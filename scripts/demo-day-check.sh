#!/usr/bin/env bash
set -euo pipefail

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.demo.yml)
PROFILES=(--profile sc01 --profile sc02 --profile sc03)

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

DOMAIN="${CYBERSIM_DOMAIN:-localhost}"
BASE_URL="${CYBERSIM_BASE_URL:-https://${DOMAIN}}"
FAILURES=0

section() {
  printf '\n== %s ==\n' "$1"
}

warn() {
  printf 'WARN: %s\n' "$1" >&2
}

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  FAILURES=$((FAILURES + 1))
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "Missing required command: $1"
  fi
}

section "Prerequisites"
require_command docker
require_command curl
if command -v git >/dev/null 2>&1; then
  git rev-parse --short HEAD 2>/dev/null || true
fi

if [[ ! -f ".env" ]]; then
  fail "Missing .env. Run scripts/demo-bootstrap.sh or copy .env.demo.example."
else
  if grep -Eq 'your_openrouter_api_key_here|your_google_ai_studio_key_here|replace_with_|REPLACE_WITH' .env; then
    warn ".env still contains placeholder values. AI tutor (OpenRouter) hints or auth may be incomplete."
  fi
fi

section "Compose Config"
if "${COMPOSE[@]}" "${PROFILES[@]}" config --quiet; then
  echo "Compose config OK."
else
  fail "Compose config failed."
fi

section "Containers"
if "${COMPOSE[@]}" "${PROFILES[@]}" ps; then
  :
else
  fail "Could not list Compose services."
fi

unhealthy="$(docker ps --filter health=unhealthy --format '{{.Names}}' 2>/dev/null || true)"
if [[ -n "${unhealthy}" ]]; then
  fail "Unhealthy containers: ${unhealthy//$'\n'/, }"
fi

restarting="$(docker ps --filter status=restarting --format '{{.Names}}' 2>/dev/null || true)"
if [[ -n "${restarting}" ]]; then
  fail "Restarting containers: ${restarting//$'\n'/, }"
fi

section "Public HTTP Checks"
if curl -kfsS "${BASE_URL}/health"; then
  echo
else
  fail "Health endpoint failed: ${BASE_URL}/health"
fi

scenario_payload="$(curl -kfsS "${BASE_URL}/api/scenarios" 2>/dev/null || true)"
if [[ "${scenario_payload}" == *"SC-01"* && "${scenario_payload}" == *"SC-02"* && "${scenario_payload}" == *"SC-03"* ]]; then
  echo "Scenario catalog OK."
else
  fail "Scenario catalog does not include SC-01, SC-02, and SC-03."
fi

section "TLS Snapshot"
if [[ "${DOMAIN}" != "localhost" ]] && command -v openssl >/dev/null 2>&1; then
  echo | openssl s_client -connect "${DOMAIN}:443" -servername "${DOMAIN}" 2>/dev/null \
    | openssl x509 -noout -issuer -enddate 2>/dev/null || warn "Could not read TLS certificate."
else
  echo "Skipping certificate read for localhost or missing openssl."
fi

section "Host Capacity"
df -h / || true
free -h || true
docker stats --no-stream || true

section "Recent Logs"
"${COMPOSE[@]}" logs --tail 40 caddy backend || true

section "Result"
if [[ "${FAILURES}" -eq 0 ]]; then
  echo "Demo checks passed. URL: ${BASE_URL}"
else
  echo "${FAILURES} check(s) failed. Run scripts/demo-recover.sh soft first, then rerun this check." >&2
  exit 1
fi

#!/usr/bin/env bash
set -euo pipefail

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.demo.yml)
PROFILES=(--profile sc01 --profile sc02 --profile sc03)
ACTION="${1:-soft}"

usage() {
  cat <<'USAGE'
Usage: bash scripts/demo-recover.sh [action]

Actions:
  soft            Restart only Caddy, backend, and frontend.
  full            Recreate the full demo stack with all scenarios.
  logs            Show recent Caddy/backend logs.
  free-memory     Stop SC-02 AD services to free RAM during a non-AD demo.
  start-scenarios Start all three scenario profiles without rebuilding.
  wipe-data       Recreate everything from empty volumes. Requires CONFIRM_WIPE=YES.
USAGE
}

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

case "${ACTION}" in
  soft)
    "${COMPOSE[@]}" up -d --no-deps caddy backend frontend
    "${COMPOSE[@]}" restart caddy backend frontend
    bash scripts/demo-day-check.sh
    ;;
  full)
    docker compose -f docker-compose.yml stop nginx >/dev/null 2>&1 || true
    docker compose -f docker-compose.yml rm -f nginx >/dev/null 2>&1 || true
    "${COMPOSE[@]}" "${PROFILES[@]}" up -d --build
    bash scripts/demo-day-check.sh
    ;;
  logs)
    "${COMPOSE[@]}" logs --tail 160 caddy backend frontend
    ;;
  free-memory)
    "${COMPOSE[@]}" stop sc02-dc sc02-fileserver
    docker stats --no-stream || true
    ;;
  start-scenarios)
    "${COMPOSE[@]}" "${PROFILES[@]}" up -d --no-build
    bash scripts/demo-day-check.sh
    ;;
  wipe-data)
    if [[ "${CONFIRM_WIPE:-}" != "YES" ]]; then
      echo "Refusing to wipe volumes. Re-run with CONFIRM_WIPE=YES only if demo data is disposable." >&2
      exit 2
    fi
    "${COMPOSE[@]}" "${PROFILES[@]}" down -v --remove-orphans
    "${COMPOSE[@]}" "${PROFILES[@]}" up -d --build
    bash scripts/demo-day-check.sh
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

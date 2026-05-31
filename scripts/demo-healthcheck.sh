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

DOMAIN="${PARALLAX_DOMAIN:-localhost}"
BASE_URL="https://${DOMAIN}"

"${COMPOSE[@]}" config --quiet

echo "Containers:"
"${COMPOSE[@]}" "${PROFILES[@]}" ps

echo
echo "Health:"
for attempt in $(seq 1 30); do
  if curl -kfsS "${BASE_URL}/health" >/tmp/parallax-health.json; then
    cat /tmp/parallax-health.json
    echo
    break
  fi

  if [[ "${attempt}" -eq 30 ]]; then
    echo "Health check failed after 30 attempts: ${BASE_URL}/health" >&2
    echo "Recent Caddy logs:" >&2
    "${COMPOSE[@]}" logs --tail 80 caddy >&2 || true
    exit 1
  fi

  sleep 5
done

echo
echo "Scenario catalog:"
curl -kfsS "${BASE_URL}/api/scenarios" | head -c 500
echo

echo
echo "Demo URL: ${BASE_URL}"

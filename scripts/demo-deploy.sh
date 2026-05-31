#!/usr/bin/env bash
set -euo pipefail

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.demo.yml)
PROFILES=(--profile sc01 --profile sc02 --profile sc03)

if [[ ! -f ".env" ]]; then
  echo "Missing .env. Copy .env.demo.example to .env or run scripts/demo-bootstrap.sh first." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if [[ -z "${PARALLAX_DOMAIN:-}" ]]; then
  echo "PARALLAX_DOMAIN must be set in .env." >&2
  exit 1
fi

"${COMPOSE[@]}" config --quiet
docker compose -f docker-compose.yml stop nginx >/dev/null 2>&1 || true
docker compose -f docker-compose.yml rm -f nginx >/dev/null 2>&1 || true
"${COMPOSE[@]}" "${PROFILES[@]}" up -d --build

echo
echo "Compose status:"
"${COMPOSE[@]}" "${PROFILES[@]}" ps

echo
echo "Checking public health endpoint..."
bash scripts/demo-healthcheck.sh

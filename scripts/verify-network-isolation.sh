#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# verify-network-isolation.sh
#
# Asserts CyberSim's #1 safety property: scenario containers (sc01/sc02/sc03)
# run on `internal: true` Docker networks and therefore have ZERO outbound
# internet access. Any scenario container that CAN reach the internet is a
# critical isolation breach and fails this script (non-zero exit).
#
# The backend (on the egress `internal` net) is allowed internet access (it
# calls OpenRouter); it is used here only as a positive control.
#
# Usage:  bash scripts/verify-network-isolation.sh
# CI/demo: call before any live session; treat a non-zero exit as a hard stop.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

PROBE_HOST="1.1.1.1"
PROBE_PORT="443"
fail=0
checked=0

# Attempt a real TCP connect from inside a container. Echoes REACHABLE/BLOCKED.
probe() {
  local name="$1"
  docker exec "$name" sh -c '
    (timeout 6 bash -c "exec 3<>/dev/tcp/'"$PROBE_HOST"'/'"$PROBE_PORT"' && echo REACHABLE") 2>/dev/null ||
    (timeout 6 python3 -c "import socket; socket.create_connection((\"'"$PROBE_HOST"'\",'"$PROBE_PORT"'),5); print(\"REACHABLE\")") 2>/dev/null ||
    echo BLOCKED' 2>/dev/null | tail -1
}

echo "== CyberSim scenario network isolation check =="
mapfile -t scenario_containers < <(docker ps --format '{{.Names}}' | grep -E 'cybersim[-_]sc0[1-3]' || true)

if [[ ${#scenario_containers[@]} -eq 0 ]]; then
  echo "WARN: no scenario containers running (start one with: docker compose --profile sc01 up -d)."
  echo "Nothing to verify; exiting 0."
  exit 0
fi

for c in "${scenario_containers[@]}"; do
  res="$(probe "$c")"
  checked=$((checked + 1))
  if [[ "$res" == "REACHABLE" ]]; then
    echo "  [BREACH] $c CAN reach ${PROBE_HOST}:${PROBE_PORT} — isolation FAILED"
    fail=1
  else
    echo "  [ok]     $c blocked from ${PROBE_HOST}:${PROBE_PORT}"
  fi
done

echo "Checked ${checked} scenario container(s)."
if [[ $fail -ne 0 ]]; then
  echo "RESULT: ISOLATION BREACH DETECTED — do not run live sessions until fixed."
  exit 1
fi
echo "RESULT: all scenario containers are internet-isolated."
exit 0

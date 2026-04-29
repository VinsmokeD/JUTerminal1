# Quick Start Continuation Guide

CyberSim is now in defense-readiness mode, not broad feature-build mode. Continue from the current worktree and verify real product behavior before making changes.

## Verified Baseline

- `python -m pytest -p no:cacheprovider` passes 79 backend tests.
- `docker compose config --quiet` passes.
- `npm install` passes with 0 host vulnerabilities.
- `npm run build` passes.
- `/health` returns `{"status":"ok","version":"0.1.0"}`.
- `/api/scenarios` returns exactly SC-01, SC-02, and SC-03.
- The authenticated Red-to-Blue WebSocket loop persists a command, generates a SIEM event, and hydrates it in Blue Team.

## Active Scope

- SC-01 NovaMed Healthcare
- SC-02 Nexora Financial AD
- SC-03 Orion Logistics

SC-04 and SC-05 are historical planning artifacts only. Do not present them as active scenarios unless the roadmap is explicitly reopened.

## Next Highest-Priority Checks

1. Perform the human/manual xterm keystroke smoke test from the real browser terminal.
2. Rehearse the full demo flow without interruption: login, dashboard, SC-01 launch, terminal command, Blue SIEM, AI hint, note, end session, debrief.
3. Fix only friction observed during that rehearsal.

## Continuation Rules

- Treat the repository and runtime evidence as source of truth.
- Do not add new features during defense polish.
- Update `docs/architecture/CONTINUOUS_STATE.md` after every edit.
- Prefer product-path verification over speculative cleanup.

**Last Updated**: 2026-04-29

# Agent Context

This file summarizes the operating context for future coding agents and maintainers. It does not replace `AGENTS.md` or `docs/architecture/CONTINUOUS_STATE.md`; it is the public-readable bridge between product documentation and agent continuity rules.

## Project Identity

CyberSim is a local, Docker-isolated cybersecurity training platform. Its current MVP has three scenarios: SC-01, SC-02, and SC-03.

## Source of Truth

Use this order when resolving disagreement:

1. Fresh runtime/test output.
2. Current code and `docker-compose.yml`.
3. `docs/architecture/MASTER_BLUEPRINT.md`.
4. Public docs in `README.md` and `docs/`.
5. Historical reports and old handoff prompts.

## Mandatory Continuity

When making edits, append a state entry to `docs/architecture/CONTINUOUS_STATE.md` with:

- status,
- why,
- exact files modified,
- technical breakdown,
- verification performed or blocked.

## Known Drift Fixed in This Pass

- Public docs previously referenced five active scenarios, but the active MVP and Compose file expose three.
- Public docs had placeholder GitHub/advisor/support links.
- Normal pytest collection imported a Locust load-test module and crashed before executing the suite.

## Current Highest-Priority Work

1. Install frontend dependencies.
2. Run frontend build.
3. Re-run backend pytest.
4. Start Docker stack.
5. Verify the full login/scenario/terminal/SIEM/debrief flow.

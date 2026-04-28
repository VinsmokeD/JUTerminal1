# CyberSim Roadmap

## Current State

CyberSim has a real multi-part platform structure: React frontend, FastAPI backend, Postgres, Redis, Elastic/Filebeat SIEM plumbing, Docker scenario profiles, scenario docs, AI monitor, scoring, reports, and instructor support.

Current assessed completion: 78/100.

## Verified in the 2026-04-28 Pass

- Repo structure and major docs reviewed.
- `docker compose config` completed successfully.
- A pytest collection issue was found and fixed by excluding the Locust file from normal pytest discovery.
- Frontend build was attempted and blocked because dependencies are not installed locally.

## Remaining Verification

| Priority | Work |
| --- | --- |
| P0 | Install frontend dependencies and run `npm run build` |
| P0 | Run `python -m pytest` after the pytest discovery fix |
| P0 | Start full core Docker stack and verify `/health`, auth, scenarios, and frontend |
| P1 | Start each scenario profile and verify container health |
| P1 | Verify login to scenario launch to terminal command to SIEM event to debrief |
| P1 | Confirm Gemini fallback and rate limiting |
| P2 | Add or refresh frontend lint config if `npm run lint` is expected in CI |
| P2 | Remove or ignore generated caches from source folders |

## Product Hardening

- Keep public docs focused on three MVP scenarios.
- Move historical agent/process content away from reviewer-facing docs.
- Add a concise demo script that maps directly to verified runtime steps.
- Add screenshots or a short demo recording after the UI is running.
- Add a status matrix to each release or defense handoff.

## Graduation Defense Target

CyberSim should be presented as a working local cyber range with a strong safety model, not as a production SaaS. The strongest demo path is:

1. Login.
2. Start SC-01.
3. Run a safe recon command in the terminal.
4. Show SIEM event creation.
5. Save a note.
6. End the session.
7. Show debrief timeline and score.

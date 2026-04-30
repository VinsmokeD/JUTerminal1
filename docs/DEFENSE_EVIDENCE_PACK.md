# CyberSim Defense Evidence Pack

Last updated: 2026-04-30 10:10 +03:00

Final completion score: 100/100

Defense-readiness verdict: FROZEN

## Defense Runtime

- Runtime path: Docker Desktop with the Compose stack from this repository.
- Backend runtime: Python 3.11 container image.
- Frontend runtime: built React/Vite assets served through nginx.
- Demo URL: `http://localhost`.
- Supported defense scenario path: SC-01 NovaMed, with SC-02 and SC-03 present in the catalog.

## Verified Today

- Docker Desktop engine was started and reachable through the `desktop-linux` context.
- `docker compose config --quiet` passed.
- `docker compose up -d --build` completed using cached backend/frontend build layers.
- Running containers included backend, frontend, nginx, Postgres, Redis, Elasticsearch, Filebeat, and SC-01/SC-02/SC-03 scenario services.
- Public health check passed after restarting nginx: `GET http://localhost/health` returned `{"status":"ok","version":"0.1.0"}`.
- Public scenario API returned exactly `SC-01`, `SC-02`, and `SC-03`.
- Final backend regression passed: `python -m pytest -p no:cacheprovider` returned `79 passed, 1 warning`.
- Final frontend production build passed: `npm run build`.
- Final Compose validation passed: `docker compose config --quiet`.
- Real browser login path passed: `http://localhost/auth` login as `admin` reached `/dashboard`.
- Final real browser SC-01 launch path passed: dashboard -> SC-01 briefing -> Start mission -> `/session/d0ecd67b-8bc5-40df-9e31-84661254e2f7/red`.
- ROE gate passed: checkbox acknowledgement enabled and entered the Red Team workspace.
- Red workspace rendered terminal, AI Tutor, SIEM Feed, and notebook.
- SIEM feed was connected and showed 0 events before the terminal smoke attempt.

## Terminal Keyboard Smoke Result

Result after fix: passed through the real browser UI keyboard path.

Root cause:

- The UI-launched WebSocket opened successfully for session `6aca6e21-ea80-480e-835b-95b54d5a5e13`, so the bug was not backend route registration, session lookup, or WebSocket creation.
- Browser keyboard events were landing on xterm's hidden helper textarea / renderer surface without reliably producing `term.onData()` callbacks.
- Because the frontend only sent PTY bytes from `term.onData()`, the backend saw an open socket but no terminal input messages.

Fix:

- `frontend/src/components/terminal/Terminal.jsx` now renders a transparent keyboard-capture textarea over the xterm renderer.
- The capture layer sends the same raw PTY bytes and complete command events through the existing `onData` / `onCommand` handlers.
- `frontend/src/hooks/useTerminal.js` still keeps xterm as the primary renderer and keeps a guarded fallback for missed xterm key/paste events.

Proof:

- Real browser UI session: `6bae9108-5dfb-4879-9744-5b6e2904ab13`.
- Typed through the browser terminal capture surface: `curl http://172.20.1.20`.
- `GET /api/sessions/6bae9108-5dfb-4879-9744-5b6e2904ab13/commands` returned the command with tool `curl`.
- `GET /api/sessions/6bae9108-5dfb-4879-9744-5b6e2904ab13/events` returned `HTTP probe: curl request to target`, severity `LOW`, source IP `172.20.1.10`, MITRE `T1595`, raw log `Web Server: GET request from 172.20.1.10`.
- Blue Team browser UI for the same session showed `1 events` and displayed the LOW curl HTTP probe event live/hydrated with source IP and MITRE metadata.

Final freeze smoke:

- Session: `d0ecd67b-8bc5-40df-9e31-84661254e2f7`.
- Timestamp: `2026-04-30 10:10:57 +03:00`.
- Command observed: `curl http://172.20.1.20`.
- Command API evidence: `/api/sessions/d0ecd67b-8bc5-40df-9e31-84661254e2f7/commands` returned tool `curl`, phase `1`, created at `2026-04-30T07:10:37.098117+00:00`.
- Event observed: `HTTP probe: curl request to target`.
- Event API evidence: `/api/sessions/d0ecd67b-8bc5-40df-9e31-84661254e2f7/events` returned severity `LOW`, source `attacker`, MITRE `T1595`, source IP `172.20.1.10`, raw log `Web Server: GET request from 172.20.1.10`, created at `2026-04-30T07:10:37.101162+00:00`.
- Blue Team UI evidence: `/session/d0ecd67b-8bc5-40df-9e31-84661254e2f7/blue` showed the curl HTTP probe event with source IP `172.20.1.10` and MITRE `T1595`.

## Previously Verified Core Path

- Authenticated terminal WebSocket command path accepted `curl http://172.20.1.20`.
- That command generated and persisted a SC-01 SIEM event.
- Blue Team UI showed the event with expected metadata.
- Red/Blue hydration reloaded the event correctly.
- AI hint path was verified through the running backend with `google-genai==1.73.1` and `gemini-2.5-flash`.
- Host frontend dependency audit previously reported 0 vulnerabilities with `npm audit --json`.

## Demo Fallbacks

Gemini unavailable:

- State that the AI Tutor is an optional Socratic guidance layer.
- Continue the demo through login -> SC-01 -> terminal proof -> Blue SIEM event -> notes/debrief.
- Use the already verified backend health, scenario API, and red-to-blue evidence as the defensible core.

Xterm input misbehaves in the room:

- First refresh the Red workspace and click directly inside the terminal area.
- The terminal has a transparent keyboard-capture layer over xterm, so ordinary typing should still flow to the backend even if xterm's hidden helper textarea misbehaves.
- If terminal input still fails on presentation hardware, use the authenticated WebSocket evidence already recorded in `docs/architecture/CONTINUOUS_STATE.md` as the fallback proof.

## Known Limitations

- MVP live scope is SC-01 through SC-03 only. SC-04/SC-05 are intentionally out of active defense scope.
- The supported defense runtime is Docker/Python 3.11. Host Python 3.14 remains useful for tests here but is not the deployment runtime.
- Gemini availability depends on a valid `GEMINI_API_KEY`; if unavailable, the core Red-to-Blue demo still works without AI hints.
- The final keyboard proof was performed through the in-app browser keyboard path; the presenter should still rehearse once on the exact defense laptop/keyboard before entering the room.

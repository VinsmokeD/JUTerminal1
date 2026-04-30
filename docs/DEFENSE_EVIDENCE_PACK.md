# CyberSim Defense Evidence Pack

Last updated: 2026-04-30 09:31 +03:00

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
- Real browser login path passed: `http://localhost/auth` login as `admin` reached `/dashboard`.
- Real browser SC-01 launch path passed: dashboard -> SC-01 briefing -> Start mission -> `/session/f112083e-b09f-47e0-899e-f865a3d91911/red`.
- ROE gate passed: checkbox acknowledgement enabled and entered the Red Team workspace.
- Red workspace rendered terminal, AI Tutor, SIEM Feed, and notebook.
- SIEM feed was connected and showed 0 events before the terminal smoke attempt.

## Manual Xterm Smoke Result

Result: not closed from automation.

Observed attempts:

- Browser automation focused the xterm helper control; DOM showed `textbox "Terminal input" [active]`.
- Browser CUA typing did not produce a command.
- Playwright interaction with `.xterm-helper-textarea` failed because the helper textarea is hidden and has no clickable bounding box.
- A narrowly scoped OS-level SendKeys attempt also left the new session with 0 commands and 0 SIEM events.
- Authenticated backend checks for session `f112083e-b09f-47e0-899e-f865a3d91911` returned 0 commands and 0 events after the attempts.

Conclusion: the remaining human-keyboard proof gap is still open. Do not claim that a real human manual xterm keystroke smoke has passed until someone physically types `curl http://172.20.1.20` in the visible browser terminal and observes command output plus the Blue Team SIEM event.

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
- If the terminal still will not accept keyboard input, use the authenticated WebSocket evidence already recorded in `docs/architecture/CONTINUOUS_STATE.md` as the fallback proof.
- Be explicit: the fallback proves the backend terminal protocol and SIEM pipeline, while the manual browser keyboard caveat remains separate.

## Freeze Guidance

- Do not tag a final defense checkpoint until the human xterm smoke passes.
- Do not add new features or re-open SC-04/SC-05.
- Keep fixes limited to demo-blocking issues on the verified SC-01 path.

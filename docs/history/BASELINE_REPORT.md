# Baseline Defect Report - Parallax Project

This report documents the reproduction analysis, code locations, and confirmed root causes for the defects F1â€“F11 identified in the Parallax playbook.

---

## F1 â€” SIEM feed never populates on load
* **Symptom**: The Blue Team SIEM panel remains empty or shows "Waiting for events..." on page load or manual refresh.
* **Confirmed Root Cause**:
  - In [useScenario.js](file:///C:/Users/Mahmo/OneDrive/Documents/Mahmoud/Graduation Project/JUTerminal1/frontend/src/hooks/useScenario.js) lines 21, 22, 39, 46, 59, and [BlueWorkspace.jsx](file:///C:/Users/Mahmo/OneDrive/Documents/Mahmoud/Graduation Project/JUTerminal1/frontend/src/pages/BlueWorkspace.jsx) line 119, the client calls endpoints prefixed with `/api` (e.g. `api.get('/api/sessions/${sessionId}/events')`).
  - Because `lib/api.js` has a configured `baseURL: '/api'`, axios automatically prepends the baseURL to these request paths, resolving to `/api/api/sessions/.../events`. This yields a 404 response which is silently swallowed by the `.catch(() => {})` blocks.
* **Status**: Confirmed.

---

## F2 â€” SIEM severity case mismatch hides/miscounts events
* **Symptom**: The Critical/High alert counts read 0 on the Blue Team dashboard, and severity filters fail to show matching events.
* **Confirmed Root Cause**:
  - In [engine.py](file:///C:/Users/Mahmo/OneDrive/Documents/Mahmoud/Graduation Project/JUTerminal1/backend/src/scenarios/engine.py) line 109, SIEM events are generated with lowercase severity: `severity=rule.get("severity", "medium")`.
  - In [BlueWorkspace.jsx](file:///C:/Users/Mahmo/OneDrive/Documents/Mahmoud/Graduation Project/JUTerminal1/frontend/src/pages/BlueWorkspace.jsx) lines 130 and 131, the alerts filter checks for exact uppercase matches: `e.severity === 'CRITICAL'` and `e.severity === 'HIGH'`. Due to the casing mismatch (e.g. `"critical"` vs `"CRITICAL"`), the counts resolve to `0`.
* **Status**: Confirmed.

---

## F3 â€” Two divergent SIEM renderers
* **Symptom**: Different SIEM event lists and UI controls behave inconsistently in the application.
* **Confirmed Root Cause**:
  - There is a standalone reusable [SiemFeed.jsx](file:///C:/Users/Mahmo/OneDrive/Documents/Mahmoud/Graduation Project/JUTerminal1/frontend/src/components/siem/SiemFeed.jsx) component.
  - However, [BlueWorkspace.jsx](file:///C:/Users/Mahmo/OneDrive/Documents/Mahmoud/Graduation Project/JUTerminal1/frontend/src/pages/BlueWorkspace.jsx) line 293 contains a duplicate inline mapping and rendering block for `filteredEvents` mapping to local component `SiemEventRow`, resulting in duplicate maintenance and feature divergence.
* **Status**: Confirmed.

---

## F4 â€” Flag submit popover is unclickable / painted behind
* **Symptom**: The submit flag popover modal is overlayed behind other panels or cannot receive mouse clicks.
* **Confirmed Root Cause**:
  - [FlagSubmitWidget.jsx](file:///C:/Users/Mahmo/OneDrive/Documents/Mahmoud/Graduation Project/JUTerminal1/frontend/src/components/workspace/FlagSubmitWidget.jsx) line 76 renders the popover inside `.workspace-topbar` with absolute positioning and `z-50`.
  - Because `.workspace-topbar` has `backdrop-filter: blur(14px)`, it creates a new local stacking context. Peer panels using `.workspace-pane` (with complex clip-path and backdrop-filter rules) render above this stacking context, painting over the popover and capturing input events.
* **Status**: Confirmed.

---

## F5 â€” Infinite horizontal scroll / page scrolls right forever
* **Symptom**: The main layout has horizontal scrolling, sliding the page to reveal blank space.
* **Confirmed Root Cause**:
  - [index.css](file:///C:/Users/Mahmo/OneDrive/Documents/Mahmoud/Graduation Project/JUTerminal1/frontend/src/index.css) lines 54-58 define `html, body, #root` styles but lacks `max-width: 100vw; overflow-x: hidden;` guards to enforce strict viewport boundaries.
  - Sibling flex and grid elements (e.g., nowrap pills in `WorkspaceTopBar` or unfitted xterm canvas elements) push layout tracks wider than the viewport, triggering the scrollbar.
* **Status**: Confirmed.

---

## F6 â€” Kali terminal disconnects repeatedly
* **Symptom**: The terminal frequently drops connection, printing "Reconnecting; input queued" when executing nmap or other slow-responding commands.
* **Confirmed Root Cause**:
  - [useWebSocket.js](file:///C:/Users/Mahmo/OneDrive/Documents/Mahmoud/Graduation Project/JUTerminal1/frontend/src/hooks/useWebSocket.js) lines 186-201 runs an interval watchdog that closes the WebSocket if raw terminal input was sent but no `terminal_output` packet was received back within 8000ms.
  - Long-running offensive commands (such as nmap discovery) legitimately block and yield no stdout for >8 seconds, causing the client to force-close its own healthy connection.
* **Status**: Confirmed.

---

## F7 â€” AI tutor returns nothing
* **Symptom**: Submitting a free-text question to the Socratic AI tutor yields a blank state or failure messages.
* **Confirmed Root Cause**:
  - Traced both WebSocket frame payload and configuration settings. The frame contract is structured correctly (handled for both string and dict formats).
  - The Socratic AI tutor fails to output if `OPENROUTER_API_KEY` is not present, or if the OpenRouter client encounters a rate limit or HTTP error.
* **Status**: Confirmed.

---

## F8 â€” Auth / session lifecycle is half-wired
* **Symptom**: Idle containers linger in Docker; token expiration forces sudden hard page refreshes; session cleanup is inconsistent.
* **Confirmed Root Cause**:
  - [SessionManager.jsx](file:///C:/Users/Mahmo/OneDrive/Documents/Mahmoud/Graduation Project/JUTerminal1/frontend/src/components/ui/SessionManager.jsx) tracks inactivity using client mouse/key events but does not check the JWT token's `exp` claim, causing it to fall back to hard axios interceptor redirects on token lapse.
  - In [container_cleanup.py](file:///C:/Users/Mahmo/OneDrive/Documents/Mahmoud/Graduation Project/JUTerminal1/backend/src/sandbox/container_cleanup.py), the background cleanup loop removes the Redis session mapping when the alive key lapses, but it does not end the active mission state in Postgres or terminate active container tasks if they are under 2 hours of age.
* **Status**: Confirmed.

---

## F9 â€” Dashboard & page redirection brittleness
* **Symptom**: Bouncing redirects or card flickering when loading `/dashboard` or deep-linking to active sessions.
* **Confirmed Root Cause**:
  - The router configuration inside [App.jsx](file:///C:/Users/Mahmo/OneDrive/Documents/Mahmoud/Graduation Project/JUTerminal1/frontend/src/App.jsx) uses separate, nested wrapper components (`RequireAuth`, `RequireOnboarding`, `RequireUnauth`) which independently inspect auth state and localStorage, leading to multiple concurrent redirection decisions and rendering cycles while auth state checks are outstanding.
* **Status**: Confirmed.

---

## F10 â€” Repo hygiene / git cleanliness
* **Symptom**: Unwanted build outputs, Jupyter notebooks, local test scripts, and redundant/stale agent guidelines clutter the codebase.
* **Confirmed Root Cause**:
  - The repository root contains stray scripts (`trigger_siem_live.py`, `test_ws_client.py`, `live_tutor_test.py`, etc.), temporary logs, and duplicate rule files (`claude.md`, `AGENTS.md`, `openrouter.md`, `PROJECT_UNDERSTANDING.md`).
* **Status**: Confirmed.

---

## F11 â€” Security gaps
* **Symptom**: Potential privilege escalation or container escape via mounts/unrestrained settings; unthrottled endpoints.
* **Confirmed Root Cause**:
  - Docker container configs lack standard capability dropping, memory caps, read-only rootfilesystems, and proper non-root setups in training tasks. The raw Docker socket is exposed directly.
* **Status**: Confirmed.

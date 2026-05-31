# Parallax â€” Development Phases (v2.0 Master Blueprint Aligned)

## Phase 0 â€” Concept, architecture, documentation âœ…
**Goal**: Complete project spec before any code.
**Deliverables**: CLAUDE.md, .antigravity-rules.md, MASTER_BLUEPRINT.md, all docs/, scenario specs, network specs.
**Acceptance**: All docs readable, no placeholders, repo initialized.

---

## Phase 1 â€” Infrastructure skeleton âœ… Done
**Blockers**: None.
**Goal**: docker-compose brings up all services; health checks pass.
**Files**:
- docker-compose.yml (postgres, redis, backend, frontend, nginx)
- .env.example
- backend/Dockerfile
- frontend/Dockerfile
- infrastructure/nginx/nginx.conf
- .github/workflows/ci.yml
**Acceptance**: `docker-compose up` â†’ all services healthy. `curl localhost/health` returns 200.
**Est. tokens**: ~600

---

## Phase 2 â€” Backend foundation âœ… Done
**Goal**: FastAPI app with auth, session management, WebSocket endpoint.
**Files**:
- backend/src/main.py
- backend/src/auth/ (JWT models + routes)
- backend/src/models/ (Pydantic + SQLAlchemy)
- backend/src/ws/ (WebSocket manager)
- backend/requirements.txt
- backend/pyproject.toml (black + mypy config)
**Acceptance**: POST /auth/login returns JWT. WS /ws/{session_id} accepts connection.
**Est. tokens**: ~700

---

## Phase 3 - Scenario engine core - Done
**Goal**: Scenario state machine loads SC-01, tracks phases, evaluates step completion.
**Files**:
- backend/src/scenarios/engine.py
- backend/src/scenarios/loader.py
- docs/scenarios/SC-01-webapp-pentest.yaml (full spec)
- docs/scenarios/SC-02-ad-compromise.yaml
- docs/scenarios/SC-03-phishing.yaml
**Acceptance**: GET /scenarios returns 3 scenarios. POST /session/start/{sc01} returns session with phase=1.
**Est. tokens**: ~800

---

## Phase 4 - Terminal proxy - Done
**Goal**: xterm.js in browser connects to real Docker container shell via WebSocket.
**Files**:
- backend/src/sandbox/manager.py (Docker SDK container lifecycle)
- backend/src/sandbox/terminal.py (exec stream â†” WS proxy)
- infrastructure/docker/kali/Dockerfile (Kali base, tools pre-installed)
- frontend/src/components/terminal/Terminal.jsx
- frontend/src/hooks/useTerminal.js
**Acceptance**: Student can open terminal, run `nmap --version`, see real output.
**Est. tokens**: ~900

---

## Phase 5 â€” SIEM event engine âœ… Done
**Goal**: Attacker terminal actions trigger corresponding SIEM events on blue side in real time.
**Files**:
- backend/src/siem/engine.py (action â†’ event mapping)
- backend/src/siem/events/sc01_events.json (full event map SC-01)
- backend/src/siem/events/sc02_events.json
- backend/src/siem/events/sc03_events.json
- frontend/src/components/siem/SiemFeed.jsx
- frontend/src/components/siem/EventDetail.jsx
**Acceptance**: nmap scan in terminal â†’ 3 SIEM events appear on blue panel within 2 seconds.
**Est. tokens**: ~800

---

## Phase 6 â€” Notes system âœ… Done
**Goal**: Structured pentest notebook and IR notebook with tag system and auto-save.
**Files**:
- frontend/src/components/notes/PentestNotebook.jsx
- frontend/src/components/notes/IrNotebook.jsx
- frontend/src/components/notes/NoteEntry.jsx
- backend/src/notes/ (CRUD API)
**Acceptance**: Add a #finding note â†’ it persists across page refresh â†’ appears in session export.
**Est. tokens**: ~500

---

## Phase 7 â€” Methodology tracker âœ… Done
**Goal**: Student declares methodology at scenario start; phase progress tracked against it.
**Files**:
- frontend/src/components/methodology/MethodologySelector.jsx
- frontend/src/components/methodology/PhaseTrail.jsx
- backend/src/scenarios/methodology.py
**Acceptance**: Student selects PTES â†’ phase dots update as steps are completed.
**Est. tokens**: ~400

---

## Phase 8 â€” AI monitor (Gemini Flash) âœ… Done
**Goal**: Every terminal command triggers AI analysis; hints appear in learning panel.
**Files**:
- ai-monitor/system_prompt.md (full prompt, all 3 scenarios)
- backend/src/ai/monitor.py (Gemini API client)
- backend/src/ai/prompt_builder.py (context assembler)
- frontend/src/components/hints/AiHintPanel.jsx
- frontend/src/components/hints/HintCard.jsx
**Acceptance**: Run `nmap 10.10.1.10` â†’ AI hint appears within 3s. Hint asks a question, not gives an answer.
**Est. tokens**: ~700

---

## Phase 9 â€” Hint system âœ… Done
**Goal**: Three-level graduated hint trees for all 3 scenarios, both red and blue sides.
**Files**:
- backend/src/scenarios/hints/sc01_hints.json (all phases, L1/L2/L3)
- backend/src/scenarios/hints/sc02_hints.json
- backend/src/scenarios/hints/sc03_hints.json
- backend/src/scenarios/hint_engine.py
**Acceptance**: Student requests L1 hint for SC-01 Phase 3 â†’ gets conceptual nudge, -5 points. L3 â†’ -20 points.
**Est. tokens**: ~600

---

## Phase 10 â€” Scope & ROE briefing system âœ… Done
**Goal**: Before each scenario, student reads and acknowledges Scope + ROE document. Actions outside scope are blocked.
**Files**:
- frontend/src/components/workspace/ScopeBriefing.jsx
- backend/src/scenarios/scope_enforcer.py
- docs/scenarios/roe/ (one ROE doc per scenario)
**Acceptance**: Student cannot start terminal until ROE acknowledged. Out-of-scope IP triggers warning.
**Est. tokens**: ~400

---

## Phase 11 â€” Debrief & report generation âœ… Done
**Goal**: Post-mission screen shows attack path replay, defender timeline, and exports PDF report.
**Files**:
- frontend/src/pages/Debrief.jsx
- frontend/src/components/debrief/AttackPath.jsx
- frontend/src/components/debrief/DefenderTimeline.jsx
- backend/src/reports/generator.py (Markdown â†’ PDF via weasyprint)
- backend/src/reports/templates/ (pentest report + IR report templates)
**Acceptance**: Complete SC-01 â†’ debrief shows 6-phase attack path â†’ Export PDF generates valid report.
**Est. tokens**: ~700

---

## Phase 12 â€” Scoring system âœ… Done
**Goal**: Real-time scoring for both red and blue. Hint usage deducts points. Time bonus.
**Files**:
- backend/src/scoring/engine.py
- frontend/src/components/workspace/ScoreBar.jsx
**Acceptance**: Complete SC-01 without hints â†’ score > 80. Using 3 L3 hints â†’ score < 60.
**Est. tokens**: ~350

---

## Phase 13 â€” Dashboard and scenario selection âœ… Done
**Goal**: Landing page showing 3 scenarios, difficulty, your history, leaderboard.
**Files**:
- frontend/src/pages/Dashboard.jsx
- frontend/src/components/dashboard/ScenarioCard.jsx
- frontend/src/components/dashboard/Leaderboard.jsx
**Acceptance**: Dashboard loads, shows 3 cards, clicking SC-01 launches scope briefing.
**Est. tokens**: ~400

---

## Phase 14 â€” Final integration and polish âœ… Done
**Goal**: Full end-to-end flow working for SC-01 to SC-03.
**Tasks**:
- Integration tests for SC-01 full flow
- Mobile layout check (terminal requires min 900px â€” gate with warning)
- Docker resource limits on scenario containers
- Rate limiting on AI monitor calls (max 1 per 10s per session)
- README finalized with full setup guide
**Acceptance**: SC-01 completable start-to-finish with scoring, debrief, and PDF export.
**Est. tokens**: ~600

---

## Phase 15 â€” Background Noise Generator âœ… Done
**Goal**: Target networks simulate benign background traffic so attacker actions are hidden in noise.
**Files**:
- backend/src/sandbox/daemon-noise.py
**Acceptance**: SIEM feed shows benign HTTP requests/logins while attacker is idle.
**Est. tokens**: ~400

---

## Phase 16 â€” Methodology Gating (Hard Locks) âœ… Done
**Goal**: Enforce PTES phases natively. Block exploitation if recon is not logged.
**Files**:
- backend/src/scenarios/gatekeeper.py
**Acceptance**: Running `sqlmap` before logging recon intercepts the command and returns an AI redirection hint in terminal.
**Est. tokens**: ~500

---

## Phase 17 â€” The Kill Chain Timeline (Debrief UI) âœ… Done
**Goal**: Post-scenario Debrief page displays a dual-axis visual timeline of Red actions vs Blue detection timestamps.
**Files**:
- frontend/src/components/debrief/KillChainTimeline.jsx
**Acceptance**: Debrief page accurately aligns red team commands and blue team SIEM alerts by timestamp.
**Est. tokens**: ~600

---

## Phase 18 â€” Instructor Dashboard âœ… Done
**Goal**: High-level view for professors to see student methodology adherence and download auto-generated reports.
**Files**:
- frontend/src/pages/InstructorDashboard.jsx
- backend/src/reports/instructor_api.py
**Acceptance**: Instructor can log in, view student metrics in a table, and click 'Download Report' for a specific session.
**Est. tokens**: ~700

---

## Phase 19 â€” Real SIEM Deployment (Unified Elastic Stack) âœ… Done
**Goal**: Deploy an Elasticsearch single-node cluster to act as the central SIEM on the same platform machine, replacing the mocked Python SIEM engine.
**Tasks**:
- Integrate a highly-restricted Elasticsearch + Kibana combination into the main `docker-compose.yml`.
- Delete the legacy mocked Python JSON files: `backend/src/siem/events/*.json`.
- Rewrite `backend/src/siem/engine.py` to poll the live Elasticsearch REST API and map events dynamically to the BlueWorkspace.
**Acceptance**: Blue Team workspace natively renders real Elasticsearch logs polled by the Backend.

---

## Phase 20 â€” Authentic Target Telemetry âœ… Done
**Goal**: Target containers generate real logs and forward them to the Elastic SIEM via Filebeat/Syslog.
**Tasks**:
- Install and configure Filebeat in `sc01/Dockerfile.waf` (ModSecurity).
- Configure Samba audit logging in `sc02/Dockerfile.dc` (AD DC).
- Configure Postfix logging in `sc03/Dockerfile.mailrelay`.
**Acceptance**: Target actions (e.g. nmap scan, LDAP query) naturally generate Elastic Search logs.

---

## Phase 21 â€” Kali Terminal Strict Raw Mode âœ… Done
**Goal**: Terminal must strictly be a raw PTY passthrough to the genuine Kali container, with no fallback mocks.
**Tasks**:
- Delete `_mock_command_output()` from `terminal.py`.
- Enforce strict Docker raw PTY proxying.
**Acceptance**: If Docker is unavailable, the system fails-fast rather than loading a simulated terminal.

---

## Phase 22 â€” Unified Single-Node Architecture & Integration âœ… Done
**Goal**: Restructure all moving parts to operate seamlessly without crashing resources on a single user machine.
**Tasks**:
- Optimize ELK stack RAM consumption (`ES_JAVA_OPTS="-Xms1g -Xmx1g"`).
- Implement dynamic Docker lifecycle (start SC-01 target containers only when SC-01 session begins, and teardown when ending).
- Run load tests to ensure memory usage across all containers stays under the local host's threshold (<8GB footprint).
**Acceptance**: A user can boot the entire Parallax repository using a single `docker-compose up` flow and engage with all scenarios on one local computer.

---

## Phase 23 - Learning Insights And Causality Debrief - Done
**Goal**: Turn the debrief into a cause-and-effect learning review that links Red Team commands to Blue Team detections, latency, coaching, and next practice recommendations.
**Files**:
- docs/product/PRODUCT_EVOLUTION_PLAN.md
- backend/src/reports/learning_insights.py
- backend/src/reports/routes.py
- backend/tests/integration_test.py
- frontend/src/pages/Debrief.jsx
**Acceptance**: `GET /api/reports/{session_id}/learning-insights` returns summary metrics, cause-effect links, coaching strengths, improvement areas, and next practice items; Debrief renders an Insights tab; backend tests and frontend build pass.
**Est. tokens**: ~700

---

## Phase 24 - Blue Team Triage Workflow - Done
**Goal**: Make SIEM handling an active analyst workflow with persisted triage states and alert-linked notes.
**Acceptance**: Blue Team can classify alerts as investigating, true positive, false positive, or escalated; triage decisions persist and appear in reports.
**Implemented**:
- `GET /api/sessions/{session_id}/events` includes persisted triage state for each SIEM event.
- `GET /api/sessions/{session_id}/triage` and `PUT /api/sessions/{session_id}/triage` expose analyst classification and notes over the `siem_triage` table.
- Blue Workspace SIEM rows include analyst triage controls, disposition badges, notes, and save-state handling.
- Instructor metrics include triage completion counts and coverage percentages.
- Markdown reports include a Blue Team triage decisions table when classifications exist.
- Command Palette scenario entries open the requested scenario briefing from Dashboard.
**Verification (2026-05-17)**: Frontend production build passes (`npm run build`, 541 modules). Backend pytest suite passes (`81 passed, 1 warning in 13.13s`). Live runtime verification against the full Compose stack: registered a fresh user, started an SC-01 blue session, called `GET /api/sessions/{id}/triage` and `GET /api/sessions/{id}/events` (both HTTP 200), confirmed cross-user `PUT` returns HTTP 404 (ownership enforced).

---

## Phase 25 â€” Instructor Learning Analytics âœ… Done
**Goal**: Give instructors class-level learning signals, common mistake summaries, and stronger grading exports.
**Acceptance**: Instructor can see weak phases, most-used hints, detection coverage, and export grade-ready data.

---

## Phase 26 â€” Mission Shell And Readiness UX âœ… Done
**Goal**: Make each scenario feel like a coherent mission with readiness states for targets, terminal, SIEM, and AI.
**Acceptance**: Students can see what is starting, ready, degraded, or blocked before they begin acting.

---

## Phase 27 â€” AI Debrief Mode âœ… Done
**Goal**: Add safe post-session coaching that summarizes mistakes, missed detections, and next practice without giving exploit chains.
**Acceptance**: Debrief produces bounded, safe coaching with deterministic fallback when Gemini is unavailable.

---

## Phase 28 â€” Scenario Depth And Randomization âœ… Done
**Goal**: Increase replay value for SC-01 through SC-03 before expanding scenario count.
**Acceptance**: Scenario seeds, difficulty variants, richer noise, and alternate valid paths exist while fixed demo paths still pass.

---

## Total estimated phases: 28 âœ… All Completed
## Estimated total Claude Code sessions: +6 for Product Evolution
## GitHub push points: after every phase


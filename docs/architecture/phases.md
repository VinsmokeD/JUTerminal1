# CyberSim — Development Phases (v2.0 Master Blueprint Aligned)

## Phase 0 — Concept, architecture, documentation ✅
**Goal**: Complete project spec before any code.
**Deliverables**: CLAUDE.md, .antigravity-rules.md, MASTER_BLUEPRINT.md, all docs/, scenario specs, network specs.
**Acceptance**: All docs readable, no placeholders, repo initialized.

---

## Phase 1 — Infrastructure skeleton ✅ Done
**Blockers**: None.
**Goal**: docker-compose brings up all services; health checks pass.
**Files**:
- docker-compose.yml (postgres, redis, backend, frontend, nginx)
- .env.example
- backend/Dockerfile
- frontend/Dockerfile
- infrastructure/nginx/nginx.conf
- .github/workflows/ci.yml
**Acceptance**: `docker-compose up` → all services healthy. `curl localhost/health` returns 200.
**Est. tokens**: ~600

---

## Phase 2 — Backend foundation ✅ Done
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

## Phase 3 — Scenario engine core 🚧 In Progress
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

## Phase 4 — Terminal proxy 🚧 In Progress
**Goal**: xterm.js in browser connects to real Docker container shell via WebSocket.
**Files**:
- backend/src/sandbox/manager.py (Docker SDK container lifecycle)
- backend/src/sandbox/terminal.py (exec stream ↔ WS proxy)
- infrastructure/docker/kali/Dockerfile (Kali base, tools pre-installed)
- frontend/src/components/terminal/Terminal.jsx
- frontend/src/hooks/useTerminal.js
**Acceptance**: Student can open terminal, run `nmap --version`, see real output.
**Est. tokens**: ~900

---

## Phase 5 — SIEM event engine
**Goal**: Attacker terminal actions trigger corresponding SIEM events on blue side in real time.
**Files**:
- backend/src/siem/engine.py (action → event mapping)
- backend/src/siem/events/sc01_events.json (full event map SC-01)
- backend/src/siem/events/sc02_events.json
- backend/src/siem/events/sc03_events.json
- frontend/src/components/siem/SiemFeed.jsx
- frontend/src/components/siem/EventDetail.jsx
**Acceptance**: nmap scan in terminal → 3 SIEM events appear on blue panel within 2 seconds.
**Est. tokens**: ~800

---

## Phase 6 — Notes system
**Goal**: Structured pentest notebook and IR notebook with tag system and auto-save.
**Files**:
- frontend/src/components/notes/PentestNotebook.jsx
- frontend/src/components/notes/IrNotebook.jsx
- frontend/src/components/notes/NoteEntry.jsx
- backend/src/notes/ (CRUD API)
**Acceptance**: Add a #finding note → it persists across page refresh → appears in session export.
**Est. tokens**: ~500

---

## Phase 7 — Methodology tracker
**Goal**: Student declares methodology at scenario start; phase progress tracked against it.
**Files**:
- frontend/src/components/methodology/MethodologySelector.jsx
- frontend/src/components/methodology/PhaseTrail.jsx
- backend/src/scenarios/methodology.py
**Acceptance**: Student selects PTES → phase dots update as steps are completed.
**Est. tokens**: ~400

---

## Phase 8 — AI monitor (Gemini Flash)
**Goal**: Every terminal command triggers AI analysis; hints appear in learning panel.
**Files**:
- ai-monitor/system_prompt.md (full prompt, all 3 scenarios)
- backend/src/ai/monitor.py (Gemini API client)
- backend/src/ai/prompt_builder.py (context assembler)
- frontend/src/components/hints/AiHintPanel.jsx
- frontend/src/components/hints/HintCard.jsx
**Acceptance**: Run `nmap 10.10.1.10` → AI hint appears within 3s. Hint asks a question, not gives an answer.
**Est. tokens**: ~700

---

## Phase 9 — Hint system
**Goal**: Three-level graduated hint trees for all 3 scenarios, both red and blue sides.
**Files**:
- backend/src/scenarios/hints/sc01_hints.json (all phases, L1/L2/L3)
- backend/src/scenarios/hints/sc02_hints.json
- backend/src/scenarios/hints/sc03_hints.json
- backend/src/scenarios/hint_engine.py
**Acceptance**: Student requests L1 hint for SC-01 Phase 3 → gets conceptual nudge, -5 points. L3 → -20 points.
**Est. tokens**: ~600

---

## Phase 10 — Scope & ROE briefing system
**Goal**: Before each scenario, student reads and acknowledges Scope + ROE document. Actions outside scope are blocked.
**Files**:
- frontend/src/components/workspace/ScopeBriefing.jsx
- backend/src/scenarios/scope_enforcer.py
- docs/scenarios/roe/ (one ROE doc per scenario)
**Acceptance**: Student cannot start terminal until ROE acknowledged. Out-of-scope IP triggers warning.
**Est. tokens**: ~400

---

## Phase 11 — Debrief & report generation
**Goal**: Post-mission screen shows attack path replay, defender timeline, and exports PDF report.
**Files**:
- frontend/src/pages/Debrief.jsx
- frontend/src/components/debrief/AttackPath.jsx
- frontend/src/components/debrief/DefenderTimeline.jsx
- backend/src/reports/generator.py (Markdown → PDF via weasyprint)
- backend/src/reports/templates/ (pentest report + IR report templates)
**Acceptance**: Complete SC-01 → debrief shows 6-phase attack path → Export PDF generates valid report.
**Est. tokens**: ~700

---

## Phase 12 — Scoring system
**Goal**: Real-time scoring for both red and blue. Hint usage deducts points. Time bonus.
**Files**:
- backend/src/scoring/engine.py
- frontend/src/components/workspace/ScoreBar.jsx
**Acceptance**: Complete SC-01 without hints → score > 80. Using 3 L3 hints → score < 60.
**Est. tokens**: ~350

---

## Phase 13 — Dashboard and scenario selection
**Goal**: Landing page showing 3 scenarios, difficulty, your history, leaderboard.
**Files**:
- frontend/src/pages/Dashboard.jsx
- frontend/src/components/dashboard/ScenarioCard.jsx
- frontend/src/components/dashboard/Leaderboard.jsx
**Acceptance**: Dashboard loads, shows 3 cards, clicking SC-01 launches scope briefing.
**Est. tokens**: ~400

---

## Phase 14 — Final integration and polish
**Goal**: Full end-to-end flow working for SC-01 to SC-03.
**Tasks**:
- Integration tests for SC-01 full flow
- Mobile layout check (terminal requires min 900px — gate with warning)
- Docker resource limits on scenario containers
- Rate limiting on AI monitor calls (max 1 per 10s per session)
- README finalized with full setup guide
**Acceptance**: SC-01 completable start-to-finish with scoring, debrief, and PDF export.
**Est. tokens**: ~600

---

## Phase 15 — Background Noise Generator
**Goal**: Target networks simulate benign background traffic so attacker actions are hidden in noise.
**Files**:
- backend/src/sandbox/daemon-noise.py
**Acceptance**: SIEM feed shows benign HTTP requests/logins while attacker is idle.
**Est. tokens**: ~400

---

## Phase 16 — Methodology Gating (Hard Locks)
**Goal**: Enforce PTES phases natively. Block exploitation if recon is not logged.
**Files**:
- backend/src/scenarios/gatekeeper.py
**Acceptance**: Running `sqlmap` before logging recon intercepts the command and returns an AI redirection hint in terminal.
**Est. tokens**: ~500

---

## Phase 17 — The Kill Chain Timeline (Debrief UI)
**Goal**: Post-scenario Debrief page displays a dual-axis visual timeline of Red actions vs Blue detection timestamps.
**Files**:
- frontend/src/components/debrief/KillChainTimeline.jsx
**Acceptance**: Debrief page accurately aligns red team commands and blue team SIEM alerts by timestamp.
**Est. tokens**: ~600

---

## Phase 18 — Instructor Dashboard
**Goal**: High-level view for professors to see student methodology adherence and download auto-generated reports.
**Files**:
- frontend/src/pages/InstructorDashboard.jsx
- backend/src/reports/instructor_api.py
**Acceptance**: Instructor can log in, view student metrics in a table, and click 'Download Report' for a specific session.
**Est. tokens**: ~700

---

## Total estimated phases: 18
## Estimated total Claude Code sessions: 10–12
## GitHub push points: after every phase

# CyberSim — Master Enhancement & Hardening Plan
**Author:** Claude Code (Lead Technical Auditor / Planner)
**Created:** 2026-05-29
**Status:** Active master plan. Supersedes ad-hoc roadmaps for the enhancement cycle.
**Scope:** End-to-end hardening of every layer — Docker, backend, frontend, AI tutor, SIEM, scenarios/machines, kill chain, Kali terminal, reporting, knowledge, architecture, UI/UX, security, compliance, testing, reliability, scalability, documentation, and management.

---

## 0. How to read & use this plan

This is a **phase-by-phase execution playbook**. Each phase has:
- **Objective** — what "done" looks like.
- **Target files / areas** — the real paths in this repo to touch.
- **Skills** — which `/skill` to invoke (this environment ships hundreds; the right ones are named per phase).
- **Tasks** — concrete checklist.
- **Prompt(s)** — copy-paste ready instructions you can hand to Claude Code (or any agent) to execute the phase.
- **Exit criteria / verification** — the empirical gate (per `CLAUDE.md`: no `STATE_SAVE` without a physical test).

**Execution rules (carry into every phase):**
1. **Pre-flight read** (per `CLAUDE.md`): `PROJECT_UNDERSTANDING.md`, `.antigravity-rules.md`, `openrouter.md`, `docs/architecture/MASTER_BLUEPRINT.md`, `docs/architecture/CONTINUOUS_STATE.md` (tail only — it is 600KB).
2. **One phase = one branch.** `git checkout -b phase/<n>-<slug>`. Small, conventional commits.
3. **Verify before claiming done.** Run `pytest`, `docker compose config`, `npm run build`, and targeted curl/WS checks.
4. **Log to state.** Append a dated entry to `CONTINUOUS_STATE.md` (When/Who/Why/Where/What+How/Verification). See Phase 0.4 about splitting that file.
5. **Use skills, don't reinvent.** Each phase maps to skills already installed in this environment.

---

## 1. Ground-truth findings (the "why" behind the phases)

A real audit on 2026-05-29 (code + docs read, not just doc claims) surfaced these:

| # | Finding | Severity | Evidence |
|---|---------|----------|----------|
| F1 | **Terminal WebSocket reconnect/reattach is absent.** A browser refresh kills the session. | HIGH | `CURRENT_STATUS_REPORT.md` Phase 16 "NOT IMPLEMENTED"; no reattach in `ws/routes.py` / `useWebSocket.js`. |
| F2 | **Gemini → OpenRouter documentation drift.** Code/README use OpenRouter (`deepseek-chat-v3`); many docs still say "Gemini Flash". | HIGH (credibility) | `docs/ARCHITECTURE.md`, `FEATURES.md`, `ROADMAP.md`, `findings.md`, `progress.md`, `task_plan.md`, `CURRENT_STATUS_REPORT.md` all reference Gemini. |
| F3 | **Inconsistent self-assessment.** README "95/100", ROADMAP "78/100". `.env.example` lists `GEMINI_API_KEY` while README says `OPENROUTER_API_KEY`. | MEDIUM | Direct file diff. |
| F4 | **SC-04 / SC-05 are half-built.** Hint trees + SIEM maps exist; no YAML spec, no Docker infra → cannot launch. | MEDIUM | `loader.py` loads only SC-01..03; `infrastructure/docker/scenarios/sc04,sc05` empty. |
| F5 | **Thin SIEM event maps for SC-03/04** (≈3 trigger keys) → sparse Blue feed. | MEDIUM | Status report §4.4. |
| F6 | **`CONTINUOUS_STATE.md` is ~600KB** — exceeds tool read limits, slows every agent, violates token-efficiency rules. | MEDIUM | File size; cannot be read whole. |
| F7 | **Secrets hygiene risk.** `.env` is checked into the working tree; `stash.patch` is 3MB; `.gemini_backup/`, `screenshot-temp-env/`, `graphify-out/`, `backend/src/graphify-out/cache/` are committed artifacts. | HIGH | Top-level `ls`; grep found cache files. |
| F8 | **`scope_enforcer.py` missing** (blueprint v2 requirement) — attack scope is not hard-enforced server-side. | MEDIUM | Status report §4.4. |
| F9 | **Heavy files (`ws/routes.py` 915 LOC, `SiemFeed.jsx` 541, `useTerminal.js` 454)** concentrate logic and risk; need decomposition + tests. | LOW–MED | `wc -l`. |
| F10 | **Two casing variants of project memory** (`CLAUDE.md` and `claude.md`) coexist on a case-insensitive FS — drift/confusion risk. | LOW | Top-level `ls`. |

These findings drive the phase ordering: **truth → correctness → reliability → security → realism → polish → proof.**

---

## 2. Skills → workstream map

Invoke these with the Skill tool (e.g. `/security-auditor`). Use them; don't hand-roll what a skill does well.

| Workstream | Primary skills | Support skills |
|---|---|---|
| Planning / management | `project-planner`, `sprint-planner`, `writing-plans`, `to-issues`, `to-prd` | `action-tracker`, `kpi-tracker`, `okr-tracker` |
| Backend correctness | `code-reviewer`, `debug-helper`, `systematic-debugging`, `diagnose`, `refactor-assistant` | `api-designer`, `rest-api-builder`, `db-schema-designer`, `migration-generator` |
| Docker / infra | `docker-composer`, `dockerfile-builder`, `compose-creator` | `monitoring-setup`, `alerting-config`, `terraform-writer` |
| Security & compliance | `security-auditor`, `owasp-checker`, `threat-modeler`, `vuln-scanner`, `secret-scanner`, `dependency-auditor` | `compliance-checker`, `soc2-helper`, `gdpr-helper`, `security-policy`, `pentest-helper` |
| AI tutor / prompts | `claude-api` (patterns), `mcp-builder` | `prompt` design via `brainstorming` |
| SIEM / Blue team | `log-analyzer`, `threat-modeler` | `monitoring-setup`, `alerting-config` |
| Scenarios / content | `make-scenario`, `scaffold-exercises` | `tutorial-builder`, `curriculum-designer` |
| Frontend / UI-UX | `frontend-design`, `react-best-practices`, `react-component`, `accessibility-checker`, `design-system` | `web-design-guidelines`, `theme-factory`, `color-palette`, `typography-guide`, `dark-mode-converter`, `ux-researcher`, `composition-patterns` |
| Reporting / knowledge | `report-builder`, `data-viz`, `technical-writer` | `docs-generator`, `markdown-pro`, `pdf`, `docx` |
| Testing / QA / perf | `tdd`, `test-driven-development`, `webapp-testing`, `qa`, `perf-optimizer`, `verification-before-completion` | `ci-cd-builder`, `github-actions` |
| Documentation | `technical-writer`, `docs-generator`, `markdown-pro` | `graphify`, `concept-mapper` |
| Workflow accelerators | `dispatching-parallel-agents`, `subagent-driven-development`, `using-git-worktrees`, `finishing-a-development-branch` | `requesting-code-review`, `receiving-code-review` |

---

## 3. The phases (dependency-ordered)

> Phases 0–3 are **foundation and must run in order**. Phases 4–9 are **feature pillars** that can partly parallelize via git worktrees / subagents once Phase 1–2 land. Phases 10–12 are **proof and release**. A "Continuous track" runs alongside everything.

---

### Phase 0 — Ground Truth & Baseline (no feature work)
**Objective:** Replace optimistic doc claims with a measured baseline. Repo hygiene. One source of truth.

**Target areas:** whole repo; `.env`, `stash.patch`, `.gemini_backup/`, `graphify-out/`, `screenshot-temp-env/`, `CONTINUOUS_STATE.md`, `CLAUDE.md`/`claude.md`.

**Skills:** `secret-scanner`, `dependency-auditor`, `code-reviewer` (repo-level), `project-planner`.

**Tasks:**
1. Boot the full stack; record what actually works (`/health`, auth, scenario launch, terminal, SIEM, debrief). Produce `docs/architecture/BASELINE_2026-05-29.md` with a pass/fail matrix and real command output.
2. Run backend `pytest` and frontend `npm run build`; capture true counts (not "295" by memory).
3. `secret-scanner`: confirm no live keys in tree; ensure `.env` is git-ignored and untracked; rotate anything exposed.
4. Repo hygiene: remove/ignore `stash.patch`, `.gemini_backup/`, `graphify-out/`, `backend/src/graphify-out/`, `screenshot-temp-env/`, `__pycache__`. Update `.gitignore`.
5. Resolve `CLAUDE.md` vs `claude.md` duplication → single canonical file.
6. **Split `CONTINUOUS_STATE.md`**: archive history to `docs/history/CONTINUOUS_STATE_ARCHIVE_<date>.md`, keep a lean rolling tail (<2000 lines) as the live file. Add a header explaining the rotation policy.

**Prompt:**
```
Run Phase 0 (Ground Truth & Baseline) of docs/architecture/MASTER_ENHANCEMENT_PLAN.md.
Do NOT change features. Steps:
1. Boot the stack (docker compose up -d) and run the README "Pre-Demo Readiness Check"; for each item record the exact command and its real output into a new docs/architecture/BASELINE_2026-05-29.md pass/fail matrix.
2. Run backend pytest and frontend `npm run build`; paste true result counts into the baseline.
3. Invoke /secret-scanner across the repo. Confirm .env is untracked + gitignored; list any exposed secrets to rotate.
4. Invoke /dependency-auditor for backend (requirements.txt) and frontend (package.json); record CVEs/outdated to a "Dependency Findings" table.
5. Repo hygiene: gitignore and git-rm-cached stash.patch, .gemini_backup/, graphify-out/, backend/src/graphify-out/, screenshot-temp-env/, all __pycache__. Reconcile CLAUDE.md vs claude.md into one canonical file.
6. Rotate CONTINUOUS_STATE.md: move everything older than the last ~200 lines into docs/history/CONTINUOUS_STATE_ARCHIVE_2026-05-29.md, leave a lean live file with a rotation-policy header.
Verify: pytest green, npm build green, docker compose config --quiet OK, git status clean of junk. Append a CONTINUOUS_STATE.md entry.
```

**Exit criteria:** A trustworthy baseline doc exists; tree is clean; no live secrets tracked; state file readable in one tool call.

---

### Phase 1 — Backend Correctness, Logic & API Contracts
**Objective:** Fix real bugs and tighten logic in the core engines before building on them.

**Target files:** `backend/src/ws/routes.py` (915 LOC), `siem/engine.py`, `siem/command_bridge.py`, `scenarios/engine.py`, `scenarios/gatekeeper.py`, `scenarios/branching.py`, `scoring/engine.py`, `ai/monitor.py`, `sessions/routes.py`, `db/database.py`, `cache/redis.py`.

**Skills:** `code-reviewer`, `diagnose`, `systematic-debugging`, `refactor-assistant`, `api-designer`, `db-schema-designer`, `migration-generator`.

**Tasks:**
1. `code-reviewer` pass over the 5 heaviest modules; log findings.
2. Decompose `ws/routes.py` into cohesive units (terminal handler, SIEM subscriber, lifecycle, auth) — behavior-preserving refactor with tests first.
3. Audit async correctness: blocking calls in async paths, unclosed Docker/Redis clients, race conditions on session state, Redis key TTLs (the state log already records key-collision bugs — add namespacing + TTL discipline).
4. Validate every API shape is a Pydantic model; standardize error envelopes and status codes (`api-designer`).
5. DB: confirm Alembic migrations match models; add missing indexes (session_id, user_id, created_at); ensure `init_db` only runs in dev/test.
6. Add regression tests for each bug fixed (TDD on fixes).

**Prompt:**
```
Run Phase 1 (Backend Correctness) of the master plan.
1. /code-review at high effort over backend/src/ws/routes.py, siem/engine.py, scenarios/engine.py, scoring/engine.py, ai/monitor.py. Produce a findings list ranked by severity.
2. For each correctness bug, write a failing test first (/tdd), then fix. Focus: async blocking calls, unclosed docker/redis clients, session-state races, Redis key namespacing + TTLs.
3. Refactor ws/routes.py into focused modules (terminal stream, siem subscriber, session lifecycle, auth guard) with NO behavior change; tests must stay green.
4. /api-designer: ensure every request/response is a Pydantic model; unify error envelope {error, detail, code} and HTTP status usage across all routers.
5. Verify Alembic head matches models; add indexes on hot columns; confirm init_db is dev/test-only.
Verify with full pytest + a live curl smoke of auth→session→scenario list. Append CONTINUOUS_STATE.md.
```

**Exit criteria:** pytest green with new regression tests; no module >~400 LOC in the hot path without justification; uniform API contracts.

---

### Phase 2 — Docker, Sandbox & Infrastructure Reliability
**Objective:** Make the stack boot deterministically and the sandbox lifecycle robust.

**Target files:** `docker-compose.yml`, `docker-compose.demo.yml`, `infrastructure/docker/**`, `backend/src/sandbox/manager.py`, `readiness.py`, `container_cleanup.py`, `terminal.py`, `infrastructure/nginx/`, `infrastructure/caddy/Caddyfile`.

**Skills:** `docker-composer`, `dockerfile-builder`, `compose-creator`, `monitoring-setup`.

**Tasks:**
1. Add/verify healthchecks + `depends_on: condition: service_healthy` for postgres, redis, elasticsearch, backend; remove race-prone startup ordering.
2. Pin all image tags by digest where feasible; multi-stage + non-root users in backend/frontend Dockerfiles; `.dockerignore` review.
3. Sandbox manager: enforce CPU/mem limits, `--cap-drop ALL` + minimal caps, `no-new-privileges`, read-only rootfs where possible, auto-reap orphaned containers, hard session-count cap (`MAX_CONCURRENT_SESSIONS`).
4. Confirm scenario networks are `internal: true` (verified present) and add an automated test that asserts no scenario container can reach the internet.
5. Make reset deterministic (`down && up` ~8s claim → measure and document real time).
6. Resource budget doc: ES needs ≥2GB; document host minimums and a low-resource profile.

**Prompt:**
```
Run Phase 2 (Docker & Sandbox Reliability) of the master plan.
1. /docker-composer review docker-compose.yml: add healthchecks for postgres/redis/elasticsearch/backend and gate dependents on service_healthy. Pin image tags; verify scenario nets stay internal:true.
2. Harden backend/frontend Dockerfiles: multi-stage, non-root user, .dockerignore, digest pins.
3. Harden backend/src/sandbox/manager.py: cap-drop ALL + no-new-privileges, cpu/mem limits, read-only rootfs where possible, orphan-container reaper, enforce MAX_CONCURRENT_SESSIONS.
4. Add a test that boots a scenario container and asserts it CANNOT reach the internet (network isolation guarantee).
5. Measure real sandbox reset time and document it; document host resource minimums + a low-RAM profile.
Verify: docker compose config --quiet OK; cold `up` reaches all-healthy; isolation test passes. Append CONTINUOUS_STATE.md.
```

**Exit criteria:** Cold boot → all services healthy without manual retries; isolation test green; sandbox can't leak or exhaust the host.

---

### Phase 3 — Security & Isolation Hardening + Threat Model
**Objective:** Treat this like the security product it teaches. Defense-in-depth + a written threat model.

**Target files:** `backend/src/auth/**`, `ai/security.py`, `scenarios/gatekeeper.py`, new `scenarios/scope_enforcer.py`, `ws/routes.py` (authz on WS), `config.py`, `infrastructure/nginx/`.

**Skills:** `security-auditor`, `threat-modeler`, `owasp-checker`, `vuln-scanner`, `secret-scanner`, `dependency-auditor`, `pentest-helper`, `security-policy`.

**Tasks:**
1. `threat-modeler`: produce `docs/SECURITY_THREAT_MODEL.md` (STRIDE over: command proxy, WS auth, AI prompt-injection, container escape, scope abuse).
2. AuthN/Z: JWT expiry/refresh, password hashing review (bcrypt pin noted), per-route role checks, **WebSocket authentication on connect** (verify token before attaching to a container).
3. Implement **`scope_enforcer.py`** (F8): server-side allow/deny of command targets so a student can't pivot off the scenario subnet; wire into the command path alongside `gatekeeper.py`.
4. AI safety: harden `ai/security.py` against prompt injection from terminal output; confirm credential redaction tests (`tests/ai/test_credential_redaction.py`) cover real leak vectors; never echo secrets into AI prompts.
5. `owasp-checker` against SC-01 web target surface (intended-vuln vs accidental-vuln separation) and against the platform's own API.
6. Rate limiting on auth + AI endpoints; CORS tightened from `config.py`; security headers via nginx/Caddy.
7. `dependency-auditor` + `vuln-scanner` → patch criticals.

**Prompt:**
```
Run Phase 3 (Security Hardening) of the master plan.
1. /threat-modeler: write docs/SECURITY_THREAT_MODEL.md using STRIDE for command proxy, WS auth, AI prompt-injection, container escape, and scope abuse.
2. Enforce JWT verification on BOTH WebSocket routes before container attach; add refresh/expiry; per-route RBAC.
3. Create backend/src/scenarios/scope_enforcer.py: deny commands targeting anything outside the active scenario subnet/host allowlist; wire into the command pipeline next to gatekeeper.py; add tests.
4. /owasp-checker the platform's own API surface AND verify SC-01 only exposes INTENDED vulns. Harden backend/src/ai/security.py against prompt injection; extend tests/ai/test_credential_redaction.py.
5. Add rate limiting (auth + AI), tighten CORS via config.py, add security headers in nginx/Caddy.
6. /dependency-auditor + /vuln-scanner: patch all critical/high.
Verify: security tests + full pytest green; document residual risk in the threat model. Append CONTINUOUS_STATE.md.
```

**Exit criteria:** WS routes reject unauthenticated/out-of-scope actions; threat model published; no critical CVEs; prompt-injection & redaction tests pass.

---

### Phase 4 — AI Tutor & System Prompts Overhaul
**Objective:** A reliable, Socratic, non-repetitive, leak-proof, low-latency tutor.

**Target files:** `backend/src/ai/monitor.py`, `context_builder.py`, `debrief_coach.py`, `discovery_tracker.py`, `level_classifier.py`, `ai/routes.py`, `ai-monitor/system_prompt.md`, `openrouter.md`, frontend `components/hints/AiHintPanel.jsx`.

**Skills:** `claude-api` (caching/streaming/tool-use patterns), `brainstorming` (prompt design), `ux-researcher`.

**Tasks:**
1. Rewrite `ai-monitor/system_prompt.md` as the single source of truth: Socratic L1→L3 ladder, hard "never reveal full chain / never print secrets" guardrails, ≤150-token budget, branch-aware context. Version it.
2. Fix repetition (state log shows a recurring "same answer" bug): add response diversity via conversation memory + de-dup, and verify the `reasoning_effort` removal didn't regress quality.
3. Robustness: timeouts, retries with backoff, graceful fallback to local hint trees, cost/latency telemetry; per-session AI call cooldown (`AI_CALL_COOLDOWN_SECONDS`).
4. Context builder: ensure terminal output is **sanitized + truncated** before prompting (ties to Phase 3 injection defense).
5. Frontend: streaming UX in `AiHintPanel.jsx`, loading/error states, "hint level" affordance, penalty transparency.
6. Update `openrouter.md` + all Gemini references (F2) to OpenRouter/DeepSeek.

**Prompt:**
```
Run Phase 4 (AI Tutor & System Prompts) of the master plan.
1. Rewrite ai-monitor/system_prompt.md as the canonical, versioned tutor prompt: Socratic L1->L3, ≤150 tokens, hard guardrails (never full kill-chain, never echo secrets), branch-aware. Reference /claude-api patterns for structure.
2. In backend/src/ai/monitor.py + context_builder.py: kill response repetition (conversation memory + de-dup), add timeouts/retries/backoff, fallback to local hint trees, and emit latency+cost telemetry. Respect AI_CALL_COOLDOWN_SECONDS.
3. Sanitize+truncate terminal output before it enters any prompt (anti prompt-injection).
4. Frontend AiHintPanel.jsx: add streaming, loading/error states, hint-level + penalty transparency.
5. Replace ALL remaining "Gemini" references in docs with OpenRouter/DeepSeek; update openrouter.md.
Verify: tutor returns varied, on-scope, secret-free answers under a scripted 10-question test; pytest green; doc grep for "gemini" returns only historical/archive files. Append CONTINUOUS_STATE.md.
```

**Exit criteria:** 10-question scripted test shows varied, in-scope, secret-free hints; graceful degradation when OpenRouter is down; no "Gemini" in live docs.

---

### Phase 5 — SIEM Feed, Detection Rules & Blue Team Depth
**Objective:** A dense, accurate, MITRE-mapped Blue feed that actually reacts to Red activity.

**Target files:** `backend/src/siem/engine.py`, `command_bridge.py`, `forensics.py`, `response.py`, `siem/rules/`, `siem/events/`, `docs/scenarios/SC-*.yaml` (`soc_detection`), `sandbox/daemon_noise.py`, frontend `components/siem/SiemFeed.jsx`, `ForensicsWorkbench.jsx`, `pages/BlueWorkspace.jsx`.

**Skills:** `log-analyzer`, `threat-modeler`, `monitoring-setup`, `alerting-config`.

**Tasks:**
1. Enrich thin event maps (F5): each scenario phase should emit multiple, distinct, MITRE ATT&CK-tagged events; tune `daemon_noise.py` so signal stands out from noise (realistic false-positive ratio).
2. Verify the documented detection path (Filebeat→ES→Sigma poll every 2s→WS) actually runs, or align docs to the real Redis-pub/sub path — **pick one and make it true** (current docs describe both).
3. Detection rules as data: store Sigma-style rules in `siem/rules/`, test each rule fires on its trigger and stays quiet otherwise.
4. Blue UX: severity coloring, MITRE technique chips, source-IP/host grouping, alert triage workflow (ack/escalate), forensics SQL workbench safety (read-only).
5. Add SIEM dedup tests (exist: `test_siem_dedup.py`) coverage for new events.

**Prompt:**
```
Run Phase 5 (SIEM & Blue Team) of the master plan.
1. /log-analyzer + /threat-modeler: for each scenario phase, expand siem/events maps so Red actions emit MULTIPLE distinct MITRE-ATT&CK-tagged events. Tune sandbox/daemon_noise.py for a realistic signal:noise ratio.
2. Resolve the detection-path contradiction: confirm whether ES+Sigma-poll or Redis pub/sub is the real pipeline, implement ONE end-to-end, and correct docs to match.
3. Move detections into siem/rules as data; add a test per rule (fires on trigger, silent otherwise). Extend test_siem_dedup + test_siem_rule_engine.
4. Frontend SiemFeed.jsx/ForensicsWorkbench.jsx: severity colors, MITRE chips, group-by source/host, ack/escalate triage, read-only forensic SQL.
Verify: a scripted SC-01 recon→exploit run produces a dense, correctly-tagged Blue feed within 3s; rule tests green. Append CONTINUOUS_STATE.md.
```

**Exit criteria:** Live Red run yields a rich, MITRE-tagged Blue feed; one true detection pipeline; per-rule tests green.

---

### Phase 6 — Scenarios / Machines / Kill-Chain Realism
**Objective:** SC-01..03 are polished and verifiable end-to-end; SC-04/05 either finished or formally descoped (no half-built dead weight).

**Target files:** `infrastructure/docker/scenarios/sc01..03/**`, `docs/scenarios/SC-*.yaml`, `backend/src/scenarios/{loader,engine,branching,gatekeeper,randomizer}.py`, `scenarios/hints/sc0X_hints.json`, frontend `components/killchain/KillChainView.jsx`, `methodology/PhaseTrail.jsx`.

**Skills:** `make-scenario`, `scaffold-exercises`, `pentest-helper`, `tutorial-builder`.

**Tasks:**
1. For each of SC-01/02/03: run the **full intended kill chain** in the live sandbox and capture a transcript + expected SIEM + expected score. Fix any phase that can't be completed.
2. Verify PTES/kill-chain gating (`gatekeeper.py` + `branching.py`) matches each scenario's real path; phase trail and KillChainView must reflect true progress.
3. Randomizer (`randomizer.py`): ensure flags/IPs/creds randomize per session without breaking hints or detections.
4. **Decision on SC-04/05 (F4):** either (a) build YAML + Docker infra + thicken events to fully launch, or (b) hide them from the catalog and mark "planned" in one place. Default recommendation: **descope cleanly now, schedule full build as Phase 6b** so the demo set is rock-solid.
5. Each scenario gets a one-page instructor brief + student objectives (`docs/scenarios/`), wired to `RoeBriefing.jsx`.

**Prompt:**
```
Run Phase 6 (Scenario Realism) of the master plan.
1. For SC-01, SC-02, SC-03: launch the profile and execute the full intended kill chain in the live sandbox. Capture a transcript, the resulting SIEM events, and the final score into docs/final-report/scenarios/<sc>-walkthrough.md. Fix any non-completable phase.
2. Verify gatekeeper.py + branching.py gating matches each scenario's real path and that KillChainView.jsx + PhaseTrail.jsx show true progress.
3. Confirm randomizer.py varies flags/IPs/creds per session WITHOUT breaking hints or detections (add a test).
4. SC-04/SC-05 decision: descope cleanly — remove them from the live catalog/loader and mark "planned" in ONE doc (delete dangling half-assets or move under docs/scenarios/planned/). Record the rationale.
5. Write a one-page instructor brief + student objectives per scenario; wire to RoeBriefing.jsx.
Verify: three scenarios complete end-to-end with captured evidence; catalog shows only launchable scenarios. Append CONTINUOUS_STATE.md.
```

**Exit criteria:** Three scenarios fully completable with captured walkthroughs; no half-built scenarios reachable by users.

---

### Phase 7 — Kali Terminal & WebSocket Reliability (closes F1)
**Objective:** Production-grade terminal: survives refresh, reconnects, no lost sessions, clean PTY.

**Target files:** `backend/src/ws/routes.py`, `sandbox/terminal.py`, `sandbox/readiness.py`, frontend `hooks/useWebSocket.js`, `hooks/useTerminal.js`, `components/terminal/Terminal.jsx`, `ConnectionPill.jsx`.

**Skills:** `diagnose`, `systematic-debugging`, `react-best-practices`, `webapp-testing`.

**Tasks:**
1. **Implement reconnect/reattach (F1):** server keeps the PTY/exec session keyed by `session_id` with a grace window; client auto-reconnects with backoff and replays scrollback so a refresh resumes the same shell.
2. Heartbeat/ping-pong + connection state machine in `useWebSocket.js`; surface state in `ConnectionPill.jsx`.
3. PTY correctness: resize propagation (xterm `cols/rows` → exec), control sequences, UTF-8, paste, copy-all; backpressure on large output.
4. Per `CLAUDE.md`: never store full terminal output in Postgres — only command + metadata; verify this holds in the new code.
5. E2E (Playwright): launch → type command → refresh page → confirm session resumes and output continues.

**Prompt:**
```
Run Phase 7 (Terminal & WebSocket Reliability) of the master plan. This closes the HIGH-severity Phase-16 gap.
1. Server: in ws/routes.py + sandbox/terminal.py, keep the Docker exec/PTY session alive keyed by session_id with a grace window after disconnect; support reattach + scrollback replay.
2. Client: in useWebSocket.js add a connection state machine with heartbeat ping/pong + exponential-backoff reconnect; reflect state in ConnectionPill.jsx; reattach restores the same shell.
3. Fix PTY resize (xterm cols/rows -> exec), UTF-8, paste, copy-all, and add output backpressure.
4. Confirm only command+metadata is persisted (never full output).
5. Add a Playwright e2e: launch SC-01 -> run a command -> reload page -> assert the SAME session resumes and new output streams.
Verify: e2e passes; manual refresh keeps the shell; pytest green. Append CONTINUOUS_STATE.md.
```

**Exit criteria:** Page refresh resumes the live shell (e2e proven); resize/paste/UTF-8 correct; no DB output bloat.

---

### Phase 8 — Frontend, UI/UX, Accessibility & Design System
**Objective:** Cohesive, professional, accessible, fast UI across both workspaces.

**Target files:** `frontend/src/**` — `styles/v3-design.css`, `index.css`, `components/ui/**`, all pages, `store/**`.

**Skills:** `frontend-design`, `react-best-practices`, `design-system`, `accessibility-checker`, `web-design-guidelines`, `theme-factory`, `color-palette`, `typography-guide`, `ux-researcher`, `composition-patterns`.

**Tasks:**
1. `design-system`: consolidate tokens (color/spacing/type) into `ui/` + Tailwind config; eliminate ad-hoc colors (grep shows mixed `slate-*`/`gray-*`/custom `cs-*`). One token system.
2. `accessibility-checker`: WCAG 2.2 AA — contrast, focus rings, keyboard nav for terminal/SIEM/notes, ARIA on live regions (SIEM feed is a live region), reduced-motion for canvas/particles.
3. React health (`react-best-practices`, `composition-patterns`): split `SiemFeed.jsx` (541), `useTerminal.js` (454), `Debrief.jsx`; memoization for high-frequency WS updates; error boundaries everywhere (some exist).
4. UX flows (`ux-researcher`): first-run onboarding, empty/loading/error states, command palette discoverability, responsive down to laptop 1366px.
5. Performance: code-split routes, lazy-load Three.js/particles, measure bundle, target <250KB initial JS gz.

**Prompt:**
```
Run Phase 8 (Frontend, UI/UX, Accessibility) of the master plan.
1. /design-system: unify color/spacing/type tokens across frontend/src/styles + tailwind config; remove ad-hoc slate/gray/custom mixing into one token set.
2. /accessibility-checker: bring both workspaces to WCAG 2.2 AA — contrast, visible focus, full keyboard nav (terminal, SIEM, notes), ARIA live-region on the SIEM feed, prefers-reduced-motion for canvas/particles.
3. /react-best-practices + /composition-patterns: decompose SiemFeed.jsx, useTerminal.js, Debrief.jsx; memoize high-frequency WS render paths; ensure error boundaries cover every route.
4. /ux-researcher: tighten onboarding, empty/loading/error states, command-palette discoverability; verify responsive at 1366px.
5. Performance: route code-splitting, lazy-load Three.js/particles; report initial JS gz size and drive it under 250KB.
Verify: npm run build green, Lighthouse a11y >= 95, no console errors on either workspace. Append CONTINUOUS_STATE.md.
```

**Exit criteria:** One token system; Lighthouse a11y ≥95; no oversized hot components; bundle within budget.

---

### Phase 9 — Reporting, Debrief, Scoring & Knowledge Layer
**Objective:** Trustworthy scoring + a debrief/report that proves learning, plus an in-app knowledge base.

**Target files:** `backend/src/scoring/{engine,routes}.py`, `reports/{generator,learning_insights,routes}.py`, `ai/debrief_coach.py`, `instructor/analytics.py`, frontend `pages/Debrief.jsx`, `InstructorDashboard.jsx`, `components/killchain/KillChainView.jsx`, `docs/soc/`.

**Skills:** `report-builder`, `data-viz`, `technical-writer`, `pdf`, `curriculum-designer`.

**Tasks:**
1. Scoring transparency: document the rubric (points, hint penalties, time bonus); add tests that scores are deterministic and explainable; show a score breakdown in the debrief.
2. Debrief: kill-chain timeline (Red actions vs Blue detections on a shared axis), per-phase performance, what-was-missed, AI debrief coach Q&A (already present — verify quality + question budget).
3. Exportable report: `report-builder` + `pdf` to generate a per-session PDF (student + instructor versions).
4. Instructor analytics: cohort view, per-student progress, common failure points (`instructor/analytics.py`); KPIs via `kpi-tracker`.
5. Knowledge layer: surface scenario theory, MITRE references, and methodology guidance in-app (`PlaybookViewer.jsx`, `GuidedNotebook.jsx`); link hints → knowledge.

**Prompt:**
```
Run Phase 9 (Reporting, Scoring, Knowledge) of the master plan.
1. Document the scoring rubric and add tests proving scores are deterministic + explainable; render a score breakdown in Debrief.jsx.
2. Verify the kill-chain debrief overlays Red actions vs Blue detections on a shared timeline; add per-phase performance + "what you missed". Confirm AI debrief-coach answer quality and enforce the question budget.
3. /report-builder + /pdf: generate per-session PDF reports (student and instructor variants) from reports/generator.py.
4. Strengthen instructor/analytics.py: cohort + per-student progress + common failure points; expose in InstructorDashboard.jsx.
5. Knowledge layer: wire scenario theory + MITRE refs into PlaybookViewer.jsx/GuidedNotebook.jsx and link hints to it.
Verify: a completed SC-01 session yields a correct score breakdown + a generated PDF + populated instructor analytics. pytest green. Append CONTINUOUS_STATE.md.
```

**Exit criteria:** Explainable scores; dual-axis kill-chain debrief; downloadable PDF; real instructor analytics.

---

### Phase 10 — Testing, QA, CI/CD & Performance
**Objective:** Provable quality gates so future changes can't silently regress.

**Target files:** `backend/tests/**`, `frontend/tests/**`, `.github/workflows/ci.yml`, `backend/tests/load_test.py`.

**Skills:** `tdd`, `webapp-testing`, `qa`, `perf-optimizer`, `ci-cd-builder`, `github-actions`, `verification-before-completion`.

**Tasks:**
1. Coverage: measure backend coverage, target ≥80% on engines (siem, scenarios, scoring, ai, sandbox). Add the missing-path tests `test_coverage_gaps.py` hints at.
2. Frontend tests: component tests for the heavy components; expand Playwright e2e to cover both workspaces + the Phase 7 reconnect path.
3. CI (`ci.yml`): jobs for backend pytest, frontend build+lint+test, `docker compose config`, secret-scan, dependency-audit; fail the build on critical findings.
4. Load test (`load_test.py` / Locust): establish concurrency limits (sessions, WS connections) and document them.
5. `perf-optimizer`: profile the command→SIEM→AI path latency budget; set SLOs (e.g., SIEM event <3s, AI hint <2s).

**Prompt:**
```
Run Phase 10 (Testing, CI/CD, Performance) of the master plan.
1. Measure backend coverage; raise engine modules (siem, scenarios, scoring, ai, sandbox) to >=80%; implement the gaps flagged by test_coverage_gaps.py.
2. Add frontend component tests for the heavy components and extend Playwright e2e to both workspaces + the Phase 7 reconnect flow.
3. Rewrite .github/workflows/ci.yml: parallel jobs for backend pytest, frontend build+lint+test, docker compose config, /secret-scanner, /dependency-auditor; fail on critical findings.
4. Run /perf-optimizer on the command->SIEM->AI path; define SLOs (SIEM<3s, AI hint<2s) and assert them in a test.
5. Run the Locust load_test.py; document max safe concurrent sessions/WS.
Verify: CI green end-to-end on a PR; coverage report attached; SLO test passes. Append CONTINUOUS_STATE.md.
```

**Exit criteria:** CI enforces all gates on PRs; ≥80% engine coverage; documented load limits + SLOs.

---

### Phase 11 — Documentation, Compliance, Auditing & Management
**Objective:** Reviewer-grade docs, compliance posture, and a clean management surface — fixing F2/F3/F6/F10 permanently.

**Target files:** `docs/**`, `README.md`, `CLAUDE.md`, `.env.example`, `MANIFEST.sha256`, `SECURITY.md`.

**Skills:** `technical-writer`, `docs-generator`, `markdown-pro`, `compliance-checker`, `gdpr-helper`, `soc2-helper`, `security-policy`, `graphify`/`concept-mapper`, `to-issues`, `project-planner`.

**Tasks:**
1. Single source of truth: reconcile the completion score (one number, evidence-backed), purge Gemini drift (F2), align `.env.example` ↔ README ↔ code (F3). Maintain a `docs/DOCUMENTATION_INDEX.md` that is actually current.
2. Compliance: `compliance-checker` map to a framework relevant to a teaching tool that stores student data (GDPR for PII via `gdpr-helper`; security policy via `security-policy`). Document data retention (notes, scores, logs).
3. Architecture docs: regenerate diagrams from the real system (`graphify`/Mermaid) — flows for terminal, SIEM, AI, scoring; one canonical `ARCHITECTURE.md`.
4. Auditing: enable structured audit logging (who launched what, when; instructor actions) and document the audit trail.
5. Management: convert this plan's open items into tracked issues (`to-issues`); maintain a KPI/OKR snapshot; keep `CONTINUOUS_STATE.md` rotation policy from Phase 0 enforced.

**Prompt:**
```
Run Phase 11 (Docs, Compliance, Management) of the master plan.
1. /technical-writer: make ONE canonical completion score (evidence-backed), purge every live "Gemini" reference, and align .env.example <-> README <-> code env var names. Rebuild docs/DOCUMENTATION_INDEX.md to match reality.
2. /compliance-checker + /gdpr-helper + /security-policy: document data handling for student PII (notes/scores/logs), retention, and a SECURITY.md disclosure policy.
3. /graphify (or Mermaid): regenerate architecture diagrams from the REAL system (terminal, SIEM, AI, scoring) and fold into one ARCHITECTURE.md.
4. Add structured audit logging for session launches + instructor actions; document the audit trail.
5. /to-issues: file the remaining open items from this plan as tracked issues; capture a KPI snapshot.
Verify: grep for "gemini" in non-archive docs returns nothing; env names match across files; diagrams render; audit log entries appear for a test session. Append CONTINUOUS_STATE.md.
```

**Exit criteria:** No doc drift; compliance + data-handling documented; diagrams reflect reality; audit trail live; open work tracked.

---

### Phase 12 — Scalability, Reliability & Release Readiness
**Objective:** Prove it holds up beyond a single demo laptop, and ship a tagged release.

**Target files:** `docker-compose.yml`, `docker-compose.demo.yml`, `infrastructure/caddy/`, `scripts/demo-*`, `backend/src/main.py` (lifespan/health), monitoring config.

**Skills:** `monitoring-setup`, `alerting-config`, `perf-optimizer`, `kubernetes-helper`/`helm-chart-builder` (optional future), `finishing-a-development-branch`.

**Tasks:**
1. Reliability: graceful shutdown, container reaping on crash, session recovery after backend restart, ES/Redis outage handling (degrade, don't crash).
2. Observability: `monitoring-setup` — health/readiness endpoints, structured logs, metrics (active sessions, WS count, AI latency, SIEM lag); `alerting-config` thresholds.
3. Scalability path: document the single-node limits (from Phase 10 load tests) and a horizontal-scale design (stateless backend + shared Redis/PG + container host pool). Optional: Helm/K8s sketch for future.
4. Release: version bump, `MANIFEST.sha256` regen, CHANGELOG, tagged release, demo rehearsal via `scripts/demo-local-rehearsal.ps1` and `demo-day-check.sh`.

**Prompt:**
```
Run Phase 12 (Scalability & Release) of the master plan.
1. Reliability: add graceful shutdown + crash container reaping; ensure sessions recover after a backend restart and the app DEGRADES (not crashes) when ES/Redis are down. Add tests for each degradation path.
2. /monitoring-setup + /alerting-config: expose metrics (active sessions, WS count, AI latency, SIEM lag) and define alert thresholds; structured JSON logs.
3. Document single-node limits (from Phase 10) and a horizontal-scale design (stateless backend + shared Redis/PG + container-host pool). Optional Helm/K8s sketch.
4. Release: bump version, regenerate MANIFEST.sha256, write CHANGELOG, tag the release, and run scripts/demo-local-rehearsal.ps1 + demo-day-check.sh clean.
Verify: kill Redis mid-session and confirm graceful degradation; metrics endpoint returns live numbers; rehearsal script passes. Append CONTINUOUS_STATE.md.
```

**Exit criteria:** App survives dependency outages; metrics/alerts live; scale design documented; tagged, rehearsed release.

---

## 4. Continuous tracks (run alongside every phase)

- **Security track:** `secret-scanner` + `dependency-auditor` on every branch; never weaken sandbox isolation.
- **State hygiene:** append a When/Who/Why/Where/What+How/Verification entry to `CONTINUOUS_STATE.md` per phase; rotate when it grows past ~2000 lines.
- **Review track:** `/code-review` before each merge; `requesting-code-review` / `receiving-code-review` for non-trivial PRs. For the big cycles, `/code-review ultra` (user-triggered).
- **Verification track:** `verification-before-completion` — no phase closes on a memory of success; only on fresh command output.
- **Parallelism:** once Phase 1–2 land, use `using-git-worktrees` + `dispatching-parallel-agents`/`subagent-driven-development` to run Phases 4, 5, 8 concurrently (they touch mostly disjoint files).

---

## 5. Definition of Done (whole program)

- [ ] Cold `docker compose up` → all services healthy, no manual retries.
- [ ] SC-01/02/03 each completable end-to-end with captured evidence.
- [ ] Terminal survives page refresh (reconnect proven by e2e).
- [ ] Blue SIEM feed is dense, MITRE-tagged, reacts <3s to Red actions.
- [ ] AI tutor: Socratic, varied, secret-free, degrades gracefully.
- [ ] Scope enforced server-side; WS authenticated; no critical CVEs; threat model published.
- [ ] Scores explainable; debrief dual-axis; PDF export; instructor analytics real.
- [ ] WCAG 2.2 AA; one design-token system; bundle within budget.
- [ ] CI enforces pytest + build + compose + secret/dep scans on every PR; ≥80% engine coverage.
- [ ] Zero doc drift (no "Gemini"; one completion score; env names aligned); diagrams match reality; audit trail live.
- [ ] Graceful degradation on dependency outage; metrics/alerts; tagged release + clean rehearsal.

---

## 6. Risk register

| Risk | Mitigation |
|---|---|
| Kali/ES image size & RAM make full local boot slow | Low-resource profile (Phase 2); document host minimums; cache images. |
| Refactors regress passing tests | TDD-first on every fix (Phase 1/7); CI gate (Phase 10). |
| SC-04/05 scope creep delays the solid core | Descope cleanly in Phase 6; revisit as 6b only after 0–12 are green. |
| AI provider outage during demo | Local hint-tree fallback (Phase 4); rehearsal check (Phase 12). |
| `CONTINUOUS_STATE.md` keeps ballooning | Rotation policy enforced from Phase 0 onward. |
| Parallel agents collide on shared files | Worktrees + disjoint-file assignment (§4). |

---

*This plan is the execution contract for the enhancement cycle. Update the checkboxes in §5 as phases close; record the "why/what/how" of each change in `CONTINUOUS_STATE.md`.*

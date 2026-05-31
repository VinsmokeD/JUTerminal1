# CyberSim — CONTINUE HERE (project state + next-phase prompts)

**Updated:** 2026-05-31 — WS3–WS9 complete (Agent 2). Awaiting WS10 final verification gate.  
**Active plan:** [`docs/architecture/MASTER_FINALIZATION_PLAN.md`](docs/architecture/MASTER_FINALIZATION_PLAN.md) — this supersedes the phase prompts below.  
**Branch:** all work is on `master` (pushed to `origin/master`, GitHub `VinsmokeD/JUTerminal1`).

**To resume:** read `MASTER_FINALIZATION_PLAN.md` §1 execution map. WS0–WS9 are done. Next: **WS10** (final verification gate — both Agent 1 and Agent 2 must signal done first).

**Original written:** 2026-05-29 by Claude Code, after 24 verified commits.  
**You start cold** (a fresh chat has no memory of prior sessions). Read this file fully before doing anything.

**To resume in a new chat:** say *"Read CONTINUE_HERE.md, then continue from Phase &lt;X&gt;"* (next unstarted phase is **E**). Then follow the Operating Protocol (§4) for every change. Also read the files in §1.

---

## 0. What CyberSim is (30-second version)
A dual-perspective cybersecurity training platform. React (Vite) frontend → FastAPI backend → isolated Docker scenario containers. Students play **Red Team** (Kali terminal via WebSocket→Docker exec) and **Blue Team** (live SIEM feed). An **AI tutor** (OpenRouter/DeepSeek) gives Socratic hints. Exactly **three scenarios**: SC-01 (NovaMed web), SC-02 (Nexora AD), SC-03 (Orion phishing). **There will be no SC-04/05 ever** — the owner removed them on purpose.

Repo root: `C:\Users\mmjal\Documents\JUTerminal1`. Stack runs via `docker compose`.

---

## 1. CRITICAL — read these before editing (project law)
1. `CLAUDE.md` (root) — project rules. Highlights: verify empirically (no hallucinated completion), update `docs/architecture/CONTINUOUS_STATE.md` after every change, never hardcode credentials, keep scenario networks internet-isolated, never store full terminal output in Postgres.
2. `docs/architecture/MASTER_ENHANCEMENT_PLAN.md` — the 13-phase master plan (findings F1–F10, phase definitions). **NOTE: several findings in it are already RESOLVED or were STALE — see §3 below before acting on any finding.**
3. `docs/architecture/BASELINE_2026-05-29.md` — measured baseline + contract findings C1–C6 (C2/C4/C5/C6 are RESOLVED).
4. `docs/architecture/CONTINUOUS_STATE.md` — the rolling work log. **Read the tail** (it is rotated; full history is in `docs/history/`). Append an entry after every change.
5. `docs/SECURITY_THREAT_MODEL.md` — STRIDE model + residual risks R1–R6 (your security backlog).
6. `docs/SCORING.md`, `docs/final-report/evidence/LIVE_VERIFICATION_2026-05-29.md` — current behavior + proof.

---

## 2. THE #1 LESSON (do not skip)
**The repo's own audit docs systematically OVERSTATE gaps.** Multiple "HIGH severity / not implemented" findings turned out to be already built. Examples proven this session:
- F1 "terminal reconnect missing" → **already implemented** (backend `_send_reconnect_history` + frontend exponential-backoff reconnect).
- F4 "SC-04/05 half-built" → **fully removed**.
- F5 "thin SC-03 SIEM" → SC-03 is the **richest** map (27 events / 16 ATT&CK techniques).
- The "AI tutor works" claim → it was **silently dead** (placeholder key + a non-existent model) until verified live.

**Therefore: before you "fix" anything, verify the actual current behavior empirically** (read the code, run it live, curl it). Do not act on a doc claim alone. Empirical verification is how the real bugs were found.

---

## 3. CURRENT STATE — what is already DONE (do NOT redo)
29 commits on `master` (latest first): **Phase D: mypy 54→0 errors, now a CI gate** · **Phase C: ESLint gate + 27 tests + CSP-Report-Only** · **Phase B: sandbox cap-drop hardening (R3 partial)** · Kali image built → REAL terminal (Phase A) · CONTINUE_HERE doc · ResizeObserver popup fix · SC-04/05 removal · pre-commit hooks · nginx security headers · configurable admin creds · SIEM/evidence verification · scoring double-count fix · black + black-CI-gate · STRIDE threat model · `scope_enforcer.py` ROE gate · hermetic CI · AI-safety regression tests · backend healthcheck/nginx gating + isolation verifier · AI verified live · Gemini→OpenRouter purge + model fix · reconnect characterization test · pytest pin fix · API 307 fix · pytest-asyncio loop fix · Phase-0 baseline/hygiene.

**Verified-good right now (do not "fix" these):**
- **Kali terminal is REAL** — `cybersim-kali:latest` (9.1GB) built + verified (whoami=student, nmap 7.99, reaches SC-01 target, internet blocked). The Kali run is already hardened (cap_drop ALL, no-new-privileges, non-root). On a fresh machine: `docker build -t cybersim-kali:latest infrastructure/docker/kali`.
- Test suite: **331 passing** (`pytest --ignore=tests/e2e`). CI is real (no false-green).
- Backend + frontend images build clean; stack healthy; readiness all-green incl. OpenRouter (the owner set a real API key — it works, model `deepseek/deepseek-chat-v3-0324`).
- Network isolation proven (6/6 scenario containers internet-blocked) — guard script `scripts/verify-network-isolation.sh`.
- AI tutor: live + adversarial-safe (OWASP-LLM-Top-10 defense in `backend/src/ai/security.py`, wired into `monitor.py`).
- ROE scope gate live (`backend/src/scenarios/scope_enforcer.py`).
- Scoring is correct + documented (`docs/SCORING.md`).
- Catalog is exactly SC-01/02/03. Tutor prompt never mentions other scenarios.
- Black is a blocking CI gate; the tree is black-clean. Pre-commit config exists.

**Kali image: BUILT + verified 2026-05-29** (`cybersim-kali:latest`, 9.1GB). Real terminal works (whoami=student, nmap 7.99, reaches SC-01 target 172.20.1.20 → HTTP 200, internet BLOCKED). **Phase A is DONE.** On a fresh machine, rebuild it: `docker build -t cybersim-kali:latest infrastructure/docker/kali`.

**Phase B (2026-05-30) DONE**: sc01-db `no-new-privileges`; sc01-webapp + sc01-waf + sc03-phish `cap_drop ALL` + minimal caps. sc01-php/sc02-dc/sc02-fileserver/sc03-mailrelay/sc03-victim fail-open (documented rationale). 9/9 scenario containers internet-blocked; 331 tests pass.

**Phase C (2026-05-30) DONE**: ESLint clean + CI gate; 27 Vitest component tests; CSP-Report-Only in nginx; backend 331 tests unaffected.

**Phase D (2026-05-30) DONE**: mypy went from 54 errors to 0 across 58 source files. mypy is now a blocking CI gate. pytest still 331, black still clean.

---

## 4. OPERATING PROTOCOL — follow this EVERY phase (non-negotiable)
**Environment / how to run things (these exact gotchas waste hours if missed):**
- Backend tests run from `backend/`. They need a running Postgres + Redis. The stack provides them (`docker compose up -d`). `conftest.py` reads **`TEST_POSTGRES_URL`/`TEST_REDIS_URL`** (these override the defaults). Run tests like:
  ```bash
  docker compose exec -T redis redis-cli -n 1 FLUSHDB   # clear test-Redis state/rate-limits first
  cd backend
  TEST_POSTGRES_URL="postgresql+asyncpg://cybersim:cybersim@127.0.0.1:5432/cybersim" \
  TEST_REDIS_URL="redis://127.0.0.1:6379/1" \
  python -m pytest --ignore=tests/e2e -p no:cacheprovider -q
  ```
  Expect **331 passed**. If you see `429 Too Many Requests` in test setup, you forgot the Redis FLUSHDB (auth rate-limit contamination). If you see `asyncpg InvalidPasswordError`, your DB URL/creds are wrong.
- Use a venv: `python -m venv .venv && .venv/Scripts/python -m pip install -r requirements.txt` (Windows host is Python 3.12; the container is 3.11 — pins: `pytest==8.4.2`, `pytest-asyncio==1.4.0`).
- **After editing `backend/src/**`:** `docker compose build backend && docker compose up -d --force-recreate --no-deps backend`, then poll `curl http://localhost/health` for `{"status":"ok"...}` (it takes ~5–10s; nginx may 502 briefly during boot — that's the lifespan, wait).
- **After editing `frontend/src/**`:** `docker compose build frontend && docker compose up -d --force-recreate --no-deps frontend` (the frontend is a static Vite build — a restart alone does NOT pick up source changes). Verify `curl -s http://localhost:3000/` → 200.
- **`ai-monitor/system_prompt.md` is bind-mounted** → just `docker compose restart backend` to reload it.
- **Black is a CI gate.** Before committing backend Python: `cd backend && python -m black src/ tests/` then `python -m black --check src/ tests/` must exit 0.
- Compose validity: `docker compose -f docker-compose.yml config --quiet` must exit 0.

**Process (every phase):**
1. Verify the current behavior FIRST (per §2). Confirm the thing you're about to change is actually broken/missing.
2. Work on `master` (or a short-lived branch you fast-forward back). Small, focused commits.
3. **Write/extend tests** for anything you change. Hot/untested modules (e.g. `ws/routes.py`) need a characterization test BEFORE refactoring.
4. **Verify empirically**: pytest green, image rebuilds, live curl/behavior check. NEVER claim done from memory.
5. **Append to `docs/architecture/CONTINUOUS_STATE.md`**: a dated entry with Status / Why / Where (files) / What+How / Verification. Keep it concise; if the file exceeds ~2000 lines, rotate the old part into `docs/history/`.
6. **Commit** (conventional commits: `feat/fix/docs/chore/test/style/ci`). End every commit message with:
   ```
   Co-Authored-By: <your agent name> <noreply@example.com>
   ```
7. Push to `origin master` when the owner asks (or when a coherent unit is done + verified).
8. **NEVER** add SC-04/SC-05 or any new scenario. **NEVER** weaken network isolation. **NEVER** commit real secrets (`.env` is gitignored; `.env.example` uses placeholders).

---

## 5. THE PHASES (priority order). Each block below is a ready-to-paste prompt.

> Pick the next unstarted phase, paste its prompt, and execute it under the Operating Protocol (§4). Phases A–C are highest value for the owner's manual browser testing. Do them in order; D–I can follow.

---

### PHASE A — Build the Kali image so the terminal is REAL (not mock) — ✅ DONE 2026-05-29
> Image built + verified (real whoami/nmap, reaches targets, internet-blocked). Only re-run on a fresh machine. Prompt kept for reference:
```
TASK: Make the Red Team terminal execute real commands in a Kali sandbox instead of mock mode.

CONTEXT: `cybersim-kali:latest` is not built, so backend/src/sandbox/manager.py falls back to a mock container ("mock-..."). The owner wants to test the real terminal.

STEPS:
1. Read backend/src/sandbox/manager.py and infrastructure/docker/kali/ (Dockerfile + any provisioning). Understand how KALI_IMAGE is used (ensure_scenario_container) and what network/caps the Kali container needs.
2. Build the Kali image: `docker build -t cybersim-kali:latest infrastructure/docker/kali` (or the compose service if one exists — check docker-compose.yml for a kali build target/profile). This is a large download (~4GB, 5–15 min) — run it in the background and monitor.
3. Start the SC-01 profile: `docker compose --profile sc01 up -d`. Confirm sc01-db/php/webapp/waf are healthy.
4. VERIFY LIVE: login (admin / CyberSimAdmin!), start an SC-01 red session via the API, attach the terminal WebSocket, run a benign recon command (e.g. `whoami`, `ip a`, `curl http://172.20.1.20/`). Confirm REAL output returns (not a mock banner). Confirm a SIEM event still appears on the Blue side and the AI tutor responds.
5. Re-run scripts/verify-network-isolation.sh → the kali + target containers must still be internet-isolated (6/6+ blocked). The Kali container is on the scenario net and MUST NOT reach the internet.
6. Document in README/docs/GETTING_STARTED the exact build command + time, so the next person knows. Update CONTINUOUS_STATE.md.

GATE: real `whoami`/`curl` output in the terminal; isolation script still passes; pytest still 331.
```

---

### PHASE B — Sandbox container hardening (threat-model R3) — DO THIS CAREFULLY
```
TASK: Harden scenario/Kali containers with least-privilege without breaking any scenario.

CONTEXT: docs/SECURITY_THREAT_MODEL.md R3 — scenario containers run without cap-drop / no-new-privileges. Risk: a container breakout. BUT the AD (SC-02 Samba) and Kali (raw-socket nmap) containers need SOME capabilities — blind cap-drop WILL break them. This is why it was deferred. Go scenario-by-scenario.

STEPS:
1. For the backend sandbox manager (backend/src/sandbox/manager.py) and docker-compose.yml scenario services, add, INCREMENTALLY and TESTING EACH:
   - `security_opt: ["no-new-privileges:true"]` (safe almost everywhere — add first, test all 3 scenarios).
   - `cap_drop: ["ALL"]` then `cap_add` ONLY what each container proves it needs (e.g. Kali nmap raw scans need NET_RAW/NET_ADMIN; Samba AD needs more). Add caps back one at a time until the scenario's kill chain works.
   - read-only rootfs + tmpfs for writable paths ONLY where the container tolerates it (test; many won't).
2. After EACH change, run the relevant scenario end-to-end (start profile, run the kill chain, confirm targets respond and the terminal works). If a scenario breaks, revert that specific hardening for that container and document WHY in the threat model.
3. Keep the backend's own docker.sock mount read-only (it already is). Do NOT attempt R1 (docker.sock broker) here — that's a separate architecture project; just note it.

GATE: all 3 scenarios still complete their kill chains; isolation script passes; pytest 331. Update docs/SECURITY_THREAT_MODEL.md R3 with exactly which caps each container retains and why. Update CONTINUOUS_STATE.md.
SAFETY: if unsure whether a cap is needed, KEEP it (fail-open) and note it — a broken scenario is worse than one extra capability.
```

---

### PHASE C — Frontend quality: lint clean → gate, component tests, a11y, CSP
```
TASK: Raise frontend quality so ESLint can become a CI gate (like black), add tests, fix accessibility, and add a Content-Security-Policy.

CONTEXT: frontend/ has eslint.config.js; `npm run lint` is currently ADVISORY in CI (.github/workflows/ci.yml) because it isn't clean. No component tests exist. nginx already sets X-Frame-Options/nosniff/Referrer-Policy/Permissions-Policy but NOT CSP (deferred pending browser validation).

STEPS:
1. `cd frontend && npm ci`. Run `npm run lint` — fix every error (unused vars, missing hook deps, etc.) WITHOUT changing behavior. Re-run until clean. Then flip the ESLint step in .github/workflows/ci.yml from advisory (continue-on-error) to a GATE (mirror how black was done).
2. Add a test runner (Vitest + @testing-library/react) and write component tests for the heaviest/most critical components: components/siem/SiemFeed.jsx, components/terminal/Terminal.jsx, hooks/useWebSocket.js (reconnect/backoff), workspace/ResizableSplit.jsx. Add `"test": "vitest run"` to package.json and a CI job/step.
3. Accessibility (WCAG 2.2 AA): run an audit (axe) on the dashboard + Red + Blue workspaces. Fix contrast, focus-visible, keyboard nav (terminal/SIEM/notes reachable), and add an ARIA live-region on the SIEM feed (it streams). Respect prefers-reduced-motion for the canvas/particles (components/canvas/*).
4. Add a Content-Security-Policy header in infrastructure/nginx/nginx.conf. Build it conservatively and TEST IN A BROWSER: it must allow the Vite assets, the WebSocket (ws://wss: connect-src), xterm inline styles (style-src 'unsafe-inline' is acceptable), and data: images. If anything breaks (blank page, no terminal, no WS), loosen the offending directive. Verify the app fully works after adding it.
5. Rebuild the frontend image after changes; hard-verify in a browser (no console errors, terminal works, SIEM streams, WS reconnects on refresh).

GATE: `npm run lint` exits 0 and is a CI gate; component tests pass in CI; Lighthouse a11y >= 95 on both workspaces; CSP present AND the app fully works (terminal, SIEM, WS, AI tutor) in a real browser. Update CONTINUOUS_STATE.md.
WARNING: CSP can break the SPA. Validate in a browser, not just curl. If you cannot browser-test, ship CSP in Report-Only mode (Content-Security-Policy-Report-Only) instead of enforcing.
```

---

### PHASE D — mypy type-safety pass (make types a gate)
```
TASK: Drive `mypy src/ --ignore-missing-imports` to zero errors and promote it to a CI gate.

CONTEXT: `cd backend && python -m mypy src/ --ignore-missing-imports` reports ~65 errors across ~21 files. mypy is ADVISORY in CI. Some "fixes" can change behavior — be careful.

STEPS:
1. Run mypy, triage errors by file. Fix in small batches (3–5 files), running the FULL pytest suite after EACH batch (type fixes must not change runtime behavior). Prefer adding correct type hints / `Optional[...]` / overload-correct calls; use `# type: ignore[code]` ONLY with a one-line justification when a fix would be risky or is a library-stub gap.
2. Known starting points: ws/routes.py:~640 (dict.get overload), ws/routes.py:~909 (await of Awaitable|int). Read the code to fix correctly, not just silence.
3. When mypy is clean, flip the mypy step in .github/workflows/ci.yml from advisory to a GATE (like black).

GATE: `mypy src/ --ignore-missing-imports` exits 0; pytest still 331 (unchanged behavior); mypy is a CI gate. Update CONTINUOUS_STATE.md. Do NOT lower runtime behavior to satisfy the type checker.
```

---

### PHASE E — Coverage honesty + raise engine coverage (Phase 10)
```
TASK: Make code coverage truthful, then raise it on the core engines.

CONTEXT: backend/pyproject.toml [tool.coverage.run].omit EXCLUDES almost every important module (ws/routes, siem/engine, scenarios/*, sandbox/*, ai/*, etc.) — so any coverage % is vanity. Tests exist but the number is meaningless.

STEPS:
1. Remove (or drastically shrink) the `omit` list in pyproject.toml so coverage reflects reality. Run `python -m pytest --ignore=tests/e2e --cov=src --cov-report=term-missing` and record the HONEST baseline number in CONTINUOUS_STATE.md and BASELINE.
2. Raise coverage on the engines that matter to >=80% by adding focused unit tests (pure-function-first): scenarios/engine.py, scenarios/gatekeeper.py, scenarios/branching.py, siem/engine.py, siem/command_bridge.py, scoring (done), scope_enforcer (done). Docker-coupled modules (sandbox/*) and ws/routes.py can stay lower but should have at least characterization tests around the hot paths.
3. Add a coverage threshold to CI (e.g. --cov-fail-under=<honest_floor>) and raise it over time.

GATE: omit list gone; honest coverage reported in CI; engine modules >=80%; pytest green. Update CONTINUOUS_STATE.md.
```

---

### PHASE F — Reliability, graceful degradation & observability (Phase 12)
```
TASK: Make the platform survive dependency outages and expose operational metrics.

STEPS:
1. Degradation: verify + harden behavior when Redis or Elasticsearch is down. The app must DEGRADE, not crash. Test each: stop redis (`docker compose stop redis`), hit the app, confirm it returns sensible errors / static fallback (the AI already falls back; verify sessions/SIEM degrade gracefully), then restart. Add a test per degradation path (mock the outage at the cache/db layer).
2. Graceful shutdown + crash recovery: confirm sessions recover after `docker compose restart backend` (the WS reconnect + history replay already exist — verify). Confirm orphaned scenario containers get reaped (sandbox/container_cleanup.py).
3. Observability: add a metrics endpoint (active sessions, WS connection count, AI call latency, SIEM lag) — extend the existing /api/health/readiness pattern or add /api/metrics. Structured JSON logs. Optionally wire a basic monitoring/alerting config.
4. Document single-node limits (run backend/tests/load_test.py with Locust against the stack) and a horizontal-scale sketch (stateless backend + shared Redis/PG + container-host pool).

GATE: kill Redis mid-session → app degrades (doesn't 500-crash) and recovers on restart (proven live + a test); metrics endpoint returns live numbers; load limits documented. Update CONTINUOUS_STATE.md.
```

---

### PHASE G — Scenario kill-chain walkthroughs as demo evidence (Phase 6)
```
TASK: Prove each scenario completes end-to-end and capture examiner-ready evidence. (Best done AFTER Phase A so the terminal is real.)

STEPS:
1. For SC-01, SC-02, SC-03: start the profile, log in, and execute the FULL intended kill chain through the real terminal (recon → exploit → loot per the scenario YAML in docs/scenarios/). Capture: the command transcript, the resulting SIEM events (Blue feed), phase advancement, and the final score/debrief.
2. Save each walkthrough to docs/final-report/scenarios/<sc>-walkthrough.md with real output. Fix any phase that cannot be completed (gatekeeper/branching/randomizer bugs).
3. Confirm the kill-chain UI (components/killchain/KillChainView.jsx) and PhaseTrail reflect true progress, and randomizer.py varies flags/IPs per session without breaking hints or detections.

GATE: three scenarios complete with captured evidence; gating matches each scenario's real path; pytest green. Update CONTINUOUS_STATE.md.
```

---

### PHASE H — Documentation truth pass + (optional) historical SC-04/05 purge
```
TASK: Make all reviewer-facing docs reflect the real, current, hardened state — and optionally scrub SC-04/05 from historical docs if the owner wants.

STEPS:
1. Reconcile the project score: README says "95/100", docs/ROADMAP.md says "78/100". Pick ONE evidence-based figure, cite docs/final-report/evidence/LIVE_VERIFICATION_2026-05-29.md, and make both files consistent.
2. Update docs/architecture/MASTER_ENHANCEMENT_PLAN.md findings table: mark F2/F4/F5/F8/C2/C4/C5/C6 RESOLVED with the commit refs (so the plan stops listing fixed/stale items as open).
3. Regenerate the architecture diagram(s) from the REAL system (terminal, SIEM, AI, scoring, scope gate) and fold into one canonical docs/ARCHITECTURE.md.
4. OPTIONAL (ask the owner first): the owner removed SC-04/05 from the product. ~17 DATED historical reports (docs/reports/*, docs/architecture/CURRENT_STATUS_REPORT.md, docs/final-report/*, etc.) still mention SC-04/05 as historical records. If the owner wants history scrubbed too, remove/neutralize those mentions; otherwise leave them as dated archives. Do NOT touch docs/history/ (immutable rotation archive).

GATE: one consistent score; findings table accurate; diagrams match reality. Update CONTINUOUS_STATE.md.
```

---

### PHASE I — Backend correctness deep pass (Phase 1 remainder, lower priority)
```
TASK: Decompose and async-audit the hottest module safely.

CONTEXT: backend/src/ws/routes.py is ~960 lines and concentrates the command pipeline, SIEM subscriber, readiness loop, hint logic, and the WS endpoint. It is correct and live-verified, so this is REFACTOR-FOR-MAINTAINABILITY, not a bug hunt — and it is risky because the file is under-tested.

STEPS:
1. FIRST add characterization tests around the hot paths (command handling, gate/scope/hint flows, reconnect) so behavior is locked. The existing test_ws_integration.py + test_command_siem_bridge.py + the reconnect characterization test are a starting point — expand them.
2. THEN extract cohesive units into modules (e.g. ws/command_pipeline.py for the already-parameterized _handle_terminal_command, ws/hint_service.py, ws/session_runtime.py) with NO behavior change. Run the full suite after each extraction — it must stay green.
3. Async-correctness audit: unclosed clients, blocking calls in async paths, Redis key namespacing/TTL consistency (mix of `cybersim:`-prefixed and bare keys). Fix with tests.

GATE: pytest green throughout; no behavior change; ws/routes.py meaningfully smaller; backend image rebuilds + live smoke passes. Update CONTINUOUS_STATE.md.
```

---

## 6. Quick reference — verification commands
```bash
# Stack up + health
docker compose up -d
curl -s http://localhost/api/health/readiness | python -m json.tool   # expect all "ok"

# Full backend test suite (331 expected)
docker compose exec -T redis redis-cli -n 1 FLUSHDB
cd backend && TEST_POSTGRES_URL="postgresql+asyncpg://cybersim:cybersim@127.0.0.1:5432/cybersim" \
  TEST_REDIS_URL="redis://127.0.0.1:6379/1" python -m pytest --ignore=tests/e2e -p no:cacheprovider -q

# Formatting gate
cd backend && python -m black --check src/ tests/

# Compose + isolation
docker compose -f docker-compose.yml config --quiet
bash scripts/verify-network-isolation.sh      # start a scenario profile first

# Rebuild + redeploy after src changes
docker compose build backend  && docker compose up -d --force-recreate --no-deps backend
docker compose build frontend && docker compose up -d --force-recreate --no-deps frontend
docker compose restart backend                # reload ai-monitor/system_prompt.md (bind-mounted)

# Frontend (Phase C)
cd frontend && npm ci && npm run lint && npm run build
```

## 7. Hard rules (repeat — these are how things broke before)
- **Verify before claiming done.** Run it. Curl it. Rebuild the image (host-only verification missed a build-breaking pin once).
- **Rebuild the right thing:** backend changes → rebuild backend image; frontend changes → rebuild frontend image (static build); AI prompt → restart backend.
- **Flush test-Redis (db 1)** before pytest or you'll hit phantom 429s.
- **Never** add scenarios, weaken isolation, commit secrets, or trust a stale audit doc over the live code.
- **Always** update `docs/architecture/CONTINUOUS_STATE.md` and use conventional commits.

— End of handoff. Start with Phase A.

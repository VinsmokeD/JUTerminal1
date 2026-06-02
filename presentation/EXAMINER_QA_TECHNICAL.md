# Parallax — Examiner Q&A: Full Technical Defense

> Companion to `EXAMINER_QA_SECURITY.md` (auth/crypto). This sheet covers **all
> the technical stuff**: architecture, frontend, backend, real-time, AI, the
> scenario engine, data, Docker, testing, and performance. Answers are grounded
> in the actual code (file references given). Read the **TRAPS** and the
> **rapid-fire** section last-minute.

---

## 0. The 60-second architecture pitch (say this first)

> "Parallax is a dual-perspective cyber-range. A React/Vite SPA talks through an
> nginx reverse proxy to a FastAPI backend. The backend orchestrates isolated
> Docker scenario containers, streams a Kali terminal to the browser over
> WebSockets, runs a SIEM event engine, and calls an AI tutor. State lives in
> **Postgres** (durable) and **Redis** (real-time pub/sub + caching), with
> **Elasticsearch/Filebeat** for the production-style SIEM path. Everything an
> attacker does in the Red workspace shows up live as defender telemetry in the
> Blue workspace — that real-time attack/defense correlation is the core idea."

**Data flow:** `React (xterm.js) ⇄ WebSocket ⇄ nginx ⇄ FastAPI ⇄ Redis pub/sub ⇄ docker exec ⇄ Kali ⇄ internal Docker net ⇄ vulnerable target`.

---

## 1. "Why these technologies?" (be ready to justify every choice)

| Choice | Why (your answer) |
|---|---|
| **FastAPI (Python 3.11, async)** | Native async/await fits an I/O-bound workload (DB, Redis, Docker, HTTP to OpenRouter, WebSockets); auto OpenAPI docs; pydantic validation. |
| **React + Vite** | Component model for two complex workspaces; Vite gives fast HMR + an optimised, code-split production build. |
| **Zustand** (not Redux) | Minimal boilerplate global store for WS-driven state; no reducer ceremony. |
| **Postgres** | Relational, ACID, durable record of users/sessions/commands/events. |
| **Redis** | Sub-millisecond pub/sub for the live terminal + SIEM feed, plus rate-limit/budget counters and caches. |
| **Elasticsearch + Filebeat** | Industry-standard SIEM backend so the Blue workspace mirrors a real SOC. |
| **Docker Compose** | One-command reproducible stack; per-scenario **internal-only** networks give the security isolation the whole project depends on. |
| **xterm.js** | The same terminal emulator VS Code uses; real ANSI/PTY fidelity in the browser. |

---

## 2. Backend — "How is it structured?"

- **FastAPI app** (`backend/src/main.py`): a `lifespan` context boots DB, seeds the admin, inits Redis + the SIEM batch worker, and starts background daemons (noise generator, container cleanup). **12 routers** are mounted under `/api/*` (+ `/ws`): auth, scenarios, sessions, notes, hints, ws, scoring, reports, instructor, playbooks, ai, siem — **59 routes** total.
- **Async all the way down**: SQLAlchemy 2.0 async ORM over **asyncpg**; every request handler is `async`.
- **Validation**: pydantic models for every request/response shape; `pydantic-settings` loads config from `.env` (`backend/src/config.py`).
- **Middleware**: `GZipMiddleware` (compresses responses > 1 KB) and a CORS allowlist.
- **Observability**: `/health` (liveness), `/api/health/readiness` (deep probe of Postgres/Redis/Elasticsearch/OpenRouter → 200 or 503), `/api/metrics` (active sessions, WS connections, AI p50 latency, SIEM lag).

**TRAP — "Why async, not threads?"** → "The work is I/O-bound, not CPU-bound. One event loop handles thousands of concurrent waits (DB, Redis, sockets) without a thread per request. The *one* place I deliberately use threads is the terminal proxy — see §4."

---

## 3. Frontend — "How does the UI work?"

- **Two workspaces**: `RedWorkspace` (xterm.js terminal, notes, AI hint panel, phase tracker) and `BlueWorkspace` (live SIEM feed, forensics workbench). Shared shells in `components/workspace/`.
- **State**: Zustand slices in `src/store/`; WebSocket hooks (`hooks/useWebSocket.js`, `useTerminal.js`) push live frames into the store, components re-render reactively.
- **Routing**: react-router; pages are **lazy-loaded** (`React.lazy`) so heavy bundles (the 3D hero, jsPDF report export) are split out and only fetched when needed — verified in the build output (separate `HeroScene3D`, `jspdf` chunks).
- **Styling**: Tailwind, dark theme by default (terminal feel).
- **Resilience**: `ErrorBoundary` components; a `PerfTier` that scales motion/3D down on weaker devices.

**TRAP — "Your main bundle is large."** → "Heavy features are code-split and lazy-loaded; the initial route ships a small bundle and the 3D/PDF chunks load on demand. The build report shows them as separate gzipped chunks."

---

## 4. "Walk me through how a keystroke reaches Kali and the output returns." (the signature question)

Code: `backend/src/sandbox/terminal.py`, `backend/src/ws/routes.py`.

1. You type in **xterm.js**; the keystroke goes over a **WebSocket** to the backend.
2. The WS handler **publishes** it to a Redis channel `terminal:{session}:input`.
3. A background thread (`_redis_to_docker`) reads that channel and writes to the **Docker exec socket** of the session's Kali container.
4. Kali's output comes back on the exec socket; a second thread (`_docker_to_redis`) **publishes** it to `terminal:{session}:output`.
5. The WS handler streams that back to xterm.js, which renders it.

**TRAP — "Why threads and a synchronous Redis client here, when everything else is async?"** (this is a *great* answer to have)
> "The Docker SDK's exec socket is a blocking stream. Bridging it with the app's singleton async Redis client would mean awaiting it from a thread with a different event loop — a cross-loop bug. So the proxy uses a **synchronous** Redis client inside dedicated background threads, which is the clean, race-free way to bridge a blocking socket to async pub/sub." (It's documented in the module docstring.)

**TRAP — "Why proxy through Redis at all, not WS straight to Docker?"** → "Decoupling: multiple viewers can subscribe to the same output channel, the backend can tap the stream for SIEM/scoring, and reconnects don't drop the container."

---

## 5. "How does an attacker's command become a defender's alert?" (the core novelty)

There are **two SIEM paths**, by design:
1. **Production-style** — the target containers log; **Filebeat** ships logs to **Elasticsearch**; the backend SIEM engine polls/queries them. This is the realistic SOC pipeline.
2. **Immediate classroom telemetry** — `backend/src/siem/command_bridge.py`: when a command is submitted, it's matched against the scenario's **event map** (`siem/events/{scenario}_events.json`, regex `trigger_pattern`s). A match emits a `SiemEvent` (severity, MITRE technique, source IP `172.20.X.10`) which is **published to Redis** and streamed to the Blue workspace SIEM feed in real time.

> "The dual path is deliberate: Elasticsearch/Filebeat give SOC realism, while the command bridge keeps the teaching loop instant so a student sees their nmap scan light up the SIEM immediately — without waiting on log-shipping latency."

Events carry **MITRE ATT&CK technique IDs**, persisted in the `siem_events` table, so the debrief can map the whole engagement to the kill chain.

---

## 6. "How does the AI tutor work, and how is it controlled?"

Code: `backend/src/ai/` (`monitor.py`, `security.py`, `routes.py`, `debrief_coach.py`).

- **Provider**: OpenRouter (OpenAI-compatible HTTP API), model **configurable** via `OPENROUTER_MODEL` (currently `anthropic/claude-sonnet-4.6`).
- **When**: on **command submission** and **note save** — *not* per keystroke (cost + noise control).
- **Socratic**: it asks guiding questions; it must never hand over a payload, tool-with-flags, or a credential. Enforced in `security.py` (`sanitize_tutor_response`, `validate_ai_output`).
- **Guardrails (OWASP LLM Top 10)**: scenario secrets are **redacted before** the prompt; output is **validated for leakage after**; student input is wrapped against prompt injection; per-user/global **token budgets** in Redis cap spend (`AI_USER_HOURLY_CALL_LIMIT=50`, `AI_USER_DAILY_TOKEN_BUDGET=100k`).
- **Graceful degradation**: if `OPENROUTER_API_KEY` is unset or the API fails, the tutor falls back to **static Socratic hints** — the platform never hard-depends on the LLM.
- **Output cap**: `OPENROUTER_MAX_TOKENS=500`.

(Full detail + the credential-redaction story is in `EXAMINER_QA_SECURITY.md` §11.)

---

## 7. "How does the scenario engine work?"

Code: `backend/src/scenarios/`.

- **Specs**: each scenario is defined in YAML (`docs/scenarios/SC-0{1,2,3}-*.yaml`) — hosts, phases, flags, hints, detection rules; loaded by `loader.py`.
- **Phases / methodology**: a session advances through phases (PTES-style). `gatekeeper.py` decides when a phase is satisfied; `output_patterns.py` fingerprints completed terminal lines to emit `output_insight` frames and confirm progress.
- **Scope enforcement**: `scope_enforcer.py` keeps attacks pointed at in-scope targets (a safety + realism control — students can't wander off the engagement).
- **Branching**: `branching.py` infers which methodology branch the student is on from their commands, feeding branch-aware hints.
- **Randomisation**: `randomizer.py` varies per-session details so flags/paths aren't copy-pasteable between students.
- **Hints**: `hint_engine.py` + per-scenario hint trees (`hints/sc0X_hints.json`), with L1→L3 escalating specificity (and matching score penalties).

**Scenarios**: SC-01 (NovaMed vulnerable web app — SQLi/LFI/Redis), SC-02 (Nexora AD — Kerberoasting/AS-REP/DCSync), SC-03 (Orion phishing — GoPhish → mail relay → victim simulator).

---

## 8. "How is scoring computed?"

Code: `backend/src/scoring/engine.py`.

- A session **starts at 100** (`sessions.score` default).
- **Penalties are applied live** during play: hint penalties **L1=5 / L2=10 / L3=20** (`config.py`), plus gate/scope penalties.
- On completion: `final_score = clamp(running_score + time_bonus, 0, 100)`.
- **Time bonus**: linear, up to **+20** for near-instant completion, scaling to 0 at the **120-minute** threshold.
- **Important subtlety to volunteer**: `hints_used` is passed to `final_score` but **not re-penalised** there — penalties were already deducted live, so re-applying would double-count. (That's literally commented in the code — a good "we thought about correctness" point.)
- **Debrief**: `ai/debrief_coach.py` + `reports/generator.py` produce a post-mission report (timeline, MITRE coverage, what was detected, coaching), exportable to PDF via jsPDF on the frontend.

---

## 9. "What do you store, and where?" (data model)

**Postgres** (7 tables, Alembic-migrated — `backend/migrations/`):
`users`, `sessions`, `notes`, `command_log`, `siem_events`, `auto_evidence`, `siem_triage`.
- Primary keys are **UUID4** (non-enumerable).
- **Command log stores the command + metadata only — never full terminal output** (privacy + size; a deliberate decision in the project rules).

**Redis** (real-time + ephemeral): pub/sub channels (`terminal:*`, SIEM), the `parallax:active_sessions` hash, rate-limit + AI-budget counters, the JWT revocation blocklist, health caches, and metrics samples.

**Elasticsearch**: the SIEM log store.

**TRAP — "Why two datastores?"** → "Different jobs: Postgres is the durable system of record (ACID); Redis is the real-time nervous system (pub/sub + counters with TTLs). Putting live terminal frames in Postgres would be wrong on both latency and durability grounds."

---

## 10. "How is the Docker environment isolated and managed?"

- **One Compose stack**, ~16 services (frontend, nginx, backend, Postgres, Redis, Elasticsearch, Filebeat + per-scenario target containers), brought up with `--profile sc01/sc02/sc03`.
- **Scenario networks are `internal: true`** Docker bridges (`172.20.X.0/24`) — **zero internet egress**. Verified by `scripts/verify-network-isolation.ps1`.
- **Container hardening**: `cap_drop: ALL` + minimal `cap_add`, `no-new-privileges:true`, and CPU/memory limits (`CONTAINER_CPU_LIMIT`, `CONTAINER_MEMORY_LIMIT`).
- **Lifecycle**: the backend's `sandbox/manager.py` creates/attaches per-session containers; a cleanup loop reaps abandoned ones; a scenario reset is `compose down && up` (~8 s).
- **Concurrency cap**: `MAX_CONCURRENT_SESSIONS=10`.

**TRAP — "A student runs a real exploit tool — can it escape or reach the internet?"** → "No. The scenario container sits on an internal-only network with no gateway to the outside, drops Linux capabilities, and runs with `no-new-privileges`. The exploits act only against the deliberately-vulnerable target on that same isolated bridge."

---

## 11. "How do you know it works? (testing & quality)"

- **Backend**: **364 pytest tests** (unit + integration + e2e), run against a live Postgres/Redis — auth, sessions, scenario phase-gating, SIEM dedup/rules, scoring, AI redaction, WS integration.
- **Frontend**: **46 vitest** specs + ESLint (0 warnings) + a production build gate.
- **System**: `scripts/demo_check.py` validates 22 services/ports/endpoints; the network-isolation script checks egress on every scenario container.
- **CI**: `.github/workflows/ci.yml`.
- Project rule: **no "done" without empirically running the tests** — every change is verified, not assumed.

---

## 12. "Performance & scalability?"

- **Async I/O** end-to-end; **Redis connection pool** (max 50); **gzip** responses.
- **Frontend code-splitting / lazy routes** keep first paint light.
- **Bounded resources**: container CPU/mem limits, `MAX_CONCURRENT_SESSIONS`, AI token budgets, login/register rate limits.
- **Scaling story**: it's a single-node teaching deployment; the design (stateless JWT, Redis pub/sub, containerised services) would scale horizontally behind a load balancer, with Redis as the shared real-time bus and Postgres as shared state.

---

## 13. Honest "limitations / future work" (have 2–3)

- Single-node deployment (no orchestration/HA yet) — would move to Kubernetes for multi-node.
- The immediate SIEM bridge is pattern-based for classroom responsiveness; the Elasticsearch path is the realistic one — converging them is future work.
- No MFA; no multi-region; metrics are basic (could add Prometheus/Grafana).
- 3 scenarios shipped (SC-01–03); the engine is data-driven (YAML) so adding more is content, not code.

---

## 14. Rapid-fire technical one-liners (memorise)

- **Stack?** → "React/Vite → nginx → FastAPI → Postgres + Redis + Elasticsearch → isolated Docker targets."
- **Why FastAPI?** → "Async fits an I/O-bound app; auto OpenAPI; pydantic validation."
- **Terminal transport?** → "xterm.js over WebSocket; backend bridges Redis pub/sub ⇄ docker exec via background threads."
- **Why a sync Redis client in the proxy?** → "To bridge a blocking exec socket without a cross-event-loop bug."
- **Red→Blue link?** → "Commands matched to a scenario event map → SiemEvent → Redis publish → live Blue feed; plus Filebeat→Elasticsearch for realism."
- **State split?** → "Postgres = durable record; Redis = real-time pub/sub + TTL counters."
- **Do you store terminal output?** → "No — only the command + metadata."
- **Isolation?** → "`internal: true` networks, zero egress, `cap_drop: ALL`, `no-new-privileges`."
- **AI cost control?** → "≤500 tokens, called on submit not keystroke, per-user/global Redis budgets, static fallback."
- **Scoring?** → "Start 100, live hint/gate penalties, +≤20 time bonus, clamp [0,100]."
- **PK type?** → "UUID4 — non-enumerable."
- **Tests?** → "364 backend + 46 frontend, run against a live stack; CI-gated."

---

## 15. Likely "gotcha" questions

- **"Is this just pre-recorded?"** → "No — students run live tools against live vulnerable containers; the SIEM reacts to real commands. Nothing is scripted."
- **"What if two students collide?"** → "Per-session containers + per-session randomised flags/paths; `MAX_CONCURRENT_SESSIONS` bounds load."
- **"What happens if Redis/the AI dies mid-lab?"** → "AI degrades to static hints; rate-limiting fails open by default so logins keep working; Postgres still holds session state. The readiness probe surfaces any degraded subsystem."
- **"Where's the single point of failure?"** → "The backend and Postgres on a single node — acknowledged; the architecture is built to scale out, but the MVP is single-host."
- **"Biggest technical challenge?"** → "Bridging the blocking Docker exec stream to async WebSockets cleanly — solved with the threaded sync-Redis proxy — and keeping the Red→Blue correlation real-time."

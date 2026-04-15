# CyberSim: Master Project Blueprint & Agent Directive (v2.0)

> **Authority**: This document is the operational North Star for all agents (Antigravity, Claude Code, Gemini).  
> It supersedes all prior scope definitions. Any feature, file, or container NOT described here requires explicit approval before implementation.  
> **First action for any agent starting a new session**: Read this file, then `CLAUDE_HANDOFF.md`, then `CONTINUOUS_STATE.md`.

---

## 1. The North Star (Project Objective)

CyberSim is a dual-perspective cybersecurity training platform designed to bridge the gap between theoretical knowledge and real-world application.

**The Core Problem**: Students learn offensive tools (Nmap, Metasploit) and defensive tools (Splunk, EDR) in isolated silos. They lack the "overall scene" — the cognitive link between an attacker's keystroke and a defender's alert.

**The Solution**: A unified, browser-based sandbox where the student executes attacks in a live terminal (Red Team) while simultaneously watching the resulting telemetry populate in a real-time SIEM (Blue Team). The platform enforces industry methodologies (PTES, NIST) and utilizes an AI Monitor to provide Socratic guidance.

---

## 2. The Strict Scope (MVP Boundary)

> ⚠️ **Hard Limit**: The MVP is **Three High-Fidelity Scenarios only**.  
> Do NOT scaffold, reference, or build SC-04 or SC-05 until SC-01 through SC-03 pass full end-to-end tests.

### SC-01: NovaMed Healthcare (Web Application Pentest)
- **Focus**: OWASP Top 10 — SQLi, LFI, IDOR, File Upload exploitation
- **Network**: `172.20.1.0/24` (internal, no internet)
- **Containers**: PHP/Apache webapp (`172.20.1.20`), MySQL DB (`172.20.1.21`), ModSecurity WAF (`172.20.1.1`)
- **Red Team Objective**: Achieve RCE via chained OWASP vulnerabilities
- **Blue Team Objective**: Monitor WAF logs, triage alerts by severity, write an IR report
- **SIEM Events**: WAF blocks, DB auth failures, file access anomalies, endpoint alert on shell upload

### SC-02: Nexora Financial (Active Directory Compromise)
- **Focus**: Network/Lateral Movement — BloodHound recon, Kerberoasting, DCSync
- **Network**: `172.20.2.0/24` (internal, no internet)
- **Containers**: Samba4 AD DC (`172.20.2.20`), File Server with Finance + Public shares (`172.20.2.40`)
- **Domain**: `nexora.local` | Admin password: `NexoraAdmin2024!`
- **Pre-seeded users**: `jsmith` (low-priv), `svc_backup` (Kerberoastable, SPN: `CIFS/NEXORA-FS01.nexora.local`), `it.admin` (Domain Admin)
- **Red Team Objective**: Kerberoast `svc_backup`, crack hash, DCSync as Domain Admin
- **Blue Team Objective**: Detect Event 4769 RC4 downgrades, track lateral movement via 4624/4648 chains
- **SIEM Events**: 4625, 4768, 4769, 4776, 4624, 4648, 4728

### SC-03: Orion Logistics (Phishing & Initial Access)
- **Focus**: OSINT, Pretexting, Payload Delivery via GoPhish
- **Network**: `172.20.3.0/24` (internal, no internet)
- **Containers**: GoPhish (`172.20.3.40`), Postfix mail server (`172.20.3.20`), Python Windows endpoint sim (`172.20.3.30`)
- **Red Team Objective**: Craft phishing campaign, achieve callback from simulated victim endpoint
- **Blue Team Objective**: Email header analysis, SPF/DKIM/DMARC validation, detect macro execution
- **SIEM Events**: Email open, macro exec, PowerShell download cradle, scheduled task persistence, C2 beacon

---

## 3. Core Architecture & Tech Stack

### Frontend
- **Framework**: React 18 + Vite + Tailwind CSS + Zustand (no Redux)
- **Red Team**: xterm.js with `FitAddon` + `WebLinksAddon`. Terminal re-attaches on refresh by replaying `terminal:{session_id}:history` Redis capped list.
- **Blue Team**: `SiemFeed.jsx` — scrollable feed of severity-coded events driven by WebSocket JSON frames. Background noise events render in gray; attacker events in severity colors.
- **Pages**: `Auth.jsx`, `Dashboard.jsx`, `RedWorkspace.jsx`, `BlueWorkspace.jsx`, `Debrief.jsx`, `InstructorDashboard.jsx`

### Backend
- **Framework**: FastAPI (Python 3.11), fully async
- **ORM**: SQLAlchemy 2.0 async + asyncpg
- **Auth**: JWT (python-jose + passlib bcrypt). Users table has `role VARCHAR(20) DEFAULT 'student'`. Instructors get `role = 'instructor'`.
- **Modules**: `auth/`, `sessions/`, `notes/`, `ws/`, `scoring/`, `reports/`, `sandbox/`, `siem/`, `scenarios/`, `ai/`, `instructor/`

### Real-time Data Flow
```
Unified Single Server Node
Kali Container ◄── Docker API ───── backend/src/sandbox/manager.py
    │                                  ▲
    │ raw PTY proxy                    │ WebSocket /ws/{session_id}
    ▼                                  ▼
Target Containers ── Filebeat ────► Elastic SIEM (Elasticsearch)
    (sc01, sc02)                       │
                                       ▼ backend/src/siem/engine.py (Polling)
                                       ▼
Browser (xterm.js) ◄───────────────► React Frontend (Blue/Red Workspaces)
```

### Sandbox Physics & Hardware
- **Topology**: Unified Single-Node platform. All infrastructure (Backend, Frontend, Databases, SIEM, Target Containers, Kali Containers) runs harmoniously on one local Docker machine.
- **Resource Constraints**: High constraint priority. Elastic stack limited to 2GB RAM; scenario containers highly restrained (`cpus=0.5`, `mem_limit='512m'`).
- Docker SDK (`docker` Python library) natively orchestrates the local Docker Unix socket (`/var/run/docker.sock`).
- `provision_container()` checks if container for `session_id` already exists before creating (supports terminal re-attach on browser refresh)
- All containers: `cpus=0.5`, `mem_limit='512m'`, `cap_drop=['ALL']`, `security_opt=['no-new-privileges']`, no `--privileged`
- Terminal output history: Redis capped list `terminal:{session_id}:history` — last 500 lines, replayed on re-attach

### AI Monitor
- **Model**: `gemini-1.5-flash-latest`
- **Trigger**: Every command submission (not keystrokes)
- **Rate limit**: 1 call per 10s per session (`ai:{session_id}:last_call` Redis TTL)
- **Response**: ≤150 tokens, always a question or conceptual nudge, never a direct exploit command
- **System prompt source**: `ai-monitor/system_prompt.md`

---

## 4. Commercial-Grade Feature Directives (v2.0 — Required)

### 4.1 Background Noise Generator
- **File**: `infrastructure/docker/scenarios/sc{N}/daemon-noise.py`
- **What it does**: Runs as a sidecar process inside each scenario network, generating realistic benign traffic:
  - SC-01: Fake HTTP GETs to `172.20.1.20`, simulated cron-driven MySQL queries
  - SC-02: Simulated employee AD authentication loops (4624 events every 30–90s with jitter)
  - SC-03: Normal SMTP relay activity, periodic HTTP check-ins
- **SIEM tagging**: Noise events include `"source": "background"` in their JSON payload. `SiemFeed.jsx` renders these in gray with lower visual weight so students must actively filter them.
- **Startup**: Added to each scenario's `docker-compose` profile as a service using `python:3.11-slim`

### 4.2 Methodology Gating (Hard Phase Locks)
- **File**: `backend/src/scenarios/scope_enforcer.py`
- **How it works**:
  1. `ws/routes.py` calls `scope_enforcer.check(command, session)` before forwarding to Redis
  2. `scope_enforcer` loads phase unlock conditions from the scenario YAML (`docs/scenarios/SC-{N}-*.yaml`)
  3. Each tool is mapped to a minimum required PTES phase (e.g., `sqlmap` requires phase ≥ 2)
  4. Session's current phase and note count are checked against the minimum
  5. If blocked: WebSocket returns `{"type": "gate_block", "message": "..."}` — terminal prints red warning; AI Monitor fires a redirection prompt
- **Phase unlock conditions**: Defined per scenario in YAML under `methodology_gates:` key
- **Example**: Attempting `sqlmap` in phase 1 (Recon) → blocked → AI asks: *"You haven't documented what you found during enumeration. What services did you identify?"*

### 4.3 Kill Chain Timeline (Debrief UI)
- **Component**: `frontend/src/components/debrief/AttackTimeline.jsx`
- **What it renders**: Dual-axis SVG timeline
  - **Top rail (Red)**: Every command from `command_log` table, plotted by `created_at`
  - **Bottom rail (Blue)**: Every SIEM event from `siem_events` table, plotted by `created_at`
  - Vertical connector lines show causal links (attack → detection latency visible)
- **Data source**: New endpoint `GET /api/reports/{session_id}/timeline` returns both arrays sorted by timestamp
- **Implementation constraint**: No D3.js (too heavy). Use plain SVG with calculated x positions from timestamp ranges.

### 4.4 Instructor Dashboard
- **Route**: `/instructor` (protected, requires `role: "instructor"` JWT claim)
- **Backend**: `backend/src/instructor/routes.py`
  - `GET /api/instructor/sessions` — all sessions with user info, scenario, phase, score, hint counts
  - `GET /api/instructor/sessions/{session_id}/report` — download student's Markdown report
- **Frontend**: `frontend/src/pages/InstructorDashboard.jsx`
  - Table of all student sessions
  - Per-row: username, scenario, methodology adherence %, hints used (L1/L2/L3 breakdown), current phase, score, Download Report button
- **DB change**: Add `role VARCHAR(20) NOT NULL DEFAULT 'student'` to `users` table via Alembic migration (`backend/migrations/`)

---

## 5. Absolute Engineering Guardrails

All agents enforce these on every change. No STATE_SAVE is valid if any guardrail is violated.

| # | Rule | Implementation |
|---|------|---------------|
| **1** | **Docker Air-Gapping** — Scenario containers have ZERO outbound internet. `0.0.0.0/0` must be unreachable. | `internal: true` on every scenario network in `docker-compose.yml`. Verified with `docker network inspect` on boot. |
| **2** | **Resource Limits** — Hardcoded `cpus: 0.5`, `mem_limit: 512m` on all Kali and target containers. | Applied in `sandbox/manager.py` `provision_container()`. Not in docker-compose (dynamic containers must be limited at SDK level). |
| **3** | **No Live Malware** — Backend simulates malware *effects* via event maps only. Zero functional ransomware, shellcode, or botnet payloads in source. | Scenario YAMLs describe behaviors. Actual payload bytes are never written to any file. |
| **4** | **Persistent Terminal Sessions** — Refresh must re-attach cleanly. Session container persists until explicitly destroyed. | `provision_container()` checks container existence first. `terminal:{session_id}:history` Redis capped list (last 500 lines) replayed on re-attach. |
| **5** | **Continuous Logging** — Every sub-phase completion appended to `docs/architecture/CONTINUOUS_STATE.md` with full Who/When/Why/Where/What & How before agent turn ends. | No STATE_SAVE without a CONTINUOUS_STATE.md entry. Antigravity validates presence before marking phase ✅ Done. |

---

## 6. File Ownership Map

| Domain | Files | Owner |
|--------|-------|-------|
| Project planning & orchestration | `phases.md`, `CLAUDE_HANDOFF.md`, `CONTINUOUS_STATE.md` | Antigravity |
| Backend Python | `backend/src/**/*.py`, `requirements.txt`, `backend/Dockerfile` | Claude Code |
| Frontend React/JS | `frontend/src/**/*.jsx`, `frontend/src/**/*.js` | Claude Code |
| Docker infrastructure | `docker-compose.yml`, `infrastructure/docker/**` | Claude Code |
| Background noise scripts | `infrastructure/docker/scenarios/*/daemon-noise.py` | Claude Code |
| Instructor module | `backend/src/instructor/`, `frontend/src/pages/InstructorDashboard.jsx` | Claude Code |
| DB migrations | `backend/migrations/` (Alembic) | Claude Code |
| Scenario YAML specs | `docs/scenarios/SC-{01-03}-*.yaml` | Gemini |
| SIEM event maps | `backend/src/siem/events/sc{01-03}_events.json` | Gemini |
| Hint trees | `backend/src/scenarios/hints/sc{01-03}_hints.json` | Gemini |
| AI system prompt | `ai-monitor/system_prompt.md` | Gemini |

---

## 7. Phase Status (as of 2026-04-15)

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Concept, architecture, documentation | ✅ Done |
| 1 | Infrastructure skeleton (docker-compose, env) | ✅ Done |
| 2 | Backend foundation (auth, WS, session) | ✅ Done |
| 3 | Scenario engine core (state machine + YAML) | ✅ Done |
| 4 | Terminal proxy end-to-end test | ✅ Done |
| 5 | SIEM event engine | ✅ Done (112 events) |
| 11 | Background noise generator (sc01–sc03) | ✅ Done |
| 14 | Kill Chain Timeline (Debrief) | ✅ Done |
| 15 | Instructor Dashboard | ✅ Done |
| 16 | Terminal re-attach on refresh | ✅ Done |
| 17 | Methodology gating hard locks | ✅ Done |
| 18 | Final integration + End-to-End Tests | ✅ Done locally |
| 19-22 | Unified Memory & Telemetry | ✅ Done |

**Immediate blockers**:
1. Docker Desktop offline — must be started manually to run E2E test suite.
2. `GEMINI_API_KEY` in `.env` is a placeholder — replace with real Google AI Studio key for Socratic hints.
3. Kali Dockerfile apt-get dependencies require pinning.

---

## 8. v2.0 Scope Changes vs v1.0

| Item | v1.0 | v2.0 |
|------|------|------|
| Scenarios in MVP | 5 (SC-01 through SC-05) | **3 only** (SC-01, SC-02, SC-03) |
| Background traffic | Not specified | **Required** — `daemon-noise.py` per scenario |
| Methodology enforcement | Soft guidance via AI | **Hard phase locks** — `scope_enforcer.py` blocks commands |
| Debrief | Score + notes summary | **Dual-axis Kill Chain Timeline** (SVG, attack vs detection timestamps) |
| Instructor view | Not planned | **Required** — `/instructor` route, role-gated |
| Container resource limits | Mentioned in `.env` | **Hardcoded** in `sandbox/manager.py` (cpus: 0.5, mem_limit: 512m) |
| Terminal persistence on refresh | Not specified | **Required** — Redis capped list replay on re-attach |
| DB migrations | Not set up | **Alembic required** — `role` column + future schema changes |

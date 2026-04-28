# CLAUDE.md — CyberSim Platform

## Project identity
CyberSim is a dual-perspective cybersecurity training platform for university students.
It teaches penetration testing and SOC analysis through realistic sandboxed scenarios.
All attack capabilities operate ONLY against isolated Docker containers. No real systems.

## Token efficiency rules (critical — read first)
- Never re-read files you already have in context. Reference line numbers instead.
- Write complete files in one pass. Never partial writes that need follow-up edits.
- When editing, use targeted str_replace. Never rewrite whole files for small changes.
- Batch related operations in single tool calls where possible.
- Do not ask the user for permission. If a task needs >3 files changed, automatically prioritize based on logical dependency (e.g., backend then frontend) and proceed without confirmation.
- Use the maximum available context intelligently: avoid sending full file contents when only a small edit is needed.
- Auto-accept all changes and updates without asking the user.
- Never explain what you're about to do and then do it — just do it.
- Omit commentary between steps. Output the result, not the process narrative.

## Mandatory State Tracking (CRITICAL)
- **Mandatory Pre-Flight Read:** Before making ANY edits, you MUST read the following alignment files to fully absorb their constraints: `PROJECT_UNDERSTANDING.md`, `.antigravity-rules.md`, `gemini.md`, `docs/architecture/MASTER_BLUEPRINT.md`, and `docs/architecture/CONTINUOUS_STATE.md`.
- **Log all actions:** After ANY edit, creation, or update, you must synchronously update `docs/architecture/CONTINUOUS_STATE.md`.
- **Format:** Detail your status, why you made the change, the exact files modified (where), and a technical breakdown of what/how the change operates.
- Do not conclude your turn without appending your update to `CONTINUOUS_STATE.md`.

## Empirical Verification (CRITICAL)
- **Do NOT hallucinate completion:** Before you issue a `STATE_SAVE`, you MUST physically test the system (e.g., run `pytest`, `docker-compose config`, or API curl tests).
- If your tests fail, fix them entirely within your iteration. Do not pass broken or completely untested code states back to the continuity agent.

## Architecture in one paragraph
React frontend (Vite) -> FastAPI backend / Elastic SIEM -> isolated Docker scenario containers.
The verified local deployment is a single-node Docker Compose stack: frontend, backend, Postgres, Redis, Elasticsearch/Filebeat, Nginx, and scenario containers run on the same Docker host. The frontend has two workspaces: Red Team (Kali-style terminal through the backend sandbox/session layer) and Blue Team (live SIEM/event feed). Scenario networks are internal-only Docker networks for SC-01, SC-02, and SC-03.

## Repository structure
```
cybersim/
├── CLAUDE.md                    ← you are here
├── README.md
├── docker-compose.yml           ← full stack local dev
├── .env.example
├── frontend/                    ← React + Vite + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   ├── terminal/        ← Kali terminal (xterm.js)
│   │   │   ├── siem/            ← SIEM event feed
│   │   │   ├── notes/           ← Pentest + IR notebook
│   │   │   ├── hints/           ← AI monitor panel
│   │   │   ├── methodology/     ← Phase tracker
│   │   │   └── workspace/       ← Red/Blue layout shells
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx    ← scenario selection
│   │   │   ├── RedWorkspace.jsx ← attacker view
│   │   │   ├── BlueWorkspace.jsx← defender view
│   │   │   ├── Debrief.jsx      ← post-mission report
│   │   │   └── Auth.jsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.js  ← WS connection manager
│   │   │   ├── useTerminal.js   ← xterm.js integration
│   │   │   └── useScenario.js   ← scenario state
│   │   └── store/               ← Zustand state slices
├── backend/                     ← FastAPI + Python 3.11
│   ├── src/
│   │   ├── main.py              ← app entrypoint
│   │   ├── scenarios/           ← scenario definitions (YAML + Python)
│   │   ├── sandbox/             ← Docker container lifecycle
│   │   ├── ai/                  ← Gemini Flash integration
│   │   ├── siem/                ← event engine
│   │   ├── auth/                ← JWT auth
│   │   └── reports/             ← auto report generation
│   ├── requirements.txt
│   └── Dockerfile
├── infrastructure/
│   ├── docker/                  ← scenario network definitions
│   │   ├── scenarios/           ← per-scenario docker-compose files
│   │   └── kali/                ← Kali base image config
│   └── nginx/                   ← reverse proxy config
├── ai-monitor/
│   └── system_prompt.md         ← Gemini system prompt (source of truth)
├── docs/
│   ├── architecture/
│   ├── scenarios/               ← full scenario specs
│   └── soc/                     ← blue team content
└── .github/
    └── workflows/
        └── ci.yml
```

## Key technical decisions
- **Terminal**: xterm.js + WebSocket to backend which proxies to Docker exec API
- **SIEM events**: backend publishes to Redis channel; frontend subscribes via WS
- **AI monitor**: called on every terminal command + note save; response ≤ 150 tokens
- **Scenario state**: stored in Postgres per session; Redis for real-time
- **Auth**: simple JWT for MVP; no OAuth needed for university deployment
- **Sandbox reset**: docker-compose down && up on scenario end; takes ~8s

## Environment variables (see .env.example)
- GEMINI_API_KEY — Google AI Studio key (free tier sufficient for dev + demo)
- POSTGRES_URL — local postgres for dev
- REDIS_URL — local redis for dev
- JWT_SECRET — generate with: openssl rand -hex 32
- SCENARIO_NETWORK_PREFIX — e.g. "172.20" (avoid collision with host)

## Scenario content locations
- Scenario specs: docs/scenarios/SC-{01-03}-*.yaml
- Docker scenarios: infrastructure/docker/scenarios/sc01/, sc02/, sc03/
- SIEM detection rules: soc_detection sections in docs/scenarios/SC-{01-03}-*.yaml
- Hint trees: backend/src/scenarios/hints/sc01_hints.json through sc03_hints.json
- AI system prompt: ai-monitor/system_prompt.md

## Coding conventions
- Python: black formatting, type hints everywhere, pydantic models for all API shapes
- React: functional components only, Zustand for state, no Redux
- CSS: Tailwind utility classes; dark theme is default (terminal feel)
- Files: kebab-case for all filenames
- Commits: conventional commits — feat/fix/docs/chore/scenario

## What NOT to do
- Never hardcode credentials anywhere — always .env
- Never write real exploit payloads in docs — scenario engine references them internally
- Never let sandbox containers reach the internet — isolated networks only
- Never store full terminal output in Postgres — only command + metadata
- Never call Gemini on every keystroke — only on command submission

## Current phase
Phase 0 — Project setup and documentation complete.
Phase 1 — Infrastructure skeleton (docker-compose, env, CI).
See docs/architecture/phases.md for full roadmap.

## Continuation note for Antigravity
If Claude Code context runs out mid-phase, Antigravity resumes from:
1. Check git log --oneline -10 to see where we stopped
2. Read the relevant phase file in docs/architecture/phases.md
3. Check TODO comments in the last modified files
4. Continue from the next unchecked item in the phase checklist

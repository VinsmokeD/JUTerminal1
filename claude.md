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
- If a task needs >3 files changed, ask which is highest priority before proceeding.
- Never explain what you're about to do and then do it — just do it.
- Omit commentary between steps. Output the result, not the process narrative.

## Architecture in one paragraph
React frontend (Vite) → FastAPI backend → Docker scenario containers.
The frontend has two workspaces: RedTeam (Kali terminal + methodology tracker + pentest notes)
and BlueTeam (SIEM feed + investigation panel + IR notes). Both connect via WebSocket to
the backend which manages scenario state, injects SIEM events reactively to attacker actions,
and calls Gemini Flash for AI monitoring. Each scenario runs in an isolated Docker network.
Postgres stores session state. Redis handles real-time event queuing.

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
- Scenario specs: docs/scenarios/SC-{01-05}-*.md
- Docker networks: infrastructure/docker/scenarios/sc{01-05}/
- SIEM event maps: backend/src/siem/events/sc{01-05}_events.json
- Hint trees: backend/src/scenarios/hints/sc{01-05}_hints.json
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

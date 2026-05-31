# AGENTS.md â€” Parallax Platform

## Project identity
Parallax is a dual-perspective cybersecurity training platform for university students.
It teaches penetration testing and SOC analysis through realistic sandboxed scenarios.
All attack capabilities operate ONLY against isolated Docker containers. No real systems.

## Token efficiency rules (critical â€” read first)
- Never re-read files you already have in context. Reference line numbers instead.
- Write complete files in one pass. Never partial writes that need follow-up edits.
- When editing, use targeted str_replace. Never rewrite whole files for small changes.
- Batch related operations in single tool calls where possible.
- Do not ask the user for permission. If a task needs >3 files changed, automatically prioritize based on logical dependency (e.g., backend then frontend) and proceed without confirmation.
- Use the maximum available context intelligently: avoid sending full file contents when only a small edit is needed.
- Auto-accept all changes and updates without asking the user.
- Never explain what you're about to do and then do it â€” just do it.
- Omit commentary between steps. Output the result, not the process narrative.

## Mandatory State Tracking (CRITICAL)
- **Mandatory Pre-Flight Read:** Before making ANY edits, you MUST read the following alignment files to fully absorb their constraints: `PROJECT_UNDERSTANDING.md`, `.antigravity-rules.md`, `openrouter.md`, `docs/architecture/MASTER_BLUEPRINT.md`, and `docs/architecture/CONTINUOUS_STATE.md`.
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
parallax/
â”œâ”€â”€ AGENTS.md                    â† you are here
â”œâ”€â”€ README.md
â”œâ”€â”€ docker-compose.yml           â† full stack local dev
â”œâ”€â”€ .env.example
â”œâ”€â”€ frontend/                    â† React + Vite + Tailwind
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”‚   â”œâ”€â”€ terminal/        â† Kali terminal (xterm.js)
â”‚   â”‚   â”‚   â”œâ”€â”€ siem/            â† SIEM event feed
â”‚   â”‚   â”‚   â”œâ”€â”€ notes/           â† Pentest + IR notebook
â”‚   â”‚   â”‚   â”œâ”€â”€ hints/           â† AI monitor panel
â”‚   â”‚   â”‚   â”œâ”€â”€ methodology/     â† Phase tracker
â”‚   â”‚   â”‚   â””â”€â”€ workspace/       â† Red/Blue layout shells
â”‚   â”‚   â”œâ”€â”€ pages/
â”‚   â”‚   â”‚   â”œâ”€â”€ Dashboard.jsx    â† scenario selection
â”‚   â”‚   â”‚   â”œâ”€â”€ RedWorkspace.jsx â† attacker view
â”‚   â”‚   â”‚   â”œâ”€â”€ BlueWorkspace.jsxâ† defender view
â”‚   â”‚   â”‚   â”œâ”€â”€ Debrief.jsx      â† post-mission report
â”‚   â”‚   â”‚   â””â”€â”€ Auth.jsx
â”‚   â”‚   â”œâ”€â”€ hooks/
â”‚   â”‚   â”‚   â”œâ”€â”€ useWebSocket.js  â† WS connection manager
â”‚   â”‚   â”‚   â”œâ”€â”€ useTerminal.js   â† xterm.js integration
â”‚   â”‚   â”‚   â””â”€â”€ useScenario.js   â† scenario state
â”‚   â”‚   â””â”€â”€ store/               â† Zustand state slices
â”œâ”€â”€ backend/                     â† FastAPI + Python 3.11
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ main.py              â† app entrypoint
â”‚   â”‚   â”œâ”€â”€ scenarios/           â† scenario definitions (YAML + Python)
â”‚   â”‚   â”œâ”€â”€ sandbox/             â† Docker container lifecycle
â”‚   â”‚   â”œâ”€â”€ ai/                  â† OpenRouter (DeepSeek) integration
â”‚   â”‚   â”œâ”€â”€ siem/                â† event engine
â”‚   â”‚   â”œâ”€â”€ auth/                â† JWT auth
â”‚   â”‚   â””â”€â”€ reports/             â† auto report generation
â”‚   â”œâ”€â”€ requirements.txt
â”‚   â””â”€â”€ Dockerfile
â”œâ”€â”€ infrastructure/
â”‚   â”œâ”€â”€ docker/                  â† scenario network definitions
â”‚   â”‚   â”œâ”€â”€ scenarios/           â† per-scenario docker-compose files
â”‚   â”‚   â””â”€â”€ kali/                â† Kali base image config
â”‚   â””â”€â”€ nginx/                   â† reverse proxy config
â”œâ”€â”€ ai-monitor/
â”‚   â””â”€â”€ system_prompt.md         â† OpenRouter system prompt (source of truth)
â”œâ”€â”€ docs/
â”‚   â”œâ”€â”€ architecture/
â”‚   â”œâ”€â”€ scenarios/               â† full scenario specs
â”‚   â””â”€â”€ soc/                     â† blue team content
â””â”€â”€ .github/
    â””â”€â”€ workflows/
        â””â”€â”€ ci.yml
```

## Key technical decisions
- **Terminal**: xterm.js + WebSocket to backend which proxies to Docker exec API
- **SIEM events**: backend publishes to Redis channel; frontend subscribes via WS
- **AI monitor**: called on every terminal command + note save; response â‰¤ 150 tokens
- **Scenario state**: stored in Postgres per session; Redis for real-time
- **Auth**: simple JWT for MVP; no OAuth needed for university deployment
- **Sandbox reset**: docker-compose down && up on scenario end; takes ~8s

## Environment variables (see .env.example)
- OPENROUTER_API_KEY â€” OpenRouter key (DeepSeek V4-Pro)
- POSTGRES_URL â€” local postgres for dev
- REDIS_URL â€” local redis for dev
- JWT_SECRET â€” generate with: openssl rand -hex 32
- SCENARIO_NETWORK_PREFIX â€” e.g. "172.20" (avoid collision with host)

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
- Commits: conventional commits â€” feat/fix/docs/chore/scenario

## What NOT to do
- Never hardcode credentials anywhere â€” always .env
- Never write real exploit payloads in docs â€” scenario engine references them internally
- Never let sandbox containers reach the internet â€” isolated networks only
- Never store full terminal output in Postgres â€” only command + metadata
- Never call OpenRouter on every keystroke â€” only on command submission

## Current phase
Phase 0 â€” Project setup and documentation complete.
Phase 1 â€” Infrastructure skeleton (docker-compose, env, CI).
See docs/architecture/phases.md for full roadmap.

## Continuation note for Antigravity
If Codex context runs out mid-phase, Antigravity resumes from:
1. Check git log --oneline -10 to see where we stopped
2. Read the relevant phase file in docs/architecture/phases.md
3. Check TODO comments in the last modified files
4. Continue from the next unchecked item in the phase checklist

# Parallax Project Complete Architecture & Ecosystem Guide

## 1. Project Concept
**Parallax** is a dual-perspective, browser-based cybersecurity training platform designed for university students. It operates entirely safely through isolated Docker containers. The platform offers two primary workspaces:
- **Red Team Space**: A terminal (powered by xterm.js) that directly interfaces with a Kali Linux sandbox container to execute real pentesting techniques against deliberately vulnerable mock infrastructure.
- **Blue Team Space**: A live SIEM (Security Information and Event Management) feed reacting dynamically to the Red Team's terminal actions. 

Instead of pre-scripted events, students run live methodologies. To enhance the learning experience, an AI Monitor parses command logic and provides Socratic-style hints to guide students without handing them direct answers.

### Phase v4 realism and guidance layer
Phase v4 adds a realism/usability layer on top of the existing v3 operations-center shell:
- **Terminal and workspace UX**: xterm.js now supports native selection, Ctrl-Shift clipboard shortcuts, find, font controls, copy-all, scroll controls, output insight cards, and persisted preferences. Red and Blue workspaces use persisted resizable panels with Focus, Balanced, and Debug presets.
- **Scenario realism**: SC-01 exposes NovaMed web artifacts and alternate SQLi/LFI/Redis routes; SC-02 adds SYSVOL/GPP, AS-REP, realistic share breadcrumbs, and Windows-style event mappings; SC-03 adds a NEXORA SSO landing page, persona-driven victim simulation, synthetic payload markers, and beacon telemetry.
- **Guided outputs and branches**: backend scenario helpers scan completed PTY lines for safe educational fingerprints, emit `output_insight` WebSocket frames, infer active methodology branches from submitted commands, and feed branch-aware hints to the AI tutor and phase trail.

---

## 2. The Multi-Agent Ecosystem
This project leverages an advanced, fully automated multi-agent architecture to construct itself. Three distinct AI systems work in tandem with zero human intervention.

### A. Antigravity (Planning & Orchestrator)
- **Role**: The project manager and continuity engine. 
- **Capabilities**: Decomposes the project blueprint (`phases.md`) into granular steps, handles codebase infrastructure limits, archives states in git, and strictly enforces development rules.
- **Trigger**: Acts globally, orchestrating the hand-offs and ensuring no "hallucinated" progress occurs by validating physical execution output.

### B. Claude Code (The Core Developer)
- **Role**: Executing technical payloads.
- **Capabilities**: Focuses exclusively on building the Python backend, React frontend components, and Docker containers. 
- **Rule Constraints**: Claude is not allowed to pass arbitrary logic to the next phase without verifying it physically (`pytest` / `docker-compose config`). It receives tasks via `CLAUDE_HANDOFF.md` and signals completion via a `STATE_SAVE` command.

### C. OpenRouter (The Project Architect & Monitor)
- **Role**: Behavioral rule maker and scenario logic designer.
- **Capabilities**: Constructs the core Data Schemas and scenario logic (the A.N.T. system). It ensures there is **No Conceptual Drift** by adhering violently to the sandbox boundaries established in `docker-compose.yml`.

### D. The Global Memory Brain: `CONTINUOUS_STATE.md`
To prevent the models from losing context mid-session or overlapping efforts, every agent must synchronously update `docs/architecture/CONTINUOUS_STATE.md`. It tracks exactly **When**, **Who**, **Why**, **Where**, and **How** every modification occurred.

---

## 3. Workflow & Orchestration Physics
How code gets written without you intervening:
1. **Phase Planning**: Antigravity reads `phases.md` to identify the next target (e.g., Phase 3: Scenario Engine).
2. **Directive Handoff**: Antigravity synthesizes the objective and writes it into `CLAUDE_HANDOFF.md`.
3. **Claude Execution**: Claude executes the directive, editing files, and making commits automatically for small sets. Crucially, Claude must run a definitive terminal check to prove the code works.
4. **State Saving**: Claude signals it is finished by issuing a `STATE_SAVE`.
5. **Validation Tracker**: All agents update `CONTINUOUS_STATE.md`. Antigravity then marks the phase as `âœ… Done` in `phases.md` and begins orchestrating the next objective.

---

## 4. Technical Architecture & Folder Structure
```text
parallax/
â”œâ”€â”€ frontend/ (React / Vite / Tailwind)
â”‚   â”œâ”€â”€ src/components/terminal/   # Houses xterm.js syncing WS streams to Docker
â”‚   â”œâ”€â”€ src/components/siem/       # Reads Blue Team alerts from Redis Pub/Sub
â”‚   â””â”€â”€ src/store/                 # Zustand state management handling WS reactivity
â”‚
â”œâ”€â”€ backend/ (FastAPI / Python 3.11)
â”‚   â”œâ”€â”€ src/main.py                # App entrypoint tying all subsystems together
â”‚   â”œâ”€â”€ src/sandbox/               # The Docker SDK manager converting WebSocket to Python `docker exec` streams
â”‚   â”œâ”€â”€ src/siem/                  # Event Engine mapping specific attacker actions to Redis-published IT alerts
â”‚   â”œâ”€â”€ src/scenarios/             # Scenario State Machine validating milestones
â”‚   â””â”€â”€ src/ai/                    # OpenRouter (DeepSeek) integration examining the terminal buffer
â”‚
â”œâ”€â”€ infrastructure/ (The Sandbox Physics)
â”‚   â”œâ”€â”€ docker/scenarios/          # Extremely isolated internal bridge networks. Subnets (172.20.X.X) per level
â”‚   â”‚   â”œâ”€â”€ sc01 (Web App)         # Target 1: NovaMed Vulnerable Web Node
â”‚   â”‚   â”œâ”€â”€ sc02 (Act. Directory)  # Target 2: Nexora AD Domain Controller
â”‚   â”‚   â””â”€â”€ sc03...                # Remaining Scenarios
â”‚   â””â”€â”€ nginx/                     # Reverse proxy separating /api and /ws layers
â”‚
â”œâ”€â”€ docs/ (Global Nervous System)
â”‚   â”œâ”€â”€ architecture/
â”‚   â”‚   â”œâ”€â”€ phases.md              # The absolute step-by-step master progression tracker
â”‚   â”‚   â”œâ”€â”€ CONTINUOUS_STATE.md    # The Global Brain / Cross-Agent Memory log
â”‚   â”‚   â””â”€â”€ agent-alignment-and-efficiency-update.md # Rules definition for efficient token usage
â”‚   â””â”€â”€ scenarios/                 # Specific logic definitions and constraints to be processed by engines
â”‚
â”œâ”€â”€ .env.example                   # Security mappings and API tokens
â”œâ”€â”€ docker-compose.yml             # System skeleton initializing the microservices
â””â”€â”€ CLAUDE_HANDOFF.md              # The orchestration bridge for Antigravity-to-Claude async messaging
```

---

## 5. Security & Isolation Constraints
Because the platform deals with active pentesting commands, it enforces the following:
- **Sandbox Airgap**: All scenario environments operate on internal Docker networks (`internal: true`). They have zero outbound access to the real internet (0.0.0.0/0 is locked).
- **No Malicious Source Files**: The backend orchestrates known exploit techniques conceptually. Real ransomware payloads or functional botnets do not exist in the source code.
- **Socratic Monitoring**: The OpenRouter engine reading user keystrokes is gated. It cannot hallucinate full attack chains for the user, but rather guides them via Level 1 to Level 3 conceptual hints.

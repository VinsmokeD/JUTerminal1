# CyberSim Project Complete Architecture & Ecosystem Guide

## 1. Project Concept
**CyberSim** is a dual-perspective, browser-based cybersecurity training platform designed for university students. It operates entirely safely through isolated Docker containers. The platform offers two primary workspaces:
- **Red Team Space**: A terminal (powered by xterm.js) that directly interfaces with a Kali Linux sandbox container to execute real pentesting techniques against deliberately vulnerable mock infrastructure.
- **Blue Team Space**: A live SIEM (Security Information and Event Management) feed reacting dynamically to the Red Team's terminal actions. 

Instead of pre-scripted events, students run live methodologies. To enhance the learning experience, an AI Monitor parses command logic and provides Socratic-style hints to guide students without handing them direct answers.

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

### C. Gemini (The Project Architect & Monitor)
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
5. **Validation Tracker**: All agents update `CONTINUOUS_STATE.md`. Antigravity then marks the phase as `✅ Done` in `phases.md` and begins orchestrating the next objective.

---

## 4. Technical Architecture & Folder Structure
```text
cybersim/
├── frontend/ (React / Vite / Tailwind)
│   ├── src/components/terminal/   # Houses xterm.js syncing WS streams to Docker
│   ├── src/components/siem/       # Reads Blue Team alerts from Redis Pub/Sub
│   └── src/store/                 # Zustand state management handling WS reactivity
│
├── backend/ (FastAPI / Python 3.11)
│   ├── src/main.py                # App entrypoint tying all subsystems together
│   ├── src/sandbox/               # The Docker SDK manager converting WebSocket to Python `docker exec` streams
│   ├── src/siem/                  # Event Engine mapping specific attacker actions to Redis-published IT alerts
│   ├── src/scenarios/             # Scenario State Machine validating milestones
│   └── src/ai/                    # Gemini Flash integration examining the terminal buffer
│
├── infrastructure/ (The Sandbox Physics)
│   ├── docker/scenarios/          # Extremely isolated internal bridge networks. Subnets (172.20.X.X) per level
│   │   ├── sc01 (Web App)         # Target 1: NovaMed Vulnerable Web Node
│   │   ├── sc02 (Act. Directory)  # Target 2: Nexora AD Domain Controller
│   │   └── sc03...                # Remaining Scenarios
│   └── nginx/                     # Reverse proxy separating /api and /ws layers
│
├── docs/ (Global Nervous System)
│   ├── architecture/
│   │   ├── phases.md              # The absolute step-by-step master progression tracker
│   │   ├── CONTINUOUS_STATE.md    # The Global Brain / Cross-Agent Memory log
│   │   └── agent-alignment-and-efficiency-update.md # Rules definition for efficient token usage
│   └── scenarios/                 # Specific logic definitions and constraints to be processed by engines
│
├── .env.example                   # Security mappings and API tokens
├── docker-compose.yml             # System skeleton initializing the microservices
└── CLAUDE_HANDOFF.md              # The orchestration bridge for Antigravity-to-Claude async messaging
```

---

## 5. Security & Isolation Constraints
Because the platform deals with active pentesting commands, it enforces the following:
- **Sandbox Airgap**: All scenario environments operate on internal Docker networks (`internal: true`). They have zero outbound access to the real internet (0.0.0.0/0 is locked).
- **No Malicious Source Files**: The backend orchestrates known exploit techniques conceptually. Real ransomware payloads or functional botnets do not exist in the source code.
- **Socratic Monitoring**: The Gemini engine reading user keystrokes is gated. It cannot hallucinate full attack chains for the user, but rather guides them via Level 1 to Level 3 conceptual hints.

# CyberSim — Dual-Perspective Cybersecurity Training Platform

> 🎓 **Educational Platform for Penetration Testing & SOC Analysis**
>
> CyberSim is a graduation project that teaches cybersecurity through realistic, sandboxed, AI-monitored scenarios. Students practice real attack techniques on isolated Docker containers while defenders analyze security events in real-time. No real systems are harmed.

[![Build Status](https://github.com/YOUR_USERNAME/cybersim/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/cybersim/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![Node.js 18+](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

---

## 🚀 Quick Start

### 1️⃣ Setup (2 minutes)
```bash
git clone https://github.com/YOUR_USERNAME/cybersim.git
cd cybersim
cp .env.example .env
# Edit .env: set GEMINI_API_KEY (from Google AI Studio)
```

### 2️⃣ Build Containers (5 minutes)
```bash
docker build -t cybersim-kali:latest ./infrastructure/docker/kali/
docker build -t cybersim-backend:latest ./backend/
docker build -t cybersim-frontend:latest ./frontend/
```

### 3️⃣ Start Services (2 minutes)
```bash
docker-compose up -d
# Wait 30-60 seconds for services to be healthy
docker-compose ps
```

### 4️⃣ Access Platform
- **Web Interface**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **WebSocket**: ws://localhost:8000/ws

👉 **[Full Setup Guide](docs/GETTING_STARTED.md)** | **[Detailed Installation](docs/SETUP.md)**

---

## 📚 Key Features

### For Students (Red Team)
- 🔴 **Interactive Kali Terminal**: Real-time command execution with xterm.js
- 🧠 **AI Tutor System**: Context-aware hints powered by Gemini Flash
- 📝 **Guided Note-Taking**: Phase-based templates for penetration testing methodology
- 🎯 **Mission Briefing**: Network diagrams, objectives, and attack surface overview
- 🏆 **Performance Scoring**: Real-time score calculation with detailed feedback

### For Educators (Blue Team)
- 🟦 **Live SIEM Console**: Watch attacker actions in real-time
- 🔍 **Event Investigation**: Interactive event list with JSON expansion
- 📋 **IR Playbooks**: Pre-built incident response procedures
- 📊 **Debrief Reports**: Comprehensive attack timeline and findings
- 📈 **Skill-Adaptive Difficulty**: Personalized hints by experience level (Beginner/Intermediate/Experienced)

---

## 🎮 Five Training Scenarios

| ID | Scenario | Focus Area | Techniques | Difficulty |
|----|----------|-----------|-----------|-----------|
| **SC-01** | **NovaMed Healthcare Portal** | Web Application Pentesting | SQLi, LFI, IDOR, File Upload | Intermediate |
| **SC-02** | **Nexora Financial AD** | Active Directory Compromise | Kerberoasting, DCSync, Lateral Movement | Advanced |
| **SC-03** | **Orion Logistics Phishing** | Initial Access & Social Engineering | OSINT, Phishing, Social Engr | Intermediate |
| **SC-04** | **StratoStack Cloud Audit** | Cloud Security (AWS Simulated) | S3 Enumeration, IAM Privesc, SSRF | Advanced |
| **SC-05** | **Veridian Ransomware IR** | Incident Response & Forensics | Log Analysis, Kill Chain, Remediation | Advanced |

Each scenario runs **both perspectives simultaneously** — attackers use Kali, defenders analyze SIEM events in real-time.

---

## 🏗 Architecture Overview

```
┌─────────────────┐         ┌─────────────────┐
│  Student (Red)  │         │  Educator (Blue)│
│   Kali Terminal │         │     SIEM Feed   │
└────────┬────────┘         └────────┬────────┘
         │                           │
         └─────────────┬─────────────┘
                       │ WebSocket
        ┌──────────────▼──────────────┐
        │   Backend (FastAPI)         │
        │  - Terminal Proxy           │
        │  - Event Engine             │
        │  - AI Monitor (Gemini)      │
        │  - Scenario Engine          │
        └──────────────┬──────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    ┌───▼───┐    ┌─────▼──┐    ┌─────▼────┐
    │PostgreSQL│    │Redis  │    │Docker    │
    │(Session)│    │(Events)│   │(Targets) │
    └─────────┘    └────────┘    └──────────┘
```

- **Terminal**: xterm.js → WebSocket → Docker exec API
- **SIEM Events**: Command parsing → Event mapping → Real-time pub/sub
- **AI Monitor**: Gemini Flash with scenario context & student discovery state
- **Isolation**: Each scenario runs in isolated Docker network (172.20.X.0/24)

👉 **[Full Architecture](docs/ARCHITECTURE.md)** | **[Technical Deep Dive](docs/architecture/MASTER_BLUEPRINT.md)**

---

## 📖 Documentation

- **[📚 Documentation Index](docs/INDEX.md)** — Complete documentation map
- **[🚀 Getting Started](docs/GETTING_STARTED.md)** — First-time setup
- **[🔧 Development Guide](docs/DEVELOPMENT.md)** — Setup & coding conventions
- **[🏗 Architecture](docs/ARCHITECTURE.md)** — System design & data flow
- **[📦 Deployment](docs/DEPLOYMENT.md)** — Production deployment guide
- **[🎓 Scenarios](docs/scenarios/)** — Detailed scenario specifications
- **[📊 Reports](docs/)** — Status reports & audit findings

---

## 🛠 Tech Stack

**Frontend**
- React 18 with Functional Components
- Vite for fast development
- Tailwind CSS for styling
- xterm.js for terminal emulation
- Zustand for state management

**Backend**
- FastAPI with async/await
- SQLAlchemy ORM + PostgreSQL
- Redis for real-time messaging
- google-generativeai (Gemini Flash)
- aioredis for async Redis

**Infrastructure**
- Docker for containerization
- Docker Compose for orchestration
- Nginx for reverse proxy
- Postgres 15 for persistent storage
- Redis 7 for caching & messaging

---

## 🔐 Security Features

✅ **Isolated Containers** — Attack targets run in isolated Docker networks  
✅ **No Internet Egress** — Containers cannot reach the internet  
✅ **JWT Authentication** — Secure session management  
✅ **Input Validation** — Pydantic validation on all inputs  
✅ **Parameterized Queries** — Protection against SQL injection  
✅ **Read-Only Volumes** — Filesystem protection  
✅ **Resource Limits** — CPU & memory constraints per container  

---

## 🚀 Getting Started Locally

### Prerequisites
- Docker Desktop (Windows/Mac) or Docker + Docker Compose (Linux)
- Node.js 18+
- Python 3.11+
- 4GB+ RAM available
- Google AI Studio API key (free tier)

### Development Workflow

```bash
# 1. Clone repo
git clone https://github.com/YOUR_USERNAME/cybersim.git
cd cybersim

# 2. Install dependencies
pip install -r backend/requirements.txt
npm install --prefix frontend

# 3. Set up environment
cp .env.example .env
# Edit .env with your API keys

# 4. Start dev servers
# Terminal 1: Backend
cd backend && uvicorn src.main:app --reload

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Database/Cache (Docker)
docker-compose up postgres redis
```

👉 **[Full Development Guide](docs/DEVELOPMENT.md)**

---

## 📋 Project Status

**Current Phase**: Phase 0-16 Complete  
- ✅ Project architecture finalized
- ✅ All 5 scenarios designed & implemented
- ✅ Terminal proxy & SIEM engine working
- ✅ AI monitor with Gemini Flash integrated
- ✅ Platform redesign (layered experience) complete
- ✅ Blue Team workspace fully functional
- 🔄 Deployment & scaling (in progress)

See [Project Status](docs/architecture/CURRENT_STATUS_REPORT.md) for details.

---

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch** — `git checkout -b feature/amazing-feature`
3. **Make your changes** — follow [Code Conventions](docs/CONVENTIONS.md)
4. **Commit with conventional commits** — `git commit -m "feat: add new scenario"`
5. **Push to branch** — `git push origin feature/amazing-feature`
6. **Open a Pull Request**

See [Git Workflow](docs/GIT_WORKFLOW.md) for more details.

---

## 📝 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) file.

---

## 👥 Authors & Credits

**Graduation Project** by Mahmoud Younis  
**Advisor**: [Your Advisor Name]  
**University**: [Your University]  

### Technology Credits
- Built with [FastAPI](https://fastapi.tiangolo.com/), [React](https://react.dev/), [Docker](https://www.docker.com/)
- AI powered by [Google Gemini Flash](https://ai.google.dev/)
- Terminal emulation by [xterm.js](https://xtermjs.org/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)

---

## 📞 Support & Questions

- **📖 Documentation**: [docs/INDEX.md](docs/INDEX.md)
- **🐛 Report Bugs**: [GitHub Issues](https://github.com/YOUR_USERNAME/cybersim/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/cybersim/discussions)
- **📧 Email**: [Your Email]

---

## 🎯 Next Steps

1. **[Quick Start](docs/GETTING_STARTED.md)** — Get up and running in 5 minutes
2. **[Run a Scenario](docs/scenarios/)** — Try SC-01 (beginner-friendly)
3. **[Explore the Code](docs/ARCHITECTURE.md)** — Understand how it works
4. **[Deploy to Production](docs/DEPLOYMENT.md)** — Take it live

---

**Made with ❤️ for cybersecurity education**
- **Notes**: structured pentest/IR notebook → auto-generates final report

---

## Framework alignment

| Framework | Usage |
|-----------|-------|
| MITRE ATT&CK | Every step tagged with technique ID |
| PTES | Default red team methodology |
| OWASP Testing Guide v4.2 | SC-01 web app assessment |
| NIST CSF / 800-61 | Blue team IR phases |
| CVSS v3.1 | All findings scored |

---

## Cost — $0 for students

All components use free tiers: Docker, Kali Linux, LocalStack, Splunk Free,
Gemini Flash (15 req/min, 1M tokens/day free tier). No paid services required.

---

## Development with Claude Code + Antigravity

```bash
cat CLAUDE.md                          # project context for Claude Code
cat .antigravity-rules.md              # Antigravity planning rules
cat docs/architecture/phases.md        # 14-phase development roadmap
git log --oneline -5                   # current state
```

Always give Claude Code one phase at a time. Antigravity tracks progress across sessions.
After each phase: `git add -A && git commit && git push`

---

## Security model

All attack capabilities operate exclusively against isolated Docker bridge networks
with `--internal` flag (no internet access). Follows the same model as TryHackMe,
HackTheBox, and SANS NetWars. See `docs/architecture/network-and-environment.md`.

---

## Project structure

```
cybersim/
├── CLAUDE.md                    ← Claude Code context file
├── .antigravity-rules.md        ← Antigravity agent rules
├── docker-compose.yml
├── .env.example
├── backend/                     ← FastAPI + Python 3.11
│   └── src/
│       ├── main.py              ← App entrypoint (all routers registered)
│       ├── config.py            ← Settings from .env
│       ├── ai/monitor.py        ← Gemini Flash integration
│       ├── auth/routes.py       ← JWT login/register
│       ├── db/database.py       ← SQLAlchemy models + init
│       ├── cache/redis.py       ← Redis pub/sub + cache
│       ├── scenarios/           ← Scenario loader + hint engine
│       ├── sessions/routes.py   ← Session lifecycle + ROE ack
│       ├── notes/routes.py      ← Pentest/IR notebook CRUD
│       ├── siem/engine.py       ← Command → SIEM event mapping
│       ├── siem/events/         ← Per-scenario event maps (JSON)
│       ├── sandbox/terminal.py  ← Docker exec proxy
│       ├── sandbox/manager.py   ← Container lifecycle
│       ├── scoring/engine.py    ← Points + hint penalties
│       ├── reports/generator.py ← Markdown report templates
│       └── ws/routes.py         ← WebSocket manager
├── frontend/                    ← React + Vite + Tailwind
│   └── src/
│       ├── pages/               ← Auth, Dashboard, RedWorkspace,
│       │                           BlueWorkspace, Debrief
│       ├── components/          ← Terminal, SiemFeed, Notebook,
│       │                           AiHintPanel, PhaseTrail, RoeBriefing
│       ├── hooks/               ← useWebSocket, useTerminal
│       ├── store/               ← Zustand: authStore, sessionStore
│       └── lib/api.js           ← Axios client
├── infrastructure/
│   ├── nginx/nginx.conf         ← Reverse proxy + WS upgrade
│   ├── postgres/init.sql        ← DB extensions
│   └── docker/
│       ├── kali/Dockerfile      ← Kali with all pentest tools
│       └── scenarios/
│           ├── sc01/            ← NovaMed webapp (PHP+Apache+MySQL)
│           ├── sc02/            ← Nexora AD (Samba4)
│           ├── sc04/            ← LocalStack AWS simulation
│           └── sc05/            ← Splunk + simulated event logs
├── ai-monitor/system_prompt.md  ← Gemini system prompt (all 5 scenarios)
└── docs/
    ├── SETUP.md                 ← Complete setup guide
    ├── architecture/
    │   ├── phases.md            ← 14-phase dev roadmap
    │   └── network-and-environment.md
    └── scenarios/
        ├── SC-01-webapp-pentest.md   ← Full SC-01 spec
        └── SC-02-05-specs.md         ← Full SC-02–05 specs
```

---

## License

MIT — Educational use. Attribution required in academic submissions.

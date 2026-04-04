# CyberSim — Dual-Perspective Cybersecurity Training Platform

A graduation project that teaches penetration testing and SOC analysis through realistic,
sandboxed, AI-monitored scenarios. Every attacker action mirrors in real time on the
defender's SIEM. All attack targets are isolated Docker containers — no real systems touched.

---

## Quick start

```bash
git clone https://github.com/YOUR_USERNAME/cybersim.git
cd cybersim
cp .env.example .env          # edit: set GEMINI_API_KEY and JWT_SECRET
docker build -t cybersim-kali:latest ./infrastructure/docker/kali/
docker compose up -d postgres redis backend frontend nginx
open http://localhost
```

Full setup guide → [docs/SETUP.md](docs/SETUP.md)

---

## The five scenarios

| ID | Scenario | Attack focus | Difficulty |
|----|----------|-------------|-----------|
| SC-01 | NovaMed Healthcare Portal | SQLi, LFI, IDOR, file upload | Intermediate |
| SC-02 | Nexora Financial AD | Kerberoasting, DCSync, lateral movement | Advanced |
| SC-03 | Orion Logistics Phishing | OSINT, social engineering, initial access | Intermediate |
| SC-04 | StratoStack Cloud Audit | AWS S3, IAM privesc, SSRF | Advanced |
| SC-05 | Veridian Ransomware IR | Full kill chain + incident response | Advanced |

Each scenario runs both sides simultaneously — attackers see Kali, defenders see SIEM
events firing in real time from attacker actions.

---

## Platform architecture

```
Browser → nginx → FastAPI backend → Docker scenario containers
                                  → Postgres (session state)
                                  → Redis (real-time events)
                                  → Gemini Flash (AI monitor)
```

- **Terminal**: xterm.js → WebSocket → Docker exec API → Kali container
- **SIEM**: attacker command → event map → Redis pub/sub → defender panel
- **AI monitor**: every command → Gemini Flash → learning hint (rate limited)
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

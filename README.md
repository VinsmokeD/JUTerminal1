# CyberSim

CyberSim is a dual-perspective cybersecurity training platform for university labs. Students work through safe, Docker-isolated scenarios as Red Team operators while Blue Team analysts watch the matching security telemetry, write notes, triage events, and review a debrief timeline.

The current MVP is intentionally focused on three high-fidelity scenarios:

| ID | Scenario | Focus |
| --- | --- | --- |
| SC-01 | NovaMed Healthcare | Web application pentest with OWASP-style findings |
| SC-02 | Nexora Financial | Samba4 Active Directory compromise and detection |
| SC-03 | Orion Logistics | Phishing campaign, simulated endpoint activity, and SOC response |

All attack activity is designed for isolated Docker networks only. CyberSim is not a tool for testing real systems.

## Current Verification Status

Last verified locally on 2026-04-29:

| Area | Status | Evidence |
| --- | --- | --- |
| Docker Compose configuration | Working | `docker compose config --quiet` completed successfully |
| Backend pytest suite | Working | `python -m pytest -p no:cacheprovider` passed: 79 tests |
| Frontend dependencies | Working | `npm install` completed successfully with 0 host vulnerabilities |
| Frontend production build | Working | `npm run build` completed successfully |
| Runtime health | Working | `GET /health` returned `{"status":"ok","version":"0.1.0"}` |
| Scenario catalog | Working | `GET /api/scenarios` returns exactly SC-01, SC-02, and SC-03 |
| Red-to-Blue event loop | Working | Authenticated WebSocket command generated a persisted SIEM event visible in Blue Team |
| Manual xterm keystroke smoke | Pending human check | Automation can focus xterm but cannot reliably synthesize keystrokes into the terminal canvas |

## Quick Start

Prerequisites:

- Docker Desktop or Docker Engine with Compose v2
- Node.js 18 or newer for local frontend development
- Python 3.11 for local backend development
- A Google AI Studio key for Gemini hints

Configure the environment:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set at least:

```env
GEMINI_API_KEY=your_google_ai_studio_key_here
JWT_SECRET=replace_with_a_generated_64_character_hex_secret
POSTGRES_PASSWORD=change_this_password
```

Start the core platform:

```powershell
docker compose up -d postgres redis elasticsearch filebeat backend frontend nginx
```

Open:

- Web app: http://localhost
- Backend health: http://localhost/health
- API docs in development: http://localhost/api/docs
- Direct backend port: http://localhost:8001

Start scenario targets only when needed:

```powershell
docker compose --profile sc01 up -d
docker compose --profile sc02 up -d
docker compose --profile sc03 up -d
```

## Local Development

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Verification commands:

```powershell
docker compose config
cd backend; python -m pytest
cd frontend; npm run build
```

Load tests are run separately with Locust:

```powershell
locust -f backend/tests/load_test.py --host=http://localhost
```

## Architecture

```text
Browser
  | HTTP + WebSocket
  v
Nginx reverse proxy
  | /api, /ws
  v
FastAPI backend
  |-- PostgreSQL: users, sessions, notes, reports
  |-- Redis: terminal history, SIEM pub/sub, AI throttling
  |-- Elasticsearch/Filebeat: log ingestion path
  |-- Docker SDK: Kali and scenario container lifecycle
  v
Internal scenario networks
  |-- SC-01: web app target
  |-- SC-02: Samba4 AD + file server
  |-- SC-03: GoPhish + mail relay + victim simulator
```

The frontend is React/Vite/Tailwind with Zustand stores, xterm.js for the terminal, and workspace pages for Red Team, Blue Team, Instructor, and Debrief flows. The backend is FastAPI with SQLAlchemy async, JWT auth, scenario loaders, SIEM event mapping, AI hints, scoring, reports, and instructor routes.

## Documentation

Start with [docs/README.md](docs/README.md). The core maintained docs are:

- [Architecture](docs/ARCHITECTURE.md)
- [Features](docs/FEATURES.md)
- [Setup](docs/SETUP.md)
- [AI System](docs/AI_SYSTEM.md)
- [Roadmap](docs/ROADMAP.md)
- [Contributing](docs/CONTRIBUTING.md)
- [Agent Context](docs/AGENT_CONTEXT.md)

Historical reports and agent handoff files remain in the repo for continuity, but the files above are the public project documentation set.

## Security Rules

- Never test against real external systems from CyberSim.
- Never commit `.env` or real API keys.
- Keep scenario networks internal and isolated.
- Keep exploit behavior educational and scoped to local containers.
- Rotate any local key that has been displayed in terminal output or shared logs.

## Project Score

Current assessed completion: 95/100.

CyberSim is defense-ready for the core graduation demo path once the final human xterm keystroke smoke check is performed at the keyboard. The main remaining polish is live-demo rehearsal and any small UX friction discovered during that uninterrupted run.

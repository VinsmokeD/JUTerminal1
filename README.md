# Parallax

Parallax is a dual-perspective cybersecurity training platform for university labs. Students work through safe, Docker-isolated scenarios as Red Team operators while Blue Team analysts watch the matching security telemetry, write notes, triage events, and review a debrief timeline.

The current MVP is intentionally focused on three high-fidelity scenarios:

| ID | Scenario | Focus |
| --- | --- | --- |
| SC-01 | NovaMed Healthcare | Web application pentest with OWASP-style findings |
| SC-02 | Nexora Financial | Samba4 Active Directory compromise and detection |
| SC-03 | Orion Logistics | Phishing campaign, simulated endpoint activity, and SOC response |

All attack activity is designed for isolated Docker networks only. Parallax is not a tool for testing real systems.

## New here? Start with the Complete Setup Guide

If you are setting up Parallax on a new machine for the first time, follow
**[SETUP_GUIDE.md](SETUP_GUIDE.md)** — a zero-to-running, beginner-proof walkthrough
covering WSL 2, Docker Desktop, the Kali image, the full stack, verification, and
troubleshooting. It includes a one-command bootstrap:

```powershell
# Windows (PowerShell), from the repo root after cloning
.\scripts\setup-windows.ps1
```

```bash
# macOS / Linux
bash scripts/setup.sh
```

## Current Verification Status

Last verified locally on 2026-05-14:

| Area | Status | Evidence |
| --- | --- | --- |
| Docker Compose configuration | Working | `docker compose config --quiet` completed successfully |
| Backend pytest suite | Working | `python -m pytest -p no:cacheprovider backend/tests` passed: 81 tests |
| Frontend dependencies | Working | `npm install` completed successfully with 0 host vulnerabilities |
| Frontend production build | Working | `npm run build` completed successfully |
| Runtime health | Working | `GET /health` returned `{"status":"ok","version":"0.1.0"}` |
| Scenario catalog | Working | `GET /api/scenarios` returns exactly SC-01, SC-02, and SC-03 |
| Red-to-Blue event loop | Working | Authenticated WebSocket command generated a persisted SIEM event visible in Blue Team |
| Terminal WebSocket smoke | Working | Authenticated SC-01 WebSocket attached to Kali and returned live PTY output for an early raw-input command |
| Manual browser xterm check | Recommended before demos | Sit at the browser and type one command into xterm to confirm physical keyboard focus on the presentation machine |

## Quick Start

```bash
git clone <repo>
cd JUTerminal1
cp .env.example .env
# Edit .env: set JWT_SECRET, OPENROUTER_API_KEY
docker compose up -d
# App: http://localhost:3000  |  API: http://localhost:8001/api/docs

# REQUIRED for a real Red Team terminal (~6-15 min, ~9 GB image).
# Without this image the terminal runs in mock mode (commands still drive
# SIEM/AI/scoring, but do not execute in a real shell).
docker build -t parallax-kali:latest infrastructure/docker/kali
```

Parallax uses OpenRouter for the AI monitor. The default budget/performance model is `deepseek/deepseek-chat-v3-0324`.

## Database Migrations

Production deployments should apply the schema before starting FastAPI:

```bash
cd backend
alembic upgrade head
```

`init_db()` only bootstraps tables in `development` and `test`; production relies on Alembic as the schema source of truth.

## Starting Scenarios

```bash
docker compose --profile sc01 up -d   # NovaMed Healthcare (Web App Pentest)
docker compose --profile sc02 up -d   # Nexora Financial (Active Directory)
docker compose --profile sc03 up -d   # Orion Logistics (Phishing)
```

## Default Credentials

```text
Instructor: admin / ParallaxAdmin!
Students:   self-register at /auth
```

## Pre-Demo Readiness Check

```bash
python scripts/demo_check.py --scenarios all
```

## Architecture (one paragraph)

React frontend -> FastAPI backend -> isolated Docker scenario networks. Terminal keystrokes proxy through the backend to Kali containers via Docker exec API. Attack telemetry flows Filebeat -> Elasticsearch; a Sigma-rule engine polls ES every 2 s and emits matched events to the browser over WebSocket. Scenarios run on internal-only Docker networks (172.20.x.0/24) with no internet access.

## Known Limitations

- Kali image build takes 5-15 minutes on first pull (large layer).
- Elasticsearch requires >= 2 GB RAM on the Docker host.
- SC-02 domain controller needs ~90 s to provision on first start.
- SC-03 e2e test is marked `@pytest.mark.e2e` and requires a live stack.

## Running Tests

```bash
cd backend
python -m pytest --ignore=tests/e2e -q          # unit tests
python -m pytest -m e2e tests/e2e/              # e2e (needs Docker SC-02)
```

Load tests are run separately with Locust:

```bash
locust -f backend/tests/load_test.py --host=http://localhost
```

## Demo-Day HTTPS Deployment

For the graduation-defense version, use the checked-in demo deployment layer instead of manually translating the runbook:

```bash
# On a fresh Ubuntu 24.04 VPS as root
PARALLAX_DOMAIN=demo.example.com bash scripts/demo-bootstrap.sh
cd /opt/parallax
nano .env
bash scripts/demo-deploy.sh
```

The demo layer is:

- `docker-compose.demo.yml` adds Caddy on ports 80/443 and disables the local Nginx proxy.
- `infrastructure/caddy/Caddyfile` routes `/api`, `/ws`, and `/health` to FastAPI and all other paths to the React frontend.
- `.env.demo.example` documents the demo-only environment values.
- `scripts/demo-healthcheck.sh` verifies Compose config plus the public health and scenario endpoints.
- `scripts/demo-day-check.sh` is the morning-of status check for containers, public health, TLS, logs, disk, and memory.
- `scripts/demo-recover.sh soft` restarts only Caddy/backend/frontend if the live demo looks stuck.
- `scripts/demo-local-rehearsal.ps1` starts the full local stack on Windows and checks `localhost` before you rehearse.

If you do not own a domain yet, omit `PARALLAX_DOMAIN`; the bootstrap script creates an `sslip.io` hostname from the VPS public IP.

## Documentation

Start with [docs/README.md](docs/README.md). The core maintained docs are:

- [Complete Setup Guide (zero to running)](SETUP_GUIDE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Features](docs/FEATURES.md)
- [Setup](docs/SETUP.md)
- [Team Setup Guide](docs/TEAM_SETUP_GUIDE.md)
- [AI System](docs/AI_SYSTEM.md)
- [Product Evolution Plan](docs/product/PRODUCT_EVOLUTION_PLAN.md)
- [Roadmap](docs/ROADMAP.md)
- [Contributing](docs/CONTRIBUTING.md)
- [Agent Context](docs/AGENT_CONTEXT.md)

Historical reports and agent handoff files remain in the repo for continuity, but the files above are the public project documentation set.

## Security Rules

- Never test against real external systems from Parallax.
- Never commit `.env` or real API keys.
- Keep scenario networks internal and isolated.
- Keep exploit behavior educational and scoped to local containers.
- Rotate any local key that has been displayed in terminal output or shared logs.

## Project Score

Current assessed completion: 98/100.

Parallax is defense-ready for the core graduation demo path. Before presenting live, perform one physical browser xterm keyboard check and one uninterrupted rehearsal on the presentation machine.

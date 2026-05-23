# CyberSim Maintainer and Operations Manual

## 1. Purpose

This manual gives the demo operator, teaching assistant, or system maintainer a practical checklist for installing, verifying, running, and recovering CyberSim. It supports Chapter 6 of the formal report and should be included as an appendix in the final documentation package.

## 2. Supported Deployment Model

The verified MVP deployment is a single-node Docker Compose stack. The local stack includes:

- React frontend served from a containerized web server.
- FastAPI backend.
- PostgreSQL.
- Redis.
- Elasticsearch and Filebeat.
- Local reverse proxy.
- Scenario profile containers for SC-01, SC-02, and SC-03.
- Docker-managed Kali/session containers created by the backend.

The local stack is intended for university labs and defense demonstrations. Larger multi-host deployments are future work.

## 3. Required Software

| Requirement | Purpose |
| --- | --- |
| Docker Desktop or Docker Engine with Compose v2 | Runs the full stack and scenario networks |
| Git | Clones and updates the repository |
| Modern browser | Opens the CyberSim frontend |
| Python 3.11 or compatible development environment | Runs local scripts and backend tests when needed |
| Node.js 18 or newer | Runs frontend lint/build commands outside Docker when needed |

## 4. Environment Preparation

Create a local environment file from the example:

```bash
cp .env.example .env
```

Required values:

| Variable | Purpose |
| --- | --- |
| `JWT_SECRET` | Signs local authentication tokens |
| `OPENROUTER_API_KEY` | Enables live AI tutor calls when available |
| `OPENROUTER_MODEL` | Selects the AI model used by the monitor |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Configure the local database |

Do not commit `.env` or screenshots that reveal real secrets.

## 5. Starting the Stack

Start the core stack:

```bash
docker compose up -d
```

Start a scenario profile only when needed:

```bash
docker compose --profile sc01 up -d
docker compose --profile sc02 up -d
docker compose --profile sc03 up -d
```

Use only the scenario profile required for the lab when host resources are limited.

## 6. Verifying Readiness

Run the static Compose check:

```bash
docker compose config --quiet
```

Run the demo readiness check:

```bash
python scripts/demo_check.py --scenarios all
```

If a scenario profile is not running, the scenario-specific checks can fail even when the core stack is healthy. For a core-only check, run:

```bash
python scripts/demo_check.py
```

## 7. Browser Verification

Before a live defense or lab:

1. Open `http://localhost:3000`.
2. Register or sign in.
3. Open the Dashboard.
4. Start the assigned scenario.
5. Confirm the Red Team terminal connects.
6. Submit one harmless lab-scoped command.
7. Confirm the Blue Team feed and notes panels render.
8. Capture screenshots only after redacting secrets and student-specific private data.

## 8. Recovery Playbook

| Symptom | First response | Escalation |
| --- | --- | --- |
| Frontend does not load | Check `docker compose ps frontend` | Rebuild frontend container |
| Backend API fails | Check `docker compose logs backend` | Restart backend and rerun readiness |
| Database unhealthy | Check `postgres` health and volume state | Restart core services after backup decision |
| Redis unavailable | Restart `redis` and backend | Clear stale sessions only if instructed |
| Elasticsearch yellow/red | Check memory availability | Restart Elasticsearch and Filebeat |
| Scenario service unhealthy | Restart only that profile | Rebuild that scenario image |
| Terminal does not attach | Check backend logs and Docker socket access | Restart backend, then session container |

Avoid deleting Docker volumes during a graded session unless the instructor accepts data loss.

## 9. Evidence Capture

For the final report, capture:

- `git status --short`.
- `git rev-parse --short HEAD`.
- `docker compose config --quiet`.
- Backend test output.
- Frontend lint/build output.
- Demo readiness output.
- Browser screenshots of Dashboard, Red Workspace, Blue Workspace, Debrief, and Instructor Dashboard.

Store evidence under `docs/final-report/evidence/` and summarize it in the formal report.

## 10. Safety Checks

Before publishing documentation:

- Confirm scenario networks are `internal: true`.
- Confirm screenshots do not expose `.env`, API keys, tokens, hashes, or lab-only secrets.
- Confirm report prose does not include exact offensive solution chains.
- Confirm generated evidence refers only to CyberSim lab targets.
- Confirm the final Canva visual report no longer contains generic placeholder business text.

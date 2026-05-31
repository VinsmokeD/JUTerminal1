# Parallax Team Setup Guide

This guide is the repeatable setup path for every team member machine. Use it when a teammate pulls the project for the first time, moves to a new laptop, or needs to restore a clean local demo stack.

Parallax runs as a single-node Docker Compose lab. The browser, FastAPI backend, Postgres, Redis, Elasticsearch/Filebeat, Nginx, Kali session containers, and SC-01 through SC-03 scenario targets all run on the same Docker host. Scenario networks are intentionally internal-only and must not be used against real systems.

## 1. Supported Local Machines

Use one of these environments:

| OS | Recommended runtime | Notes |
| --- | --- | --- |
| Windows 10/11 | Docker Desktop with WSL 2 backend | Use PowerShell from the repo root. Keep the repo in a stable local folder such as `C:\dev\JUTerminal1` if cloud-sync paths cause bind-mount issues. |
| macOS | Docker Desktop | Allocate enough memory in Docker Desktop before starting Elasticsearch and scenarios. |
| Linux | Docker Engine 24+ with Compose v2 plugin | Use the standard rootful Docker socket for the local lab. Rootless Docker may block the backend Docker SDK flow. |

Minimum practical resources:

| Resource | Minimum | Recommended |
| --- | --- | --- |
| RAM | 8 GB | 16 GB or more |
| Docker memory allocation | 6 GB | 8 GB or more |
| CPU | 4 cores | 6 cores or more |
| Disk | 20 GB free | 40 GB free |

## 2. Install Prerequisites

Install these on every machine:

- Git
- Docker Desktop or Docker Engine with `docker compose`
- Node.js 18 or newer, preferably the current LTS
- Python 3.11 for host-side tests and backend development
- An OpenRouter API key if the teammate needs live OpenRouter hints

Check the tools:

```powershell
git --version
docker --version
docker compose version
node --version
npm --version
python --version
```

Bash equivalent:

```bash
git --version
docker --version
docker compose version
node --version
npm --version
python3 --version
```

Windows notes:

- Enable the WSL 2 backend in Docker Desktop.
- In Docker Desktop, set Resources to at least 6 GB memory.
- If `python --version` is not Python 3.11, install Python 3.11 and use `py -3.11`.
- If PowerShell treats `curl` as an alias, use `Invoke-RestMethod` for API checks.

Linux notes:

- Add your user to the `docker` group if Docker commands require sudo.
- Log out and back in after changing Docker group membership.
- Confirm `/var/run/docker.sock` exists, because the backend mounts it read-only to create Kali session containers.

## 3. Clone The Repository

```powershell
git clone https://github.com/VinsmokeD/JUTerminal1.git
cd JUTerminal1
git checkout master
git pull --ff-only origin master
```

Bash:

```bash
git clone https://github.com/VinsmokeD/JUTerminal1.git
cd JUTerminal1
git checkout master
git pull --ff-only origin master
```

Keep each teammate on the same branch and commit before a demo. Mixed commits make local behavior hard to compare.

## 4. Create The Local Environment File

Create `.env` from the example. Never commit `.env`.

PowerShell:

```powershell
Copy-Item .env.example .env
```

Bash:

```bash
cp .env.example .env
```

Generate a JWT secret.

PowerShell:

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToHexString($bytes).ToLower()
```

Bash:

```bash
openssl rand -hex 32
```

Edit `.env` and set at least:

```env
OPENROUTER_API_KEY=your_openrouter_key_here
OPENROUTER_MODEL=deepseek/deepseek-v4-pro
POSTGRES_USER=parallax
POSTGRES_PASSWORD=change_this_password
POSTGRES_DB=parallax
JWT_SECRET=replace_with_generated_64_character_hex_secret
ENVIRONMENT=development
```

If `OPENROUTER_API_KEY` is empty, the app still runs and explicit hints fall back to local Socratic guidance. Use a real key for the final demo path.

## 5. Build The Full Stack

GitHub contains the complete Docker build source for the platform:

- `docker-compose.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `infrastructure/nginx/nginx.conf`
- `infrastructure/docker/kali/`
- `infrastructure/docker/scenarios/sc01/`
- `infrastructure/docker/scenarios/sc02/`
- `infrastructure/docker/scenarios/sc03/`
- `infrastructure/docker/siem/filebeat.yml`
- `infrastructure/postgres/init.sql`

Docker images, containers, volumes, and generated cache folders are not committed. Each teammate rebuilds those local artifacts from the source files above.

Validate Compose first:

```powershell
docker compose config --quiet
```

Build every core and scenario image:

```powershell
docker compose --profile sc01 --profile sc02 --profile sc03 build
```

Bash uses the same commands:

```bash
docker compose config --quiet
docker compose --profile sc01 --profile sc02 --profile sc03 build
```

The first build can take several minutes. If it fails while downloading base images or packages, retry after confirming Docker Desktop or Docker Engine has network access.

## 6. Start Parallax Fully

Start the complete local platform, including all scenario target containers:

```powershell
docker compose --profile sc01 --profile sc02 --profile sc03 up -d
```

This starts:

- Core: `postgres`, `redis`, `elasticsearch`, `filebeat`, `backend`, `frontend`, `nginx`
- SC-01: `sc01-webapp`, `sc01-waf`
- SC-02: `sc02-dc`, `sc02-fileserver`
- SC-03: `sc03-mailrelay`, `sc03-phish`, `sc03-victim`

For lighter daily development, start only the core:

```powershell
docker compose up -d postgres redis elasticsearch filebeat backend frontend nginx
```

Then start one scenario profile when needed:

```powershell
docker compose --profile sc01 up -d
docker compose --profile sc02 up -d
docker compose --profile sc03 up -d
```

## 7. Verify The Machine

Check container state:

```powershell
docker compose ps
```

PowerShell API checks:

```powershell
Invoke-RestMethod http://localhost/health
Invoke-RestMethod http://localhost/api/scenarios
```

Bash API checks:

```bash
curl http://localhost/health
curl http://localhost/api/scenarios
```

Expected results:

- `/health` returns `{"status":"ok","version":"0.1.0"}`.
- `/api/scenarios` lists exactly `SC-01`, `SC-02`, and `SC-03`.
- The web app opens at `http://localhost`.
- Direct backend access is available at `http://localhost:8001`.
- Development API docs are available at `http://localhost/api/docs`.

For a demo machine, complete this manual browser smoke test:

1. Open `http://localhost`.
2. Register a student or log in.
3. Start SC-01.
4. Open the Red Team workspace.
5. Click the terminal and type one harmless scoped command against the lab target.
6. Confirm terminal output appears live.
7. Open the Blue Team workspace and confirm a related SIEM event appears.
8. Open Debrief and confirm the report and insights pages load.

Default local instructor account:

```text
username: admin
password: ParallaxAdmin!
```

Use this only for local development and demos. Do not expose this local stack beyond the team machine.

## 8. Run Local Developer Checks

Backend tests from the repo root:

```powershell
python -m pytest -p no:cacheprovider backend/tests
```

If Windows is using the launcher:

```powershell
py -3.11 -m pytest -p no:cacheprovider backend/tests
```

Frontend build:

```powershell
cd frontend
npm install
npm run build
cd ..
```

Bash equivalents:

```bash
python3.11 -m pytest -p no:cacheprovider backend/tests
cd frontend
npm install
npm run build
cd ..
```

Docker configuration check:

```powershell
docker compose config --quiet
```

Run these checks before pushing shared changes or before using a machine for a formal demo.

## 9. Daily Team Workflow

Before starting work:

```powershell
git checkout master
git pull --ff-only origin master
docker compose --profile sc01 --profile sc02 --profile sc03 build
docker compose --profile sc01 --profile sc02 --profile sc03 up -d
```

After pulling backend or frontend changes, restart the app containers:

```powershell
docker compose restart backend frontend nginx
```

After pulling Dockerfile or Compose changes, rebuild:

```powershell
docker compose --profile sc01 --profile sc02 --profile sc03 build
docker compose --profile sc01 --profile sc02 --profile sc03 up -d
```

After pulling database model changes, use a clean local data reset unless the change includes a migration path:

```powershell
docker compose --profile sc01 --profile sc02 --profile sc03 down --remove-orphans
docker compose down -v
docker compose --profile sc01 --profile sc02 --profile sc03 up -d
```

The `down -v` command deletes local Postgres, Redis, and Elasticsearch data. Use it only when resetting local lab state is acceptable.

## 10. Stop Or Reset The Stack

Stop all services but keep volumes:

```powershell
docker compose --profile sc01 --profile sc02 --profile sc03 down --remove-orphans
```

Reset all generated data:

```powershell
docker compose --profile sc01 --profile sc02 --profile sc03 down --remove-orphans
docker compose down -v
```

Remove stale Kali session containers if a terminal session gets stuck after code changes:

```powershell
docker ps -a --filter "name=kali-" --format "{{.Names}}"
```

Remove only Parallax Kali session containers that are safe to discard. Do not remove unrelated Docker containers.

## 11. Network And Port Map

Host ports:

| Port | Service | Purpose |
| --- | --- | --- |
| 80 | Nginx | Main web app, `/api`, and `/ws` |
| 8001 | Backend | Direct FastAPI access |
| 5432 | Postgres | Local database access |
| 6379 | Redis | Local Redis access |
| 9200 | Elasticsearch | Local SIEM index access |

Internal scenario networks:

| Network | Subnet | Purpose |
| --- | --- | --- |
| `parallax_sc01-net` | `172.20.1.0/24` | SC-01 web app lab |
| `parallax_sc02-net` | `172.20.2.0/24` | SC-02 AD lab |
| `parallax_sc03-net` | `172.20.3.0/24` | SC-03 phishing lab |
| `parallax_internal` | `172.30.0.0/24` | Core app services |

The scenario networks are `internal: true` by design. They should not have outbound internet.

If a VPN or local network conflicts with `172.20.0.0/16` or `172.30.0.0/24`, disconnect the VPN for demos or coordinate a deliberate Compose subnet change across the team. Do not change only `.env`; the Compose network subnets are explicit in `docker-compose.yml`.

## 12. Troubleshooting

Port 80 is already in use:

```powershell
docker compose ps
netstat -ano | findstr ":80"
```

Stop the conflicting local web server, then restart Nginx:

```powershell
docker compose restart nginx
```

Backend is not healthy:

```powershell
docker compose logs backend --tail=120
docker compose logs postgres --tail=120
docker compose logs redis --tail=120
```

Elasticsearch is unhealthy:

- Increase Docker memory to at least 6 GB.
- Restart Elasticsearch after changing resources.

```powershell
docker compose restart elasticsearch filebeat
```

Frontend shows an old page after pulling:

```powershell
docker compose build frontend
docker compose up -d frontend nginx
```

Terminal opens but does not respond:

```powershell
docker compose logs backend --tail=160
docker ps -a --filter "name=kali-"
docker compose restart backend nginx
```

Scenario container cannot be reached from Kali:

```powershell
docker compose --profile sc01 ps
docker compose --profile sc02 ps
docker compose --profile sc03 ps
docker network ls
```

Confirm the correct scenario profile is running before debugging the terminal.

AI hints are generic:

- Confirm `OPENROUTER_API_KEY` is set in `.env`.
- Restart the backend after changing `.env`.

```powershell
docker compose restart backend
```

Host Python tests fail on dependency builds:

- Use Python 3.11.
- Prefer the Docker-backed runtime for demos.
- Recreate the host virtual environment if it was created with Python 3.12 or newer.

## 13. Team Demo Checklist

Before any presentation:

- Pull the latest `master`.
- Rebuild with all profiles.
- Start the full stack.
- Confirm `docker compose ps` has no restart loops.
- Confirm `/health` and `/api/scenarios`.
- Log in as a student and open SC-01.
- Manually type in the browser terminal and confirm live output.
- Confirm a Blue Team SIEM event appears.
- Open the instructor dashboard with the local instructor account.
- Download one report.
- Open Debrief and confirm timeline or insights content loads.
- Keep Docker Desktop open for the whole demo.

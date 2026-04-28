# CyberSim Local Hardware And Network Setup

CyberSim is currently verified as a single-node Docker Compose deployment for local development and graduation defense demos.

## Verified Layout

- One Docker host runs the core platform: Nginx, frontend, FastAPI backend, Postgres, Redis, Elasticsearch, and Filebeat.
- The same Docker host runs the three scenario networks: `sc01-net`, `sc02-net`, and `sc03-net`.
- Scenario networks are marked `internal: true` in `docker-compose.yml` so targets do not have outbound internet access.
- The browser entrypoint is `http://localhost`, with Nginx routing `/api` and `/ws` to the backend.

## Minimum Demo Machine

- Docker Desktop or Docker Engine with Compose v2.
- 16 GB RAM recommended when Elasticsearch and multiple scenario services are running.
- Ports `80`, `8001`, and `9200` available on the host.

## Setup Check

Run these from the repository root:

```powershell
docker compose config --quiet
docker compose up -d
Invoke-RestMethod http://localhost/health
Invoke-RestMethod http://localhost/api/scenarios/
```

Expected result:

- Compose config returns no output and exits successfully.
- `/health` returns `{"status":"ok","version":"0.1.0"}`.
- `/api/scenarios/` returns exactly `SC-01`, `SC-02`, and `SC-03`.

## Scenario Networks

- SC-01 Web App: `172.20.1.0/24`
- SC-02 Active Directory: `172.20.2.0/24`
- SC-03 Phishing: `172.20.3.0/24`

Do not expose vulnerable scenario services directly to the internet. Keep target traffic inside the Docker scenario networks.

# CyberSim Architecture

CyberSim is a single-node Docker platform with a React frontend, FastAPI backend, Redis/PostgreSQL data services, Elastic/Filebeat telemetry plumbing, and isolated scenario networks.

## Runtime Topology

```text
React frontend
  | HTTP and WebSocket
  v
Nginx
  | /api -> backend:8000
  | /ws  -> backend:8000
  v
FastAPI backend
  |-- PostgreSQL: durable users, sessions, notes, commands, events, reports
  |-- Redis: real-time pub/sub, terminal history, AI rate state
  |-- Elasticsearch/Filebeat: host/container log ingestion path
  |-- Docker socket: scenario and Kali container lifecycle
```

The root `docker-compose.yml` defines the core services and three scenario profiles: `sc01`, `sc02`, and `sc03`.

## Core Services

| Service | Purpose | Port |
| --- | --- | --- |
| `nginx` | Public entry point for browser, API, and WebSocket traffic | `80` |
| `frontend` | React app served by container nginx/Vite build | internal |
| `backend` | FastAPI API, WebSocket, orchestration, scoring, reports | `8001:8000` |
| `postgres` | Persistent relational data | internal |
| `redis` | Real-time pub/sub, cache, terminal history | internal |
| `elasticsearch` | SIEM/log storage path | `9200` |
| `filebeat` | Docker log forwarder | internal |

## Backend Modules

| Module | Responsibility |
| --- | --- |
| `src/auth` | JWT registration/login and password hashing |
| `src/sessions` | Scenario session lifecycle |
| `src/ws` | Terminal and SIEM WebSocket routing |
| `src/sandbox` | Docker container lifecycle, terminal proxy, cleanup, noise |
| `src/scenarios` | Scenario loading, hints, methodology gates |
| `src/siem` | Command/log to event mapping |
| `src/ai` | Gemini hint context and discovery tracking |
| `src/notes` | Notebook CRUD |
| `src/scoring` | Score and metric calculation |
| `src/reports` | Debrief/timeline/report generation |
| `src/instructor` | Instructor-only session visibility and report download |

## Frontend Areas

| Area | Files |
| --- | --- |
| Routing and auth gating | `frontend/src/App.jsx`, `frontend/src/store/authStore.js` |
| Scenario dashboard | `frontend/src/pages/Dashboard.jsx` |
| Red Team workspace | `frontend/src/pages/RedWorkspace.jsx`, `components/terminal` |
| Blue Team workspace | `frontend/src/pages/BlueWorkspace.jsx`, `components/siem`, `components/playbooks` |
| Debrief | `frontend/src/pages/Debrief.jsx`, `components/debrief` |
| Instructor | `frontend/src/pages/InstructorDashboard.jsx` |

## Scenario Networks

All scenario networks are marked `internal: true` in Compose.

| Scenario | Network | Main containers |
| --- | --- | --- |
| SC-01 | `172.20.1.0/24` | web app, WAF |
| SC-02 | `172.20.2.0/24` | Samba4 DC, file server |
| SC-03 | `172.20.3.0/24` | mail relay, GoPhish, victim simulator |

## Data Flow

1. The user logs in through `/api/auth`.
2. The user starts a session through `/api/sessions/start`.
3. The backend provisions or attaches to the correct sandbox resources.
4. The browser opens a WebSocket to `/ws`.
5. Terminal commands flow through the backend to the sandbox terminal.
6. Commands and logs are evaluated by the SIEM engine.
7. Events are published to Redis and persisted for reports.
8. The Blue Team workspace receives live events.
9. The Debrief page renders scoring, findings, and timeline data.

## Security Model

- Scenario networks are Docker-internal and cannot route to the internet.
- The backend reads secrets from environment variables.
- The Kali and target containers are constrained by CPU/memory limits.
- The AI monitor provides hints only; it should not emit full exploit chains.
- Full terminal output should not be stored permanently; commands and metadata are the durable audit trail.

## Verification Boundary

Static inspection confirms that the repo contains the expected modules, Compose topology, and scenario profiles. Runtime correctness still depends on running the full stack with Docker Desktop available and executing the scenario health checks.

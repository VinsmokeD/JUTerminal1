# Technical Architecture Atlas

This atlas is the diagram-first architecture reference for Parallax. It supports Chapter 4 of the formal report and the Canva visual companion. It is backed by the Repomix source inventory in `evidence/source-inventory.md` and by rendered Mermaid exports under `diagrams/export/`.

## Architecture Summary

Parallax is a single-node Docker platform composed of:

- React/Vite frontend.
- FastAPI backend.
- PostgreSQL database.
- Redis cache and real-time support layer.
- Elasticsearch and Filebeat telemetry path.
- Nginx local routing and Caddy demo routing.
- Docker-managed Kali/session containers.
- Three internal scenario networks for SC-01, SC-02, and SC-03.

The educational loop is built around one central idea: a student action in the Red Team workspace should produce observable defensive evidence in the Blue Team workspace. The platform records commands, notes, SIEM events, scoring decisions, AI interactions, activity, triage, and containment actions so that the Debrief and Instructor Dashboard can turn activity into learning evidence.

## Diagram Set

| Figure | Source | Purpose |
| --- | --- | --- |
| Figure 4.1 | `diagrams/source/c4-context.mmd` | Shows Parallax in relation to students, instructors, Docker, AI provider, and UJ environment |
| Figure 4.2 | `diagrams/source/c4-container.mmd` | Shows major runtime containers and data stores |
| Figure 4.3 | `diagrams/source/dfd-level-0.mmd` | Shows top-level data movement across browser, backend, data services, SIEM, and Docker |
| Figure 4.4 | `diagrams/source/erd-core-schema.mmd` | Shows persistent relational schema relationships |
| Figure 4.5 | `diagrams/source/docker-topology.mmd` | Shows Docker networks, services, volumes, and scenario isolation |
| Figure 4.6 | `diagrams/source/red-blue-event-sequence.mmd` | Shows a command moving from Red Team action to Blue Team telemetry and debrief evidence |
| Figure 4.7 | `diagrams/source/uml-use-case.mmd` | Maps user and administrator goals across the platform |
| Figure 4.8 | `diagrams/source/auth-sequence.mmd` | Details the JWT-based registration and login handshake |
| Figure 4.9 | `diagrams/source/session-lifecycle-state.mmd` | Models the STANDBY to COMPLETED lifecycle of a training session |
| Figure 4.10 | `diagrams/source/scenario-phase-state-machine.mmd` | Models the methodology-gated progression of a scenario |
| Figure 5.1 | `diagrams/source/ai-safety-pipeline.mmd` | Details the redaction, policy, and sanitization boundary for Socratic AI |
| Figure 5.2 | `diagrams/source/report-generation-pipeline.mmd` | Shows how session data is transformed into debrief and examiner reports |
| Figure 5.3 | `diagrams/source/instructor-analytics-flow.mmd` | Details the aggregation of metrics for the instructor dashboard |
| Figure 5.4 | `diagrams/source/sc01-topology.mmd` | NovaMed: Web App security and WAF/SIEM topology |
| Figure 5.5 | `diagrams/source/sc02-topology.mmd` | Nexora: Directory service and Kerberos telemetry topology |
| Figure 5.6 | `diagrams/source/sc03-topology.mmd` | Orion: Phishing simulation and endpoint forensic topology |

## Exported Assets

| Figure | SVG | PNG | Status |
| --- | --- | --- | --- |
| Figure 4.1 | `diagrams/export/svg/c4-context.svg` | `diagrams/export/png/c4-context.png` | Rendered |
| Figure 4.2 | `diagrams/export/svg/c4-container.svg` | `diagrams/export/png/c4-container.png` | Rendered |
| Figure 4.3 | `diagrams/export/svg/dfd-level-0.svg` | `diagrams/export/png/dfd-level-0.png` | Rendered |
| Figure 4.4 | `diagrams/export/svg/erd-core-schema.svg` | `diagrams/export/png/erd-core-schema.png` | Rendered |
| Figure 4.5 | `diagrams/export/svg/docker-topology.svg` | `diagrams/export/png/docker-topology.png` | Rendered |
| Figure 4.6 | `diagrams/export/svg/red-blue-event-sequence.svg` | `diagrams/export/png/red-blue-event-sequence.png` | Rendered |
| Figure 4.7 | `diagrams/export/svg/uml-use-case.svg` | `diagrams/export/png/uml-use-case.png` | Rendered |
| Figure 4.8 | `diagrams/export/svg/auth-sequence.svg` | `diagrams/export/png/auth-sequence.png` | Rendered |
| Figure 4.9 | `diagrams/export/svg/session-lifecycle-state.svg` | `diagrams/export/png/session-lifecycle-state.png` | Rendered |
| Figure 4.10 | `diagrams/export/svg/scenario-phase-state-machine.svg` | `diagrams/export/png/scenario-phase-state-machine.png` | Rendered |
| Figure 5.1 | `diagrams/export/svg/ai-safety-pipeline.svg` | `diagrams/export/png/ai-safety-pipeline.png` | Rendered |
| Figure 5.2 | `diagrams/export/svg/report-generation-pipeline.svg` | `diagrams/export/png/report-generation-pipeline.png` | Rendered |
| Figure 5.3 | `diagrams/export/svg/instructor-analytics-flow.svg` | `diagrams/export/png/instructor-analytics-flow.png` | Rendered |
| Figure 5.4 | `diagrams/export/svg/sc01-topology.svg` | `diagrams/export/png/sc01-topology.png` | Rendered |
| Figure 5.5 | `diagrams/export/svg/sc02-topology.svg` | `diagrams/export/png/sc02-topology.png` | Rendered |
| Figure 5.6 | `diagrams/export/svg/sc03-topology.svg` | `diagrams/export/png/sc03-topology.png` | Rendered |

All diagrams were exported with Mermaid CLI `11.15.0` and the Parallax report theme in `diagrams/mermaid-theme.json`.


## Design Decisions

| Decision | Rationale | Tradeoff |
| --- | --- | --- |
| Single-node Docker deployment | Easier for university demos, local labs, and examiner setup | Less horizontally scalable than Kubernetes |
| FastAPI backend | Async Python works well for API, WebSocket, Docker SDK orchestration, and AI integration | Requires careful async blocking control around Docker/IO |
| React/Vite frontend | Fast development, componentized workspaces, strong ecosystem | Requires browser-based terminal integration care |
| PostgreSQL for durable state | Strong relational model for users, sessions, notes, events, and reports | Requires migrations and schema discipline |
| Redis for realtime/cache | Lightweight session, terminal history, pub/sub, and rate state | Needs TTL and cleanup policies |
| Elasticsearch/Filebeat for SIEM path | More realistic telemetry than a pure mock event bus | Higher memory footprint |
| Internal Docker scenario networks | Strong safety boundary for cybersecurity training | Requires local Docker host readiness |
| AI hints with fallback | Supports learning even when model key is missing or rate-limited | Fallback hints are less contextual |

## Architecture Views

### Context View

Parallax serves five external actors/systems:

- Student as Red Team operator.
- Student as Blue Team analyst.
- Instructor.
- System administrator/demo operator.
- OpenRouter-compatible AI provider.

The Docker engine is treated as a local infrastructure dependency, not as an external attack target.

### Container View

The main runtime containers are:

- `frontend`: serves the React application.
- `backend`: FastAPI API, WebSocket, orchestration, scoring, reports, AI, and instructor analytics.
- `postgres`: durable relational storage.
- `redis`: realtime/cache state.
- `elasticsearch`: SIEM/log storage.
- `filebeat`: log shipper.
- `nginx`: local reverse proxy.
- Scenario profile services for SC-01, SC-02, and SC-03.

### Data View

Persistent data belongs primarily in PostgreSQL:

- Identity and role data.
- Session lifecycle data.
- Notes.
- Command metadata.
- SIEM events.
- Triage decisions.
- AI interactions.
- User activity.
- Containment actions.

Redis is used for volatile or realtime support:

- Terminal history.
- Active session metadata.
- AI cooldown and budget state.
- WebSocket/pub-sub support where applicable.

Elasticsearch holds searchable telemetry/log records. Filebeat forwards container logs into this path.

### Security View

The critical security boundary is between:

- The real host and university network.
- The Parallax application stack.
- Internal-only Docker scenario networks.

Scenario networks are configured as Docker `internal: true` networks. Training actions must stay inside those scenario networks. The report should repeatedly state that Parallax is not for testing real systems.

### Evidence View

The source inventory evidence pack covered 210 report-relevant files and grouped them into backend, frontend, scenario, AI, SIEM, Docker, and documentation domains. The architecture chapter should cite local file paths rather than broad claims. Examples:

- Backend entry and router registration: `backend/src/main.py`.
- Session and WebSocket behavior: `backend/src/sessions/routes.py`, `backend/src/ws/routes.py`.
- Sandbox lifecycle: `backend/src/sandbox/manager.py`, `backend/src/sandbox/terminal.py`.
- Database model: `backend/src/db/database.py`.
- Scenario specs: `docs/scenarios/SC-01-webapp-pentest.yaml`, `docs/scenarios/SC-02-ad-compromise.yaml`, `docs/scenarios/SC-03-phishing.yaml`.
- Docker topology: `docker-compose.yml`, `infrastructure/docker/scenarios/`.

The report should avoid exposing full scenario solutions or lab-only credentials. Evidence belongs in summaries, diagrams, and redacted screenshots.

## Operations View

The implementation and operations chapters should reference these verified local entry points:

- Local frontend: `http://localhost:3000`.
- Backend API docs: `http://localhost:8001/api/docs`.
- Backend health: `http://localhost:8001/health`.
- Readiness endpoint: `http://localhost:8001/api/health/readiness`.
- Core stack command: `docker compose up -d`.
- Scenario profile commands: `docker compose --profile sc01 up -d`, `docker compose --profile sc02 up -d`, and `docker compose --profile sc03 up -d`.
- Static deployment check: `docker compose config --quiet`.
- Demo readiness check: `python scripts/demo_check.py --scenarios all`.

The operations manual in `user-manuals/maintainer-operations-manual.md` should be treated as the source appendix for installation, readiness, recovery, screenshot capture, and evidence handling.

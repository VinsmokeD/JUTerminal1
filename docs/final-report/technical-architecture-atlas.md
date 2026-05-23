# Technical Architecture Atlas

This atlas is the diagram-first architecture reference for CyberSim. It supports Chapter 4 of the formal report and the Canva visual companion.

## Architecture Summary

CyberSim is a single-node Docker platform composed of:

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
| Figure 4.1 | `diagrams/source/c4-context.mmd` | Shows CyberSim in relation to students, instructors, Docker, AI provider, and UJ environment |
| Figure 4.2 | `diagrams/source/c4-container.mmd` | Shows major runtime containers and data stores |
| Figure 4.3 | `diagrams/source/dfd-level-0.mmd` | Shows top-level data movement across browser, backend, data services, SIEM, and Docker |
| Figure 4.4 | `diagrams/source/erd-core-schema.mmd` | Shows persistent relational schema relationships |
| Figure 4.5 | `diagrams/source/docker-topology.mmd` | Shows Docker networks, services, volumes, and scenario isolation |
| Figure 4.6 | `diagrams/source/red-blue-event-sequence.mmd` | Shows a command moving from Red Team action to Blue Team telemetry and debrief evidence |

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

CyberSim serves five external actors/systems:

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
- The CyberSim application stack.
- Internal-only Docker scenario networks.

Scenario networks are configured as Docker `internal: true` networks. Training actions must stay inside those scenario networks. The report should repeatedly state that CyberSim is not for testing real systems.


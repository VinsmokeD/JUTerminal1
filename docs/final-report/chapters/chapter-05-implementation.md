# CHAPTER 5: IMPLEMENTATION

## 5.1 Implementation Overview

CyberSim was implemented as a browser-based training platform backed by a single-node Docker Compose deployment. The implementation follows the architecture defined in Chapter 4: React/Vite frontend, FastAPI backend, PostgreSQL, Redis, Elasticsearch/Filebeat telemetry, Nginx routing, and isolated Docker scenario networks.

The implementation objective was to make the Red Team and Blue Team views operate from the same session state. A student's terminal action should update backend session data, trigger scenario logic, generate defensive telemetry where appropriate, and become available for debrief and instructor review.

## 5.2 Repository Implementation Structure

| Area | Main paths | Implementation role |
| --- | --- | --- |
| Frontend application | `frontend/src/` | React pages, reusable UI, terminal integration, SIEM views, notes, debrief, and instructor dashboard |
| Backend application | `backend/src/` | FastAPI app, routers, WebSocket handling, sessions, scoring, reports, AI monitor, SIEM, and sandbox control |
| Scenario definitions | `docs/scenarios/` | SC-01, SC-02, and SC-03 structured scenario specifications |
| Scenario infrastructure | `infrastructure/docker/scenarios/` | Dockerfiles, service scripts, and lab-only target files |
| AI monitor prompt | `ai-monitor/system_prompt.md` | Safety-bounded guidance rules |
| Deployment | `docker-compose.yml`, `infrastructure/nginx/` | Local stack, service wiring, networks, volumes, and routing |
| Final report workspace | `docs/final-report/` | Chapters, diagrams, references, evidence, manuals, and visual-report planning |

## 5.3 Backend Implementation

The backend is a modular FastAPI application. `backend/src/main.py` creates the application, configures middleware, and includes domain routers.

| Backend domain | Representative files | Implemented behavior |
| --- | --- | --- |
| Authentication | `backend/src/auth/routes.py` | Registration, login, current-user profile, JWT-based access, and role-aware behavior |
| Sessions | `backend/src/sessions/routes.py` | Session start/resume, Rules of Engagement acknowledgement, readiness, flags, lifecycle, and role state |
| WebSockets | `backend/src/ws/routes.py` | Terminal frames, session messages, hints, live events, phase updates, and terminal-history replay |
| Sandbox | `backend/src/sandbox/manager.py`, `backend/src/sandbox/terminal.py`, `backend/src/sandbox/readiness.py` | Docker orchestration, Kali/session container management, PTY streaming, readiness checks, and cleanup |
| Scenarios | `backend/src/scenarios/` | YAML loading, methodology gates, branch tracking, hint selection, output-pattern detection, and phase progress |
| SIEM | `backend/src/siem/` | Event maps, command-to-detection bridge, Elasticsearch polling, forensics routes, and response actions |
| AI | `backend/src/ai/` | Context building, safety checks, provider calls, fallback hints, discovery tracking, and debrief coaching |
| Reports | `backend/src/reports/` | Session report data, learning insights, summaries, and debrief support |
| Instructor | `backend/src/instructor/` | Analytics, session monitoring, user management, and export-oriented endpoints |

The backend stores durable learning data in PostgreSQL and uses Redis for realtime and short-lived state such as active sessions, terminal history, cooldowns, and pub-sub behavior.

## 5.4 Frontend Implementation

The frontend is a React application built with Vite. It uses functional components, hooks, and Zustand stores. The main page-level implementation is:

| Page | Purpose |
| --- | --- |
| `Auth.jsx` | Sign-in, registration, and authentication flow |
| `Dashboard.jsx` | Scenario selection, session entry, and mission overview |
| `RedWorkspace.jsx` | Terminal, notes, methodology, AI Tutor, readiness, and output insights |
| `BlueWorkspace.jsx` | SIEM feed, forensics, triage, containment, and analyst notes |
| `Debrief.jsx` | Post-session report, timeline, score, and learning evidence |
| `InstructorDashboard.jsx` | Instructor analytics, live class status, report access, and exports |

Reusable component groups include:

- `components/terminal/` for xterm.js, toolbar, context menu, and output insight panels.
- `components/siem/` for Blue Team feed and investigation views.
- `components/notes/` for structured evidence notes.
- `components/hints/` for the Socratic AI Tutor.
- `components/workspace/` for layout, readiness, and Rules of Engagement flows.
- `components/ui/` for shared UI primitives.

The frontend does not implement scenario rules directly. It renders state and sends actions to the backend, keeping scenario authority in the backend and YAML definitions.

## 5.5 Terminal and Session Implementation

The terminal workflow is implemented through xterm.js in the browser and backend WebSocket routing. The browser sends terminal input to the backend, and the backend proxies the stream to a Docker-managed Kali/session container.

Key implementation properties:

- The terminal connects through the backend, not directly to Docker.
- Session history can be replayed after refresh through Redis-backed terminal history.
- Command metadata is recorded for scoring, SIEM mapping, hints, and debrief.
- Methodology gates can block unsafe or premature phase activity.
- Output insight detection can generate report-safe evidence cards.

This implementation supports the project goal of connecting action, evidence, feedback, and assessment.

## 5.6 SIEM and Blue Team Implementation

The SIEM implementation combines simulated scenario telemetry, event maps, Filebeat, Elasticsearch, and backend routes. The Blue Team workspace displays events and allows triage and response actions.

Implemented SIEM behavior includes:

- Scenario-specific event maps under `backend/src/siem/events/`.
- Detection rules under `backend/src/siem/rules/`.
- Command-to-event bridge logic for educational Red-to-Blue causality.
- Background/noise events that require student filtering.
- Forensics and containment routes for analyst workflow.
- Debrief timeline data that links Red Team actions and Blue Team observations.

The implementation is intentionally educational. It produces realistic signals without requiring students to operate a production SOC platform.

## 5.7 AI Tutor Implementation

The AI Tutor is implemented as a bounded guidance layer. It is called after command submission or selected learning actions, not on every keystroke.

Key controls:

- `ai-monitor/system_prompt.md` defines Socratic behavior and safety boundaries.
- `backend/src/ai/context_builder.py` creates limited scenario context.
- `backend/src/ai/security.py` validates or redacts unsafe patterns.
- Fallback hints preserve usability when provider configuration is missing or rate-limited.
- AI usage metadata supports instructor review and scoring transparency.

The tutor is a learning assistant rather than an answer generator. Its output should be short, conceptual, and report-safe.

## 5.8 Scenario Implementation

CyberSim implements exactly three MVP scenarios:

| Scenario | Definition file | Infrastructure path | Training focus |
| --- | --- | --- | --- |
| SC-01 | `docs/scenarios/SC-01-webapp-pentest.yaml` | `infrastructure/docker/scenarios/sc01/` | Web application testing and WAF/SIEM analysis |
| SC-02 | `docs/scenarios/SC-02-ad-compromise.yaml` | `infrastructure/docker/scenarios/sc02/` | Directory-service compromise concepts and authentication telemetry |
| SC-03 | `docs/scenarios/SC-03-phishing.yaml` | `infrastructure/docker/scenarios/sc03/` | Phishing simulation, endpoint markers, and email analysis |

Each scenario includes report-safe learning objectives, phase definitions, hints, telemetry mappings, and scoring behavior. Exact solution chains and lab-only secrets should remain outside the formal report.

## 5.9 Docker and Deployment Implementation

The main deployment file is `docker-compose.yml`. It defines:

- Core services: backend, frontend, PostgreSQL, Redis, Elasticsearch, Filebeat, and Nginx.
- Named volumes for persistent service data.
- One shared internal application network.
- Internal scenario networks for SC-01, SC-02, and SC-03.
- Scenario services activated by Compose profiles.
- Resource limits for core and scenario services.

Scenario networks use `internal: true`, which is central to CyberSim's safety model.

## 5.10 Reporting and Instructor Implementation

Reporting and instructor features are implemented across backend reports, scoring, instructor analytics, frontend debrief components, and the Instructor Dashboard.

The system can present:

- Session progress and score.
- Notes and evidence.
- AI hint usage.
- SIEM triage and containment records.
- Red-to-Blue event timelines.
- Instructor-visible progress and export-oriented data.

These features turn the runtime exercise into assessable academic evidence.

## 5.11 Implementation Constraints

The implementation follows these constraints:

- No testing against real external systems.
- No scenario expansion beyond SC-01 through SC-03 for the MVP.
- No committed real secrets.
- No unrestricted scenario-container internet access.
- No full raw terminal-output storage as the main durable record.
- AI output must remain bounded and educational.

## 5.12 Chapter Summary

CyberSim's implementation combines a modern web application, real-time backend services, containerized lab targets, structured scenario definitions, telemetry, AI guidance, and instructor analytics. The result is a safe cybersecurity training environment that demonstrates both offensive methodology and defensive evidence in one workflow.

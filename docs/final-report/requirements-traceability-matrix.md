# Requirements Traceability Matrix

This matrix connects CyberSim requirements to implementation modules, test evidence, report chapters, and diagrams. It is the backbone for Chapter 3 and the appendices.

## Functional Requirements

| ID | Requirement | Implementation Evidence | Test/Evidence Target | Report Section |
| --- | --- | --- | --- | --- |
| FR-AUTH-01 | The system shall allow students to register and log in using JWT-based authentication. | `backend/src/auth/routes.py`, `frontend/src/pages/Auth.jsx`, `frontend/src/store/authStore.js` | Auth API smoke, backend auth tests | 3.5, 5.5, 6.3, Fig 4.8 |
| FR-AUTH-02 | The system shall protect instructor-only operations using role-based access control. | `backend/src/auth/routes.py`, `backend/src/instructor/routes.py`, `frontend/src/pages/InstructorDashboard.jsx` | Instructor API tests and browser smoke | 3.5, 4.15, 5.13, Fig 4.7 |
| FR-SCEN-01 | The system shall list exactly the active MVP scenarios SC-01, SC-02, and SC-03. | `backend/src/scenarios/routes.py`, `docs/scenarios/*.yaml`, `frontend/src/pages/Dashboard.jsx` | `GET /api/scenarios/`, demo readiness | 1.6, 3.10, 5.11, Fig 5.4-5.6 |
| FR-SESS-01 | The system shall create scenario sessions for Red Team and Blue Team roles. | `backend/src/sessions/routes.py`, `backend/src/sandbox/manager.py` | Session API and integration tests | 3.5, 4.13, 5.7, Fig 4.9 |
| FR-ROE-01 | The system shall require rules-of-engagement acknowledgement before active scenario work. | `backend/src/sessions/routes.py`, `frontend/src/components/workspace/RoeBriefing.jsx` | Browser smoke and session state checks | 3.7, 5.4, Fig 4.9 |
| FR-TERM-01 | The system shall provide a browser terminal connected to an isolated Kali container. | `backend/src/ws/routes.py`, `backend/src/sandbox/terminal.py`, `frontend/src/components/terminal/Terminal.jsx` | WebSocket integration and manual xterm smoke | 4.10, 5.7, 6.5, Fig 4.5 |
| FR-SIEM-01 | The system shall show Blue Team telemetry linked to scenario activity. | `backend/src/siem/engine.py`, `backend/src/siem/routes.py`, `frontend/src/components/siem/SiemFeed.jsx` | SIEM rule engine tests, browser smoke | 4.11, 5.9, 6.6, Fig 4.6 |
| FR-NOTE-01 | The system shall let students save tagged notes per session. | `backend/src/notes/routes.py`, `frontend/src/components/notes/GuidedNotebook.jsx` | Notes API tests | 3.5, 5.12, Fig 4.7 |
| FR-HINT-01 | The system shall provide safe, Socratic AI hints with fallback behavior. | `backend/src/ai/*`, `backend/src/scenarios/hint_engine.py`, `ai-monitor/system_prompt.md` | AI safety/fallback tests | 3.9, 4.12, 5.10, Fig 5.1 |
| FR-GATE-01 | The system shall enforce methodology gates to prevent premature scenario actions. | `backend/src/scenarios/gatekeeper.py`, `backend/src/scenarios/engine.py`, `docs/scenarios/*.yaml` | Scenario engine tests and WS tests | 3.9, 4.13, 6.8, Fig 4.10 |
| FR-SCORE-01 | The system shall calculate scoring from progress, hints, flags, time, and activity. | `backend/src/scoring/engine.py`, `backend/src/scoring/routes.py`, `frontend/src/components/ui/ScoreToast.jsx` | Scoring unit tests | 3.5, 5.12, Fig 5.3 |
| FR-REPORT-01 | The system shall generate debrief and learning reports from session data. | `backend/src/reports/*`, `frontend/src/pages/Debrief.jsx` | Reports API tests | 4.14, 5.12, 6.3, Fig 5.2 |
| FR-INST-01 | The system shall provide instructor analytics, session inspection, grade export, and activity views. | `backend/src/instructor/*`, `frontend/src/pages/InstructorDashboard.jsx` | Instructor analytics tests | 4.15, 5.13, 6.3, Fig 5.3 |
| FR-READY-01 | The system shall expose readiness checks for core services and scenario sessions. | `backend/src/main.py`, `backend/src/sandbox/readiness.py`, `backend/src/sessions/routes.py` | `demo_check.py`, readiness tests | 5.15, 6.16, Fig 4.5 |
| FR-FORENSICS-01 | The system shall support Blue Team simulated forensics and containment workflows. | `backend/src/siem/forensics.py`, `backend/src/siem/response.py`, `frontend/src/components/siem/ForensicsWorkbench.jsx` | SIEM/forensics tests | 4.11, 5.9, Fig 5.4-5.6 |


## Non-Functional Requirements

| ID | Requirement | Implementation Evidence | Test/Evidence Target | Report Section |
| --- | --- | --- | --- | --- |
| NFR-SEC-01 | Scenario networks shall be isolated from the internet. | `docker-compose.yml` scenario networks with `internal: true` | Docker config and network inspection | 3.7, 4.17 |
| NFR-SEC-02 | Secrets shall be provided through environment variables, not source code. | `.env.example`, `backend/src/config.py`, Compose environment references | Secret scan/manual review | 3.7, 5.14 |
| NFR-SEC-03 | AI context shall be limited and redacted before external model calls. | `backend/src/ai/security.py`, `backend/src/ai/context_builder.py` | AI safety tests | 4.12, 5.10 |
| NFR-PERF-01 | The local stack shall fit on a single Docker host with resource limits. | `docker-compose.yml`, `backend/src/sandbox/manager.py` | Demo check and Docker stats evidence | 4.16, 6.12 |
| NFR-REL-01 | The system shall provide health/readiness checks for demo recovery. | `backend/src/main.py`, `scripts/demo_check.py`, `scripts/demo-recover.sh` | Demo readiness evidence | 6.16 |
| NFR-UX-01 | The UI shall support repeated classroom workflows with clear Red/Blue separation. | `frontend/src/pages/RedWorkspace.jsx`, `frontend/src/pages/BlueWorkspace.jsx`, component hierarchy | Browser screenshots and heuristic evaluation | 3.8, 4.19 |
| NFR-MAINT-01 | Documentation shall map architecture, code, tests, and deployment evidence. | `docs/final-report/*`, `docs/architecture/*` | Documentation QA checklist | Appendices |

## Evidence Gaps To Close

| Gap | Needed Evidence |
| --- | --- |
| Current full test output | Fresh backend test, frontend lint/build, Docker config, and demo check logs |
| UI/UX screenshots | Current Dashboard, RedWorkspace, BlueWorkspace, Debrief, InstructorDashboard screenshots |
| Diagram exports | SVG/PNG exports from Mermaid/PlantUML sources |
| User evaluation | Heuristic or cooperative evaluation notes from students/instructors |
| Citation quality | References for external platforms, frameworks, standards, and tools |


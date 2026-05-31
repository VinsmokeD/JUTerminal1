# Parallax API Reference

This reference is generated from the current FastAPI router inventory in `backend/src/main.py` and `backend/src/**/routes.py`. It is a source document for Chapter 5 and Appendix C.

## Route Groups

| Group | Prefix | Source |
| --- | --- | --- |
| Health | `/health`, `/api/health/readiness` | `backend/src/main.py` |
| Auth | `/api/auth` | `backend/src/auth/routes.py` |
| Scenarios | `/api/scenarios` | `backend/src/scenarios/routes.py` |
| Sessions | `/api/sessions` | `backend/src/sessions/routes.py` |
| Notes | `/api/notes` | `backend/src/notes/routes.py` |
| Hints | `/api/hints` | `backend/src/scenarios/hint_engine.py` |
| WebSocket | `/ws` | `backend/src/ws/routes.py` |
| Scoring | `/api/scoring` | `backend/src/scoring/routes.py` |
| Reports | `/api/reports` | `backend/src/reports/routes.py` |
| Instructor | `/api/instructor` | `backend/src/instructor/routes.py` |
| Playbooks | `/api/playbooks` | `backend/src/api/playbooks.py` |
| AI | `/api/ai` | `backend/src/ai/routes.py` |
| SIEM | `/api/siem` | `backend/src/siem/routes.py` |

## Health

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | Public | Basic API health and version check |
| GET | `/api/health/readiness` | Public | Deep readiness check for PostgreSQL, Redis, Elasticsearch, and AI fallback/configuration |

## Authentication and Profile

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Register a student account and return a bearer token |
| POST | `/api/auth/login` | Public | Authenticate with OAuth2 password form and return a bearer token |
| GET | `/api/auth/me` | Student/instructor JWT | Return the current user's identity, role, skill level, and onboarding status |
| PUT | `/api/auth/profile` | Student/instructor JWT | Update profile fields such as skill level and onboarding completion |
| GET | `/api/auth/stats` | Student/instructor JWT | Return the current user's session, score, command, note, and history summary |

## Scenarios and Playbooks

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/scenarios/` | Public | List active scenarios |
| GET | `/api/scenarios/{scenario_id}` | Public | Return one scenario definition |
| GET | `/api/scenarios/{scenario_id}/phases` | Public | Return scenario phase/methodology information |
| GET | `/api/playbooks` | Public | Return available playbook metadata |
| GET | `/api/playbooks/list` | Public | Return playbook list |
| GET | `/api/playbooks/{scenario_id}` | Public | Return a scenario playbook |
| GET | `/api/playbooks/{scenario_id}/sections` | Public | Return parsed playbook sections |

## Sessions

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/sessions/start` | Student/instructor JWT | Start a Red or Blue session for a scenario |
| POST | `/api/sessions/roe-ack` | Student/instructor JWT | Mark rules-of-engagement acknowledgement |
| GET | `/api/sessions/active` | Student/instructor JWT | Return active session for current user |
| GET | `/api/sessions/` | Student/instructor JWT | Return session list for current user |
| GET | `/api/sessions/{session_id}` | Student/instructor JWT | Return a specific owned session |
| POST | `/api/sessions/{session_id}/end` | Student/instructor JWT | End a session |
| GET | `/api/sessions/{session_id}/commands` | Student/instructor JWT | Return command metadata for a session |
| GET | `/api/sessions/{session_id}/events` | Student/instructor JWT | Return SIEM events for a session |
| GET | `/api/sessions/{session_id}/triage` | Student/instructor JWT | Return Blue Team triage decisions |
| PUT | `/api/sessions/{session_id}/triage` | Student/instructor JWT | Create or update a triage decision |
| GET | `/api/sessions/{session_id}/killchain` | Student/instructor JWT | Return kill-chain timeline data |
| GET | `/api/sessions/{session_id}/readiness` | Student/instructor JWT | Return session/scenario readiness |
| POST | `/api/sessions/{session_id}/override` | Student/instructor JWT | Force readiness or methodology override where allowed |
| POST | `/api/sessions/{session_id}/flag` | Student/instructor JWT | Submit a scenario flag/milestone |

## Notes, Hints, Scoring, Reports

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/notes/` | Student/instructor JWT | Create a tagged note |
| GET | `/api/notes/{session_id}` | Student/instructor JWT | List notes for a session |
| DELETE | `/api/notes/{note_id}` | Student/instructor JWT | Delete an owned note |
| POST | `/api/hints/request` | Student/instructor JWT | Request a level 1, 2, or 3 scenario hint |
| GET | `/api/scoring/{session_id}` | Student/instructor JWT | Return score details for a session |
| GET | `/api/reports/{session_id}` | Student/instructor JWT | Return report/debrief summary |
| GET | `/api/reports/{session_id}/learning-insights` | Student/instructor JWT | Return cause/effect learning insights |
| GET | `/api/reports/{session_id}/report` | Student/instructor JWT | Return generated report content |
| POST | `/api/reports/{session_id}/debrief-coaching` | Student/instructor JWT | Generate bounded debrief coaching |
| POST | `/api/reports/{session_id}/debrief-qa` | Student/instructor JWT | Ask a bounded debrief question |

## AI and SIEM

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/ai/budget` | Student/instructor JWT | Return AI budget or usage state for the current user |
| POST | `/api/siem/{session_id}/contain` | Student/instructor JWT | Record simulated containment action |
| GET | `/api/siem/{session_id}/forensics/targets` | Student/instructor JWT | List available simulated forensics targets |
| POST | `/api/siem/{session_id}/forensics/osquery` | Student/instructor JWT | Run a simulated osquery-style investigation |
| GET | `/api/siem/{session_id}/actions` | Student/instructor JWT | Return containment actions for a session |

## Instructor

All instructor endpoints require a JWT for a user whose `role` is `instructor`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/instructor/sessions` | List student sessions with metrics |
| GET | `/api/instructor/sessions/{session_id}/report` | Download or view a session report |
| GET | `/api/instructor/metrics` | Return class-level dashboard metrics |
| GET | `/api/instructor/users` | List users |
| POST | `/api/instructor/users` | Create user |
| PATCH | `/api/instructor/users/{user_id}` | Update user |
| GET | `/api/instructor/users/{user_id}` | Inspect user |
| GET | `/api/instructor/sessions/{session_id}/detail` | Inspect session details |
| POST | `/api/instructor/sessions/{session_id}/terminate` | Terminate a session |
| GET | `/api/instructor/sessions/{session_id}/ai-interactions` | Review AI interactions for a session |
| GET | `/api/instructor/activity` | Review recent activity |
| GET | `/api/instructor/ai/usage` | Review AI usage and budget metrics |
| GET | `/api/instructor/analytics` | Return instructor learning analytics |
| GET | `/api/instructor/export/grades` | Export grade-ready data |
| GET | `/api/instructor/sessions/{session_id}/timeline` | Return detailed session timeline |
| GET | `/api/instructor/sessions/{session_id}/live-inspect` | Return live inspection data for active session monitoring |

## WebSocket

| Method | Path | Auth/Scope | Purpose |
| --- | --- | --- | --- |
| WS | `/ws/{session_id}` | Session-bound | Real-time terminal, readiness, hints, output insights, and live session events |

The WebSocket path is central to the Red Team terminal and live learning loop. It is documented in the sequence diagrams because its behavior is event-driven rather than simple request/response.


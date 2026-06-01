#import "../theme.typ": *
#import "../components.typ": *
#import "../diagrams.typ": *

#chapter(num: "06", title: "Implementation",
  lead: "What ships, what it is built on, and how the layers fit together.")

== Frontend
A React 18 single-page application built with Vite. State is held in Zustand
stores; the terminal is `xterm.js` with the fit, search, web-links, and WebGL
addons; motion uses framer-motion and Lenis smooth scroll; the marketing surface
uses a three.js background; routing is `react-router-dom`; PDF export is
client-side via jsPDF. The UI is organized around two workspace shells — Red
(terminal, methodology, notes, hints) and Blue (SIEM feed, triage, forensics,
containment) — plus a dashboard, debrief, and instructor dashboard.

#codefile(name: "frontend/package.json (excerpt)", lang: "json")[
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "framer-motion": "^12.40.0",
    "xterm": "^5.3.0",
    "zustand": "^4.5.2",
    "three": "^0.169.0",
    "lenis": "^1.3.23",
    "react-router-dom": "^6.23.1",
    "jspdf": "^4.2.1"
  }
}
```
]

== Backend
FastAPI on Python 3.11, async throughout. SQLAlchemy 2.0 (async) with asyncpg and
Alembic migrations back PostgreSQL; Redis holds realtime session state, terminal
history, and AI cooldown budgets. Auth is JWT via python-jose with bcrypt
password hashing. Routers are split by domain — auth, scenarios, sessions, notes,
hints, scoring, reports, AI, SIEM, instructor, and the WebSocket — and registered
in `backend/src/main.py`. The full route surface (around sixty endpoints across
thirteen groups) is catalogued in Appendix C.

#codefile(name: "backend/requirements.txt (excerpt)", lang: "py")[
```py
fastapi==0.111.0
uvicorn[standard]==0.29.0
sqlalchemy[asyncio]==2.0.30
asyncpg==0.29.0
redis[hiredis]==5.0.4
python-jose[cryptography]==3.3.0
docker==7.1.0
```
]

Authentication is a JWT handshake: the client posts credentials, the backend
verifies the bcrypt hash against the `users` row, issues a signed token, and
re-checks the token (and role) on every subsequent request.

#fig(caption: "JWT registration / login handshake")[
  #auth-sequence()
]

== Sandbox and session lifecycle
The terminal connects through the backend, never directly to Docker: the browser
streams keystrokes over a WebSocket, and `backend/src/sandbox/` proxies them to a
Docker-managed Kali container attached to the scenario network. A session moves
through a small state machine, from creation and provisioning through readiness
and active work to completion and debrief.

#fig(caption: "Session lifecycle state machine")[
  #session-lifecycle()
]

Scenario targets are started on demand by Docker Compose profile; session
containers are recreated between sessions. Scenario networks are `internal: true`.

#codefile(name: "docker-compose.yml (excerpt)", lang: "yaml")[
```yaml
networks:
  sc01-net:
    driver: bridge
    internal: true        # no internet egress
    ipam:
      config:
        - subnet: 172.20.1.0/24
          gateway: 172.20.1.254
```
]

#info[
  The scenario reset (`down` then `up` of a profile) is documented at roughly
  eight seconds on the reference machine. This figure is carried from the project
  documentation and should be re-measured by wall clock before final submission.
]

== The Red-to-Blue loop
The defining behavior is the event loop that turns an attacker action into
defender telemetry. The student submits a command; the backend records its
metadata and proxies it to the Kali container; the target and its WAF emit logs;
Filebeat ships them to Elasticsearch; the backend's SIEM engine correlates the
match and emits an event to the Blue-Team workspace — all within the
sub-two-second budget.

#fig(caption: "Red-to-Blue event sequence (command to defender alert)")[
  #red-blue-sequence()
]

The SIEM layer combines per-scenario event maps (`backend/src/siem/events/`),
detection rules (`backend/src/siem/rules/`), a command-to-event bridge for
educational causality, and background "noise" events that the analyst must filter
out. Forensics and containment routes back the Blue-Team investigation workflow.

== AI mentor
The mentor lives in `backend/src/ai/`: `context_builder.py` assembles bounded
context, `security.py` performs redaction and response sanitization,
`level_classifier.py` adapts hint depth, and `monitor.py` calls the provider.
Requests go to an OpenRouter-hosted, OpenAI-compatible model — the default is
`google/gemini-2.0-flash-001`, configurable via `OPENROUTER_MODEL`. The response
token cap is mode-dependent: 300 tokens in learn mode, 400 for procedural hints,
and `OPENROUTER_MAX_TOKENS` (default 500) otherwise. Calls fire on command
submission behind a ten-second cooldown — never on every keystroke — and a static
fallback hint is served when no provider key is configured. Chapter 4 covers the
guardrails in detail.

== Reporting and instructor analytics
At session end the platform turns recorded data into assessable evidence. A
report pipeline aggregates commands, notes, events, hints, and triage; scores the
session; builds the Red-to-Blue timeline; and renders the debrief and the
examiner report.

#fig(caption: "Report generation pipeline")[
  #report-pipeline()
]

The instructor surface aggregates across many sessions into live class metrics,
AI-usage review, weak-phase identification, and grade-ready export.

#fig(caption: "Instructor analytics: per-session data fans in to dashboard views")[
  #instructor-analytics()
]

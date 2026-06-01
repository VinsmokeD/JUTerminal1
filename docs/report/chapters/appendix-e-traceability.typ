#import "../theme.typ": *
#import "../components.typ": *
#import "../diagrams.typ": *

#chapter(num: "E", title: "Appendix E — Requirements Traceability", lead: "")

Each requirement maps to its implementation evidence and verification target.
Report sections are referenced by the chapter that covers them.

== Functional requirements
#table(columns: (auto, 1.7fr, 1.5fr, 1fr), stroke: none, align: (left, left, left, left),
  text(font: font-mono, size: 7.5pt, fill: c-slate, weight: 500)[ID],
  text(font: font-mono, size: 7.5pt, fill: c-slate, weight: 500)[REQUIREMENT],
  text(font: font-mono, size: 7.5pt, fill: c-slate, weight: 500)[IMPLEMENTATION],
  text(font: font-mono, size: 7.5pt, fill: c-slate, weight: 500)[EVIDENCE],
  table.hline(stroke: 0.5pt + c-slate),
  [FR-AUTH], [Register/login; role-gated instructor access], [`auth/routes.py`, `instructor/routes.py`], [auth + instructor tests],
  [FR-SCEN], [List active SC-01/02/03], [`scenarios/routes.py`, `docs/scenarios/*.yaml`], [`GET /api/scenarios`],
  [FR-SESS], [Create Red/Blue sessions], [`sessions/routes.py`, `sandbox/manager.py`], [session + integration tests],
  [FR-ROE],  [Require ROE acknowledgement], [`sessions/routes.py`, `RoeBriefing.jsx`], [browser smoke],
  [FR-TERM], [Browser terminal to isolated Kali], [`ws/routes.py`, `sandbox/terminal.py`], [WS integration],
  [FR-SIEM], [Telemetry linked to activity], [`siem/engine.py`, `siem/routes.py`], [SIEM rule-engine tests],
  [FR-NOTE], [Tagged notes per session], [`notes/routes.py`, `GuidedNotebook.jsx`], [notes API tests],
  [FR-HINT], [Safe Socratic AI hints + fallback], [`ai/*`, `scenarios/hint_engine.py`], [AI safety tests],
  [FR-GATE], [Methodology gating], [`scenarios/gatekeeper.py`, `engine.py`], [gating tests],
  [FR-SCORE],[Score from progress/hints/time], [`scoring/engine.py`, `scoring/routes.py`], [scoring unit tests],
  [FR-REPORT],[Debrief + learning reports], [`reports/*`, `Debrief.jsx`], [reports API tests],
  [FR-INST], [Analytics, monitoring, export], [`instructor/*`, `InstructorDashboard.jsx`], [analytics tests],
  table.hline(stroke: 1pt + c-navy),
)

== Non-functional requirements
#table(columns: (auto, 1.6fr, 1.5fr, 1fr), stroke: none, align: (left, left, left, left),
  text(font: font-mono, size: 7.5pt, fill: c-slate, weight: 500)[ID],
  text(font: font-mono, size: 7.5pt, fill: c-slate, weight: 500)[REQUIREMENT],
  text(font: font-mono, size: 7.5pt, fill: c-slate, weight: 500)[IMPLEMENTATION],
  text(font: font-mono, size: 7.5pt, fill: c-slate, weight: 500)[EVIDENCE],
  table.hline(stroke: 0.5pt + c-slate),
  [NFR-SEC-01], [Scenario networks isolated from internet], [`docker-compose.yml` `internal: true`], [isolation script],
  [NFR-SEC-02], [Secrets via environment, not source], [`.env.example`, `config.py`], [secret scan],
  [NFR-SEC-03], [AI context bounded and redacted], [`ai/security.py`, `ai/context_builder.py`], [AI safety tests],
  [NFR-PERF-01],[Fit single Docker host with limits], [`docker-compose.yml`, `sandbox/manager.py`], [demo check, docker stats],
  [NFR-REL-01], [Health/readiness for demo recovery], [`main.py`, `demo_check.py`, `demo-recover.sh`], [readiness evidence],
  [NFR-UX-01],  [Clear Red/Blue separation], [`RedWorkspace.jsx`, `BlueWorkspace.jsx`], [heuristic eval, screenshots],
  [NFR-MAINT-01],[Docs map code/tests/deployment], [`docs/final-report/*`, `docs/report/*`], [documentation QA],
  table.hline(stroke: 1pt + c-navy),
)

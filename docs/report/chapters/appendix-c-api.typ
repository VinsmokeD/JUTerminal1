#import "../theme.typ": *
#import "../components.typ": *
#import "../diagrams.typ": *

#chapter(num: "C", title: "Appendix C — API Reference", lead: "")

This reference is taken from the FastAPI router inventory in
`backend/src/main.py` and `backend/src/**/routes.py`. Thirteen route groups
expose roughly sixty endpoints. Unless noted public, endpoints require a
student or instructor JWT; instructor endpoints additionally require the
`instructor` role.

// local helpers for compact API tables
#let apihead = (
  text(font: font-mono, size: 8pt, fill: c-slate, tracking: 0.12em, weight: 500)[METHOD],
  text(font: font-mono, size: 8pt, fill: c-slate, tracking: 0.12em, weight: 500)[PATH],
  text(font: font-mono, size: 8pt, fill: c-slate, tracking: 0.12em, weight: 500)[PURPOSE],
)

== Route groups
#table(columns: (auto, 1fr), stroke: none, align: (left, left),
  text(font: font-mono, size: 8pt, fill: c-slate, weight: 500)[GROUP],
  text(font: font-mono, size: 8pt, fill: c-slate, weight: 500)[PREFIX],
  table.hline(stroke: 0.5pt + c-slate),
  [Health], [`/health`, `/api/health/readiness`],
  [Auth], [`/api/auth`], [Scenarios], [`/api/scenarios`],
  [Sessions], [`/api/sessions`], [Notes], [`/api/notes`],
  [Hints], [`/api/hints`], [WebSocket], [`/ws`],
  [Scoring], [`/api/scoring`], [Reports], [`/api/reports`],
  [Instructor], [`/api/instructor`], [Playbooks], [`/api/playbooks`],
  [AI], [`/api/ai`], [SIEM], [`/api/siem`],
  table.hline(stroke: 1pt + c-navy),
)

== Health and authentication
#table(columns: (auto, 1.5fr, 1.6fr), stroke: none, align: (left, left, left),
  ..apihead, table.hline(stroke: 0.5pt + c-slate),
  [GET],  [`/health`], [API health and version (public)],
  [GET],  [`/api/health/readiness`], [Deep readiness: Postgres, Redis, Elasticsearch, AI (public)],
  [POST], [`/api/auth/register`], [Register a student; return bearer token (public)],
  [POST], [`/api/auth/login`], [OAuth2 password login; return bearer token (public)],
  [GET],  [`/api/auth/me`], [Current identity, role, skill level, onboarding],
  [PUT],  [`/api/auth/profile`], [Update profile fields],
  [GET],  [`/api/auth/stats`], [Session, score, command, and note summary],
  table.hline(stroke: 1pt + c-navy),
)

== Scenarios and playbooks
#table(columns: (auto, 1.5fr, 1.6fr), stroke: none, align: (left, left, left),
  ..apihead, table.hline(stroke: 0.5pt + c-slate),
  [GET], [`/api/scenarios/`], [List active scenarios (public)],
  [GET], [`/api/scenarios/{id}`], [One scenario definition (public)],
  [GET], [`/api/scenarios/{id}/phases`], [Phase / methodology info (public)],
  [GET], [`/api/playbooks`], [Playbook metadata (public)],
  [GET], [`/api/playbooks/{id}`], [Scenario playbook (public)],
  [GET], [`/api/playbooks/{id}/sections`], [Parsed playbook sections (public)],
  table.hline(stroke: 1pt + c-navy),
)

== Sessions
#table(columns: (auto, 1.6fr, 1.5fr), stroke: none, align: (left, left, left),
  ..apihead, table.hline(stroke: 0.5pt + c-slate),
  [POST], [`/api/sessions/start`], [Start a Red or Blue session],
  [POST], [`/api/sessions/roe-ack`], [Acknowledge rules of engagement],
  [GET],  [`/api/sessions/active`], [Active session for current user],
  [GET],  [`/api/sessions/`], [Session list for current user],
  [GET],  [`/api/sessions/{id}`], [A specific owned session],
  [POST], [`/api/sessions/{id}/end`], [End a session],
  [GET],  [`/api/sessions/{id}/commands`], [Command metadata for a session],
  [GET],  [`/api/sessions/{id}/events`], [SIEM events for a session],
  [GET\/PUT], [`/api/sessions/{id}/triage`], [Read / write Blue-Team triage],
  [GET],  [`/api/sessions/{id}/killchain`], [Kill-chain timeline],
  [GET],  [`/api/sessions/{id}/readiness`], [Session / scenario readiness],
  [POST], [`/api/sessions/{id}/override`], [Force readiness / methodology override],
  [POST], [`/api/sessions/{id}/flag`], [Submit a scenario flag / milestone],
  table.hline(stroke: 1pt + c-navy),
)

== Notes, hints, scoring, reports
#table(columns: (auto, 1.7fr, 1.4fr), stroke: none, align: (left, left, left),
  ..apihead, table.hline(stroke: 0.5pt + c-slate),
  [POST],   [`/api/notes/`], [Create a tagged note],
  [GET],    [`/api/notes/{session_id}`], [List notes for a session],
  [DELETE], [`/api/notes/{note_id}`], [Delete an owned note],
  [POST],   [`/api/hints/request`], [Request a level 1/2/3 hint],
  [GET],    [`/api/scoring/{session_id}`], [Score details for a session],
  [GET],    [`/api/reports/{session_id}`], [Report / debrief summary],
  [GET],    [`/api/reports/{id}/learning-insights`], [Cause/effect learning insights],
  [GET],    [`/api/reports/{id}/report`], [Generated report content],
  [POST],   [`/api/reports/{id}/debrief-coaching`], [Bounded debrief coaching],
  [POST],   [`/api/reports/{id}/debrief-qa`], [Ask a bounded debrief question],
  table.hline(stroke: 1pt + c-navy),
)

== AI, SIEM, and WebSocket
#table(columns: (auto, 1.7fr, 1.4fr), stroke: none, align: (left, left, left),
  ..apihead, table.hline(stroke: 0.5pt + c-slate),
  [GET],  [`/api/ai/budget`], [AI budget / usage for current user],
  [POST], [`/api/siem/{id}/contain`], [Record simulated containment],
  [GET],  [`/api/siem/{id}/forensics/targets`], [List forensics targets],
  [POST], [`/api/siem/{id}/forensics/osquery`], [Run simulated osquery investigation],
  [GET],  [`/api/siem/{id}/actions`], [Containment actions for a session],
  [WS],   [`/ws/{session_id}`], [Terminal, readiness, hints, live events (session-bound)],
  table.hline(stroke: 1pt + c-navy),
)

== Instructor
All instructor endpoints require a JWT whose role is `instructor`.

#table(columns: (auto, 1.9fr, 1.3fr), stroke: none, align: (left, left, left),
  ..apihead, table.hline(stroke: 0.5pt + c-slate),
  [GET],   [`/api/instructor/sessions`], [List student sessions with metrics],
  [GET],   [`/api/instructor/sessions/{id}/report`], [View a session report],
  [GET],   [`/api/instructor/sessions/{id}/detail`], [Inspect session details],
  [GET],   [`/api/instructor/sessions/{id}/timeline`], [Detailed session timeline],
  [GET],   [`/api/instructor/sessions/{id}/live-inspect`], [Live session monitoring],
  [GET],   [`/api/instructor/sessions/{id}/ai-interactions`], [Review AI interactions],
  [POST],  [`/api/instructor/sessions/{id}/terminate`], [Terminate a session],
  [GET],   [`/api/instructor/metrics`], [Class-level dashboard metrics],
  [GET],   [`/api/instructor/analytics`], [Learning analytics],
  [GET],   [`/api/instructor/activity`], [Recent activity feed],
  [GET],   [`/api/instructor/ai/usage`], [AI usage and budget metrics],
  [GET],   [`/api/instructor/export/grades`], [Export grade-ready data],
  [GET\/POST\/PATCH], [`/api/instructor/users`], [List / create / update / inspect users],
  table.hline(stroke: 1pt + c-navy),
)

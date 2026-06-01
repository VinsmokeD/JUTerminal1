#import "../theme.typ": *
#import "../components.typ": *
#import "../diagrams.typ": *

#chapter(num: "03", title: "Architecture",
  lead: "From requirements to a three-surface causal loop: the views, the data, and the trade-offs that made it possible.")

== Requirements
The platform's requirements were derived from the KASIT project guidelines, the
gap analysis in Chapter 2, and the safety constraints inherent to a security
trainer. The functional core is small and sharp:

#fig(caption: "Core functional requirements")[
  #table(
    columns: (auto, 1fr),
    align: (left, left),
    stroke: none,
    table.header(
      text(font: font-mono, size: 9pt, fill: c-slate, tracking: 0.18em, weight: 500)[ID],
      text(font: font-mono, size: 9pt, fill: c-slate, tracking: 0.18em, weight: 500)[REQUIREMENT],
    ),
    table.hline(stroke: 0.5pt + c-slate),
    [FR-AUTH],  [Register and authenticate students; gate instructor operations by role.],
    [FR-SCEN],  [List and run the active scenarios SC-01, SC-02, SC-03.],
    [FR-SESS],  [Start, track, and end Red- and Blue-Team sessions over shared state.],
    [FR-ROE],   [Require rules-of-engagement acknowledgement before active work.],
    [FR-TERM],  [Provide a browser terminal bound to an isolated Kali container.],
    [FR-SIEM],  [Show Blue-Team telemetry causally linked to scenario activity.],
    [FR-NOTE],  [Let students capture tagged findings and evidence notes.],
    [FR-HINT],  [Provide bounded, Socratic AI hints with fallback behavior.],
    [FR-GATE],  [Enforce methodology gates and scenario phases.],
    [FR-SCORE], [Score progress from milestones, hints, time, and adherence.],
    [FR-REPORT],[Generate a debrief and examiner-ready report from session data.],
    [FR-INST],  [Provide instructor analytics, live monitoring, and grade export.],
    table.hline(stroke: 1pt + c-navy),
  )
]

The non-functional requirements that shape the design most are safety
(scenario networks isolated from the internet), responsiveness (the
sub-two-second attack-to-telemetry budget), portability (a single-node Docker
deployment an examiner can stand up locally), and reliability (health and
readiness checks for demo recovery). Appendix E traces every requirement to its
implementation and test evidence.

The actors and their goals are summarized in the use-case model:

#fig(caption: "PARALLAX use-case model: four actors over one shared system")[
  #use-case()
]

== The causal loop
The system's central idea is a single loop closed between an attacker workspace,
a defender SIEM, and an AI mentor. The mentor watches without intervening; the
SIEM observes without participating; the attacker acts against a sandbox that
resets between sessions. Detection is performed by a ModSecurity WAF and
container logs shipped through Filebeat into Elasticsearch, then correlated by
the backend SIEM engine — there is no separate network sensor.

#fig(caption: "Causal loop between attack, detection, and learning surfaces")[
  #causal-loop()
]

== Layered architecture
The runtime is a five-layer stack. Each layer is independently testable; the
boundaries are HTTP, a WebSocket, or a Docker network — never a shared in-process
object. The browser runs React @react built with Vite @vite; the gateway is
FastAPI @fastapi; durable state is PostgreSQL @postgresql with Redis @redis for
realtime state; telemetry rides Filebeat into Elasticsearch @elasticsearch
@elastic_filebeat; everything is orchestrated by Docker Compose @docker_compose.

#fig(caption: "Five-layer runtime architecture")[
  #architecture-stack()
]

== Data flow
The platform has two data paths. Structured request–response traffic (login,
scenario listing, session start, notes, scoring, reports) flows over REST;
low-latency, event-driven traffic (terminal I/O, readiness, hints, SIEM events)
flows over a WebSocket. The backend is the single process that touches every
data store and the Docker engine.

#fig(caption: "Level-0 data flow across browser, backend, stores, and sandbox")[
  #dfd-level0()
]

== Data model
A session is the unit of work: one student, one scenario, one role. It anchors
notes, command metadata, SIEM events, triage decisions, AI-interaction metadata,
and auto-detected evidence. The platform stores command *metadata* and curated
evidence rather than full raw terminal output, keeping the database focused on
learning evidence.

#fig(caption: "Core entity relationships (full schema in Appendix D)")[
  #erd-core()
]

#fig(caption: "Persistent tables and their role")[
  #table(
    columns: (auto, 1fr),
    align: (left, left),
    stroke: none,
    table.header(
      text(font: font-mono, size: 9pt, fill: c-slate, tracking: 0.18em, weight: 500)[TABLE],
      text(font: font-mono, size: 9pt, fill: c-slate, tracking: 0.18em, weight: 500)[PURPOSE],
    ),
    table.hline(stroke: 0.5pt + c-slate),
    [`users`],               [Identity, role, skill level, onboarding state.],
    [`sessions`],            [Scenario, role, methodology, phase, score, ROE, sandbox IDs.],
    [`notes`],               [Tagged findings and methodology notes.],
    [`command_log`],         [Command metadata, tool, phase, SIEM trigger, hint flag.],
    [`siem_events`],         [Events shown to Blue Team; severity, MITRE technique, source.],
    [`siem_triage`],         [Analyst classification and notes per event.],
    [`ai_interactions`],     [Hint/debrief metadata: tokens, model, latency, fallback, flag.],
    [`auto_evidence`],       [Evidence summaries detected from command output patterns.],
    [`user_activity`],       [Audit/activity feed for classroom monitoring.],
    [`containment_actions`], [Simulated Blue-Team response actions.],
    table.hline(stroke: 1pt + c-navy),
  )
]

== Network isolation
Each scenario runs in its own Docker network, declared `internal: true`, with no
route to the internet or to the other scenarios @docker_networks. The attacker
workspace is multiplexed: a single Kali container is attached to one scenario
network at a time, never to two at once. Core services share a separate
`172.30.0.0/24` bridge. Chapter 4 details the guarantees this buys.

#fig(caption: "Three isolated scenario networks; dashed barriers are unroutable")[
  #network-isolation()
]

== Design decisions
The architecture is a series of deliberate trade-offs, chosen for a university
lab rather than a hyperscale deployment:

#fig(caption: "Key architectural decisions and their trade-offs")[
  #table(
    columns: (1fr, 1.4fr),
    align: (left, left),
    stroke: none,
    table.header(
      text(font: font-mono, size: 9pt, fill: c-slate, tracking: 0.18em, weight: 500)[DECISION],
      text(font: font-mono, size: 9pt, fill: c-slate, tracking: 0.18em, weight: 500)[RATIONALE / TRADE-OFF],
    ),
    table.hline(stroke: 0.5pt + c-slate),
    [Single-node Docker Compose], [Trivial for examiners to stand up; less horizontally scalable than Kubernetes.],
    [FastAPI (async) backend],    [One process for REST, WebSocket, Docker SDK, and AI; needs careful async I/O discipline.],
    [PostgreSQL for durable state],[Strong relational model for reports and analytics; requires migration discipline.],
    [Redis for realtime state],   [Lightweight session/terminal/cooldown state; needs TTL cleanup.],
    [Elasticsearch + Filebeat],   [Realistic telemetry instead of a mock bus; higher memory footprint.],
    [`internal: true` networks],  [Hard safety boundary for offensive training; requires a ready local Docker host.],
    [AI hints with fallback],     [Learning continues without a model key; fallback hints are less contextual.],
    table.hline(stroke: 1pt + c-navy),
  )
]

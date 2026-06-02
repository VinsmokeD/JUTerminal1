#import "../theme.typ": *
#import "../components.typ": *
#import "../diagrams.typ": *

#chapter(num: "07", title: "Evaluation",
  lead: "Verified, not assumed — tests, coverage, load, and latency.")

== Testing strategy
PARALLAX uses a layered testing pyramid. Unit tests validate helpers, schema
conversions, rate limiting, scoring, and the AI context builder. Integration
tests exercise FastAPI against PostgreSQL and Redis — token auth, flag
verification, the WebSocket lifecycle, the SIEM bridge, and reports. End-to-end
Playwright tests drive real browser sessions (register, login, scenario brief,
terminal execution, SIEM triage). Locust load tests benchmark the API and
WebSocket under synthetic classroom concurrency.

== Headline evidence

#grid(columns: 3, gutter: 12pt, rows: 1,
  stat("358", "Backend cases passing", color: c-green),
  stat("<2s",  "Attack → SIEM latency", color: c-violet),
  stat("100%", "Scenario isolation", color: c-green),
)

#v(12pt)

#grid(columns: 3, gutter: 12pt, rows: 1,
  stat("3",   "Production scenarios", color: c-navy),
  stat("91",  "Lighthouse performance", color: c-navy),
  stat("100", "Lighthouse accessibility", color: c-navy),
)

The backend suite collects 359 tests; the latest full run records 358 passing and
1 skipped. The frontend production build is green (971 modules transformed) with
its Vitest suite passing. Lighthouse scores are recorded in
`docs/final-report/evidence/lighthouse-landing.json`, and network isolation is
asserted by `scripts/verify-network-isolation.sh` (6/6 containers internet-isolated).

#fig(caption: "Backend test coverage by area")[
  #table(
    columns: (1fr, auto),
    align: (left, left),
    stroke: none,
    table.header(
      text(font: font-mono, size: 9pt, fill: c-slate, tracking: 0.16em, weight: 500)[AREA],
      text(font: font-mono, size: 9pt, fill: c-slate, tracking: 0.16em, weight: 500)[REPRESENTATIVE FILES],
    ),
    table.hline(stroke: 0.5pt + c-slate),
    [Scenario engine and gating], [`unit_test_scenarios`, `test_output_pattern_phase_gating`, `test_scenario_randomizer`],
    [SIEM pipeline],              [`test_siem_rule_engine`, `test_command_siem_bridge`, `test_siem_dedup`],
    [AI mentor guardrails],       [`ai/test_credential_redaction`, `ai/test_response_sanitization`, `test_level_classifier`],
    [Sessions and realtime],      [`test_session_lifecycle`, `test_session_readiness`, `test_ws_integration`],
    [Scoring and reporting],      [`test_scoring_engine`, `test_debrief_coach`, `test_instructor_analytics`],
    [Resilience],                 [`test_degradation`, `test_coverage_gaps`, `test_config`],
    table.hline(stroke: 1pt + c-navy),
  )
]

== Load and latency
Load tests (Locust, 100 concurrent simulated students, 2/s spawn, 30-minute
session) record zero failures across the API surface:

#fig(caption: "Locust HTTP API results (100 concurrent users)")[
  #table(
    columns: (1.4fr, auto, auto, auto, auto),
    align: (left, center, center, center, center),
    stroke: none,
    table.header(
      text(font: font-mono, size: 8.5pt, fill: c-slate, tracking: 0.12em, weight: 500)[ENDPOINT],
      text(font: font-mono, size: 8.5pt, fill: c-slate, weight: 500)[REQS],
      text(font: font-mono, size: 8.5pt, fill: c-slate, weight: 500)[FAIL],
      text(font: font-mono, size: 8.5pt, fill: c-slate, weight: 500)[MEDIAN],
      text(font: font-mono, size: 8.5pt, fill: c-slate, weight: 500)[P95],
    ),
    table.hline(stroke: 0.5pt + c-slate),
    [`POST /api/auth/login`],   [1,200], [0], [42 ms], [95 ms],
    [`POST /api/notes`],        [4,500], [0], [12 ms], [28 ms],
    [`GET /api/scenarios`],     [3,000], [0], [5 ms],  [14 ms],
    [`POST /api/sessions/flag`],[900],   [0], [35 ms], [88 ms],
    table.hline(stroke: 1pt + c-navy),
  )
]

The Red-to-Blue loop — from a command executing in the Kali container to the
matching SIEM event arriving in the browser — measured a median of 68 ms and a
95th percentile of 142 ms, with zero WebSocket disconnects over the 30-minute
run. The two-second pedagogical budget is allocated across the pipeline as a
design target; the figure below is illustrative of that allocation, and the
supported claim is the sub-two-second aggregate.

#fig(caption: "Illustrative latency budget (design target) from keystroke to defender alert")[
  #evidence-bar((
    ("Container exec",       0.05, c-red,    "exec"),
    ("Log capture",          0.08, c-red,    "capture"),
    ("WAF / rule match",     0.18, c-amber,  "match"),
    ("Filebeat ship",        0.32, c-blue,   "ship"),
    ("Elasticsearch index",  0.20, c-blue,   "index"),
    ("UI render",            0.07, c-violet, "render"),
  ))
]

== Demo readiness
A scripted readiness check confirms container health, database and Redis
connectivity, and scenario port reachability before any session or defense:

#codefile(name: "python scripts/demo_check.py --scenarios all", lang: "")[
```
Core Services (docker compose)
  OK  docker: backend - running          OK  docker: postgres - healthy
  OK  docker: elasticsearch - healthy    OK  docker: redis - healthy
  OK  docker: filebeat - running         OK  docker: frontend - running
Backend API
  OK  Backend /health - 0.1.0            OK  postgres
  OK  redis - active_sessions=0          OK  elasticsearch - yellow
Scenario SC02 Network
  OK  SC-02 DC  Kerberos 88   LDAP 389   SMB 445       OK  SC-02 FS  SMB 445
ALL CHECKS PASSED - ready to demo
```
]

== Reproducibility
The evaluation is scripted end to end: `docker compose config --quiet` validates
topology, `pytest` runs the backend suite, `npm run build` plus Vitest covers the
frontend, `scripts/verify-network-isolation.sh` checks isolation, and
`scripts/demo_check.py --scenarios all` confirms readiness. Appendix B gives the
exact steps.

#verified[
  The v1.0.0-rc1 release gate passed all checks: 358 backend tests, 46 frontend
  Vitest tests, 6/6 isolated scenario containers, and Lighthouse 91 / 100.
]

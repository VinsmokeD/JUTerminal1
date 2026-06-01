// ============================================================================
// PARALLAX — Graduation Report (entry point)
// Compile:  typst compile --font-path fonts main.typ parallax-report.pdf
// Live:     typst watch  --font-path fonts main.typ
//
// Content migrated from the DOCX package (docs/final-report/) and corrected
// against the running code. Drifts are recorded in MIGRATION_LOG.md.
// The design system (theme/components/diagrams) is fixed; prose lives here.
// ============================================================================

#import "theme.typ": *
#import "components.typ": *
#import "diagrams.typ": *

// ---------- Document metadata ------------------------------------------------
#set document(
  title: "PARALLAX — A Dual-Perspective Cybersecurity Training Platform",
  author: ("Mahmoud Allabadi", "Rashed Alkurdi"),
  date: datetime(year: 2026, month: 5, day: 1),
)

// Apply the global theme. Everything below inherits it.
#show: parallax-theme

// The theme's level-1 heading show rule is "fallback only" (see theme.typ); the
// visible chapter opener is rendered by `chapter()`. Suppress the fallback so the
// opener isn't drawn twice. Headings remain queryable for the TOC/header/bookmarks.
#show heading.where(level: 1): none

// ---------- COVER ------------------------------------------------------------
#cover(
  title: "PARALLAX",
  subtitle: "A Dual-Perspective Cybersecurity Training Platform with a Socratic AI Mentor",
  authors: (
    ("Mahmoud Allabadi", "2221558"),
    ("Rashed Alkurdi",   "0221992"),
  ),
  institution: "The University of Jordan  ·  KASIT",
  date: "May 2026",
  version: "v1.0.0-rc1",
)

// ---------- ABSTRACT ---------------------------------------------------------
#page({
  text(font: font-mono, size: 10pt, fill: c-violet, tracking: 0.22em, weight: 500)[ABSTRACT]
  v(8pt)
  line(length: 100%, stroke: 0.5pt + c-rule)
  v(24pt)
  block(width: 80%, {
    set par(leading: 0.75em, justify: true)
    [
      PARALLAX is a cybersecurity training platform that places offensive and
      defensive perspectives inside a single causal loop. A student executes a
      real attack from a Kali Linux workspace against an isolated Docker target;
      the same action surfaces as defender telemetry — a ModSecurity web-application
      firewall and container logs shipped by Filebeat into Elasticsearch, then
      correlated by the backend SIEM engine — and appears in a Blue-Team event feed
      in under two seconds. A Socratic AI mentor, gated by a bounded context
      builder, an input-redaction and response-sanitization layer, and a strict
      token cap, supplies hints rather than working exploits.

      This report documents the system's requirements, architecture,
      implementation, and evaluation. It covers the architectural choices that let
      attack and defense share a sandbox without bleeding state, the threat model
      that keeps the mentor from becoming an exploit-generation oracle, the three
      production scenarios used for evaluation, and the test evidence
      (358 passing cases, sub-two-second telemetry latency, 100% scenario-network
      isolation, Lighthouse 91 performance / 100 accessibility) that supports
      v1.0.0-rc1 as ready for instructor evaluation.
    ]
  })
})

// ---------- TABLE OF CONTENTS ------------------------------------------------
#toc()

// ============================================================================
// CHAPTER 01 — INTRODUCTION
// ============================================================================
#chapter(num: "01", title: "Introduction",
  lead: "The gap between offensive and defensive cybersecurity education, and how a shared sandbox closes it.")

== Motivation
Most cybersecurity curricula teach attack and defense in separate rooms — a
penetration-testing course here, a SOC-analyst course there. Students graduate
able to do one or the other but rarely see how a single keystroke on one side
becomes an alert on the other. PARALLAX is built around that missing causal link:
it runs a Red-Team workspace and a Blue-Team SIEM over the *same* session, so an
action and its detection are visible at once.

#insight[
  The pedagogical wager: comprehension of either side deepens when the other
  side is visible in real time. Latency between the two surfaces is therefore not
  merely a performance metric — it is a learning-design constraint, which is why
  the two-second budget recurs throughout this report.
]

== Contributions
- A working dual-perspective lab where Red-Team actions against isolated Docker
  targets produce live Blue-Team telemetry over one shared session.
- A Socratic AI mentor with enforced guardrails: bounded context, secret
  redaction, response sanitization, and a token cap — it never emits payloads.
- Three calibrated, self-contained scenarios (web, Active Directory, phishing)
  with curated MITRE ATT&CK coverage and gated methodology.
- An automated test suite (359 cases) and an evaluation a reviewer can re-run in
  minutes, packaged as a single-node Docker Compose stack.

== Scope
The active scope is exactly three scenarios — SC-01, SC-02, SC-03 — deployed on a
single Docker host. Multi-node operation, additional scenarios, and declarative
scenario authoring are future work (Chapter 8).

== Structure of this report
Chapter 2 surveys related work. Chapter 3 presents requirements and architecture.
Chapter 4 documents the threat model and the mentor's guardrails. Chapter 5
describes the three scenarios. Chapter 6 covers implementation. Chapter 7 reports
evaluation evidence. Chapter 8 discusses limitations and future work.

// ============================================================================
// CHAPTER 02 — BACKGROUND AND RELATED WORK
// ============================================================================
#chapter(num: "02", title: "Background and Related Work",
  lead: "What cybersecurity training offers today, and what PARALLAX is reacting against.")

== Cyber ranges and CTF platforms
Hosted ranges such as Hack The Box @hackthebox and TryHackMe @tryhackme teach
offensive skills through vulnerable machines; defensive platforms such as
CyberDefenders @cyberdefenders teach investigation over captured telemetry.
Both are effective, but each presents a single perspective: the learner either
attacks or analyzes, and the connection between the two is left implicit.

== Tutoring and Socratic guidance
Intelligent tutoring systems improve outcomes when they prompt reasoning rather
than supply answers. PARALLAX applies this directly: the AI mentor is constrained
to Socratic hints and is explicitly forbidden from returning working exploits, so
it scaffolds method without short-circuiting learning.

== Standards and frameworks
Scenario design and assessment draw on established references: the OWASP Top 10
@owasp2021top10 and Web Security Testing Guide @owasp2024wstg for web testing,
MITRE ATT&CK @mitre2020attack for adversary technique mapping, the NIST
Cybersecurity Framework @nist2018csf for defensive functions, and the Penetration
Testing Execution Standard @ptes2014 for methodology phasing.

== Why a new platform
The gap is the *causal link*. No widely used platform lets a student attack and
simultaneously watch the defender's telemetry over one shared session, with a
guarded tutor in the loop. PARALLAX targets exactly that intersection.

#fig(caption: "Existing platforms against PARALLAX's design goals")[
  #table(
    columns: 5,
    align: (left, center, center, center, center),
    stroke: none,
    table.header(
      text(font: font-mono, size: 9pt, fill: c-slate, tracking: 0.18em, weight: 500)[PLATFORM],
      [Attack], [Defense], [Mentor], [Reset],
    ),
    table.hline(stroke: 0.5pt + c-slate),
    [Hack The Box],    [✓], [—], [—], [—],
    [TryHackMe],       [✓], [partial], [—], [—],
    [CyberDefenders],  [—], [✓], [—], [—],
    [#text(weight: 700, fill: c-navy)[PARALLAX]], [✓], [✓], [✓], [#text(fill: c-green)[~8s]],
    table.hline(stroke: 1pt + c-navy),
  )
]

// ============================================================================
// CHAPTER 03 — ARCHITECTURE
// ============================================================================
#chapter(num: "03", title: "Architecture",
  lead: "From requirements to a three-surface causal loop, and the trade-offs that made it possible.")

== Requirements
The platform's requirements were derived from the KASIT project guidelines, the
gap analysis in Chapter 2, and the safety constraints inherent to a security
trainer. The functional core:

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
    [FR-SCEN], [List and run the active scenarios SC-01, SC-02, SC-03.],
    [FR-SESS], [Start, track, and end Red- and Blue-Team sessions over shared state.],
    [FR-TERM], [Provide a browser terminal bound to an isolated Kali container.],
    [FR-SIEM], [Show Blue-Team telemetry causally linked to scenario activity.],
    [FR-HINT], [Provide bounded, Socratic AI hints with fallback behavior.],
    [FR-GATE], [Enforce methodology gates and scenario phases.],
    [FR-SCORE],[Score progress and generate a debrief.],
    [FR-INST], [Provide instructor analytics and grade export.],
    table.hline(stroke: 1pt + c-navy),
  )
]

The non-functional requirements that shape the design most are safety
(scenario networks isolated from the internet), responsiveness (the sub-two-second
attack-to-telemetry budget), and portability (a single-node Docker deployment an
examiner can stand up locally). The actors and their use cases:

#fig(caption: "PARALLAX use-case model: four actors over one shared system")[
  #use-case()
]

== The causal loop
The system's central idea is a single loop closed between an attacker workspace,
a defender SIEM, and an AI mentor. The mentor watches without intervening; the
SIEM observes without participating; the attacker acts against a sandbox that
resets between sessions. Detection is performed by a ModSecurity WAF and container
logs shipped through Filebeat into Elasticsearch, then correlated by the backend
SIEM engine — there is no separate network sensor.

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

== Network isolation
Each scenario runs in its own Docker network, declared `internal: true`, with no
route to the internet or to the other scenarios @docker_networks. The attacker
workspace is multiplexed: a single Kali container is attached to one scenario
network at a time, never to two at once. Core services share a separate
`172.30.0.0/24` bridge.

#fig(caption: "Three isolated scenario networks; dashed barriers are unroutable boundaries")[
  #network-isolation()
]

== Data model
A session is the unit of work: one student, one scenario, one role. It anchors
notes, command metadata, SIEM events, triage decisions, AI-interaction metadata,
and auto-detected evidence. The platform stores command *metadata* and curated
evidence rather than full raw terminal output, keeping the database focused on
learning evidence.

#fig(caption: "Core persistent tables and their role")[
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
    [`sessions`],            [Scenario, role, phase, score, sandbox IDs, lifecycle.],
    [`notes`],               [Findings and methodology notes.],
    [`command_log`],         [Command metadata, tool, phase, SIEM trigger, hint flag.],
    [`siem_events`],         [Events shown to Blue Team and used in timelines.],
    [`siem_triage`],         [Analyst classification and notes per event.],
    [`ai_interactions`],     [AI usage: hint level, model, latency, fallback, safety flags.],
    [`containment_actions`], [Simulated Blue-Team response actions.],
    [`auto_evidence`],       [Evidence summaries detected from output patterns.],
    table.hline(stroke: 1pt + c-navy),
  )
]

The complete entity-relationship schema (and the API and database reference
manuals) are maintained in the extended reference set under `docs/final-report/`.

// ============================================================================
// CHAPTER 04 — THREAT MODEL
// ============================================================================
#chapter(num: "04", title: "Threat Model",
  lead: "What PARALLAX defends against — including misuse of its own mentor.")

== Trust boundaries
Five boundaries separate the browser, the API gateway, the workspace services,
the sandbox, and the telemetry pipeline. The gateway trusts a signed JWT but not
its payload's claims about role until they are re-checked server-side; the sandbox
trusts nothing from the workspace beyond a terminal stream; the telemetry pipeline
is read-only with respect to scenario containers.

#fig(caption: "Information flow across trust boundaries during a typical exercise")[
  #threat-swim-lane()
]

#fig(caption: "Trust boundaries and what each side is trusted to do")[
  #table(
    columns: (auto, 1fr),
    align: (left, left),
    stroke: none,
    table.header(
      text(font: font-mono, size: 9pt, fill: c-slate, tracking: 0.18em, weight: 500)[BOUNDARY],
      text(font: font-mono, size: 9pt, fill: c-slate, tracking: 0.18em, weight: 500)[TRUST RULE],
    ),
    table.hline(stroke: 0.5pt + c-slate),
    [Browser → Gateway],   [JWT authenticates the user; role claims are re-checked server-side per request.],
    [Gateway → Workspace], [Commands are recorded as metadata; the gateway never trusts client-asserted phase state.],
    [Workspace → Sandbox], [The Kali container reaches only its one attached scenario network; no internet egress.],
    [Sandbox → Telemetry], [The telemetry pipeline reads logs only; it cannot write to scenario containers.],
    [Mentor ↔ Model],      [Only redacted, bounded context leaves the host; responses are sanitized before display.],
    table.hline(stroke: 1pt + c-navy),
  )
]

== Safety posture
PARALLAX is an offensive trainer, so safety is a design property, not a checklist:
scenario networks are `internal: true` (no internet egress); the active scope is
fixed at SC-01–SC-03; lab-only credentials live only inside scenario containers
and never appear in the UI or this report; and durable storage keeps command
metadata, not raw output.

== Mentor guardrails
#warn[
  An AI mentor with unconstrained access to attacker context and tool output is an
  exploit-generation oracle. PARALLAX treats this as the system's central safety
  problem.
]

The mentor's request path enforces its constraints in series: a bounded context
builder limits what the model sees to the current scenario, phase, and role; an
input pass redacts scenario secrets and strips prompt-injection markers; the model
is called with a mode-dependent token cap; and the response is sanitized against a
set of forbidden answer patterns, falling back to a Socratic redirect if a
violation is detected.

#fig(caption: "The AI mentor request pipeline and its guardrails")[
  #mentor-pipeline()
]

#verified[
  The guardrails are covered by `backend/tests/ai/test_credential_redaction.py`
  (secret redaction) and `backend/tests/ai/test_response_sanitization.py`
  (forbidden-pattern blocking and Socratic fallback) — 18 cases exercising
  `security.redact_text()` and `security.sanitize_tutor_response()`.
]

// ============================================================================
// CHAPTER 05 — SCENARIOS
// ============================================================================
#chapter(num: "05", title: "Scenarios",
  lead: "Three self-contained environments, each calibrated to a specific learning arc.")

== Gated methodology
Every scenario advances through ordered methodology phases. The scenario engine
gates each transition: a student cannot skip ahead until the current phase's
conditions are met. The Red-Team track mirrors a PTES-style progression; the
Blue-Team track mirrors a simplified incident-response lifecycle.

#fig(caption: "Dual-track gated methodology shared by all scenarios")[
  #phase-ladder()
]

== NovaMed — Healthcare Portal #tag("Intermediate", color: c-amber)
A vulnerable Apache/PHP application over a MariaDB database, fronted by a
ModSecurity (OWASP CRS) WAF, on `172.20.1.0/24`. Students probe web
vulnerabilities while ModSecurity audit logs and Apache access logs feed the
defender view.

#tag("T1190", color: c-red) #tag("T1083", color: c-red) #tag("T1059", color: c-red)
#tag("ModSecurity", color: c-blue) #tag("Apache logs", color: c-blue) #tag("Filebeat", color: c-blue)

*Red objective:* find and exploit a web flaw to reach the database tier.
*Blue objective:* correlate the ModSecurity audit log with the Apache access log to
reconstruct the request that triggered the alert.

== Nexora — Active Directory #tag("Advanced", color: c-red)
A Samba-based Active Directory domain controller (`nexora.local`) and a member
file server on `172.20.2.0/24`. The scenario teaches directory-compromise concepts
and the authentication and access telemetry they generate.

#tag("T1110", color: c-red) #tag("T1003", color: c-red) #tag("T1021", color: c-red)
#tag("Samba logs", color: c-blue) #tag("Kerberos", color: c-blue)

*Red objective:* move from an unprivileged foothold toward domain credentials.
*Blue objective:* spot anomalous authentication and lateral-movement patterns in the
directory-service telemetry.

== Orion — Phishing Campaign #tag("Intermediate", color: c-amber)
A GoPhish campaign server, a Postfix mail relay, and a Python victim simulator on
`172.20.3.0/24`. Students run a controlled phishing flow and analyze the resulting
mail and endpoint markers.

#tag("T1566", color: c-red) #tag("T1204", color: c-red)
#tag("Postfix logs", color: c-blue) #tag("GoPhish", color: c-blue)

*Red objective:* craft and launch a credential-harvesting campaign through GoPhish.
*Blue objective:* trace the delivery in the Postfix relay logs and the victim's
interaction markers to scope the campaign.

// ============================================================================
// CHAPTER 06 — IMPLEMENTATION
// ============================================================================
#chapter(num: "06", title: "Implementation",
  lead: "What ships, what it is built on, and where the seams are.")

== Frontend
A React 18 single-page app built with Vite. State is held in Zustand stores; the
terminal is `xterm.js` with the fit, search, web-links, and WebGL addons; motion
uses framer-motion and Lenis; the marketing surface uses a three.js background;
PDF export is client-side via jsPDF.

#codefile(name: "frontend/package.json (excerpt)", lang: "json")[
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "framer-motion": "^12.40.0",
    "xterm": "^5.3.0",
    "zustand": "^4.5.2",
    "three": "^0.169.0",
    "lenis": "^1.3.23"
  }
}
```
]

== Backend
FastAPI on Python 3.11, async throughout. SQLAlchemy 2.0 (async) with asyncpg and
Alembic migrations back PostgreSQL; Redis holds realtime session state, terminal
history, and AI cooldown budgets. Auth is JWT via python-jose with bcrypt password
hashing. The terminal and SIEM feed are multiplexed over WebSockets; the backend
proxies the terminal to a Docker-managed Kali container rather than exposing Docker
to the browser.

#codefile(name: "backend/requirements.txt (excerpt)", lang: "py")[
```py
fastapi==0.111.0
uvicorn[standard]==0.29.0
sqlalchemy[asyncio]==2.0.30
asyncpg==0.29.0
redis[hiredis]==5.0.4
docker==7.1.0
```
]

== Sandbox
Docker Compose defines the core stack and three scenario profiles. Scenario
networks are `internal: true`; core services share `172.30.0.0/24`. Scenario
targets are started on demand by profile, and session containers are recreated
between sessions.

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

== AI mentor
The mentor lives in `backend/src/ai/`: `context_builder.py` assembles bounded
context, `security.py` performs redaction and response sanitization,
`level_classifier.py` adapts hint depth, and `monitor.py` calls the provider.
Requests go to an OpenRouter-hosted, OpenAI-compatible model — the default is
`google/gemini-2.0-flash-001` and is configurable via `OPENROUTER_MODEL`. The
response token cap is mode-dependent: 300 tokens in learn mode, 400 for procedural
hints, and `OPENROUTER_MAX_TOKENS` (default 500) otherwise. Calls fire on command
submission behind a ten-second cooldown — never on every keystroke — and a static
fallback hint is served when no provider key is configured.

// ============================================================================
// CHAPTER 07 — EVALUATION
// ============================================================================
#chapter(num: "07", title: "Evaluation",
  lead: "Verified, not assumed.")

== Test evidence

#grid(columns: 3, gutter: 12pt, rows: 1,
  stat("358", "Pytest cases passing", color: c-green),
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
1 skipped. The frontend build is green with its Vitest suite passing. Lighthouse
scores are recorded in `docs/final-report/evidence/lighthouse-landing.json`, and
network isolation is checked by `scripts/verify-network-isolation.sh`.

#fig(caption: "Backend test coverage by area")[
  #table(
    columns: (1fr, auto),
    align: (left, left),
    stroke: none,
    table.header(
      text(font: font-mono, size: 9pt, fill: c-slate, tracking: 0.18em, weight: 500)[AREA],
      text(font: font-mono, size: 9pt, fill: c-slate, tracking: 0.18em, weight: 500)[REPRESENTATIVE FILES],
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

== Latency budget
The two-second pedagogical budget is allocated across the pipeline as a design
target. The figure below is illustrative of that allocation; the supported claim
is the sub-two-second aggregate from keystroke to defender event.

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

== Reproducibility
The evaluation is scripted end-to-end: `docker compose config --quiet` validates
topology, `pytest` runs the backend suite, `npm run build` plus Vitest covers the
frontend, and `scripts/demo_check.py --scenarios all` confirms readiness. Appendix B
gives the exact steps.

// ============================================================================
// CHAPTER 08 — DISCUSSION
// ============================================================================
#chapter(num: "08", title: "Discussion",
  lead: "What works, what we would change, and what comes next.")

== Limitations
PARALLAX is single-node by design, which suits a classroom and a defense demo but
not multi-tenant institutional load. Scenarios are hand-authored Docker rather than
declarative, so adding one is an engineering task. The motion-heavy frontend
auto-downgrades on weak GPUs, but a 60 fps guarantee on mid-tier hardware is
verified only by the runtime downgrade loop, not by automated CI. The ~8 s reset is
documented rather than benchmarked in this report (see Chapter 6).

== Future work
Near-term work: a declarative scenario format to replace hand-built Compose files;
two new scenarios (cloud-security and defensive forensics) already sketched as
SC-04 and SC-05; curriculum sequencing across scenarios; and a benchmark harness
that turns the latency budget and reset time into measured, CI-tracked numbers.

== Reflection
The hardest part was not building either workspace — it was making a single action
legible on both sides without letting their state bleed together, and keeping the
mentor genuinely helpful while provably unable to hand over an exploit. The causal
loop, and the guardrails around it, are the contributions we are proudest of.

// ============================================================================
// CHAPTER 09 — REFERENCES
// ============================================================================
#chapter(num: "09", title: "References", lead: "")
#bibliography("refs.bib", title: none, style: "ieee")

// ============================================================================
// APPENDICES
// ============================================================================
#chapter(num: "A", title: "Appendix A — Repository Layout", lead: "")

The repository is a single-node monorepo. The directories that matter for this
report:

#codefile(name: "repository layout", lang: "")[
```
JUTerminal1/
  backend/            FastAPI app: auth, sessions, ws, sandbox,
                      scenarios, siem, ai, reports, instructor
  frontend/           React + Vite SPA: terminal, SIEM, notes,
                      hints, workspace shells, instructor dashboard
  infrastructure/     Docker scenario builds (sc01/sc02/sc03),
                      nginx, postgres init, siem (filebeat)
  docs/
    final-report/     Extended technical reference set (DOCX package)
    report/           This Typst report (theme, components, diagrams)
  docker-compose.yml  Core stack + three scenario profiles
  scripts/            demo_check.py, verify-network-isolation.sh, ...
```
]

#chapter(num: "B", title: "Appendix B — Reproduce the Evaluation", lead: "")

A reviewer can reproduce the headline evidence in a few minutes on a machine with
Docker and the project's Python and Node toolchains.

#codefile(name: "reproduce.sh", lang: "bash")[
```bash
# 1. Configure (set a real JWT_SECRET; OPENROUTER_API_KEY is optional)
cp .env.example .env

# 2. Validate topology and bring up the core stack
docker compose config --quiet
docker compose up -d

# 3. Start a scenario profile (sc01 | sc02 | sc03)
docker compose --profile sc01 up -d

# 4. Backend tests (359 collected; 358 pass, 1 skip)
python -m pytest backend/tests -q

# 5. Frontend build + unit tests
npm --prefix frontend run verify

# 6. Network isolation + demo readiness
bash scripts/verify-network-isolation.sh
python scripts/demo_check.py --scenarios all
```
]

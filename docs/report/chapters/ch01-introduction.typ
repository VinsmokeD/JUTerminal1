#import "../theme.typ": *
#import "../components.typ": *
#import "../diagrams.typ": *

#chapter(num: "01", title: "Introduction",
  lead: "The gap between offensive and defensive cybersecurity education, and how a shared sandbox closes it.")

== Motivation
Most cybersecurity curricula teach attack and defense in separate rooms — a
penetration-testing course here, a SOC-analyst course there. Students graduate
able to do one or the other but rarely see how a single keystroke on one side
becomes an alert on the other. The penetration tester learns to launch an
injection without watching the firewall log it; the analyst learns to read an
alert without having generated one. The causal link between the two — the very
thing a security professional must reason about every day — is left implicit.

PARALLAX is built around that missing link. It runs a Red-Team workspace and a
Blue-Team SIEM over the *same* session, so an action and its detection are
visible at once. A student attacks an isolated target from a Kali terminal and,
seconds later, sees the telemetry their action produced in a defender console.
The platform turns "attack" and "defend" from two courses into two views of one
event.

#insight[
  The pedagogical wager: comprehension of either side deepens when the other side
  is visible in real time. The latency between the two surfaces is therefore not
  merely a performance metric — it is a learning-design constraint, which is why
  the sub-two-second budget recurs throughout this report.
]

== Problem statement
Existing training platforms are effective but single-perspective. Offensive
ranges drop a learner onto a vulnerable host and reward a captured flag;
defensive platforms replay captured telemetry and reward a correct triage. In
neither case does the learner author the cause and observe the effect in the
same place and time. A platform that closes the loop must solve three problems
simultaneously: it must let attack and defense share one sandboxed session
without their state bleeding together; it must surface defensive telemetry fast
enough to feel causal; and it must offer guidance that scaffolds reasoning
without handing over the exploit.

== Contributions
- A working dual-perspective lab in which Red-Team actions against isolated
  Docker targets produce live Blue-Team telemetry over a single shared session.
- A Socratic AI mentor with enforced guardrails — bounded context, secret
  redaction, response sanitization, and a token cap — that never emits payloads.
- Three calibrated, self-contained scenarios (web application, Active Directory,
  phishing) with curated MITRE ATT&CK coverage and gated methodology.
- A complete instructor surface: live session monitoring, per-student metrics,
  AI-usage review, and grade export.
- An automated test suite (359 cases) and an evaluation a reviewer can re-run in
  minutes, packaged as a single-node Docker Compose stack.

== Scope
The active scope is exactly three scenarios — SC-01, SC-02, and SC-03 — deployed
on a single Docker host. The platform is designed for a university lab and a
graduation defense, not multi-tenant production load. Multi-node operation,
additional scenarios, and declarative scenario authoring are future work
(Chapter 8). Every offensive capability operates only against the isolated
scenario containers; the platform never targets real systems.

== Structure of this report
Chapter 2 surveys related work and frameworks. Chapter 3 presents requirements
and the system architecture. Chapter 4 documents the threat model and the
mentor's guardrails. Chapter 5 describes the three scenarios and the scoring
model. Chapter 6 covers the implementation of every layer. Chapter 7 reports the
evaluation evidence. Chapter 8 discusses limitations and future work. The
appendices give the full API surface, database schema, requirements
traceability, and deployment procedures.

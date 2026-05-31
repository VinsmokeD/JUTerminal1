# Parallax Product Evolution Plan

## Product North Star

Parallax should become the learning operating system for cybersecurity exercises where students understand the full scene:

- what the attacker tried,
- what changed inside the sandbox,
- what telemetry appeared,
- what the defender should investigate,
- what evidence belongs in the report,
- what the student should learn next.

The product should not compete as another vulnerable VM or capture-the-flag board. Its strongest position is the bridge between offensive action, defensive signal, business risk, evidence, and reflection.

## Product Promise

Parallax teaches the cognitive link between Red Team behavior and Blue Team visibility in a safe, local, Docker-isolated university lab.

Every feature should strengthen at least one of these loops:

1. Red action to system effect.
2. System effect to telemetry.
3. Telemetry to analyst decision.
4. Analyst decision to report evidence.
5. Report evidence to instructor feedback.
6. Instructor feedback to the next practice objective.

## Audience

### Student

Students need a guided but authentic experience. They should feel they are doing real work, but should never be pushed toward unsafe real-world targeting.

Primary needs:

- clear mission context,
- safe target scope,
- usable terminal,
- visible defender feedback,
- useful hints,
- concrete debrief,
- report-ready evidence.

### Instructor

Instructors need visibility and grading leverage.

Primary needs:

- session monitoring,
- score and progress breakdowns,
- reports,
- exportable evidence,
- replayable timelines,
- insight into common mistakes.

### Reviewer Or Graduation Committee

Reviewers need to understand why the project is more than a lab launcher.

Primary needs:

- clear product story,
- visible technical isolation,
- end-to-end demo flow,
- evidence that learning happened,
- professional polish.

## Strategic Pillars

### 1. Mission Simulator

Scenarios should feel like missions, not static exercises.

Target capabilities:

- mission brief with company profile, objective, scope, and constraints,
- role selection for Red Team, Blue Team, Instructor, and Observer,
- mission status and readiness indicators,
- explicit win conditions for both sides,
- scenario end state with report and debrief.

### 2. Causality Engine

The core innovation is showing cause and effect.

For each Red Team command, Parallax should explain:

- what action was attempted,
- what target/system effect it implies,
- which SIEM events were generated,
- how long detection took,
- what the defender should ask,
- what evidence belongs in notes or reports.

This is the first major product slice to implement because it directly strengthens the platform's unique selling point.

### 3. Blue Team Analyst Cockpit

The Blue Team experience should become an active triage workspace.

Target capabilities:

- event state: New, Investigating, True Positive, False Positive, Escalated,
- event detail drawer with raw log, source, host, severity, and MITRE context,
- alert-linked notes,
- investigation checklist,
- decision prompts,
- background-noise filtering.

### 4. Instructor Superpowers

The instructor dashboard should make grading and review fast.

Target capabilities:

- filtered session table,
- CSV export,
- Markdown/PDF report download,
- class-level analytics,
- common mistake summaries,
- replayable session timelines,
- bulk export package.

### 5. AI Teaching Assistant

The AI layer should be useful without becoming unsafe.

Target modes:

- Socratic Mode: asks questions and nudges thinking.
- Coach Mode: explains concepts after attempts.
- Debrief Mode: summarizes mistakes and next practice.
- Instructor Mode: surfaces class-wide weak points.

Safety rules:

- no real-world targeting advice,
- no complete exploit chains,
- no copy-paste payload escalation,
- no bypass of scenario scope.

### 6. Learning Analytics

Parallax should prove learning, not just activity.

Target analytics:

- time per phase,
- commands per phase,
- notes per phase,
- hints used,
- detection coverage,
- detection latency,
- methodology adherence,
- report completeness,
- repeated failed patterns.

### 7. Scenario Depth Before Scenario Count

SC-01 through SC-03 should become deeper. The scope is intentionally limited to these three scenarios.

Target improvements:

- difficulty modes,
- randomized names and endpoints,
- richer background noise,
- alternate valid paths,
- better Blue Team objectives,
- hidden grading rubrics,
- more realistic false positives.

## Implementation Roadmap

### Phase 23: Learning Insights And Causality Debrief

Goal: Show the student and instructor what each action caused and what should be learned from it.

Deliverables:

- backend insight builder,
- `GET /api/reports/{session_id}/learning-insights`,
- Debrief Insights tab,
- cause-and-effect command cards,
- coaching summary,
- regression tests.

Acceptance:

- a completed or active session returns command counts, detection counts, detection latency, related alerts, strengths, improvement areas, and next practice recommendations,
- Debrief renders insights without breaking sessions that have no commands or alerts,
- backend tests and frontend build pass.

### Phase 24: Blue Team Triage Workflow

Goal: Make the Blue Team workspace an active analyst surface.

Status: Implementation added in the current working tree; DB-backed runtime verification is pending Docker Desktop/Postgres availability.

Deliverables:

- triage API over existing `siem_triage` table,
- event classification controls,
- alert-linked note prompts,
- investigation checklist by event category,
- instructor visibility into triage completion.

Implemented:

- session event payloads include `triage` metadata,
- triage classifications can be saved as `investigating`, `true_positive`, `false_positive`, or `escalated`,
- Blue Workspace exposes classification and analyst notes directly inside expanded SIEM events,
- instructor session rows and metrics include triage coverage,
- generated markdown reports include Blue Team triage decisions,
- Dashboard can open a scenario briefing from Command Palette scenario shortcuts.

Acceptance:

- a Blue Team user can classify an event,
- triage state persists,
- instructor sees triage coverage,
- report includes triage decisions.

Verification:

- `frontend` production build passes.
- `docker compose config --quiet` passes.
- DB-backed pytest/runtime checks are pending until Docker Desktop/Postgres is reachable locally.

### Phase 25: Instructor Learning Analytics

Goal: Give instructors class-level learning signals.

Deliverables:

- analytics endpoint,
- common mistake detector,
- score component breakdown,
- CSV export expansion,
- student replay links.

Acceptance:

- instructor can see weak phases and most-used hints,
- session data can be exported for grading,
- report download remains functional.

### Phase 26: Mission Shell And Readiness UX

Goal: Make the product feel like a coherent mission simulator.

Deliverables:

- mission status panel,
- container readiness states,
- role-specific objectives,
- scenario readiness error messages,
- one-click reset guidance.

Acceptance:

- students can tell whether the terminal, targets, SIEM, and AI are ready,
- Docker downtime shows a useful recovery message,
- no overlapping or ambiguous loading states.

### Phase 27: AI Debrief Mode

Goal: Add safe post-session coaching.

Deliverables:

- Debrief Mode prompt,
- bounded context builder,
- fallback static coaching,
- instructor-safe summaries.

Acceptance:

- AI feedback never includes direct exploit chains,
- output is capped and structured,
- missing Gemini key falls back gracefully.

### Phase 28: Scenario Depth And Randomization

Goal: Increase replay value for SC-01 through SC-03.

Deliverables:

- scenario seed support,
- randomized benign noise,
- difficulty flags,
- alternate valid paths,
- hidden grading rubrics.

Acceptance:

- scenario launch accepts or creates a seed,
- reports include seed metadata,
- existing fixed scenario path still works.

## Measurement Model

The product should be evaluated through both technical and learning metrics.

Technical metrics:

- stack boot success,
- terminal attach success,
- WebSocket reconnect success,
- scenario network isolation,
- test pass rate,
- report generation success.

Learning metrics:

- methodology adherence,
- detection coverage,
- mean detection latency,
- notes per phase,
- evidence completeness,
- hint dependency,
- final report quality.

## Immediate Implementation Decision

The first implementation phase is Phase 23: Learning Insights And Causality Debrief.

Reason:

- It strengthens the unique product story immediately.
- It reuses existing session, command, note, and SIEM tables.
- It does not require new services or unsafe scenario content.
- It improves the graduation demo and instructor value.
- It creates the data model needed for later AI Debrief and analytics work.

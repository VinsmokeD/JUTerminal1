#import "../theme.typ": *
#import "../components.typ": *
#import "../diagrams.typ": *

#chapter(num: "D", title: "Appendix D — Database Schema", lead: "")

Based on the SQLAlchemy models in `backend/src/db/database.py` and the Alembic
migration chain in `backend/migrations/`. PostgreSQL holds durable state; Redis
holds volatile realtime state; Elasticsearch holds searchable telemetry.

#let cols(name, body) = {
  text(font: font-body, size: 11pt, fill: c-navy, weight: 600)[#name]
  v(2pt)
  block(inset: (left: 6pt), text(font: font-mono, size: 8.5pt, fill: c-ink)[#body])
  v(6pt)
}

== Storage responsibilities
#table(columns: (auto, 1fr), stroke: none, align: (left, left),
  text(font: font-mono, size: 8pt, fill: c-slate, weight: 500)[STORE],
  text(font: font-mono, size: 8pt, fill: c-slate, weight: 500)[RESPONSIBILITY],
  table.hline(stroke: 0.5pt + c-slate),
  [PostgreSQL], [Users, sessions, notes, commands, SIEM events, triage, AI interactions, activity, containment.],
  [Redis], [Active session state, terminal history, AI cooldown / rate state, short-lived cache.],
  [Elasticsearch], [Searchable telemetry / log events ingested through Filebeat.],
  [Docker volumes], [Postgres / Redis / Elasticsearch data, WAF logs, Samba data and logs.],
  table.hline(stroke: 1pt + c-navy),
)

== Table columns
#cols("users")[id · username (unique) · password_hash · role (student\|instructor) · skill_level (beginner\|intermediate\|experienced) · onboarding_completed · created_at]

#cols("sessions")[id · user_id → users.id · scenario_id (e.g. SC-01) · role (Red\|Blue) · methodology (default ptes) · ai_mode · phase · score · hints_used (JSON) · roe_acknowledged · started_at · completed_at · container_id · network_name · metadata (JSON)]

#cols("notes")[id · session_id · tag · content · phase · created_at]

#cols("command_log")[id · session_id · command · tool · phase · triggered_siem_events · ai_hint_given · created_at]

#cols("siem_events")[id · session_id · severity · message · raw_log · mitre_technique · source_ip · source (attacker\|background\|system) · acknowledged · created_at]

#cols("auto_evidence")[id · session_id · command · output_summary · tool_name · tag · created_at]

#cols("siem_triage")[id · session_id · event_id · classification (investigating\|true-positive\|false-positive\|escalated) · notes · created_at]

#cols("ai_interactions")[id · session_id · user_id · created_at · kind · hint_level · command_context · phase · prompt_tokens · completion_tokens · model · response_text · latency_ms · was_fallback · flagged]

#cols("user_activity")[id · user_id · session_id · event_type · metadata_json · created_at]

#cols("containment_actions")[id · session_id · user_id · action_type · target_value · status · created_at]

#insight[
  Durable storage keeps command *metadata*, not full raw terminal output. Raw
  output lives only in temporary Redis terminal history and in curated
  `auto_evidence` summaries — keeping the database focused on learning evidence
  and avoiding accidental secret capture.
]

== Migrations
The production schema source of truth is the Alembic migration chain;
`init_db()` is a development bootstrap only.

#codefile(name: "production schema", lang: "bash")[
```bash
cd backend && alembic upgrade head
```
]

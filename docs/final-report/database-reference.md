# Database Reference

This reference is based on the SQLAlchemy models in `backend/src/db/database.py` and the Alembic migration path in `backend/migrations/`. It supports Chapter 4, Chapter 5, and Appendix D.

## Storage Responsibilities

| Store | Responsibility |
| --- | --- |
| PostgreSQL | Durable users, sessions, notes, commands, SIEM events, triage, AI interactions, activity, reports-related evidence, and containment actions |
| Redis | Active session state, terminal history, AI cooldown/rate state, short-lived readiness/cache data |
| Elasticsearch | Searchable telemetry/log events ingested through Filebeat |
| Docker volumes | Service data such as PostgreSQL data, Redis data, Elasticsearch data, WAF logs, and Samba data/logs |

## Core Tables

| Table | Purpose | Primary Relationships |
| --- | --- | --- |
| `users` | Stores student/instructor identity, role, skill level, onboarding state, and creation time | One user has many sessions |
| `sessions` | Stores scenario session lifecycle, role, methodology, AI mode, phase, score, ROE state, sandbox identifiers, and metadata | Belongs to user; has notes, commands, SIEM events |
| `notes` | Stores tagged session notes used for findings, evidence, and methodology progress | Belongs to session |
| `command_log` | Stores submitted command metadata, tool name, phase, SIEM trigger references, and AI hint flag | Belongs to session |
| `siem_events` | Stores SIEM events shown to Blue Team and used in reports/timelines | Belongs to session |
| `auto_evidence` | Stores system-generated evidence summaries from command output patterns | Belongs to session by `session_id` |
| `siem_triage` | Stores Blue Team event classifications and analyst notes | Belongs to session and event id |
| `ai_interactions` | Stores AI hint/debrief interaction metadata, token counts, fallback flag, and response text | Belongs to user and session |
| `user_activity` | Stores audit/activity feed entries for student and instructor workflows | Belongs to user, optionally session |
| `containment_actions` | Stores simulated containment actions for Blue Team response workflow | Belongs to user and session |

## Table Details

### `users`

Columns:

- `id`: string primary key.
- `username`: unique string.
- `password_hash`: password hash.
- `role`: `student` or `instructor`.
- `skill_level`: `beginner`, `intermediate`, or `experienced`.
- `onboarding_completed`: boolean.
- `created_at`: timezone-aware datetime.

Documentation notes:

- Never include password hashes in screenshots or exports.
- The formal report should describe the seeded instructor capability without publishing operational credentials.

### `sessions`

Columns:

- `id`: string primary key.
- `user_id`: foreign key to `users.id`.
- `scenario_id`: scenario identifier such as `SC-01`.
- `role`: Red or Blue workspace role.
- `methodology`: selected methodology, default `ptes`.
- `ai_mode`: AI guidance mode.
- `phase`: current methodology/scenario phase.
- `score`: current score.
- `hints_used`: JSON hint usage list.
- `roe_acknowledged`: rules-of-engagement acknowledgement flag.
- `started_at`, `completed_at`: lifecycle timestamps.
- `container_id`, `network_name`: sandbox runtime identifiers.
- `metadata`: JSON session metadata.

Documentation notes:

- `sessions` is the central table for report generation, instructor analytics, and user history.

### `notes`

Columns:

- `id`, `session_id`, `tag`, `content`, `phase`, `created_at`.

Allowed tag behavior is enforced by the notes route. Notes support findings, evidence capture, and methodology progression.

### `command_log`

Columns:

- `id`, `session_id`, `command`, `tool`, `phase`, `triggered_siem_events`, `ai_hint_given`, `created_at`.

Documentation notes:

- The platform should document command metadata, not full terminal output, as the durable audit trail.
- Full raw output belongs in temporary terminal history and selected evidence summaries only.

### `siem_events`

Columns:

- `id`, `session_id`, `severity`, `message`, `raw_log`, `mitre_technique`, `source_ip`, `source`, `acknowledged`, `created_at`.

Documentation notes:

- `source` distinguishes attacker, background, and system-originated events.
- MITRE fields allow educational mapping in debrief and reports.

### `auto_evidence`

Columns:

- `id`, `session_id`, `command`, `output_summary`, `tool_name`, `tag`, `created_at`.

Documentation notes:

- Used to turn recognized training output patterns into concise report evidence.

### `siem_triage`

Columns:

- `id`, `session_id`, `event_id`, `classification`, `notes`, `created_at`.

Classification values include investigation-style dispositions such as investigating, true positive, false positive, and escalated.

### `ai_interactions`

Columns:

- `id`, `session_id`, `user_id`, `created_at`, `kind`, `hint_level`, `command_context`, `phase`, `prompt_tokens`, `completion_tokens`, `model`, `response_text`, `latency_ms`, `was_fallback`, `flagged`.

Documentation notes:

- Supports safety review, budget tracking, and instructor visibility into AI assistance.
- Sensitive command context must be bounded and redacted before AI usage.

### `user_activity`

Columns:

- `id`, `user_id`, `session_id`, `event_type`, `metadata_json`, `created_at`.

Documentation notes:

- Supports instructor activity feed and audit-style classroom monitoring.

### `containment_actions`

Columns:

- `id`, `session_id`, `user_id`, `action_type`, `target_value`, `status`, `created_at`.

Documentation notes:

- Blue Team containment is simulated and auditable, avoiding unsupported container firewall assumptions.

## Relationship Summary

- One `User` has many `Session` records.
- One `Session` has many `Note` records.
- One `Session` has many `CommandLog` records.
- One `Session` has many `SiemEvent` records.
- One `Session` may have many `SiemTriage`, `AutoEvidence`, `AIInteraction`, `UserActivity`, and `ContainmentAction` records.
- Instructor analytics aggregate across users, sessions, commands, notes, SIEM events, hints, activity, and AI interactions.

## Migration and Production Rule

Production deployment should run Alembic migrations before starting FastAPI:

```bash
cd backend
alembic upgrade head
```

`init_db()` is only a development/test bootstrap helper. The production schema source of truth is the migration chain.


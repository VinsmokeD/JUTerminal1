# Graph Report - .  (2026-04-11)

## Corpus Check
- 117 files · ~102,488 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 103 nodes · 167 edges · 10 communities detected
- Extraction: 76% EXTRACTED · 24% INFERRED · 0% AMBIGUOUS · INFERRED: 40 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `User` - 14 edges
2. `Session` - 12 edges
3. `Base` - 9 edges
4. `Note` - 8 edges
5. `CommandLog` - 8 edges
6. `SiemEvent` - 8 edges
7. `_get()` - 7 edges
8. `Context builder: assembles the full AI context payload for a session.  This repl` - 5 edges
9. `Assemble the full AI context payload for a given session.     This is the brain'` - 5 edges
10. `Summarize notes into a compact representation for the AI.` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Create the default instructor account if it doesn't exist.` --uses--> `User`  [INFERRED]
  backend\src\main.py → backend\src\db\database.py
- `UserCreate` --uses--> `User`  [INFERRED]
  backend\src\auth\routes.py → backend\src\db\database.py
- `Token` --uses--> `User`  [INFERRED]
  backend\src\auth\routes.py → backend\src\db\database.py
- `ProfileUpdate` --uses--> `User`  [INFERRED]
  backend\src\auth\routes.py → backend\src\db\database.py
- `Context builder: assembles the full AI context payload for a session.  This repl` --uses--> `Session`  [INFERRED]
  backend\src\ai\context_builder.py → backend\src\db\database.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.21
Nodes (20): Context builder: assembles the full AI context payload for a session.  This repl, Assemble the full AI context payload for a given session.     This is the brain', Summarize notes into a compact representation for the AI., AutoEvidence, Base, CommandLog, Note, Session (+12 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (15): BaseModel, create_note(), create_token(), get_metrics(), get_timeline(), hash_password(), list_all_sessions(), list_notes() (+7 more)

### Community 2 - "Community 2"
Cohesion: 0.23
Nodes (11): _format_context_for_ai(), get_ai_hint(), _get_fallback_hint(), _load_system_prompt(), _missing_findings(), AI Monitor v2: Context-aware adaptive tutor.  Uses the full context payload from, Compute which expected findings the student hasn't discovered yet., Call Gemini with full context for a learning hint.     Rate-limited per session. (+3 more)

### Community 3 - "Community 3"
Cohesion: 0.25
Nodes (10): _add_to_set(), clear_discoveries(), get_discoveries(), _key(), Discovery tracker: parses terminal command outputs to track what the student has, Return all discoveries for a session., Clear all discoveries for a session (on reset)., Add to Redis set, return True if newly added. (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.29
Nodes (8): cache_delete(), cache_get(), cache_set(), _get(), lpush_capped(), lrange(), publish(), Push to a list and trim to max_len most recent.

### Community 5 - "Community 5"
Cohesion: 0.22
Nodes (10): Backend FastAPI, CyberSim Platform, Docker Sandbox, Frontend React Vite, Integration Test Suite, SC-01 Web App Pentest, SC-02 AD Compromise, SC-03 Phishing (+2 more)

### Community 6 - "Community 6"
Cohesion: 0.5
Nodes (3): lifespan(), Create the default instructor account if it doesn't exist., _seed_admin()

### Community 7 - "Community 7"
Cohesion: 0.5
Nodes (3): BaseSettings, Config, Settings

### Community 8 - "Community 8"
Cohesion: 1.0
Nodes (2): build_ai_context(), _summarize_notes()

### Community 9 - "Community 9"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **17 isolated node(s):** `Config`, `Discovery tracker: parses terminal command outputs to track what the student has`, `Parse a command + output pair and update the discovery state in Redis.     Retur`, `Return all discoveries for a session.`, `Clear all discoveries for a session (on reset).` (+12 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 9`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
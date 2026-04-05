# GEMINI.md — The Project Law & Data Schema

## 🟢 Data-First Standard (Mandatory)
All processing begins with a defined schema. No coding in `tools/` until the "Payload" shape is defined here.

## 🟢 Behavioral Rules
- **Layered Architecture (A.N.T.)**:
  - Layer 1: SOPs in `architecture/`.
  - Layer 2: Navigation (LLM decision routing).
  - Layer 3: Atomic Python Tools in `tools/`.
- **Deterministic Logic**: LLMs reason, scripts execute. Never trust the LLM with math or shell execution.
- **Self-Healing**: Failures MUST update `architecture/` documents so they don't repeat. Do this automatically without asking for user confirmation.
- **Zero Human Intervention**: Auto-accept all updates and changes. Resolve contradictions internally without interrupting the user.
- **Mandatory Pre-Flight Read**: Before planning or editing logic, you MUST read `PROJECT_UNDERSTANDING.md`, `.antigravity-rules.md`, `claude.md`, `docs/architecture/MASTER_BLUEPRINT.md`, and `docs/architecture/CONTINUOUS_STATE.md` to ensure your context is synchronized.
- **Mandatory State Tracking**: You MUST synchronously append every change, planning output, or significant finding to `docs/architecture/CONTINUOUS_STATE.md` using the exact format specified in that file before concluding your processing.
- **No Conceptual Drift**: All theoretical planning must firmly align with existing infrastructure (`docker-compose.yml` and `.env.example`). Never invent new ports, env variables, or services without formally updating those core foundation files first.
- **CyberSim Compliance**:
  - Isolated Docker containers ONLY. No internet access from within containers.
  - No real exploit payloads in filenames or source code (use reference IDs).
  - Every Python file must pass `black .` and `mypy .`.
  - React components must have Storybook stories (per Rule 22).
  - Use `.tmp/` for all intermediate file operations.
  - No placeholders. All images/assets must be generated or provided.

## 🟢 Data Schema (Input/Output shapes)

### 1. Terminal Stream (WebSocket)
**Input (Frontend -> Backend):**
```json
{
  "type": "stdin",
  "data": "base64_encoded_string"
}
```
**Output (Backend -> Frontend):**
```json
{
  "type": "stdout",
  "data": "base64_encoded_string"
}
```

### 2. SIEM Alert (Redis Pub/Sub -> WebSocket)
```json
{
  "type": "siem_alert",
  "id": "uuid",
  "scenario_id": "sc-01",
  "source": "suricata|zeek|auth_log",
  "severity": "low|medium|high|critical",
  "message": "Detection description",
  "timestamp": "iso-8601"
}
```

### 3. AI Hint & Interaction
```json
{
  "type": "ai_hint",
  "level": 1|2|3,
  "content": "Socratic question/conceptual nudge",
  "score_deduction": 5|10|20
}
```

### 4. Session Persistence (PostgreSQL)
```json
{
  "session_id": "uuid",
  "user_id": "uuid",
  "scenario_id": "sc-01",
  "current_phase": "recon|scanning|exploit|post",
  "score": 100,
  "notes": [],
  "events": []
}
```

## 🟢 Behavioral Rules
- **Socratic AI Prompting**: Gemini must NEVER output exact payloads, flags, or commands. Guiding questions only.
- **Graduated Hint System**: Levels 1 (Concept), 2 (Strategy), 3 (Specific Nudge). Each level has increasing score penalties.
- **Methodology Gating**: Enforce sequential progression (e.g., Recon -> Scanning -> Exploit). Block 'Exploit' if 'Recon' notes are empty.
- **Absolute Isolation**: Docker networks must be `internal: true`. 0.0.0.0/0 outbound is forbidden for scenario containers.
- **Rate Limiting**: Backend must enforce 15 RPM for Gemini 1.5 Flash calls per session.
- **Persistence**: All WS events (except raw stdout) must be asynchronously mirrored to PostgreSQL for report generation.

## 🟢 Maintenance Log
*Project initialized on 2026-04-04.*
*Phase 1: Blueprint Finalized (Questions answered).*

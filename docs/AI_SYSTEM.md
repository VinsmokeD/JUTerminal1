# CyberSim AI System

CyberSim uses Gemini as a Socratic training assistant. The AI monitor is designed to guide student reasoning, not to provide complete attack chains or real-world exploitation instructions.

## Source Files

| File | Purpose |
| --- | --- |
| `ai-monitor/system_prompt.md` | System prompt and behavioral constraints |
| `backend/src/ai/monitor.py` | Gemini client integration and fallback handling |
| `backend/src/ai/context_builder.py` | Scenario/student context assembly |
| `backend/src/ai/discovery_tracker.py` | Command/output discovery extraction |
| `backend/src/scenarios/hint_engine.py` | Structured hint API |
| `backend/src/scenarios/hints/*.json` | Scenario hint trees |

## Runtime Rules

- Trigger AI only on command submission or explicit hint requests, not every keystroke.
- Keep responses short and instructional.
- Prefer questions, concepts, and next-investigation nudges.
- Do not emit full exploit payloads, flags, or copy-paste attack chains.
- Apply cooldown/rate limiting per session to protect free-tier usage.
- Fall back to static hints when Gemini is unavailable.

## Configuration

Required environment variables:

```env
GEMINI_API_KEY=your_google_ai_studio_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_MAX_TOKENS=150
AI_CALL_COOLDOWN_SECONDS=10
```

## Verification

AI behavior is only fully verified after running the backend with a valid key and checking:

- hint endpoint responses,
- WebSocket hint emission during terminal commands,
- cooldown enforcement,
- fallback behavior with the key removed,
- refusal/safety behavior for requests outside isolated lab scope.

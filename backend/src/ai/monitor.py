import asyncio
import time
import google.generativeai as genai
from pathlib import Path

from src.config import settings
from src.cache.redis import cache_get, cache_set

_system_prompt: str | None = None


def _load_system_prompt() -> str:
    global _system_prompt
    if _system_prompt:
        return _system_prompt
    # Try mounted path first (Docker), then relative
    paths = [
        Path("/app/ai-monitor/system_prompt.md"),
        Path(__file__).parent.parent.parent / "ai-monitor" / "system_prompt.md",
    ]
    for p in paths:
        if p.exists():
            content = p.read_text()
            # Extract just the prompt string from the markdown file
            if 'SYSTEM_PROMPT = """' in content:
                start = content.index('SYSTEM_PROMPT = """') + len('SYSTEM_PROMPT = """')
                end = content.rindex('"""')
                _system_prompt = content[start:end].strip()
            else:
                _system_prompt = content.strip()
            return _system_prompt
    return "You are a cybersecurity training assistant. Help students learn."


def _build_user_context(session_id: str, state: dict, command: str | None, hint_level: int | None) -> str:
    parts = [
        f"scenario_id: {state.get('scenario_id', 'SC-01')}",
        f"role: {state.get('role', 'red')}",
        f"phase: {state.get('phase', 1)}",
        f"methodology: {state.get('methodology', 'ptes')}",
    ]
    if command:
        parts.append(f"current_action: {command}")
    if hint_level:
        parts.append(f"hint_level_requested: {hint_level}")
    else:
        parts.append("hint_level_requested: null")
    return "\n".join(parts)


async def get_ai_hint(
    session_id: str,
    state: dict,
    command: str | None,
    hint_level: int | None,
) -> str | None:
    """Call Gemini Flash for a learning hint. Rate-limited per session."""
    if not settings.GEMINI_API_KEY:
        return None

    # Rate limit: one call per cooldown period per session
    rate_key = f"ai:{session_id}:last_call"
    last_call = await cache_get(rate_key)
    if last_call and not hint_level:  # Always allow explicit hint requests
        return None

    # For unprompted hints, only trigger on meaningful commands
    if not hint_level and command:
        meaningful_tools = {"nmap", "sqlmap", "gobuster", "nikto", "hydra", "curl",
                            "bloodhound", "crackmapexec", "impacket", "mimikatz",
                            "aws", "msfconsole"}
        first_word = command.strip().split()[0].lower() if command.strip() else ""
        if first_word not in meaningful_tools:
            return None

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            system_instruction=_load_system_prompt(),
        )
        user_msg = _build_user_context(session_id, state, command, hint_level)
        gen_config = genai.GenerationConfig(
            max_output_tokens=settings.GEMINI_MAX_TOKENS,
            temperature=0.4,
        )
        # generate_content is synchronous — run in a thread pool so we never
        # block the FastAPI event loop during the Gemini network round-trip.
        response = await asyncio.to_thread(
            model.generate_content,
            user_msg,
            generation_config=gen_config,
        )
        hint_text = response.text.strip()

        # Mark rate limit (skip for explicit hint requests so they always work)
        if not hint_level:
            await cache_set(rate_key, time.time(), ttl=settings.AI_CALL_COOLDOWN_SECONDS)

        return hint_text

    except Exception as e:
        # Never crash the session over AI failures
        if settings.ENVIRONMENT == "development":
            print(f"[AI Monitor] Error: {e}")
        return None

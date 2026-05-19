"""
AI Monitor v2: Context-aware adaptive tutor.

Uses the full context payload from context_builder to provide precise,
mode-aware guidance. Supports Learn mode (step-by-step teaching) and
Challenge mode (Socratic questioning).
"""

import json
import time
from pathlib import Path

from google import genai
from google.genai import types

from src.config import settings
from src.cache.redis import cache_get, cache_set
from src.ai.context_builder import build_ai_context

_system_prompt_learn: str | None = None
_system_prompt_challenge: str | None = None
_MEANINGFUL_TOOLS = {
    "nmap",
    "sqlmap",
    "gobuster",
    "nikto",
    "hydra",
    "curl",
    "whatweb",
    "bloodhound",
    "crackmapexec",
    "netexec",
    "impacket",
    "mimikatz",
    "hashcat",
    "msfconsole",
    "msfvenom",
    "theharvester",
    "gophish",
}


def _load_system_prompt(mode: str = "challenge") -> str:
    """Load the appropriate system prompt based on mode."""
    global _system_prompt_learn, _system_prompt_challenge

    if mode == "learn" and _system_prompt_learn:
        return _system_prompt_learn
    if mode == "challenge" and _system_prompt_challenge:
        return _system_prompt_challenge

    # Load prompt file
    paths = [
        Path("/app/ai-monitor/system_prompt.md"),
        Path(__file__).parent.parent.parent / "ai-monitor" / "system_prompt.md",
    ]
    content = ""
    for p in paths:
        if p.exists():
            content = p.read_text()
            break

    # Extract LEARN and CHALLENGE prompts from the file
    def _extract_prompt(text: str, var_name: str) -> str:
        marker = f'{var_name} = """'
        if marker not in text:
            return ""
        start = text.index(marker) + len(marker)
        end = text.index('"""', start)
        return text[start:end].strip()

    _system_prompt_learn = _extract_prompt(content, "LEARN_SYSTEM_PROMPT")
    _system_prompt_challenge = _extract_prompt(content, "CHALLENGE_SYSTEM_PROMPT")

    # Fallbacks
    if not _system_prompt_learn:
        _system_prompt_learn = "You are a cybersecurity training tutor in Learn mode. Teach step-by-step with clear explanations. Use the format: [Concept], [What to do], [What to look for], [Pro tip]."
    if not _system_prompt_challenge:
        _system_prompt_challenge = "You are a cybersecurity training monitor in Challenge mode. Use Socratic questioning. Never give direct answers. Always end with a question."

    return _system_prompt_learn if mode == "learn" else _system_prompt_challenge


def _format_context_for_ai(
    context: dict, command: str | None, hint_level: int | None
) -> str:
    """Format the full context dict into a structured prompt string."""
    parts = []

    # Session info
    parts.append(f"=== SESSION STATE ===")
    parts.append(
        f"scenario: {context.get('scenario_id')} — {context.get('scenario_name')}"
    )
    parts.append(f"role: {context.get('role')}")
    parts.append(f"phase: {context.get('phase')}")
    parts.append(f"methodology: {context.get('methodology')}")
    parts.append(f"skill_level: {context.get('skill_level', 'beginner')}")
    parts.append(f"mode: {context.get('mode', 'learn')}")

    # Target knowledge
    env = context.get("target_environment", {})
    if env:
        parts.append(f"\n=== TARGET ENVIRONMENT ===")
        parts.append(f"network: {env.get('network')}")
        for host in env.get("hosts", []):
            parts.append(f"\n  Host: {host.get('ip')} ({host.get('hostname', '')})")
            parts.append(f"  Services: {', '.join(host.get('services', []))}")
            if host.get("vulns"):
                for v in host["vulns"]:
                    parts.append(
                        f"  Vuln: [{v.get('severity')}] {v.get('type')} at {v.get('location')} ({v.get('cwe', '')})"
                    )
            if host.get("attack_path"):
                parts.append(f"  Attack path: {host['attack_path']}")

        if env.get("domain"):
            parts.append(f"  Domain: {env['domain']}")
        if env.get("initial_creds"):
            creds = env["initial_creds"]
            parts.append(
                f"  Initial creds: {creds.get('username')} / {creds.get('password')}"
            )
        if env.get("key_accounts"):
            parts.append(f"  Key accounts: {json.dumps(env['key_accounts'], indent=2)}")

    # Student discoveries
    parts.append(f"\n=== STUDENT DISCOVERIES ===")
    parts.append(f"Discovered services: {context.get('discovered_services', [])}")
    parts.append(f"Discovered paths: {context.get('discovered_paths', [])}")
    parts.append(f"Discovered vulns: {context.get('discovered_vulns', [])}")
    parts.append(f"Discovered credentials: {context.get('discovered_credentials', [])}")
    parts.append(f"Expected findings not yet found: {_missing_findings(context)}")

    # Command history
    history = context.get("command_history", [])
    if history:
        parts.append(f"\n=== RECENT COMMANDS (last {len(history)}) ===")
        for cmd in history[-10:]:
            parts.append(f"  $ {cmd}")

    # Notes
    parts.append(f"\n=== NOTES ===")
    parts.append(f"Total notes: {context.get('note_count', 0)}")
    parts.append(f"Has findings: {context.get('has_findings', False)}")
    parts.append(f"Has evidence: {context.get('has_evidence', False)}")
    parts.append(f"Summary: {context.get('notes_summary', 'None')}")

    # Behavioral signals
    parts.append(f"\n=== BEHAVIORAL SIGNALS ===")
    parts.append(f"Commands this phase: {context.get('commands_this_phase', 0)}")
    parts.append(
        f"Time in current phase: {context.get('phase_duration_minutes', 0)} minutes"
    )
    parts.append(
        f"Time since last command: {context.get('time_since_last_command_seconds', 0)} seconds"
    )

    # Current action
    if command:
        parts.append(f"\n=== CURRENT ACTION ===")
        parts.append(f"Command just executed: {command}")

    if hint_level:
        parts.append(f"\n=== HINT REQUEST ===")
        parts.append(f"Student requested Level {hint_level} hint")
        parts.append(
            f"L1=conceptual nudge, L2=directional guidance, L3=procedural walkthrough"
        )
    else:
        parts.append(f"\nhint_level_requested: null (unprompted observation)")

    return "\n".join(parts)


def _missing_findings(context: dict) -> list[str]:
    """Compute which expected findings the student hasn't discovered yet."""
    expected = set(context.get("key_findings_expected", []))
    found = set(
        context.get("discovered_services", [])
        + context.get("discovered_paths", [])
        + context.get("discovered_vulns", [])
    )
    # Simplified: check which expected items don't have a partial match
    missing = []
    for exp in expected:
        exp_lower = exp.lower()
        if not any(exp_lower in f.lower() or f.lower() in exp_lower for f in found):
            missing.append(exp)
    return missing


def _first_tool(command: str | None) -> str:
    """Return a normalized command tool name for fallback routing."""
    if not command or not command.strip():
        return ""
    return command.strip().split()[0].lower()


def _should_emit_static_command_hint(command: str | None) -> bool:
    """Return True when a command is meaningful enough for a static nudge."""
    return _first_tool(command) in _MEANINGFUL_TOOLS


async def get_ai_hint(
    session_id: str,
    session_state: dict,
    command: str | None,
    hint_level: int | None,
) -> str | None:
    """
    Call Gemini with full context for a learning hint.
    Rate-limited per session. Uses mode-aware system prompt.
    """
    if not settings.GEMINI_API_KEY:
        if hint_level or _should_emit_static_command_hint(command):
            return _get_fallback_hint(session_state, command, hint_level)
        return None

    # Rate limit: one call per cooldown period per session
    rate_key = f"ai:{session_id}:last_call"
    last_call = await cache_get(rate_key)
    if last_call and not hint_level:  # Always allow explicit hint requests
        if _should_emit_static_command_hint(command):
            return _get_fallback_hint(session_state, command, hint_level)
        return None

    # For unprompted hints, only trigger on meaningful commands
    if not hint_level and command:
        # Also trigger on first command ever and on phase transitions
        is_first = not last_call
        if not _should_emit_static_command_hint(command) and not is_first:
            return None

    try:
        # Build full context
        context = await build_ai_context(session_id)
        mode = context.get("mode", "learn")

        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        user_msg = _format_context_for_ai(context, command, hint_level)

        # Learn mode gets more tokens for detailed explanations
        max_tokens = 300 if mode == "learn" else settings.GEMINI_MAX_TOKENS
        if hint_level and hint_level >= 3:
            max_tokens = 400  # Procedural hints need more space

        gen_config = types.GenerateContentConfig(
            system_instruction=_load_system_prompt(mode),
            max_output_tokens=max_tokens,
            temperature=0.4 if mode == "challenge" else 0.3,
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        )

        response = await client.aio.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=user_msg,
            config=gen_config,
        )
        hint_text = (response.text or "").strip()

        # Mark rate limit
        if not hint_level:
            await cache_set(
                rate_key, time.time(), ttl=settings.AI_CALL_COOLDOWN_SECONDS
            )

        # Track last command time for behavioral signals
        await cache_set(f"session:{session_id}:last_cmd_time", time.time(), ttl=7200)

        return hint_text

    except Exception as e:
        if settings.ENVIRONMENT == "development":
            print(f"[AI Monitor] Error: {e}")
        return _get_fallback_hint(session_state, command, hint_level)


def _get_static_fallback_hint(
    state: dict,
    command: str | None,
    hint_level: int | None,
) -> str:
    """Return bounded Socratic guidance without calling Gemini."""
    scenario = state.get("scenario_id", "SC-01").upper()
    phase = state.get("phase", 1)
    role = state.get("role", "red")
    level = hint_level or 1

    generic = {
        1: "Consider what you know so far and what evidence is still missing. What question should your next step answer?",
        2: "Compare the current evidence with the mission methodology. Which hypothesis can you test next without skipping documentation?",
        3: "Write down the artifact you expect to find, the source that should prove it, and the defensive meaning before you continue.",
    }
    hints = {
        ("SC-01", "red", 1): {
            1: "What does the web service reveal before you attempt anything intrusive?",
            2: "Which headers, metadata paths, and visible technologies would help you fingerprint the stack?",
            3: "Capture the service banner, framework clues, and exposed metadata as evidence before moving into enumeration.",
        },
        ("SC-01", "red", 2): {
            1: "Which unlinked paths or file types would change your understanding of the web attack surface?",
            2: "Compare accessible, redirected, and forbidden responses; each can prove a real route exists.",
            3: "Document the relevant paths with status code, purpose, and why each path matters to the next test.",
        },
        ("SC-01", "red", 3): {
            1: "Which input points appear to influence database-backed behavior?",
            2: "Look for error behavior, response-size changes, or authentication differences that prove input reaches a query.",
            3: "Keep the proof minimal: affected parameter, observed response, likely data impact, and remediation recommendation.",
        },
        ("SC-01", "blue", 1): {
            1: "Which alerts are signal, and which are ordinary background activity?",
            2: "Start with severity, source IP, and timing so you can separate one attacker's path from noise.",
            3: "Build a short timeline with first seen time, source, affected service, confidence, and containment priority.",
        },
        ("SC-02", "red", 1): {
            1: "Before choosing an AD path, what do you know about users, groups, computers, and trust boundaries?",
            2: "Prioritize evidence that maps privilege relationships and service-account exposure.",
            3: "Record the account, privilege relationship, and defensive implication for each AD clue before attempting escalation.",
        },
        ("SC-03", "red", 1): {
            1: "What public context would make a training pretext credible without leaving the lab scope?",
            2: "Map persona, role, likely workflow, and expected email behavior before designing the campaign.",
            3: "Document target group, pretext rationale, expected user action, and defensive telemetry that should confirm interaction.",
        },
    }

    hint = hints.get((scenario, role, phase), {}).get(
        level, generic.get(level, generic[1])
    )
    if hint_level:
        return hint

    tool = _first_tool(command)
    if tool:
        return f"{hint} After using {tool}, what result is strong enough to save as evidence before you continue?"
    return hint


def _get_fallback_hint(
    state: dict, command: str | None, hint_level: int | None
) -> str | None:
    """Provide basic guidance when Gemini is unavailable."""
    return _get_static_fallback_hint(state, command, hint_level)

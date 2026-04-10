"""
AI Monitor v2: Context-aware adaptive tutor.

Uses the full context payload from context_builder to provide precise,
mode-aware guidance. Supports Learn mode (step-by-step teaching) and
Challenge mode (Socratic questioning).
"""
import asyncio
import json
import time
from pathlib import Path

import google.generativeai as genai

from src.config import settings
from src.cache.redis import cache_get, cache_set
from src.ai.context_builder import build_ai_context

_system_prompt_learn: str | None = None
_system_prompt_challenge: str | None = None


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


def _format_context_for_ai(context: dict, command: str | None, hint_level: int | None) -> str:
    """Format the full context dict into a structured prompt string."""
    parts = []

    # Session info
    parts.append(f"=== SESSION STATE ===")
    parts.append(f"scenario: {context.get('scenario_id')} — {context.get('scenario_name')}")
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
                    parts.append(f"  Vuln: [{v.get('severity')}] {v.get('type')} at {v.get('location')} ({v.get('cwe', '')})")
            if host.get("attack_path"):
                parts.append(f"  Attack path: {host['attack_path']}")

        if env.get("domain"):
            parts.append(f"  Domain: {env['domain']}")
        if env.get("initial_creds"):
            creds = env["initial_creds"]
            parts.append(f"  Initial creds: {creds.get('username')} / {creds.get('password')}")
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
    parts.append(f"Time in current phase: {context.get('phase_duration_minutes', 0)} minutes")
    parts.append(f"Time since last command: {context.get('time_since_last_command_seconds', 0)} seconds")

    # Current action
    if command:
        parts.append(f"\n=== CURRENT ACTION ===")
        parts.append(f"Command just executed: {command}")

    if hint_level:
        parts.append(f"\n=== HINT REQUEST ===")
        parts.append(f"Student requested Level {hint_level} hint")
        parts.append(f"L1=conceptual nudge, L2=directional guidance, L3=procedural walkthrough")
    else:
        parts.append(f"\nhint_level_requested: null (unprompted observation)")

    return "\n".join(parts)


def _missing_findings(context: dict) -> list[str]:
    """Compute which expected findings the student hasn't discovered yet."""
    expected = set(context.get("key_findings_expected", []))
    found = set(context.get("discovered_services", []) +
                context.get("discovered_paths", []) +
                context.get("discovered_vulns", []))
    # Simplified: check which expected items don't have a partial match
    missing = []
    for exp in expected:
        exp_lower = exp.lower()
        if not any(exp_lower in f.lower() or f.lower() in exp_lower for f in found):
            missing.append(exp)
    return missing


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
        return _get_fallback_hint(session_state, command, hint_level)

    # Rate limit: one call per cooldown period per session
    rate_key = f"ai:{session_id}:last_call"
    last_call = await cache_get(rate_key)
    if last_call and not hint_level:  # Always allow explicit hint requests
        return None

    # For unprompted hints, only trigger on meaningful commands
    if not hint_level and command:
        meaningful_tools = {
            "nmap", "sqlmap", "gobuster", "nikto", "hydra", "curl",
            "whatweb", "bloodhound", "crackmapexec", "netexec",
            "impacket", "mimikatz", "hashcat", "msfconsole", "msfvenom",
            "theHarvester", "gophish",
        }
        first_word = command.strip().split()[0].lower() if command.strip() else ""
        # Also trigger on first command ever and on phase transitions
        is_first = not last_call
        if first_word not in meaningful_tools and not is_first:
            return None

    try:
        # Build full context
        context = await build_ai_context(session_id)
        mode = context.get("mode", "learn")

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            system_instruction=_load_system_prompt(mode),
        )

        user_msg = _format_context_for_ai(context, command, hint_level)

        # Learn mode gets more tokens for detailed explanations
        max_tokens = 300 if mode == "learn" else settings.GEMINI_MAX_TOKENS
        if hint_level and hint_level >= 3:
            max_tokens = 400  # Procedural hints need more space

        gen_config = genai.GenerationConfig(
            max_output_tokens=max_tokens,
            temperature=0.4 if mode == "challenge" else 0.3,
        )

        response = await asyncio.to_thread(
            model.generate_content,
            user_msg,
            generation_config=gen_config,
        )
        hint_text = response.text.strip()

        # Mark rate limit
        if not hint_level:
            await cache_set(rate_key, time.time(), ttl=settings.AI_CALL_COOLDOWN_SECONDS)

        # Track last command time for behavioral signals
        await cache_set(f"session:{session_id}:last_cmd_time", time.time(), ttl=7200)

        return hint_text

    except Exception as e:
        if settings.ENVIRONMENT == "development":
            print(f"[AI Monitor] Error: {e}")
        return _get_fallback_hint(session_state, command, hint_level)


def _get_fallback_hint(state: dict, command: str | None, hint_level: int | None) -> str | None:
    """Provide basic guidance when Gemini is unavailable."""
    if not hint_level:
        return None

    scenario = state.get("scenario_id", "SC-01").upper()
    phase = state.get("phase", 1)
    role = state.get("role", "red")

    fallback_hints = {
        "SC-01": {
            "red": {
                1: {
                    1: "Think about what information you can gather without touching the target directly. What's publicly visible?",
                    2: "Start with passive recon: HTTP headers, robots.txt, SSL certificates. These reveal the technology stack.",
                    3: "Run 'curl -I' against the target IP to see HTTP response headers. Look for Server and X-Powered-By headers — they tell you what software is running.",
                },
                2: {
                    1: "You know the target is running a web server. What directories might exist that aren't linked from the homepage?",
                    2: "Directory enumeration with a wordlist can reveal hidden paths. Common findings: /admin, /backup, /uploads, /api.",
                    3: "Use a directory brute-forcing tool against the web server on port 80. Common wordlists are in /usr/share/wordlists/. Look for Status 200 and 403 responses — both are interesting.",
                },
                3: {
                    1: "You've found some interesting paths. What happens when user input reaches a database query without sanitization?",
                    2: "Test input fields for SQL injection. A single quote in a form field tests whether input is sanitized. Error messages leaking database type are critical findings.",
                    3: "Try entering a single quote (') in the login form fields. If you get a SQL error, the parameter is injectable. Then use an automated tool to extract data — but understand what it's doing.",
                },
            },
            "blue": {
                1: {
                    1: "What should you look at first when investigating potential web application attacks?",
                    2: "Start by identifying which SIEM events are from attackers vs background noise. Filter by severity.",
                    3: "Look at HIGH and CRITICAL severity events first. Check the source IP — is it from the expected network range? Correlate timestamps to build an attack timeline.",
                },
            },
        },
        "SC-02": {
            "red": {
                1: {
                    1: "Before attacking Active Directory, you need to understand its structure. What tool maps the entire AD trust chain?",
                    2: "AD reconnaissance tools can map users, groups, computers, and trust relationships. This reveals the shortest path to Domain Admin.",
                    3: "Use BloodHound to collect AD data. It will show you users, group memberships, and which accounts are Kerberoastable. Start with the low-privilege credentials you have.",
                },
            },
        },
        "SC-03": {
            "red": {
                1: {
                    1: "Effective phishing requires research. What information would make your pretext more convincing?",
                    2: "OSINT gathering: company domain, employee names, job titles, recent events. The more specific your pretext, the higher the success rate.",
                    3: "Research the target organization. Find naming conventions, job roles, and recent events. A logistics company invoice or delivery notice makes a natural pretext.",
                },
            },
        },
    }

    scenario_hints = fallback_hints.get(scenario, {})
    role_hints = scenario_hints.get(role, {})
    phase_hints = role_hints.get(phase, role_hints.get(1, {}))
    return phase_hints.get(hint_level, f"Consider what you know so far and what information you still need. What's the logical next step in your methodology?")

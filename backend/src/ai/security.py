import re
from typing import NamedTuple
from datetime import datetime, timezone

from src.config import settings
from src.cache.redis import cache_get, cache_set, cache_increment


class SanitizationResult(NamedTuple):
    text: str
    was_flagged: bool
    violations: list[str]
    fallback_category: str | None


# Define injection patterns that we should strip or escape from student input
_INJECTION_MARKERS = [
    r"(?i)ignore previous",
    r"(?i)disregard previous",
    r"(?i)forget previous",
    r"(?i)system:",
    r"(?i)assistant:",
    r"(?i)user:",
    r"```(?:system|assistant)",
]

_SENSITIVE_KEY_PARTS = (
    "password",
    "passwd",
    "pwd",
    "hash",
    "secret",
    "token",
    "flag",
    "credential",
    "private_key",
    "api_key",
)
_REDACTED_VALUE = "<REDACTED - student must discover>"

FLAG_REGEX = re.compile(
    r"FLAG\{[A-Za-z0-9_]+\}|FLAG-SC\d+-\d+|kerberoast_hash|dcsync_krbtgt_nthash", re.IGNORECASE
)
CREDENTIAL_REGEX = re.compile(
    r"\b(password|passwd|pass|key|hash|secret|token|credential)\s*[:=]\s*([^\s,;\"']+)",
    re.IGNORECASE,
)

FORBIDDEN_PATTERNS: list[tuple[re.Pattern, str, str]] = [
    (
        re.compile(
            r"\b(sqlmap|hydra|hashcat|john|metasploit|msfconsole|gobuster|ffuf|nikto|wpscan|wfuzz|enum4linux|crackmapexec|impacket-\w+)\s+-\w",
            re.IGNORECASE,
        ),
        "tool_with_flag",
        "tool_choice",
    ),
    (
        re.compile(
            r"\bnmap\s+-(s[STUVAWVMi]|O|A|T[0-5]|p-|D|f|Pn)\b.*?\d{1,3}\.\d{1,3}", re.IGNORECASE
        ),
        "nmap_flag",
        "recon",
    ),
    (
        re.compile(r"['\"]\s*OR\s+['\"]?\s*1\s*['\"]?\s*=\s*['\"]?\s*1", re.IGNORECASE),
        "sqli_tautology",
        "sqli",
    ),
    (re.compile(r"\badmin['\"]?\s*--"), "sqli_admin_bypass", "sqli"),
    (re.compile(r"UNION\s+SELECT", re.IGNORECASE), "sqli_union", "sqli"),
    (re.compile(r"<script[^>]*>", re.IGNORECASE), "xss_script_tag", "xss"),
    (re.compile(r"\bon(error|load|click)\s*=", re.IGNORECASE), "xss_event_handler", "xss"),
    (re.compile(r"javascript\s*:", re.IGNORECASE), "xss_js_uri", "xss"),
    (re.compile(r"\.\./\.\./|\.\.%2f\.\.%2f", re.IGNORECASE), "path_traversal", "lfi"),
    (re.compile(r"\$\{jndi:", re.IGNORECASE), "log4shell", "deserialization"),
    (re.compile(r"P@ssw0rd_NovaMed_2023!", re.IGNORECASE), "lab_cred_novamed", "credential"),
    (re.compile(r"WebAppPass2024!", re.IGNORECASE), "lab_cred_webapp", "credential"),
    (re.compile(r"Password123\b"), "lab_cred_jsmith", "credential"),
    (re.compile(r"Backup2023!"), "lab_cred_svcbackup", "credential"),
]


LEARN_MODE_PATTERNS: list[tuple[re.Pattern, str, str]] = [
    (
        re.compile(
            r"\b(sqlmap|hydra|hashcat|john|metasploit|msfconsole|gobuster|ffuf|nikto|wpscan|wfuzz|enum4linux|crackmapexec|impacket-\w+)\b(?!\s*-\w)",
            re.IGNORECASE,
        ),
        "tool_leakage",
        "tool_choice",
    ),
]


SOCRATIC_FALLBACKS: dict[str, str] = {
    "tool_choice": "What category of tool fits this phase? Before picking flags, what do you need to learn about the target?",
    "recon": "What information do you need first? How would you discover what services are exposed without testing each port by hand?",
    "sqli": "What character would break out of a SQL string literal? Once you've escaped that string context, what kind of logical condition would change the query's outcome regardless of the original value?",
    "xss": "Where does user input end up rendered in the response? What HTML context is it placed inside?",
    "lfi": "Where in the URL does the application accept a filename? What sequence moves a path up one directory level, and how many levels up is the file you want?",
    "deserialization": "What kind of data does this endpoint deserialize? What would happen if the object had a side effect on construction?",
    "credential": "Credentials are recovered through technique, not asked for. What attack class fits this account type, and what would you extract to attack it offline?",
    "default": "Let's take a step back. What is your current goal in this phase, and what concept are you trying to apply?",
}


def sanitize_tutor_response(text: str, mode: str = "challenge") -> SanitizationResult:
    """
    Critical: do NOT match on /etc/passwd, /etc/shadow, or topic-name-only patterns.
    Mentioning a sensitive file name in a conceptual context is permitted education.
    Only payload shapes are filtered.
    """
    if not text:
        return SanitizationResult(
            text=text, was_flagged=False, violations=[], fallback_category=None
        )

    violations: list[str] = []
    triggered_category: str | None = None

    patterns = FORBIDDEN_PATTERNS.copy()
    if mode == "learn":
        patterns.extend(LEARN_MODE_PATTERNS)

    for pattern, label, category in patterns:
        if pattern.search(text):
            violations.append(label)
            if triggered_category is None:
                triggered_category = category

    if violations:
        clean = SOCRATIC_FALLBACKS.get(
            triggered_category or "default", SOCRATIC_FALLBACKS["default"]
        )
        return SanitizationResult(
            text=clean,
            was_flagged=True,
            violations=violations,
            fallback_category=triggered_category,
        )

    return SanitizationResult(text=text, was_flagged=False, violations=[], fallback_category=None)


def redact_text(text: str, session_metadata: dict | None = None) -> str:
    if not text:
        return ""
    # 1. Dynamic metadata scrubbing first to ensure exact strings in metadata
    # are caught before regexes modify them
    if session_metadata:
        sensitive_vals = []

        def extract_strings(val):
            if isinstance(val, str):
                if len(val) >= 4:
                    sensitive_vals.append(val)
            elif isinstance(val, dict):
                for k, v in val.items():
                    extract_strings(v)
            elif isinstance(val, list):
                for item in val:
                    extract_strings(item)

        extract_strings(session_metadata)
        for val in sorted(set(sensitive_vals), key=len, reverse=True):
            if val in ("true", "false", "null", "none", "admin", "user"):
                continue
            text = text.replace(val, "[REDACTED_METADATA_SECRET]")

    # 2. Regex scrubbing
    text = FLAG_REGEX.sub("[REDACTED_FLAG]", text)
    # 3. Scrub password/hash patterns
    text = CREDENTIAL_REGEX.sub(r"\1: [REDACTED_CREDENTIAL]", text)
    return text


def sanitize_untrusted(text: str | None) -> str:
    """
    Wrap all user-derived content in explicit delimiters and strip injection markers.
    (OWASP LLM01 - Prompt Injection)
    """
    if not text:
        return ""

    sanitized = text
    for pattern in _INJECTION_MARKERS:
        sanitized = re.sub(pattern, "[REDACTED_MARKER]", sanitized)

    # Escape any existing closing tags
    sanitized = sanitized.replace("<<END>>", "[ESCAPED_END]")

    return f"<<UNTRUSTED_STUDENT_INPUT>>\n{sanitized}\n<<END>>"


def _is_sensitive_key(key: object) -> bool:
    key_text = str(key).lower()
    return any(part in key_text for part in _SENSITIVE_KEY_PARTS)


def _redact_sensitive_values(value):
    if isinstance(value, dict):
        safe = {}
        for key, item in value.items():
            safe[key] = (
                _REDACTED_VALUE if _is_sensitive_key(key) else _redact_sensitive_values(item)
            )
        return safe
    if isinstance(value, list):
        return [_redact_sensitive_values(item) for item in value]
    return value


def redact_for_ai(target_knowledge: dict, current_phase: int = 1) -> dict:
    try:
        return _redact_for_ai_impl(target_knowledge, current_phase)
    except (KeyError, TypeError, ValueError):
        return _redact_sensitive_values(target_knowledge or {})


def _redact_for_ai_impl(target_knowledge: dict, current_phase: int = 1) -> dict:
    """
    Redact plaintext credentials and gate attack paths.
    (OWASP LLM02 - Sensitive Information Disclosure)
    """
    if not target_knowledge:
        return {}

    redacted = _redact_sensitive_values(target_knowledge)
    if isinstance(redacted.get("key_accounts"), dict):
        redacted["key_accounts"] = [
            (
                {"username": account_name, **account}
                if isinstance(account, dict)
                else {"username": account_name, "details": account}
            )
            for account_name, account in redacted["key_accounts"].items()
        ]

    # 1. Redact initial credentials
    if "initial_creds" in redacted:
        creds = dict(redacted["initial_creds"])
        if "password" in creds:
            creds["password"] = "<REDACTED — student must discover>"
        if "hash" in creds:
            creds["hash"] = "<REDACTED — student must discover>"
        redacted["initial_creds"] = creds

    # 2. Redact key accounts
    if "key_accounts" in redacted:
        accounts = []
        for acc in redacted["key_accounts"]:
            safe_acc = dict(acc)
            if "password" in safe_acc:
                safe_acc["password"] = "<REDACTED — student must discover>"
            if "hash" in safe_acc:
                safe_acc["hash"] = "<REDACTED — student must discover>"
            accounts.append(safe_acc)
        redacted["key_accounts"] = accounts

    # 3. Gate attack paths based on phase
    # Only reveal path knowledge for the current + previous phase
    if "hosts" in redacted:
        hosts = []
        for host in redacted["hosts"]:
            safe_host = dict(host)
            # If the host has a specific phase requirement for its attack path, gate it
            # Since scenarios don't define phase per host attack_path explicitly yet,
            # we just ensure we don't leak end-game (phase 3) paths in phase 1.
            # Simplified: hide attack_path completely if we are in phase 1 and it looks complex.
            # Real implementation would rely on `phase` tagged on the host or finding.
            if current_phase < 2 and "attack_path" in safe_host:
                safe_host["attack_path"] = "<REDACTED — phase too low to reveal>"
            hosts.append(safe_host)
        redacted["hosts"] = hosts

    return redacted


def validate_ai_output(text: str | None, scenario_secrets: list[str] = None) -> tuple[bool, str]:
    """
    Reject or scrub responses that leak known credentials, contain HTML, or verbatim echo prompts.
    (OWASP LLM05 - Improper Output Handling & LLM07 - System Prompt Leakage)

    Returns (is_valid, sanitized_text_or_fallback).
    """
    if not text:
        return False, ""

    # 1. Check length
    if len(text) > 4000:
        return False, "[Output rejected: length exceeded safety limit]"

    # 2. Check for HTML/Script tags
    if re.search(r"<script.*?>.*?</script>", text, flags=re.IGNORECASE | re.DOTALL) or re.search(
        r"<iframe.*?>", text, flags=re.IGNORECASE
    ):
        return False, "[Output rejected: unsafe HTML/script detected]"

    # 3. System prompt leakage
    leak_phrases = [
        "You are a cybersecurity training tutor",
        "You are a cybersecurity training monitor",
        "Never reveal credentials",
        "UNTRUSTED_STUDENT_INPUT",
    ]
    for phrase in leak_phrases:
        if phrase.lower() in text.lower():
            return False, "[Output rejected: system instruction leakage detected]"

    # 4. Leakage of known scenario secrets (if provided)
    if scenario_secrets:
        for secret in scenario_secrets:
            if secret and secret in text:
                return False, "[Output rejected: sensitive credential disclosure detected]"

    return True, text


async def check_ai_budget(user_id: str, prompt_tokens_estimate: int = 0) -> bool:
    """
    Enforce global and per-user token budgets and call limits.
    (OWASP LLM10 - Unbounded Consumption)
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    hour = datetime.now(timezone.utc).strftime("%Y-%m-%d-%H")

    global_daily_key = f"ai:budget:global:{today}:tokens"
    user_daily_key = f"ai:budget:user:{user_id}:{today}:tokens"
    user_hourly_key = f"ai:budget:user:{user_id}:{hour}:calls"

    # Check current limits before incrementing
    global_tokens = int(await cache_get(global_daily_key) or 0)
    user_tokens = int(await cache_get(user_daily_key) or 0)
    user_calls = int(await cache_get(user_hourly_key) or 0)

    if global_tokens + prompt_tokens_estimate >= settings.AI_GLOBAL_DAILY_TOKEN_BUDGET:
        return False

    if user_tokens + prompt_tokens_estimate >= settings.AI_USER_DAILY_TOKEN_BUDGET:
        return False

    if user_calls >= settings.AI_USER_HOURLY_CALL_LIMIT:
        return False

    return True


async def record_ai_usage(user_id: str, prompt_tokens: int, completion_tokens: int):
    """
    Increment usage counters after a successful API call.
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    hour = datetime.now(timezone.utc).strftime("%Y-%m-%d-%H")

    global_daily_key = f"ai:budget:global:{today}:tokens"
    user_daily_key = f"ai:budget:user:{user_id}:{today}:tokens"
    user_hourly_key = f"ai:budget:user:{user_id}:{hour}:calls"

    total_tokens = prompt_tokens + completion_tokens

    # 24 hour TTL for daily, 2 hour TTL for hourly
    await cache_increment(global_daily_key, amount=total_tokens, ttl=86400)
    await cache_increment(user_daily_key, amount=total_tokens, ttl=86400)
    await cache_increment(user_hourly_key, amount=1, ttl=7200)

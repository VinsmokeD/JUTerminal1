"""Branch inference and branch-aware hint helpers."""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

from src.cache.redis import cache_get, cache_set

_HINT_PATH = Path(__file__).resolve().parent / "hints" / "branch_hints.json"
_BRANCH_TTL = 28800

_BRANCH_RULES: dict[str, list[tuple[str, str, str]]] = {
    "SC-01": [
        ("branch_sqli", "SQLi upload path", r"sqlmap|union\s+select|or\s+1=1|/login"),
        ("branch_lfi", "LFI traversal path", r"path-as-is|\.\./|%2e|/etc/passwd|records\?file"),
        ("branch_redis", "Redis service path", r"redis-cli|6379|config\s+set|authorized_keys"),
    ],
    "SC-02": [
        ("branch_kerberoast", "Kerberoast path", r"GetUserSPNs|kerberoast|4769|hashcat.*13100"),
        ("branch_asrep", "AS-REP path", r"GetNPUsers|AS-REP|KRB5ASREP|DONT_REQ_PREAUTH"),
        ("branch_gpp", "GPP cpassword path", r"Groups\.xml|cpassword|gpp-decrypt|SYSVOL"),
    ],
    "SC-03": [
        ("branch_sso", "SSO credential-capture path", r"landing|sso|credential|password|2fa"),
        ("branch_payload", "Attachment payload path", r"docm|iso|pdf|macro|payload|attachment"),
        ("branch_beacon", "Beacon detection path", r"beacon|check-in|/api/cmd|/api/check-in|c2"),
    ],
}


@lru_cache(maxsize=1)
def _load_branch_hints() -> dict[str, Any]:
    if not _HINT_PATH.exists():
        return {}
    with _HINT_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _branch_cache_key(session_id: str) -> str:
    return f"session:{session_id}:active_branch"


async def infer_active_branch(
    session_id: str, scenario_id: str, command: str
) -> dict[str, str] | None:
    """Infer and cache the active scenario branch from a submitted command."""
    current = await get_active_branch(session_id)
    for branch_id, label, pattern in _BRANCH_RULES.get(scenario_id, []):
        if re.search(pattern, command, re.IGNORECASE):
            branch = {"id": branch_id, "label": label}
            await cache_set(_branch_cache_key(session_id), branch, ttl=_BRANCH_TTL)
            return branch
    return current


async def get_active_branch(session_id: str) -> dict[str, str] | None:
    cached = await cache_get(_branch_cache_key(session_id))
    return cached if isinstance(cached, dict) else None


def get_branch_hint(
    scenario_id: str, role: str, phase: int, branch_id: str | None, level: int
) -> list[str] | None:
    if not branch_id:
        return None
    data = _load_branch_hints()
    phase_hints = data.get(scenario_id, {}).get(role, {}).get(str(phase), {}).get(branch_id, {})
    hint = phase_hints.get(f"L{level}")
    if isinstance(hint, list):
        return hint
    if isinstance(hint, str):
        return [hint]
    return None

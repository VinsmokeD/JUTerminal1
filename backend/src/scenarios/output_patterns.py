"""Scenario output fingerprint scanner for terminal teaching moments."""

from __future__ import annotations

import json
import re
from hashlib import sha1
from functools import lru_cache
from pathlib import Path
from typing import Any

from src.cache.redis import cache_set_if_absent, cache_get

_PATTERN_DIR = Path(__file__).resolve().parent / "patterns"
_ANSI_RE = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]")
_buffers: dict[str, str] = {}
_INSIGHT_DEDUP_TTL_SECONDS = 300
_INSIGHT_COOLDOWN_SECONDS = 30
_GENERIC_PATTERNS_RAW: list[dict[str, Any]] = [
    {
        "id": "shell-tool-usage",
        "regex": r"usage:\s+\S+\.py|positional arguments:|options:",
        "what": "The tool printed its help screen instead of running the intended action.",
        "why": "This usually means the command was missing its target, credentials, or required flags.",
        "next": "Rebuild the command as one complete line: tool name, required options, then the target. Avoid pressing Enter after a trailing backslash unless you continue the command immediately.",
        "tags": ["shell", "recovery"],
    },
    {
        "id": "shell-option-alone",
        "regex": r"bash:\s+-{1,2}[A-Za-z0-9][\w-]*:\s+command not found",
        "what": "A command option was submitted as its own command.",
        "why": "Shell flags such as -dc-ip or --rules-file only work when they are attached to the tool command they configure.",
        "next": "Put every option on the same command line as the tool. If you split lines, keep the backslash at the end of each continued line and do not submit a blank continuation line.",
        "tags": ["shell", "syntax"],
    },
    {
        "id": "wordlist-missing",
        "regex": r"rockyou\.txt:\s+No such file|/usr/share/wordlists/rockyou\.txt:\s+No such file",
        "what": "The expected password wordlist path is missing in this Kali image.",
        "why": "Some Kali builds ship rockyou compressed as rockyou.txt.gz or under the SecLists directory.",
        "next": "Check for the compressed wordlist first, then either decompress it to your home directory or use the available SecLists password path.",
        "tags": ["tooling", "wordlist"],
    },
    {
        "id": "auth-or-share-denied",
        "regex": r"NT_STATUS_ACCESS_DENIED|STATUS_LOGON_FAILURE|tree connect failed",
        "what": "The target rejected the current authentication context.",
        "why": "This can mean the account is wrong, the password is wrong, the domain prefix is missing, or the share requires a different privilege level.",
        "next": "Verify the exact domain, username, password, and share name. Then document whether the denial is expected access control or a credential problem.",
        "tags": ["credentials", "smb"],
    },
]


@lru_cache(maxsize=1)
def _generic_patterns() -> list[dict[str, Any]]:
    patterns: list[dict[str, Any]] = []
    for item in _GENERIC_PATTERNS_RAW:
        try:
            patterns.append({**item, "_compiled": re.compile(item["regex"], re.IGNORECASE)})
        except (KeyError, re.error):
            continue
    return patterns


@lru_cache(maxsize=8)
def _load_patterns(scenario_id: str) -> list[dict[str, Any]]:
    stem = scenario_id.lower().replace("-", "")
    path = _PATTERN_DIR / f"{stem}_outputs.json"
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as handle:
        raw = json.load(handle)
    patterns: list[dict[str, Any]] = []
    for item in raw:
        try:
            patterns.append({**item, "_compiled": re.compile(item["regex"], re.IGNORECASE)})
        except (KeyError, re.error):
            continue
    return patterns


def _clean_output(text: str) -> str:
    return _ANSI_RE.sub("", text).replace("\r", "")


def _phase_matches(pattern: dict[str, Any], current_phase: int | None) -> bool:
    phases = pattern.get("phases")
    if current_phase is None or not phases:
        return True
    return int(current_phase) in {int(phase) for phase in phases}


def _dedup_key(session_id: str, insight: dict[str, Any]) -> str:
    fingerprint = sha1(
        f"{insight.get('id', '')}:{insight.get('next', '')}".encode("utf-8")
    ).hexdigest()
    return f"insight:{session_id}:dedup:{fingerprint}"


_BANNER_GUARD = re.compile(
    r"RED OBJECTIVE|BLUE OBJECTIVE|CyberSim Training(?: Platform)?|"
    r"Type 'scope'|Tools(?: available)?:\s*(nmap|gobuster|sqlmap|smbclient|kerbrute)",
    re.IGNORECASE,
)


_FLAG_CANDIDATE_DEDUP_TTL_SECONDS = 600  # 10 min — re-nudge if still uncaptured


@lru_cache(maxsize=8)
def _compile_flag_patterns(scenario_id: str) -> list[dict[str, Any]]:
    """Return compiled flag scan entries for a scenario (cached)."""
    from src.scenarios.loader import get_flags

    compiled: list[dict[str, Any]] = []
    for flag in get_flags(scenario_id):
        pattern_str: str = flag.get("value_pattern", "")
        if not pattern_str:
            # Fall back to a literal search on the exact value
            raw_val: str = flag.get("value", "")
            if raw_val:
                pattern_str = re.escape(raw_val)
        if not pattern_str:
            continue
        try:
            compiled.append(
                {
                    "flag_id": flag["id"],
                    "description": flag.get("description", ""),
                    "_compiled": re.compile(pattern_str, re.IGNORECASE),
                }
            )
        except re.error:
            continue
    return compiled


async def scan_flag_candidates(
    session_id: str,
    scenario_id: str,
    chunk: str,
) -> list[dict[str, Any]]:
    """Return flag_candidate nudges for flag-shaped strings seen in terminal output.

    Only fires when the student's terminal actually produces a matching line.
    Never volunteers the flag value — only flag_id, points available, and
    whether already captured. The student must still submit via FlagSubmitWidget.
    """
    if not chunk:
        return []

    clean = _clean_output(chunk)
    # Reuse the same line-complete buffer as scan_output_chunk (keyed differently
    # to avoid cross-contamination between the two scanners).
    buf_key = f"{session_id}:flagscan"
    buffered = _buffers.get(buf_key, "") + clean
    if "\n" not in buffered:
        _buffers[buf_key] = buffered[-2000:]
        return []

    parts = buffered.split("\n")
    complete_lines = parts[:-1]
    _buffers[buf_key] = parts[-1][-2000:]
    complete_lines = [ln for ln in complete_lines if not _BANNER_GUARD.search(ln)]
    if not complete_lines:
        return []

    # Fetch already-captured flags once per call (Redis cache, fast)
    cached_state: dict[str, Any] = await cache_get(f"session:{session_id}:state") or {}
    captured_flags: list[str] = cached_state.get("flags_captured", [])

    from src.scenarios.loader import get_scoring

    flag_patterns = _compile_flag_patterns(scenario_id)
    scoring = get_scoring(scenario_id, "red")
    flag_bonuses: dict[str, int] = scoring.get("flag_bonuses", {})

    candidates: list[dict[str, Any]] = []
    seen_ids: set[str] = set()  # one nudge per flag per call

    for line in complete_lines[-30:]:
        if not line.strip():
            continue
        for entry in flag_patterns:
            flag_id: str = entry["flag_id"]
            if flag_id in seen_ids:
                continue
            compiled: re.Pattern[str] = entry["_compiled"]
            m = compiled.search(line)
            if not m:
                continue
            # Dedup: suppress if already nudged recently for this (session, flag)
            dedup_key = f"flagcandidate:{session_id}:{flag_id}"
            already_nudged = not await cache_set_if_absent(
                dedup_key, "1", ttl=_FLAG_CANDIDATE_DEDUP_TTL_SECONDS
            )
            if already_nudged and flag_id not in captured_flags:
                # Still suppress — student was already nudged
                seen_ids.add(flag_id)
                continue
            seen_ids.add(flag_id)
            if flag_id in captured_flags:
                continue
            points = flag_bonuses.get(flag_id, 0)
            candidates.append(
                {
                    "flag_id": flag_id,
                    "description": entry["description"],
                    "matched_text": m.group(0)[:200],
                    "points": points,
                }
            )
    return candidates


async def scan_output_chunk(
    session_id: str,
    scenario_id: str,
    chunk: str,
    current_phase: int | None = None,
) -> list[dict[str, Any]]:
    """Return teaching insights found in completed terminal output lines."""
    if not chunk:
        return []

    clean = _clean_output(chunk)
    buffered = _buffers.get(session_id, "") + clean
    if "\n" not in buffered:
        _buffers[session_id] = buffered[-2000:]
        return []

    parts = buffered.split("\n")
    complete_lines = parts[:-1]
    _buffers[session_id] = parts[-1][-2000:]
    complete_lines = [ln for ln in complete_lines if not _BANNER_GUARD.search(ln)]
    if not complete_lines:
        return []

    insights: list[dict[str, Any]] = []
    for line in complete_lines[-30:]:
        if not line.strip():
            continue
        line_matched_specific = False
        for pattern in _load_patterns(scenario_id):
            compiled = pattern.get("_compiled")
            if (
                not compiled
                or not _phase_matches(pattern, current_phase)
                or not compiled.search(line)
            ):
                continue
            line_matched_specific = True
            insight = {
                "id": pattern.get("id"),
                "matched_line": line[-500:],
                "what": pattern.get("what", "Interesting output fingerprint detected."),
                "why": pattern.get("why", "This line can guide the next investigation step."),
                "next": pattern.get(
                    "next",
                    "Record the evidence and continue with the scenario methodology.",
                ),
                "tags": pattern.get("tags", []),
            }
            if not await cache_set_if_absent(
                _dedup_key(session_id, insight), "1", ttl=_INSIGHT_DEDUP_TTL_SECONDS
            ):
                continue
            cooldown_key = f"insight:{session_id}:cooldown"
            if not await cache_set_if_absent(
                cooldown_key, insight["id"] or "insight", ttl=_INSIGHT_COOLDOWN_SECONDS
            ):
                continue
            insights.append(insight)
            break
        if line_matched_specific:
            continue
        for pattern in _generic_patterns():
            compiled = pattern.get("_compiled")
            if (
                not compiled
                or not _phase_matches(pattern, current_phase)
                or not compiled.search(line)
            ):
                continue
            insight = {
                "id": pattern.get("id"),
                "matched_line": line[-500:],
                "what": pattern.get("what", "Interesting output fingerprint detected."),
                "why": pattern.get("why", "This line can guide the next investigation step."),
                "next": pattern.get(
                    "next",
                    "Record the evidence and continue with the scenario methodology.",
                ),
                "tags": pattern.get("tags", []),
            }
            if not await cache_set_if_absent(
                _dedup_key(session_id, insight), "1", ttl=_INSIGHT_DEDUP_TTL_SECONDS
            ):
                continue
            cooldown_key = f"insight:{session_id}:cooldown"
            if not await cache_set_if_absent(
                cooldown_key, insight["id"] or "insight", ttl=_INSIGHT_COOLDOWN_SECONDS
            ):
                continue
            insights.append(insight)
            break
    return insights

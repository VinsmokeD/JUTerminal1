"""Scenario output fingerprint scanner for terminal teaching moments."""
from __future__ import annotations

import json
import re
import time
from functools import lru_cache
from pathlib import Path
from typing import Any

_PATTERN_DIR = Path(__file__).resolve().parent / "patterns"
_ANSI_RE = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]")
_buffers: dict[str, str] = {}
_last_emit: dict[tuple[str, str], float] = {}
_EMIT_TTL_SECONDS = 45.0


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


_BANNER_GUARD = re.compile(
    r"RED OBJECTIVE|BLUE OBJECTIVE|CyberSim Training(?: Platform)?|"
    r"Type 'scope'|Tools(?: available)?:\s*(nmap|gobuster|sqlmap|smbclient|kerbrute)",
    re.IGNORECASE,
)


def scan_output_chunk(session_id: str, scenario_id: str, chunk: str) -> list[dict[str, Any]]:
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

    now = time.monotonic()
    insights: list[dict[str, Any]] = []
    for line in complete_lines[-30:]:
        if not line.strip():
            continue
        for pattern in _load_patterns(scenario_id):
            compiled = pattern.get("_compiled")
            if not compiled or not compiled.search(line):
                continue
            emit_key = (session_id, pattern.get("id", "unknown"))
            if now - _last_emit.get(emit_key, 0.0) < _EMIT_TTL_SECONDS:
                continue
            _last_emit[emit_key] = now
            insights.append(
                {
                    "id": pattern.get("id"),
                    "matched_line": line[-500:],
                    "what": pattern.get("what", "Interesting output fingerprint detected."),
                    "why": pattern.get("why", "This line can guide the next investigation step."),
                    "next": pattern.get("next", "Record the evidence and continue with the scenario methodology."),
                    "tags": pattern.get("tags", []),
                }
            )
    return insights

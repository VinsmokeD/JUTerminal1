"""Immediate classroom SIEM telemetry from submitted terminal commands.

The Elasticsearch poller remains the production-style SIEM path. This bridge
keeps the student UI responsive during labs by emitting scenario event-map
telemetry for commands that clearly match a training detection.
"""
from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.cache.redis import publish
from src.db.database import SiemEvent

_EVENTS_DIR = Path(__file__).resolve().parent / "events"
_TRAILING_CONTINUATION = re.compile(r"\\\s*$")
_OPTION_ONLY = re.compile(r"^\s*-{1,2}[A-Za-z0-9][\w-]*(?:\s|$)")
_SCRIPT_ONLY = re.compile(
    r"^\s*(?:python3?\s+)?(?:/opt/impacket/examples/)?"
    r"(?:GetUserSPNs|secretsdump|smbexec|psexec|wmiexec|ticketer)\.py\s*$",
    re.IGNORECASE,
)


def _event_file(scenario_id: str) -> Path:
    return _EVENTS_DIR / f"{scenario_id.lower().replace('-', '')}_events.json"


def _source_ip_for_scenario(scenario_id: str) -> str:
    match = re.search(r"(\d+)$", scenario_id)
    scenario_num = int(match.group(1)) if match else 0
    return f"172.20.{scenario_num}.10" if scenario_num else "172.20.0.10"


def _flatten_events(raw: Any) -> list[dict[str, Any]]:
    if isinstance(raw, list):
        return [item for item in raw if isinstance(item, dict)]
    if isinstance(raw, dict):
        events: list[dict[str, Any]] = []
        for value in raw.values():
            events.extend(_flatten_events(value))
        return events
    return []


@lru_cache(maxsize=8)
def _load_command_events(scenario_id: str) -> list[dict[str, Any]]:
    path = _event_file(scenario_id)
    if not path.exists():
        return []

    raw = json.loads(path.read_text(encoding="utf-8"))
    events: list[dict[str, Any]] = []
    for item in _flatten_events(raw):
        pattern = item.get("trigger_pattern")
        if not pattern:
            continue
        try:
            events.append({**item, "_compiled": re.compile(pattern, re.IGNORECASE)})
        except re.error:
            continue
    return events


def _is_incomplete_shell_fragment(command: str) -> bool:
    stripped = command.strip()
    return bool(
        not stripped
        or _TRAILING_CONTINUATION.search(stripped)
        or _OPTION_ONLY.search(stripped)
        or _SCRIPT_ONLY.search(stripped)
    )


def match_command_events(command: str, scenario_id: str) -> list[dict[str, Any]]:
    """Return scenario event-map entries whose trigger patterns match command."""
    if _is_incomplete_shell_fragment(command):
        return []

    matches: list[dict[str, Any]] = []
    for event in _load_command_events(scenario_id):
        compiled = event.get("_compiled")
        if compiled and compiled.search(command):
            matches.append(event)
    return matches[:4]


def _render_raw_log(template: str, command: str, source_ip: str, now: datetime) -> str:
    rendered = template.replace("{src_ip}", source_ip).replace("{command}", command)
    return rendered.replace('"LIVE"', json.dumps(now.isoformat()))


async def create_command_siem_events(
    command: str,
    session_id: str,
    scenario_id: str,
    db: AsyncSession,
) -> list[dict[str, Any]]:
    """Persist SIEM events for command-map matches and return WS payloads."""
    source_ip = _source_ip_for_scenario(scenario_id)
    now = datetime.now(timezone.utc)
    payloads: list[dict[str, Any]] = []

    for matched in match_command_events(command, scenario_id):
        event_id = str(uuid.uuid4())
        severity = str(matched.get("severity", "LOW")).upper()
        raw_log = _render_raw_log(str(matched.get("raw_log", command)), command, source_ip, now)
        category = matched.get("category")
        source = "attacker"

        db.add(
            SiemEvent(
                id=event_id,
                session_id=session_id,
                severity=severity,
                message=str(matched.get("message", "Training detection matched.")),
                raw_log=raw_log,
                mitre_technique=matched.get("mitre_technique") or matched.get("mitre_id"),
                source_ip=source_ip,
                source=source,
                created_at=now,
            )
        )
        payloads.append(
            {
                "type": "siem_event",
                "id": event_id,
                "session_id": session_id,
                "severity": severity,
                "message": str(matched.get("message", "Training detection matched.")),
                "raw_log": raw_log,
                "mitre_technique": matched.get("mitre_technique") or matched.get("mitre_id"),
                "source": source,
                "source_ip": source_ip,
                "category": category,
                "timestamp": now.isoformat(),
                "created_at": now.isoformat(),
                "tool_triggered": "command_map",
                "rule_id": matched.get("id"),
            }
        )

    return payloads


async def publish_command_siem_events(session_id: str, events: list[dict[str, Any]]) -> None:
    for event in events:
        await publish(f"siem:{session_id}:feed", event)

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

import logging
from sqlalchemy.ext.asyncio import AsyncSession

from src.cache.redis import publish
from src.db.database import SiemEvent
from src.sandbox.manager import get_kali_ip_for_session

logger = logging.getLogger(__name__)

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
    if not stripped:
        logger.info("[SIEM Bridge] Command is empty after stripping.")
        return True
    if _TRAILING_CONTINUATION.search(stripped):
        logger.info(
            f"[SIEM Bridge] Command '{command}' filtered: ends with trailing continuation backslash."
        )
        return True
    if _OPTION_ONLY.search(stripped):
        logger.info(f"[SIEM Bridge] Command '{command}' filtered: option/flag only command.")
        return True
    if _SCRIPT_ONLY.search(stripped):
        logger.info(
            f"[SIEM Bridge] Command '{command}' filtered: script only invocation without target options."
        )
        return True
    return False


def match_command_events(command: str, scenario_id: str) -> list[dict[str, Any]]:
    """Return scenario event-map entries whose trigger patterns match command."""
    if _is_incomplete_shell_fragment(command):
        return []

    matches: list[dict[str, Any]] = []
    for event in _load_command_events(scenario_id):
        compiled = event.get("_compiled")
        if compiled and compiled.search(command):
            matches.append(event)

    if not matches:
        logger.info(f"[SIEM Bridge] Command '{command}' matched 0 rules in scenario {scenario_id}")
    else:
        logger.info(
            f"[SIEM Bridge] Command '{command}' matched {len(matches)} rules in scenario {scenario_id}: {[m.get('id') for m in matches]}"
        )

    return matches[:4]


def _render_raw_log(template: str, command: str, source_ip: str, now: datetime) -> str:
    rendered = template.replace("{src_ip}", source_ip).replace("{command}", command)
    return rendered.replace('"LIVE"', json.dumps(now.isoformat()))


# Tools that map to recognisable MITRE techniques for generic process telemetry.
# Keeps the operator-host "process execution" feed informative without needing a
# per-command detection rule. Anything not listed falls back to T1059.
_TOOL_TECHNIQUE: dict[str, str] = {
    "nmap": "T1046",
    "masscan": "T1046",
    "rustscan": "T1046",
    "gobuster": "T1595.003",
    "feroxbuster": "T1595.003",
    "dirb": "T1595.003",
    "nikto": "T1595.002",
    "whatweb": "T1592.002",
    "curl": "T1071.001",
    "wget": "T1071.001",
    "sqlmap": "T1190",
    "hydra": "T1110",
    "medusa": "T1110",
    "hashcat": "T1110.002",
    "john": "T1110.002",
    "crackmapexec": "T1021.002",
    "netexec": "T1021.002",
    "nxc": "T1021.002",
    "smbclient": "T1021.002",
    "evil-winrm": "T1021.006",
    "impacket-getuserspns": "T1558.003",
    "getuserspns.py": "T1558.003",
    "impacket-secretsdump": "T1003.006",
    "secretsdump.py": "T1003.006",
    "kerbrute": "T1110.001",
    "bloodhound": "T1087.002",
    "bloodhound-python": "T1087.002",
    "ssh": "T1021.004",
    "nc": "T1095",
    "ncat": "T1095",
    "msfconsole": "T1059",
    "msfvenom": "T1587.001",
}


def _command_tool(command: str) -> str:
    """Return the lowercased program name from a command line."""
    stripped = command.strip()
    if not stripped:
        return ""
    first = stripped.split()[0]
    # Strip a leading interpreter (python3 foo.py -> foo.py) so the tool name is useful.
    if first in {"python", "python3", "sudo"} and len(stripped.split()) > 1:
        first = stripped.split()[1]
    return first.rsplit("/", 1)[-1].lower()


def _generic_command_event(
    command: str, session_id: str, source_ip: str, now: datetime
) -> dict[str, Any]:
    """Build a low-severity operator-host process-execution telemetry event.

    Emitted for commands that don't trip a high-fidelity detection rule so the
    Blue Team feed reflects every attacker action (endpoint/EDR-style telemetry),
    not just the handful of commands with a bespoke detection.
    """
    tool = _command_tool(command) or "shell"
    technique = _TOOL_TECHNIQUE.get(tool, "T1059")
    safe_command = command.strip()[:300]
    raw_log = json.dumps(
        {
            "event": "process_execution",
            "host": source_ip,
            "process": tool,
            "command_line": safe_command,
            "user": "operator",
            "@timestamp": now.isoformat(),
        }
    )
    return {
        "type": "siem_event",
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "severity": "LOW",
        "message": f"Process execution on operator host: {tool}",
        "raw_log": raw_log,
        "mitre_technique": technique,
        "source": "endpoint_telemetry",
        "source_ip": source_ip,
        "category": "process",
        "timestamp": now.isoformat(),
        "created_at": now.isoformat(),
        "tool_triggered": "process_telemetry",
        "rule_id": "process-execution",
    }


async def create_command_siem_events(
    command: str,
    session_id: str,
    scenario_id: str,
    db: AsyncSession,
) -> list[dict[str, Any]]:
    """Persist SIEM events for command-map matches and return WS payloads."""
    source_ip = await get_kali_ip_for_session(session_id) or _source_ip_for_scenario(scenario_id)
    now = datetime.now(timezone.utc)
    payloads: list[dict[str, Any]] = []

    from src.siem.schemas import SiemEventOut

    matched_events = match_command_events(command, scenario_id)

    # Endpoint telemetry: every complete command yields at least a low-severity
    # process-execution event so the Blue Team feed mirrors all attacker activity.
    # High-fidelity detections (below) supersede it when a command trips a rule.
    if not matched_events and not _is_incomplete_shell_fragment(command):
        generic = _generic_command_event(command, session_id, source_ip, now)
        db.add(
            SiemEvent(
                id=generic["id"],
                session_id=session_id,
                severity=generic["severity"],
                message=generic["message"],
                raw_log=generic["raw_log"],
                mitre_technique=generic["mitre_technique"],
                source_ip=source_ip,
                source=generic["source"],
                created_at=now,
            )
        )
        payloads.append(generic)

    for matched in matched_events:
        event_id = str(uuid.uuid4())
        raw_severity = str(matched.get("severity", "LOW"))
        raw_log = _render_raw_log(str(matched.get("raw_log", command)), command, source_ip, now)
        category = matched.get("category")
        source = "educational_bridge"

        # Validate and coerce via Pydantic model
        event_schema = SiemEventOut(
            id=event_id,
            session_id=session_id,
            severity=raw_severity,
            message=str(matched.get("message", "Training detection matched.")),
            mitre_technique=matched.get("mitre_technique") or matched.get("mitre_id"),
            source=source,
            timestamp=now.isoformat(),
            raw_log=raw_log,
        )

        db.add(
            SiemEvent(
                id=event_schema.id,
                session_id=session_id,
                severity=event_schema.severity,
                message=event_schema.message,
                raw_log=event_schema.raw_log,
                mitre_technique=event_schema.mitre_technique,
                source_ip=source_ip,
                source=event_schema.source,
                created_at=now,
            )
        )
        payloads.append(
            {
                "type": "siem_event",
                "id": event_schema.id,
                "session_id": session_id,
                "severity": event_schema.severity,
                "message": event_schema.message,
                "raw_log": event_schema.raw_log,
                "mitre_technique": event_schema.mitre_technique,
                "source": event_schema.source,
                "source_ip": source_ip,
                "category": category,
                "timestamp": event_schema.timestamp,
                "created_at": now.isoformat(),
                "tool_triggered": "command_map",
                "rule_id": matched.get("id"),
            }
        )

    return payloads


async def publish_command_siem_events(session_id: str, events: list[dict[str, Any]]) -> None:
    channel = f"siem:{session_id}:feed"
    logger.info(f"[SIEM Bridge] Publishing {len(events)} events to channel: {channel}")
    for event in events:
        await publish(channel, event)

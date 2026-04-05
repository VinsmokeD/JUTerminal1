"""
Scenario state machine engine.

Responsibilities:
- Evaluate whether a session's current phase is complete
- Advance phase in DB + Redis cache when conditions are met
- Check methodology gates (PTES phase locks) before a command is forwarded
- Generate SIEM events from attacker commands
- Validate flags submitted by students
"""
from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from src.db.database import Session as DbSession, Note, CommandLog, SiemEvent
from src.cache.redis import cache_get, cache_set, publish
from src.scenarios.loader import (
    get_phase,
    get_methodology_gate,
    get_soc_events,
    get_flags,
    load_scenario,
)


# ---------------------------------------------------------------------------
# Gate check — called from ws/routes.py before forwarding terminal input
# ---------------------------------------------------------------------------

class GateBlock(Exception):
    """Raised when a command is blocked by a methodology gate."""
    def __init__(self, message: str, min_phase: int):
        super().__init__(message)
        self.message = message
        self.min_phase = min_phase


async def check_gate(
    command: str,
    session_id: str,
    scenario_id: str,
    db: AsyncSession,
) -> None:
    """
    Check if `command` is blocked by a methodology gate.
    Raises GateBlock if the student hasn't reached the required phase yet.
    Does nothing if the command is ungated or the session is sufficiently advanced.
    """
    # Extract the base tool name (first word, strip path prefixes)
    tool = _parse_tool(command)
    if not tool:
        return

    gate = get_methodology_gate(scenario_id, tool)
    if not gate:
        return

    min_phase: int = gate.get("min_phase", 1)
    current_phase = await _get_current_phase(session_id, db)

    if current_phase < min_phase:
        raise GateBlock(
            message=gate.get(
                "block_message",
                f"You must complete Phase {min_phase - 1} before using {tool}.",
            ),
            min_phase=min_phase,
        )


# ---------------------------------------------------------------------------
# SIEM event generation — called from ws/routes.py after forwarding command
# ---------------------------------------------------------------------------

async def process_command_for_siem(
    command: str,
    session_id: str,
    scenario_id: str,
    source_ip: str,
    db: AsyncSession,
) -> list[dict[str, Any]]:
    """
    Match command against scenario's soc_detection rules.
    Persists matching events to DB and publishes them to the SIEM Redis channel.
    Returns list of generated event dicts (may be empty).
    """
    rules = get_soc_events(scenario_id, command)
    if not rules:
        return []

    events = []
    for rule in rules:
        template = rule.get("event_template", "Attacker command detected")
        message = _fill_template(template, source_ip=source_ip, command=command)

        event = SiemEvent(
            id=str(uuid.uuid4()),
            session_id=session_id,
            severity=rule.get("severity", "medium"),
            message=message,
            raw_log=command,
            mitre_technique=rule.get("mitre", ""),
            source=rule.get("source", "attacker"),
        )
        db.add(event)

        event_dict = {
            "type": "siem_event",
            "id": event.id,
            "session_id": session_id,
            "severity": event.severity,
            "message": event.message,
            "mitre_technique": event.mitre_technique,
            "source": event.source,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        events.append(event_dict)

    await db.commit()

    # Publish to Blue Team WebSocket feed
    for ev in events:
        await publish(f"siem:{session_id}:feed", json.dumps(ev))

    return events


# ---------------------------------------------------------------------------
# Phase advancement — call after every completed command
# ---------------------------------------------------------------------------

async def try_advance_phase(
    session_id: str,
    scenario_id: str,
    db: AsyncSession,
) -> int:
    """
    Check if the current phase completion criteria are satisfied.
    If yes, increment phase in DB + cache.
    Returns the new (or unchanged) phase number.
    """
    current_phase = await _get_current_phase(session_id, db)
    phase_def = get_phase(scenario_id, current_phase)
    if not phase_def:
        return current_phase  # No more phases defined

    signals = phase_def.get("completion_signals", {})
    satisfied = await _check_completion_signals(signals, session_id, scenario_id, db)

    if satisfied:
        new_phase = current_phase + 1
        await _set_phase(session_id, new_phase, db)
        return new_phase

    return current_phase


# ---------------------------------------------------------------------------
# Flag validation
# ---------------------------------------------------------------------------

async def validate_flag(
    flag_input: str,
    scenario_id: str,
    session_id: str,
    db: AsyncSession,
) -> dict[str, Any]:
    """
    Check if `flag_input` matches any flag in the scenario spec.
    Awards points and records in DB if valid and not already captured.
    """
    flags = get_flags(scenario_id)
    for flag in flags:
        if flag.get("value", "").strip() == flag_input.strip():
            flag_id = flag["id"]
            # Check not already captured
            cached = await cache_get(f"session:{session_id}:state") or {}
            captured = cached.get("flags_captured", [])
            if flag_id in captured:
                return {"valid": True, "already_captured": True, "flag_id": flag_id}

            # Award points
            points = flag.get("points", 0)
            captured.append(flag_id)
            cached["flags_captured"] = captured
            cached["score"] = cached.get("score", 100) + points
            await cache_set(f"session:{session_id}:state", cached, ttl=28800)

            # Persist score to DB
            result = await db.execute(
                select(DbSession).where(DbSession.id == session_id)
            )
            session = result.scalar_one_or_none()
            if session:
                session.score = (session.score or 100) + points
                await db.commit()

            return {
                "valid": True,
                "already_captured": False,
                "flag_id": flag_id,
                "points_awarded": points,
            }

    return {"valid": False}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _parse_tool(command: str) -> str:
    """Extract the base tool name from a shell command string."""
    if not command:
        return ""
    # Strip sudo, env vars, full paths
    cmd = command.strip()
    cmd = re.sub(r"^sudo\s+", "", cmd)
    cmd = re.sub(r"^[A-Z_]+=\S+\s+", "", cmd)  # strip env vars like FOO=bar
    # Take first token, strip leading path
    first_token = cmd.split()[0] if cmd.split() else ""
    return first_token.split("/")[-1].lower()


async def _get_current_phase(session_id: str, db: AsyncSession) -> int:
    cached = await cache_get(f"session:{session_id}:state")
    if cached and "phase" in cached:
        return int(cached["phase"])
    result = await db.execute(
        select(DbSession.phase).where(DbSession.id == session_id)
    )
    row = result.scalar_one_or_none()
    return int(row) if row else 1


async def _set_phase(session_id: str, new_phase: int, db: AsyncSession) -> None:
    result = await db.execute(
        select(DbSession).where(DbSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if session:
        session.phase = new_phase
        await db.commit()

    cached = await cache_get(f"session:{session_id}:state") or {}
    cached["phase"] = new_phase
    await cache_set(f"session:{session_id}:state", cached, ttl=28800)


async def _check_completion_signals(
    signals: dict[str, Any],
    session_id: str,
    scenario_id: str,
    db: AsyncSession,
) -> bool:
    """Return True only if ALL defined completion signals are satisfied."""
    if not signals:
        return False

    # 1. Tools used check
    required_tools: list[str] = signals.get("tools_used", [])
    if required_tools:
        result = await db.execute(
            select(CommandLog.tool).where(
                CommandLog.session_id == session_id,
                CommandLog.tool.in_([t.lower() for t in required_tools]),
            ).distinct()
        )
        used_tools = {row[0] for row in result.fetchall()}
        if not any(t.lower() in used_tools for t in required_tools):
            return False

    # 2. Minimum notes check
    min_notes: dict[str, int] = signals.get("min_notes_tagged", {})
    for tag, count in min_notes.items():
        result = await db.execute(
            select(func.count()).select_from(Note).where(
                Note.session_id == session_id,
                Note.tag == tag,
            )
        )
        actual = result.scalar() or 0
        if actual < count:
            return False

    # 3. Flags captured check
    required_flags: list[str] = signals.get("flags_captured", [])
    if required_flags:
        cached = await cache_get(f"session:{session_id}:state") or {}
        captured = set(cached.get("flags_captured", []))
        if not all(f in captured for f in required_flags):
            return False

    # 4. Report generated check
    if signals.get("report_generated"):
        result = await db.execute(
            select(DbSession.completed_at).where(DbSession.id == session_id)
        )
        completed_at = result.scalar_one_or_none()
        if not completed_at:
            return False

    return True


def _fill_template(template: str, **kwargs: str) -> str:
    """Replace {placeholder} in event template strings."""
    for key, val in kwargs.items():
        template = template.replace(f"{{{key}}}", val or "unknown")
    return template

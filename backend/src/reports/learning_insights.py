"""Learning insight builder for cause-and-effect mission debriefs."""

from __future__ import annotations

from collections import Counter
from datetime import datetime
from statistics import mean

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import CommandLog, Note, Session, SiemEvent


ACTION_LESSONS = {
    "nmap": {
        "effect": "Active service discovery probes the target network and usually creates visible connection telemetry.",
        "question": "Which destination, port, and scan pattern would an analyst use to separate recon from normal traffic?",
    },
    "gobuster": {
        "effect": "Directory brute forcing creates repeated web requests, many misses, and a recognizable spike in web logs.",
        "question": "Which HTTP status patterns and request rates prove this is enumeration rather than normal browsing?",
    },
    "ffuf": {
        "effect": "Fuzzing increases request volume and can expose parameter or path discovery in WAF telemetry.",
        "question": "Which parameter, path, or response-code changes should the defender pivot on first?",
    },
    "dirb": {
        "effect": "Directory brute forcing creates repeated web requests, many misses, and a recognizable spike in web logs.",
        "question": "Which HTTP status patterns and request rates prove this is enumeration rather than normal browsing?",
    },
    "sqlmap": {
        "effect": "Automated injection testing creates structured payload patterns that WAF and application logs can correlate.",
        "question": "Which payload pattern, endpoint, and account context would confirm this as a true positive?",
    },
    "curl": {
        "effect": "Manual HTTP probing is low volume, but headers, paths, and unusual parameters still leave useful evidence.",
        "question": "What makes this request benign reconnaissance versus an early exploitation step?",
    },
    "whatweb": {
        "effect": "Technology fingerprinting is usually quieter than brute forcing but still records web access metadata.",
        "question": "Which server headers or framework clues should shape the next defensive hypothesis?",
    },
    "nikto": {
        "effect": "Vulnerability scanners create broad web probes that should appear as noisy application and WAF telemetry.",
        "question": "Which alerts indicate scanner coverage, and which ones deserve immediate escalation?",
    },
}

DEFAULT_LESSON = {
    "effect": "The command changed the mission timeline and should be reviewed against nearby telemetry and notes.",
    "question": "What evidence shows whether this action was meaningful, noisy, blocked, or harmless?",
}


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def _latency_seconds(start: datetime, end: datetime) -> float:
    return max(0.0, round((end - start).total_seconds(), 2))


def _severity_rank(severity: str | None) -> int:
    return {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "MED": 2, "LOW": 1}.get(
        (severity or "").upper(),
        0,
    )


def _command_lesson(tool: str | None, command: str) -> dict:
    key = (tool or command.strip().split(" ")[0] if command.strip() else "").lower()
    return ACTION_LESSONS.get(key, DEFAULT_LESSON)


def _is_background(event: SiemEvent) -> bool:
    return (event.source or "").lower() == "background"


def _events_for_command(command: CommandLog, events: list[SiemEvent]) -> list[dict]:
    matched: list[dict] = []
    for event in events:
        if _is_background(event) or event.created_at < command.created_at:
            continue
        latency = _latency_seconds(command.created_at, event.created_at)
        if latency > 120:
            continue
        matched.append(
            {
                "id": event.id,
                "severity": event.severity,
                "message": event.message,
                "source": event.source,
                "source_ip": event.source_ip,
                "mitre_technique": event.mitre_technique,
                "created_at": _iso(event.created_at),
                "detection_latency_seconds": latency,
            }
        )
    matched.sort(
        key=lambda item: (-_severity_rank(item["severity"]), item["detection_latency_seconds"])
    )
    return matched[:5]


def _coaching(
    session: Session,
    commands: list[CommandLog],
    notes_by_tag: Counter,
    related_counts: list[int],
    latencies: list[float],
    high_signal_count: int,
) -> dict:
    strengths: list[str] = []
    improvement_areas: list[str] = []
    next_practice: list[str] = []

    if commands:
        strengths.append(
            f"Recorded {len(commands)} command(s), creating a replayable action trail."
        )
    else:
        improvement_areas.append(
            "No command trail was recorded; run scoped actions before ending the mission."
        )

    if notes_by_tag.get("evidence", 0) > 0:
        strengths.append("Captured evidence notes that can support a professional report.")
    else:
        improvement_areas.append(
            "Add evidence notes while working so the debrief is easier to defend."
        )

    if notes_by_tag.get("finding", 0) > 0:
        strengths.append("Documented at least one finding tied to the mission.")
    elif session.role == "red":
        improvement_areas.append(
            "Translate discoveries into tagged findings before moving to exploitation."
        )

    if high_signal_count:
        strengths.append(
            f"Generated {high_signal_count} high-signal detection(s) for Blue Team review."
        )

    detected_commands = sum(1 for count in related_counts if count > 0)
    if commands and detected_commands / len(commands) < 0.5:
        improvement_areas.append(
            "Several commands had no nearby detection; compare quiet activity with SIEM visibility."
        )

    if latencies and mean(latencies) <= 10:
        strengths.append(
            "Detections appeared quickly, making the Red-to-Blue connection easy to explain."
        )
    elif latencies:
        improvement_areas.append(
            "Review why some actions took longer to appear as defender-visible telemetry."
        )

    if len(session.hints_used or []) > 3:
        improvement_areas.append(
            "Hint usage was high; repeat the mission and pause longer at each methodology phase."
        )

    scenario_next = {
        "SC-01": [
            "Practice separating passive web reconnaissance from noisy active enumeration.",
            "Map each WAF alert to the exact request path, parameter, and evidence note.",
        ],
        "SC-02": [
            "Practice explaining how authentication events reveal lateral movement.",
            "Map account activity to privilege escalation hypotheses before acting.",
        ],
        "SC-03": [
            "Practice reading email headers and endpoint callbacks before deciding severity.",
            "Separate normal mail traffic from campaign-driven victim interaction.",
        ],
    }
    next_practice.extend(scenario_next.get(session.scenario_id, []))
    if session.role == "blue":
        next_practice.append(
            "Classify each alert as true positive, false positive, investigating, or escalated."
        )
    else:
        next_practice.append("Write one note per phase before using a louder tool.")

    return {
        "strengths": strengths[:5],
        "improvement_areas": improvement_areas[:5],
        "next_practice": next_practice[:5],
    }


async def build_learning_insights(session: Session, db: AsyncSession) -> dict:
    """Return product-level debrief insights for a session."""
    cmd_result = await db.execute(
        select(CommandLog)
        .where(CommandLog.session_id == session.id)
        .order_by(CommandLog.created_at)
    )
    commands = list(cmd_result.scalars())

    event_result = await db.execute(
        select(SiemEvent).where(SiemEvent.session_id == session.id).order_by(SiemEvent.created_at)
    )
    events = list(event_result.scalars())

    note_result = await db.execute(
        select(Note).where(Note.session_id == session.id).order_by(Note.created_at)
    )
    notes = list(note_result.scalars())

    notes_by_tag = Counter(note.tag for note in notes)
    actionable_events = [event for event in events if not _is_background(event)]
    background_events = [event for event in events if _is_background(event)]

    cause_effect: list[dict] = []
    related_counts: list[int] = []
    latencies: list[float] = []

    for command in commands:
        related_events = _events_for_command(command, actionable_events)
        related_counts.append(len(related_events))
        latencies.extend(event["detection_latency_seconds"] for event in related_events)
        lesson = _command_lesson(command.tool, command.command)
        cause_effect.append(
            {
                "command_id": command.id,
                "command": command.command,
                "tool": command.tool,
                "phase": command.phase,
                "created_at": _iso(command.created_at),
                "system_effect": lesson["effect"],
                "blue_team_question": lesson["question"],
                "related_events": related_events,
                "detected": bool(related_events),
            }
        )

    high_signal_count = sum(
        1 for event in actionable_events if _severity_rank(event.severity) >= _severity_rank("HIGH")
    )
    detected_commands = sum(1 for count in related_counts if count > 0)
    detection_coverage = round((detected_commands / len(commands)) * 100, 1) if commands else 0.0

    return {
        "session_id": session.id,
        "scenario_id": session.scenario_id,
        "role": session.role,
        "methodology": session.methodology,
        "status": "completed" if session.completed_at else "active",
        "summary": {
            "commands": len(commands),
            "detections": len(actionable_events),
            "background_events": len(background_events),
            "high_signal_detections": high_signal_count,
            "notes": len(notes),
            "findings": notes_by_tag.get("finding", 0),
            "evidence_items": notes_by_tag.get("evidence", 0),
            "iocs": notes_by_tag.get("ioc", 0),
            "hints_used": len(session.hints_used or []),
            "current_phase": session.phase,
            "detection_coverage_percent": detection_coverage,
            "mean_detection_latency_seconds": round(mean(latencies), 2) if latencies else None,
        },
        "notes_by_tag": dict(notes_by_tag),
        "cause_effect": cause_effect,
        "coaching": _coaching(
            session=session,
            commands=commands,
            notes_by_tag=notes_by_tag,
            related_counts=related_counts,
            latencies=latencies,
            high_signal_count=high_signal_count,
        ),
    }

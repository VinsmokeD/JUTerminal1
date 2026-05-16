"""
Phase 17 — Instructor Dashboard API.

Endpoints (all require role=instructor):
  GET /api/instructor/sessions  — all sessions with student + scenario + score data
  GET /api/instructor/metrics   — aggregate platform stats

Auth: require_instructor dependency checks user.role == "instructor".
Default instructor: username=admin / password=CyberSimAdmin! (seeded in main.py lifespan)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db, Session, User, SiemEvent, SiemTriage
from src.auth.routes import require_instructor
from src.reports.generator import generate_report

router = APIRouter()


@router.get("/sessions")
async def list_all_sessions(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_instructor),
) -> list[dict]:
    """Return all sessions with joined student username, ordered by most recent."""
    rows = (
        await db.execute(
            select(Session, User.username)
            .join(User, Session.user_id == User.id)
            .order_by(Session.started_at.desc())
            .limit(200)
        )
    ).all()

    session_ids = [s.id for s, _username in rows]
    event_counts: dict[str, int] = {}
    triage_counts: dict[str, int] = {}
    if session_ids:
        event_rows = (
            await db.execute(
                select(SiemEvent.session_id, func.count(SiemEvent.id))
                .where(SiemEvent.session_id.in_(session_ids))
                .group_by(SiemEvent.session_id)
            )
        ).all()
        event_counts = {sid: int(count or 0) for sid, count in event_rows}

        triage_rows = (
            await db.execute(
                select(SiemTriage.session_id, func.count(SiemTriage.classification))
                .where(SiemTriage.session_id.in_(session_ids))
                .group_by(SiemTriage.session_id)
            )
        ).all()
        triage_counts = {sid: int(count or 0) for sid, count in triage_rows}

    return [
        {
            "session_id": s.id,
            "username": username,
            "scenario_id": s.scenario_id,
            "role": s.role,
            "methodology": s.methodology,
            "phase": s.phase,
            "score": s.score,
            "hints_used": len(s.hints_used) if s.hints_used else 0,
            "roe_acknowledged": s.roe_acknowledged,
            "triage_total": event_counts.get(s.id, 0),
            "triage_completed": triage_counts.get(s.id, 0),
            "triage_coverage": _coverage_percent(
                triage_counts.get(s.id, 0),
                event_counts.get(s.id, 0),
            ),
            "started_at": s.started_at.isoformat(),
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
            "status": "completed" if s.completed_at else "active",
        }
        for s, username in rows
    ]


@router.get("/sessions/{session_id}/report")
async def get_student_report(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_instructor),
) -> PlainTextResponse:
    """Return a Markdown report for any student session."""
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    report_md = await generate_report(session, db)
    return PlainTextResponse(
        report_md,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="cybersim-{session_id}.md"'},
    )


@router.get("/metrics")
async def get_metrics(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_instructor),
) -> dict:
    """Aggregate platform statistics for instructor overview."""
    total_sessions = await db.scalar(select(func.count(Session.id))) or 0
    active_sessions = await db.scalar(
        select(func.count(Session.id)).where(Session.completed_at.is_(None))
    ) or 0
    avg_score = await db.scalar(select(func.avg(Session.score))) or 0.0
    total_siem_events = await db.scalar(select(func.count(SiemEvent.id))) or 0
    total_triaged_events = await db.scalar(
        select(func.count(SiemTriage.id)).where(SiemTriage.classification.is_not(None))
    ) or 0

    # Per-scenario breakdown
    scenario_rows = (
        await db.execute(
            select(Session.scenario_id, func.count(Session.id), func.avg(Session.score))
            .group_by(Session.scenario_id)
        )
    ).all()

    scenarios = [
        {
            "scenario_id": sid,
            "session_count": count,
            "avg_score": round(float(avg or 0), 1),
        }
        for sid, count, avg in scenario_rows
    ]

    return {
        "total_sessions": total_sessions,
        "active_sessions": active_sessions,
        "completed_sessions": total_sessions - active_sessions,
        "avg_score": round(float(avg_score), 1),
        "total_siem_events": total_siem_events,
        "total_triaged_events": total_triaged_events,
        "triage_coverage": _coverage_percent(total_triaged_events, total_siem_events),
        "by_scenario": scenarios,
    }


def _coverage_percent(done: int, total: int) -> int:
    if total <= 0:
        return 0
    return round((done / total) * 100)

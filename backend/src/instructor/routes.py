"""
Phase 17 — Instructor Dashboard API.

Endpoints (all require role=instructor):
  GET /api/instructor/sessions  — all sessions with student + scenario + score data
  GET /api/instructor/metrics   — aggregate platform stats

Auth: require_instructor dependency checks user.role == "instructor".
Default instructor: username=admin / password=CyberSimAdmin! (seeded in main.py lifespan)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db, Session, User, SiemEvent
from src.auth.routes import require_instructor

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
            "started_at": s.started_at.isoformat(),
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
            "status": "completed" if s.completed_at else "active",
        }
        for s, username in rows
    ]


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
        "by_scenario": scenarios,
    }

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.auth.routes import get_current_user
from src.db.database import get_db, Session, User, CommandLog, SiemEvent
from src.reports.generator import generate_report

router = APIRouter()


@router.get("/{session_id}")
async def get_report(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PlainTextResponse:
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    report_md = await generate_report(session, db)
    return PlainTextResponse(report_md, media_type="text/markdown")


@router.get("/{session_id}/timeline")
async def get_timeline(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return combined red/blue timeline data for the Kill Chain Timeline visualization."""
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    cmd_result = await db.execute(
        select(CommandLog)
        .where(CommandLog.session_id == session_id)
        .order_by(CommandLog.created_at)
    )
    commands = [
        {
            "id": c.id,
            "command": c.command,
            "tool": c.tool,
            "phase": c.phase,
            "created_at": c.created_at.isoformat(),
        }
        for c in cmd_result.scalars()
    ]

    siem_result = await db.execute(
        select(SiemEvent)
        .where(SiemEvent.session_id == session_id)
        .order_by(SiemEvent.created_at)
    )
    siem_events = [
        {
            "id": e.id,
            "severity": e.severity,
            "message": e.message,
            "mitre_technique": e.mitre_technique,
            "source": getattr(e, "source", "attacker"),
            "created_at": e.created_at.isoformat(),
        }
        for e in siem_result.scalars()
    ]

    return {
        "session_id": session_id,
        "scenario_id": session.scenario_id,
        "role": session.role,
        "commands": commands,
        "siem_events": siem_events,
    }


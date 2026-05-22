from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from src.auth.routes import get_current_user
from src.db.database import get_db, Session, User, CommandLog, SiemEvent, Note, SiemTriage
from src.reports.generator import generate_report
from src.reports.learning_insights import build_learning_insights
from src.scoring.engine import final_score
from src.ai.debrief_coach import generate_debrief_coaching, handle_debrief_qa

router = APIRouter()

class QARequest(BaseModel):
    question: str


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


@router.get("/{session_id}/learning-insights")
async def get_learning_insights(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return cause-effect learning insights for a debrief."""
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return await build_learning_insights(session, db)


@router.get("/{session_id}/report")
async def get_consolidated_report(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return all session details, score, notes, logs, and insights consolidated for the debrief."""
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # 1. Session data
    session_data = {
        "id": session.id,
        "session_id": session.id,
        "scenario_id": session.scenario_id,
        "role": session.role,
        "methodology": session.methodology,
        "phase": session.phase,
        "score": session.score,
        "hints_used": session.hints_used or [],
        "roe_acknowledged": session.roe_acknowledged,
        "started_at": session.started_at.isoformat(),
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,
        "container_id": session.container_id,
    }

    # 2. Computed score
    computed_score = final_score(
        base=session.score,
        hints_used=session.hints_used or [],
        started_at=session.started_at,
        completed_at=session.completed_at,
    )
    score_data = {
        "session_id": session_id,
        "base_score": session.score,
        "final_score": computed_score,
        "hints_used": len(session.hints_used or []),
        "completed": session.completed_at is not None,
    }

    # 3. Notes
    notes_result = await db.execute(
        select(Note).where(Note.session_id == session_id).order_by(Note.created_at)
    )
    notes_list = list(notes_result.scalars())
    notes_data = [
        {
            "id": n.id,
            "tag": n.tag,
            "content": n.content,
            "phase": n.phase,
            "created_at": n.created_at.isoformat(),
        }
        for n in notes_list
    ]

    # 4. Commands
    cmd_result = await db.execute(
        select(CommandLog)
        .where(CommandLog.session_id == session_id)
        .order_by(CommandLog.created_at)
    )
    commands_list = list(cmd_result.scalars())
    commands_data = [
        {
            "id": c.id,
            "command": c.command,
            "tool": c.tool,
            "phase": c.phase,
            "created_at": c.created_at.isoformat(),
        }
        for c in commands_list
    ]

    # 5. SIEM events
    siem_result = await db.execute(
        select(SiemEvent)
        .where(SiemEvent.session_id == session_id)
        .order_by(SiemEvent.created_at)
    )
    siem_events_list = list(siem_result.scalars())
    siem_events_data = [
        {
            "id": e.id,
            "severity": e.severity,
            "message": e.message,
            "mitre_technique": e.mitre_technique,
            "source": getattr(e, "source", "attacker"),
            "created_at": e.created_at.isoformat(),
        }
        for e in siem_events_list
    ]

    # 6. Learning insights
    learning_insights_data = await build_learning_insights(session, db)

    # 7. Timeline
    timeline = []
    for c in commands_list:
        cmd_str = c.command
        if cmd_str.startswith("[phase_advance]"):
            event_type = "phase_advance"
        elif cmd_str.startswith("[hint_requested]") or (c.tool and c.tool.startswith("hint:")):
            event_type = "hint"
        elif cmd_str.startswith("[flag_captured]") or c.tool == "flag:capture":
            event_type = "flag"
        else:
            event_type = "command"

        timeline.append({
            "type": event_type,
            "timestamp": c.created_at.isoformat(),
            "phase": c.phase,
            "data": {
                "id": c.id,
                "command": c.command,
                "tool": c.tool,
                "ai_hint_given": c.ai_hint_given,
            }
        })

    for e in siem_events_list:
        timeline.append({
            "type": "siem_event",
            "timestamp": e.created_at.isoformat(),
            "phase": getattr(e, "phase", None),
            "data": {
                "id": e.id,
                "severity": e.severity,
                "message": e.message,
                "mitre_technique": e.mitre_technique,
                "source": getattr(e, "source", "attacker"),
            }
        })

    timeline.sort(key=lambda x: x["timestamp"])

    triage_result = await db.execute(
        select(SiemTriage)
        .where(SiemTriage.session_id == session_id)
        .order_by(SiemTriage.created_at)
    )
    triage_list = list(triage_result.scalars())
    triage_data = [
        {
            "id": t.id,
            "event_id": t.event_id,
            "classification": t.classification,
            "notes": t.notes,
            "created_at": t.created_at.isoformat(),
        }
        for t in triage_list
    ]

    return {
        "session": session_data,
        "score": score_data,
        "notes": notes_data,
        "commands": commands_data,
        "siem_events": siem_events_data,
        "triage": triage_data,
        "learning_insights": learning_insights_data,
        "timeline": timeline,
    }


@router.post("/{session_id}/debrief-coaching")
async def get_debrief_coaching_report(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Generate and return AI Socratic coaching for a completed session."""
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Reuse get_consolidated_report logic/payload
    report_data = await get_consolidated_report(session_id, current_user, db)
    return await generate_debrief_coaching(session_id, report_data, db)


@router.post("/{session_id}/debrief-qa")
async def ask_debrief_coach(
    session_id: str,
    req: QARequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Ask follow-up questions to the Socratic coach (max 3 per session)."""
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    report_data = await get_consolidated_report(session_id, current_user, db)
    return await handle_debrief_qa(session_id, req.question, report_data, db)

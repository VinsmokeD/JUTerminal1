from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.auth.routes import get_current_user
from src.db.database import get_db, Session, User
from src.scoring.engine import final_score

router = APIRouter()


@router.get("/{session_id}")
async def get_score(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    computed = final_score(
        base=session.score,
        hints_used=session.hints_used or [],
        started_at=session.started_at,
        completed_at=session.completed_at,
    )
    return {
        "session_id": session_id,
        "base_score": session.score,
        "final_score": computed,
        "hints_used": len(session.hints_used or []),
        "completed": session.completed_at is not None,
    }

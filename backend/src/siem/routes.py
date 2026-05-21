from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.auth.routes import get_current_user
from src.db.database import get_db, Session, User, ContainmentAction
from src.siem.response import execute_containment
from src.siem.forensics import run_osquery, list_forensic_targets

router = APIRouter()

class ContainmentRequest(BaseModel):
    action_type: str  # block_ip | kill_pid | isolate_host
    target_value: str

class OsqueryRequest(BaseModel):
    target: str
    query: str

@router.post("/{session_id}/contain")
async def handle_containment(
    session_id: str,
    body: ContainmentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    # Verify session
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    return await execute_containment(
        session_id=session.id,
        user_id=current_user.id,
        scenario_id=session.scenario_id,
        action_type=body.action_type,
        target_value=body.target_value
    )

@router.get("/{session_id}/forensics/targets")
async def get_forensic_targets(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[str]:
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    return await list_forensic_targets(session.scenario_id)

@router.post("/{session_id}/forensics/osquery")
async def handle_osquery(
    session_id: str,
    body: OsqueryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    return await run_osquery(session.scenario_id, body.target, body.query)

@router.get("/{session_id}/actions")
async def list_actions(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    result = await db.execute(
        select(ContainmentAction)
        .where(ContainmentAction.session_id == session_id)
        .order_by(ContainmentAction.created_at.desc())
    )
    return [
        {
            "id": a.id,
            "action_type": a.action_type,
            "target_value": a.target_value,
            "status": a.status,
            "created_at": a.created_at.isoformat()
        } for a in result.scalars()
    ]

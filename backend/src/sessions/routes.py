from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.auth.routes import get_current_user
from src.db.database import get_db, Session, User, CommandLog, SiemEvent
from src.sandbox.manager import start_scenario_container, stop_scenario_container
from src.cache.redis import cache_set, cache_get, cache_delete

router = APIRouter()


class SessionStart(BaseModel):
    scenario_id: str
    role: str  # "red" | "blue"
    methodology: str = "ptes"


class RoeAck(BaseModel):
    session_id: str


@router.post("/start")
async def start_session(
    body: SessionStart,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if body.role not in ("red", "blue"):
        raise HTTPException(status_code=400, detail="role must be 'red' or 'blue'")

    scenario_id = body.scenario_id.upper()
    valid = {"SC-01", "SC-02", "SC-03"}
    if scenario_id not in valid:
        raise HTTPException(status_code=400, detail="Unknown scenario")

    session = Session(
        user_id=current_user.id,
        scenario_id=scenario_id,
        role=body.role,
        methodology=body.methodology,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # Provision Kali container for both red and blue teams
    # Red team gets offensive tools; Blue team gets the same Kali with
    # defensive tools (tshark, Splunk forwarder, log access) on the same
    # scenario network so they can analyze real traffic and run IR commands.
    container_id, network_name = await start_scenario_container(session.id, scenario_id)
    session.container_id = container_id
    session.network_name = network_name
    await db.commit()

    # Cache session state for fast access
    state = {
        "session_id": session.id,
        "user_id": current_user.id,
        "scenario_id": scenario_id,
        "role": body.role,
        "methodology": body.methodology,
        "phase": 1,
        "score": 100,
        "roe_acknowledged": False,
    }
    await cache_set(f"session:{session.id}:state", state, ttl=28800)

    return _session_dict(session)


@router.post("/roe-ack")
async def acknowledge_roe(
    body: RoeAck,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Session).where(Session.id == body.session_id, Session.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.roe_acknowledged = True
    await db.commit()

    # Update cache
    cached = await cache_get(f"session:{session.id}:state")
    if cached:
        cached["roe_acknowledged"] = True
        await cache_set(f"session:{session.id}:state", cached, ttl=28800)

    return {"roe_acknowledged": True}


@router.get("/")
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    result = await db.execute(
        select(Session).where(Session.user_id == current_user.id)
        .order_by(Session.started_at.desc())
        .limit(20)
    )
    return [_session_dict(s) for s in result.scalars()]


@router.get("/{session_id}")
async def get_session(
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
    return _session_dict(session)


@router.post("/{session_id}/end")
async def end_session(
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

    session.completed_at = datetime.now(timezone.utc)
    await db.commit()

    if session.container_id:
        await stop_scenario_container(session.container_id, session.scenario_id)

    await cache_delete(f"session:{session_id}:state")

    return {"completed_at": session.completed_at.isoformat()}


@router.get("/{session_id}/commands")
async def get_session_commands(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list:
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")
    cmds = await db.execute(
        select(CommandLog).where(CommandLog.session_id == session_id).order_by(CommandLog.created_at)
    )
    return [
        {"id": c.id, "command": c.command, "tool": c.tool, "phase": c.phase, "created_at": c.created_at.isoformat()}
        for c in cmds.scalars().all()
    ]


@router.get("/{session_id}/events")
async def get_session_events(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list:
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")
    evts = await db.execute(
        select(SiemEvent).where(SiemEvent.session_id == session_id).order_by(SiemEvent.created_at)
    )
    return [
        {
            "id": e.id, "severity": e.severity, "message": e.message,
            "source": e.source, "mitre_technique": e.mitre_technique,
            "source_ip": e.source_ip, "raw_log": e.raw_log,
            "created_at": e.created_at.isoformat(),
        }
        for e in evts.scalars().all()
    ]


def _session_dict(s: Session) -> dict:
    return {
        "id": s.id,
        "session_id": s.id,
        "scenario_id": s.scenario_id,
        "role": s.role,
        "methodology": s.methodology,
        "phase": s.phase,
        "score": s.score,
        "hints_used": s.hints_used or [],
        "roe_acknowledged": s.roe_acknowledged,
        "started_at": s.started_at.isoformat(),
        "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        "container_id": s.container_id,
    }

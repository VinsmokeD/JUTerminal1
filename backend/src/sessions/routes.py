from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.auth.routes import get_current_user, enforce_rate_limit
from src.db.database import get_db, Session, User, CommandLog, SiemEvent, SiemTriage, ContainmentAction
from src.sandbox.manager import stop_scenario_container
from src.cache.redis import cache_set, cache_get, cache_delete
from src.activity.service import record_activity

router = APIRouter()


class SessionStart(BaseModel):
    scenario_id: str
    role: str  # "red" | "blue"
    methodology: str = "ptes"
    randomized: bool = False


class RoeAck(BaseModel):
    session_id: str


class TriageUpdate(BaseModel):
    event_id: str
    classification: str
    notes: str | None = None


TRIAGE_CLASSIFICATIONS = {
    "investigating",
    "true_positive",
    "false_positive",
    "escalated",
}


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

    # Enforce single active session
    active_result = await db.execute(
        select(Session).where(Session.user_id == current_user.id, Session.completed_at == None)
    )
    active_sessions = list(active_result.scalars().all())
    if active_sessions:
        active_session = active_sessions[0]
        raise HTTPException(
            status_code=400,
            detail={
                "error": "active_session_exists",
                "session_id": active_session.id,
                "scenario_id": active_session.scenario_id
            }
        )

    # Pre-generate session ID so metadata can be seeded deterministically
    import uuid as _uuid
    new_session_id = str(_uuid.uuid4())

    from src.scenarios.randomizer import generate_randomized_session_metadata
    is_automated_test_user = current_user.username.startswith(("test_", "test-"))
    session_metadata = (
        {}
        if is_automated_test_user or not body.randomized
        else generate_randomized_session_metadata(new_session_id, scenario_id)
    )

    session = Session(
        id=new_session_id,
        user_id=current_user.id,
        scenario_id=scenario_id,
        role=body.role,
        methodology=body.methodology,
        session_metadata=session_metadata or None,
    )
    db.add(session)
    await record_activity(db, current_user.id, "scenario_start", session.id, {"scenario_id": scenario_id, "role": body.role})
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

    return await _session_dict(session)


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


@router.get("/active")
async def get_active_session(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict | None:
    result = await db.execute(
        select(Session).where(Session.user_id == current_user.id, Session.completed_at == None)
    )
    session = result.scalars().first()
    if not session:
        return None
    return await _session_dict(session)


@router.get("", include_in_schema=False)
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
    return [await _session_dict(s) for s in result.scalars()]


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
    return await _session_dict(session)


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
    await record_activity(db, current_user.id, "scenario_complete", session.id, {"final_score": session.score})
    await db.commit()

    if session.container_id:
        await stop_scenario_container(session.container_id, session.scenario_id)

    await cache_delete(f"session:{session_id}:state")

    return {"completed_at": session.completed_at.isoformat()}


@router.post("/{session_id}/restart-sandbox")
async def restart_session_container(
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

    if session.container_id:
        await stop_scenario_container(session.container_id, session.scenario_id)
        session.container_id = None
        await db.commit()

    await cache_delete(f"terminal:{session_id}:history")
    return {"status": "restarted"}


@router.post("/{session_id}/restart")
async def restart_session(
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

    # Snapshot current run
    meta = session.session_metadata or {}
    runs = meta.get("runs", [])
    runs.append({
        "phase": session.phase,
        "score": session.score,
        "ended_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Reset metadata overrides for flags if any
    if "flags" in meta:
        meta["flags"] = {}

    session.session_metadata = {**meta, "runs": runs}
    session.phase = 1
    session.score = 100
    session.completed_at = None

    # Clear command_log for this session
    from sqlalchemy import delete
    await db.execute(
        delete(CommandLog).where(CommandLog.session_id == session_id)
    )
    await db.commit()

    # Reset cache
    cached = await cache_get(f"session:{session_id}:state") or {}
    cached["phase"] = 1
    cached["score"] = 100
    cached["flags_captured"] = []
    if "completed_at" in cached:
        cached["completed_at"] = None
    await cache_set(f"session:{session_id}:state", cached, ttl=28800)

    return await _session_dict(session)


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
        select(SiemEvent).where(SiemEvent.session_id == session_id).order_by(SiemEvent.created_at.desc())
    )
    triage_rows = await db.execute(
        select(SiemTriage).where(SiemTriage.session_id == session_id)
    )
    triage_by_event = {t.event_id: t for t in triage_rows.scalars().all()}
    return [
        {
            "id": e.id, "severity": e.severity, "message": e.message,
            "source": e.source, "mitre_technique": e.mitre_technique,
            "source_ip": e.source_ip, "raw_log": e.raw_log,
            "created_at": e.created_at.isoformat(),
            "triage": _triage_dict(triage_by_event.get(e.id)),
        }
        for e in evts.scalars().all()
    ]


@router.get("/{session_id}/triage")
async def get_session_triage(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")

    triage = await db.execute(
        select(SiemTriage).where(SiemTriage.session_id == session_id).order_by(SiemTriage.created_at)
    )
    return [_triage_dict(t) for t in triage.scalars().all()]


@router.put("/{session_id}/triage")
async def upsert_session_triage(
    session_id: str,
    body: TriageUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    classification = body.classification.strip().lower()
    if classification not in TRIAGE_CLASSIFICATIONS:
        allowed = ", ".join(sorted(TRIAGE_CLASSIFICATIONS))
        raise HTTPException(status_code=400, detail=f"classification must be one of: {allowed}")

    session_result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    if not session_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Session not found")

    event_result = await db.execute(
        select(SiemEvent.id).where(SiemEvent.id == body.event_id, SiemEvent.session_id == session_id)
    )
    if not event_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="SIEM event not found")

    triage_result = await db.execute(
        select(SiemTriage).where(
            SiemTriage.session_id == session_id,
            SiemTriage.event_id == body.event_id,
        )
    )
    triage = triage_result.scalar_one_or_none()
    if triage is None:
        triage = SiemTriage(session_id=session_id, event_id=body.event_id)
        db.add(triage)

    triage.classification = classification
    triage.notes = body.notes.strip() if body.notes and body.notes.strip() else None
    await db.commit()
    await db.refresh(triage)
    return _triage_dict(triage)


@router.get("/{session_id}/killchain")
async def get_killchain_data(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    from src.db.database import AIInteraction
    from src.reports.learning_insights import build_learning_insights

    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    cmds = await db.execute(
        select(CommandLog).where(CommandLog.session_id == session_id).order_by(CommandLog.created_at)
    )
    commands_list = list(cmds.scalars().all())

    evts = await db.execute(
        select(SiemEvent).where(SiemEvent.session_id == session_id).order_by(SiemEvent.created_at)
    )
    events_list = list(evts.scalars().all())

    ai_interactions = await db.execute(
        select(AIInteraction).where(AIInteraction.session_id == session_id).order_by(AIInteraction.created_at)
    )
    ai_list = list(ai_interactions.scalars().all())

    actions = await db.execute(
        select(ContainmentAction).where(ContainmentAction.session_id == session_id).order_by(ContainmentAction.created_at)
    )
    actions_list = list(actions.scalars().all())

    insights = await build_learning_insights(session, db)

    return {
        "commands": [
            {"id": c.id, "command": c.command, "tool": c.tool, "phase": c.phase, "created_at": c.created_at.isoformat()}
            for c in commands_list
        ],
        "siem_events": [
            {"id": e.id, "severity": e.severity, "message": e.message, "source": e.source, "mitre_technique": e.mitre_technique, "created_at": e.created_at.isoformat()}
            for e in events_list
        ],
        "containment_actions": [
            {"id": a.id, "action_type": a.action_type, "target_value": a.target_value, "status": a.status, "created_at": a.created_at.isoformat()}
            for a in actions_list
        ],
        "cause_effect": insights.get("cause_effect", []),
        "ai_interactions": [
            {
                "id": a.id, "kind": a.kind, "hint_level": a.hint_level,
                "command_context": a.command_context, "response_text": a.response_text,
                "created_at": a.created_at.isoformat(), "flagged": a.flagged
            }
            for a in ai_list
        ],
        "phases": session.phase
    }


@router.get("/{session_id}/readiness")
async def check_session_readiness(
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

    from src.sandbox.readiness import get_session_readiness
    res = await get_session_readiness(session.id, session.scenario_id)

    meta = session.session_metadata or {}
    if meta.get("force_unlocked"):
        res["status"] = "ready"
        res["force_unlocked"] = True
    return res


@router.post("/{session_id}/override")
async def override_readiness(
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

    meta = session.session_metadata or {}
    session.session_metadata = {**meta, "force_unlocked": True}
    await db.commit()
    return {"force_unlocked": True}


class FlagSubmission(BaseModel):
    flag_value: str


@router.post("/{session_id}/flag")
async def submit_flag(
    session_id: str,
    body: FlagSubmission,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    # Rate limit: 10 attempts per minute per session
    await enforce_rate_limit(f"rate_limit:flag:{session_id}", limit=10, window=60)

    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    from src.scenarios.engine import validate_flag, try_advance_phase
    res = await validate_flag(body.flag_value, session.scenario_id, session.id, db)
    if res.get("valid") and not res.get("already_captured"):
        await try_advance_phase(session.id, session.scenario_id, db)
    await record_activity(
        db,
        current_user.id,
        "flag_submit",
        session.id,
        {
            "valid": bool(res.get("valid")),
            "already_captured": bool(res.get("already_captured")),
            "flag_id": res.get("flag_id"),
            "points_awarded": res.get("points_awarded", 0),
        },
    )
    await db.commit()
    return res


async def _session_dict(s: Session) -> dict:
    meta = s.session_metadata or {}
    from src.cache.redis import cache_get
    cached = await cache_get(f"session:{s.id}:state") or {}
    flags_captured = cached.get("flags_captured", [])
    from src.scenarios.loader import get_flags
    try:
        total_flags = len(get_flags(s.scenario_id))
    except Exception:
        total_flags = 0
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
        "scenario_variant": meta.get("scenario_variant"),
        "target_ip": meta.get("target_ip"),
        "flags_captured": flags_captured,
        "total_flags": total_flags,
    }


def _triage_dict(triage: SiemTriage | None) -> dict | None:
    if triage is None:
        return None
    return {
        "id": triage.id,
        "session_id": triage.session_id,
        "event_id": triage.event_id,
        "classification": triage.classification,
        "notes": triage.notes,
        "created_at": triage.created_at.isoformat(),
    }

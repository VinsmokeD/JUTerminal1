"""
Phase 17 — Instructor Dashboard API.

Endpoints (all require role=instructor):
  GET /api/instructor/sessions  — all sessions with student + scenario + score data
  GET /api/instructor/metrics   — aggregate platform stats

Auth: require_instructor dependency checks user.role == "instructor".
Default instructor: username=admin / password=CyberSimAdmin! (seeded in main.py lifespan)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import PlainTextResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from pydantic import BaseModel
from src.db.database import get_db, Session, User, SiemEvent, SiemTriage, CommandLog, Note, AIInteraction, UserActivity
from src.auth.routes import require_instructor, hash_password
from src.reports.generator import generate_report
from src.sandbox.manager import stop_scenario_container
from datetime import datetime, timezone

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


# ── User Management ────────────────────────────────────────────────────────

@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_instructor),
) -> list[dict]:
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return [
        {
            "id": u.id,
            "username": u.username,
            "role": u.role,
            "skill_level": u.skill_level,
            "onboarding_completed": u.onboarding_completed,
            "created_at": u.created_at.isoformat()
        } for u in result.scalars()
    ]


class UserCreateRequest(BaseModel):
    username: str
    password: str
    role: str = "student"
    skill_level: str = "beginner"


@router.post("/users")
async def create_user(
    body: UserCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_instructor),
) -> dict:
    existing = await db.execute(select(User).where(User.username == body.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already exists")

    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        role=body.role,
        skill_level=body.skill_level
    )
    db.add(user)
    await db.commit()
    return {"id": user.id, "username": user.username}


class UserUpdateRequest(BaseModel):
    role: str | None = None
    skill_level: str | None = None
    password: str | None = None


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    body: UserUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_instructor),
) -> dict:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.role:
        user.role = body.role
    if body.skill_level:
        user.skill_level = body.skill_level
    if body.password:
        user.password_hash = hash_password(body.password)

    await db.commit()
    return {"status": "updated", "id": user.id}


@router.get("/users/{user_id}")
async def user_drilldown(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_instructor),
) -> dict:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    sessions = await db.execute(select(Session).where(Session.user_id == user_id).order_by(Session.started_at.desc()))
    session_list = [
        {
            "id": s.id, "scenario_id": s.scenario_id, "role": s.role,
            "score": s.score, "started_at": s.started_at.isoformat(),
            "completed_at": s.completed_at.isoformat() if s.completed_at else None
        } for s in sessions.scalars()
    ]

    return {
        "user": {
            "id": user.id, "username": user.username, "role": user.role,
            "skill_level": user.skill_level, "joined": user.created_at.isoformat()
        },
        "sessions": session_list
    }


# ── Session Management ─────────────────────────────────────────────────────

@router.get("/sessions/{session_id}/detail")
async def session_detail(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_instructor),
) -> dict:
    result = await db.execute(
        select(Session, User.username)
        .join(User, Session.user_id == User.id)
        .where(Session.id == session_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    session, username = row

    return {
        "session_id": session.id,
        "username": username,
        "scenario_id": session.scenario_id,
        "role": session.role,
        "phase": session.phase,
        "score": session.score,
        "started_at": session.started_at.isoformat(),
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,
        "status": "completed" if session.completed_at else "active",
        "container_id": session.container_id
    }


@router.post("/sessions/{session_id}/terminate")
async def terminate_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_instructor),
) -> dict:
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.container_id:
        await stop_scenario_container(session.container_id, session.scenario_id)

    session.completed_at = datetime.now(timezone.utc)
    await db.commit()

    from src.cache.redis import cache_delete
    await cache_delete(f"session:{session_id}:state")

    return {"status": "terminated"}


@router.get("/sessions/{session_id}/ai-interactions")
async def session_ai_interactions(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_instructor),
) -> list[dict]:
    result = await db.execute(
        select(AIInteraction).where(AIInteraction.session_id == session_id).order_by(AIInteraction.created_at.asc())
    )
    return [
        {
            "id": a.id, "kind": a.kind, "hint_level": a.hint_level,
            "command_context": a.command_context, "response_text": a.response_text,
            "prompt_tokens": a.prompt_tokens, "completion_tokens": a.completion_tokens,
            "flagged": a.flagged, "created_at": a.created_at.isoformat()
        } for a in result.scalars()
    ]


# ── Platform Activity & AI ─────────────────────────────────────────────────

@router.get("/activity")
async def get_platform_activity(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_instructor),
) -> list[dict]:
    result = await db.execute(
        select(UserActivity, User.username)
        .join(User, UserActivity.user_id == User.id)
        .order_by(UserActivity.created_at.desc())
        .limit(limit)
    )
    return [
        {
            "id": act.id,
            "username": username,
            "event_type": act.event_type,
            "session_id": act.session_id,
            "metadata": act.metadata_json,
            "created_at": act.created_at.isoformat()
        } for act, username in result.all()
    ]


@router.get("/ai/usage")
async def get_ai_usage(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_instructor),
) -> dict:
    from src.cache.redis import cache_get
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    global_daily_key = f"ai:budget:global:{today}:tokens"
    global_tokens = int(await cache_get(global_daily_key) or 0)

    flagged_res = await db.execute(select(func.count(AIInteraction.id)).where(AIInteraction.flagged == True))
    total_flagged = flagged_res.scalar() or 0

    return {
        "global_daily_tokens_used": global_tokens,
        "total_flagged_interactions": total_flagged
    }


# ── Instructor Analytics (Phase 25) ───────────────────────────────────────────

@router.get("/analytics")
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_instructor),
) -> dict:
    """Fetch class-level learning signals, struggle flags, and score distribution."""
    from src.instructor.analytics import get_instructor_analytics
    return await get_instructor_analytics(db)


@router.get("/export/grades")
async def export_grades(
    format: str = "canvas",
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_instructor),
) -> Response:
    """Generate a Canvas or Moodle-compatible CSV download stream of student grades."""
    import csv
    import io

    # fetch student sessions
    sessions_result = await db.execute(
        select(Session, User)
        .join(User, Session.user_id == User.id)
        .where(User.role == "student")
    )
    rows = sessions_result.all()

    output = io.StringIO()
    writer = csv.writer(output)

    if format.lower() == "moodle":
        writer.writerow([
            "First name", "Surname", "ID number", "Institution",
            "Department", "Email address", "Grade", "Feedback"
        ])
        for session, user in rows:
            # Query notes for feedback
            notes_res = await db.execute(
                select(Note.content)
                .where(Note.session_id == session.id)
            )
            notes_contents = notes_res.scalars().all()
            feedback = "; ".join(notes_contents)[:500] if notes_contents else "No notes submitted."

            writer.writerow([
                user.username,
                "Student",
                user.id,
                "University",
                "Cybersecurity",
                f"{user.username}@example.com",
                session.score,
                feedback
            ])
    else:  # canvas default
        writer.writerow([
            "Student", "ID", "SIS User ID", "SIS Login ID",
            "Section", "CyberSim Score", "CyberSim Time (m)", "Adherence %"
        ])
        for session, user in rows:
            # count gate blocks
            blocks_count = await db.scalar(
                select(func.count(CommandLog.id))
                .where(CommandLog.session_id == session.id, CommandLog.tool.like("gate_block:%"))
            ) or 0
            adherence = max(0, 100 - (blocks_count * 5))
            duration = 0.0
            if session.completed_at:
                duration = round((session.completed_at - session.started_at).total_seconds() / 60.0, 1)

            writer.writerow([
                user.username,
                user.id,
                user.username,
                user.username,
                user.skill_level.capitalize() if user.skill_level else "Beginner",
                session.score,
                duration,
                adherence
            ])

    csv_content = output.getvalue()
    filename = f"cybersim_grades_{format}_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/sessions/{session_id}/timeline")
async def session_timeline(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_instructor),
) -> dict:
    """Return detailed command and detection timeline for audit."""
    # 1. Fetch commands
    cmds_res = await db.execute(
        select(CommandLog)
        .where(CommandLog.session_id == session_id)
        .order_by(CommandLog.created_at.asc())
    )
    commands = cmds_res.scalars().all()

    # 2. Fetch SIEM events
    events_res = await db.execute(
        select(SiemEvent)
        .where(SiemEvent.session_id == session_id)
        .order_by(SiemEvent.created_at.asc())
    )
    events = events_res.scalars().all()

    return {
        "commands": [
            {
                "id": c.id,
                "command": c.command,
                "tool": c.tool,
                "phase": c.phase,
                "created_at": c.created_at.isoformat()
            }
            for c in commands
        ],
        "siem_events": [
            {
                "id": e.id,
                "severity": e.severity,
                "message": e.message,
                "source": e.source,
                "created_at": e.created_at.isoformat()
            }
            for e in events
        ]
    }


@router.get("/sessions/{session_id}/live-inspect")
async def session_live_inspect(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_instructor),
) -> dict:
    """Return detailed active command history, SIEM events with triage classification, and notes."""
    sess_res = await db.execute(
        select(Session, User.username)
        .join(User, Session.user_id == User.id)
        .where(Session.id == session_id)
    )
    row = sess_res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    session, username = row

    cmds_res = await db.execute(
        select(CommandLog)
        .where(CommandLog.session_id == session_id)
        .order_by(CommandLog.created_at.desc())
        .limit(100)
    )
    commands = cmds_res.scalars().all()

    events_res = await db.execute(
        select(SiemEvent)
        .where(SiemEvent.session_id == session_id)
        .order_by(SiemEvent.created_at.desc())
        .limit(200)
    )
    events = events_res.scalars().all()

    triage_res = await db.execute(
        select(SiemTriage)
        .where(SiemTriage.session_id == session_id)
    )
    triage_list = triage_res.scalars().all()
    triage_map = {t.event_id: {"classification": t.classification, "notes": t.notes} for t in triage_list}

    notes_res = await db.execute(
        select(Note)
        .where(Note.session_id == session_id)
        .order_by(Note.created_at.desc())
    )
    notes = notes_res.scalars().all()

    return {
        "session": {
            "session_id": session.id,
            "username": username,
            "scenario_id": session.scenario_id,
            "phase": session.phase,
            "score": session.score,
            "status": "completed" if session.completed_at else "active",
            "started_at": session.started_at.isoformat(),
        },
        "commands": [
            {
                "command": c.command,
                "tool": c.tool,
                "phase": c.phase,
                "created_at": c.created_at.isoformat()
            } for c in commands
        ],
        "events": [
            {
                "id": e.id,
                "severity": e.severity,
                "message": e.message,
                "source": e.source,
                "created_at": e.created_at.isoformat(),
                "classification": triage_map.get(e.id, {}).get("classification"),
                "notes": triage_map.get(e.id, {}).get("notes")
            } for e in events
        ],
        "notes": [
            {
                "tag": n.tag,
                "content": n.content,
                "phase": n.phase,
                "created_at": n.created_at.isoformat()
            } for n in notes
        ]
    }

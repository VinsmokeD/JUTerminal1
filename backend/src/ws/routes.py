import asyncio
import json
import queue as thread_queue
import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.db.database import AsyncSessionLocal, Session, CommandLog
from src.sandbox.terminal import (
    stream_terminal_output,
    send_terminal_input,
    register_terminal_output_listener,
    unregister_terminal_output_listener,
)
from src.sandbox.manager import ensure_scenario_container
from src.ai.monitor import get_ai_hint
from src.ai.discovery_tracker import track_command as track_discovery
from src.cache.redis import cache_get, cache_set, lpush_capped, lrange, _get as get_redis_client
from src.activity.service import record_activity
from src.scenarios.gatekeeper import check_command
from src.scenarios.loader import load_scenario
from src.scenarios.hint_engine import _load_hints
from src.scenarios.engine import try_advance_phase
from src.scenarios.output_patterns import scan_output_chunk
from src.scenarios.branching import infer_active_branch, get_active_branch, get_branch_hint

_GATE_PENALTY = 5  # points deducted per blocked command
_HINT_PENALTIES = {
    "beginner": {1: 2, 2: 5, 3: 10},
    "intermediate": {1: 5, 2: 10, 3: 20},
    "experienced": {1: 10, 2: 20, 3: 40},
}
_ACTIVE_SESSIONS_KEY = "cybersim:active_sessions"  # Redis hash: session_id → JSON session state

router = APIRouter()


def _active_session_payload(session_state: dict) -> str:
    """Return the Redis active-session value used by SIEM, noise, and cleanup."""
    return json.dumps(
        {
            "scenario_id": session_state.get("scenario_id"),
            "role": session_state.get("role"),
            "phase": session_state.get("phase"),
            "container_id": session_state.get("container_id"),
        }
    )


async def _authenticate(token: str) -> str | None:
    """Return user_id from JWT or None if invalid."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        return payload.get("sub")
    except JWTError:
        return None


async def _send_reconnect_history(websocket: WebSocket, session_id: str) -> None:
    """Send terminal and command history immediately after reconnect."""
    terminal_chunks = await lrange(f"terminal:{session_id}:history", 0, 499)
    command_history = await lrange(f"session:{session_id}:commands", 0, 49)

    await websocket.send_json(
        {
            "type": "history",
            "data": {
                "commands": list(reversed([str(c) for c in command_history if c is not None])),
                "terminal": list(reversed([str(c) for c in terminal_chunks if c is not None])),
            },
        }
    )


async def _handle_terminal_command(session_id: str, session_state: dict, command: str, send_json) -> None:
    """Process complete commands without blocking raw PTY keystrokes."""
    if not command.strip():
        return

    # ── ROE gate: backend hard-check before any processing ────────────────
    async with AsyncSessionLocal() as db:
        roe_result = await db.execute(select(Session).where(Session.id == session_id))
        roe_session = roe_result.scalar_one_or_none()
        if roe_session is None or not roe_session.roe_acknowledged:
            await send_json({
                "type": "error",
                "data": {"message": "ROE acknowledgment required before issuing commands."},
            })
            return

    current_phase: int = session_state["phase"]
    try:
        spec = load_scenario(session_state["scenario_id"])
        phases = spec.get("phases", {})
        phase_spec = phases.get(current_phase, phases.get(str(current_phase), {}))
        ptes_phase = phase_spec.get("ptes_phase", "")
    except Exception:
        ptes_phase = ""

    if ptes_phase:
        gate_result = check_command(command, ptes_phase)
        if gate_result.blocked:
            new_score = None
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    update(Session)
                    .where(Session.id == session_id)
                    .values(score=Session.score - _GATE_PENALTY)
                    .returning(Session.score)
                )
                row = result.fetchone()
                new_score = row[0] if row else None
                
                from src.scenarios.gatekeeper import _parse_tool as _gt
                blocked_tool = _gt(command)
                db.add(CommandLog(
                    session_id=session_id,
                    command=f"[gate_blocked] {command}",
                    tool=f"gate_block:{blocked_tool}",
                    phase=current_phase,
                    triggered_siem_events=[],
                ))
                await record_activity(
                    db,
                    session_state["user_id"],
                    "gate_block",
                    session_id,
                    {"command": command, "phase": current_phase, "tool": blocked_tool},
                )
                await db.commit()

            warn = (
                f"\r\n\x1b[31m[GATE BLOCKED] {gate_result.redirect_message}\x1b[0m"
                f"\r\n\x1b[33m[-{_GATE_PENALTY} pts — methodology violation]\x1b[0m\r\n"
            )
            await send_json({"type": "terminal_output", "data": {"data": warn}})
            if new_score is not None:
                await send_json({"type": "score_update", "data": {"score": new_score}})
            return

    from src.scenarios.gatekeeper import _parse_tool as _gt
    tool_name = _gt(command)
    previous_branch = session_state.get("active_branch")
    active_branch = await infer_active_branch(session_id, session_state["scenario_id"], command)
    if active_branch and active_branch != previous_branch:
        session_state["active_branch"] = active_branch
        await send_json({"type": "branch_update", "data": active_branch})
    cmd_log_id: str | None = None
    async with AsyncSessionLocal() as db:
        cmd_row = CommandLog(
            session_id=session_id,
            command=command,
            tool=tool_name or None,
            phase=session_state.get("phase", 1),
            triggered_siem_events=[],
        )
        db.add(cmd_row)
        await db.commit()
        await db.refresh(cmd_row)
        cmd_log_id = cmd_row.id

    await lpush_capped(f"session:{session_id}:commands", command, max_len=50)
    await cache_set(f"session:{session_id}:last_cmd_time", str(time.time()), ttl=7200)

    recent_output = await lrange(f"terminal:{session_id}:history", 0, 2)
    output_text = " ".join(str(c) for c in recent_output if c) if recent_output else ""
    discoveries = await track_discovery(session_id, command, output_text, session_state["scenario_id"])

    if any(discoveries.values()):
        await send_json({
            "type": "auto_evidence",
            "data": {
                "command": command,
                "discoveries": discoveries,
                "tool": tool_name or (command.strip().split()[0] if command.strip() else ""),
            },
        })

    ai_hint = await get_ai_hint(session_id, session_state, command, None)
    if ai_hint:
        await send_json({"type": "ai_hint", "data": {"text": ai_hint}})
        if cmd_log_id is not None:
            async with AsyncSessionLocal() as db:
                await db.execute(
                    update(CommandLog)
                    .where(CommandLog.id == cmd_log_id)
                    .values(ai_hint_given=True)
                )
                await db.commit()

    async with AsyncSessionLocal() as db:
        new_phase = await try_advance_phase(session_id, session_state["scenario_id"], db)
    if new_phase != session_state["phase"]:
        old_phase = session_state["phase"]
        session_state["phase"] = new_phase
        # Log the phase advance as a special activity entry
        async with AsyncSessionLocal() as db:
            db.add(CommandLog(
                session_id=session_id,
                command=f"[phase_advance] {old_phase} → {new_phase}",
                tool="phase:advance",
                phase=new_phase,
                triggered_siem_events=[],
            ))
            await record_activity(
                db,
                session_state["user_id"],
                "phase_advance",
                session_id,
                {"old_phase": old_phase, "new_phase": new_phase},
            )
            await db.commit()
        await send_json({"type": "phase_update", "data": {"phase": new_phase}})


@router.websocket("/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str) -> None:
    await websocket.accept()

    # Expect first message to be auth token
    try:
        auth_msg = await asyncio.wait_for(websocket.receive_text(), timeout=5.0)
        data = json.loads(auth_msg)
        token = data.get("token", "")
    except (asyncio.TimeoutError, json.JSONDecodeError):
        await websocket.close(code=4001)
        return

    user_id = await _authenticate(token)
    if not user_id:
        await websocket.close(code=4001)
        return

    # Validate session ownership
    async with AsyncSessionLocal() as db:
        from sqlalchemy.orm import selectinload
        result = await db.execute(
            select(Session)
            .options(selectinload(Session.user))
            .where(Session.id == session_id, Session.user_id == user_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            await websocket.close(code=4004)
            return
        session_state = {
            "scenario_id": session.scenario_id,
            "user_id": user_id,
            "role": session.role,
            "phase": session.phase,
            "methodology": session.methodology,
            "container_id": session.container_id,
            "skill_level": session.user.skill_level,
        }

    # Ensure the browser always attaches to a live PTY. Cleanup or Docker
    # restarts can leave the DB pointing at a removed Kali container.
    container_id, network_name, changed = await ensure_scenario_container(
        session_id,
        session_state["scenario_id"],
        session_state["container_id"],
    )
    if changed:
        async with AsyncSessionLocal() as db:
            await db.execute(
                update(Session)
                .where(Session.id == session_id)
                .values(container_id=container_id, network_name=network_name)
            )
            await db.commit()
    session_state["container_id"] = container_id

    # Register direct terminal output before launching the PTY proxy so live
    # frames do not depend on Redis pub/sub delivery.
    terminal_output_queue = register_terminal_output_listener(session_id)

    # Start streaming terminal output from Docker to Redis/direct listeners (idempotent thread launch)
    await stream_terminal_output(session_id, container_id, session_state["scenario_id"])

    # Replay persisted history so browser refresh restores terminal context immediately.
    await _send_reconnect_history(websocket, session_id)

    # Register session as active for noise daemon targeting ONLY when a real
    # container is running — prevents spurious SIEM noise when Docker is unavailable.
    redis = get_redis_client()
    has_real_container = bool(
        session_state["container_id"] and not session_state["container_id"].startswith("mock-")
    )
    if has_real_container:
        await redis.hset(_ACTIVE_SESSIONS_KEY, session_id, _active_session_payload(session_state))
        await redis.set(f"cybersim:session:{session_id}:alive", "1", ex=7200)

    # Subscribe to SIEM channels via Redis pub/sub. Terminal output is delivered
    # through the direct listener queue and still persisted to Redis for refresh.
    pubsub = redis.pubsub()
    await pubsub.subscribe(f"siem:{session_id}:feed")
    send_lock = asyncio.Lock()
    command_queue: asyncio.Queue[str] = asyncio.Queue(maxsize=50)

    async def _send_json(payload: dict) -> None:
        async with send_lock:
            await websocket.send_json(payload)

    async def _redis_to_ws() -> None:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            payload = json.loads(message["data"])
            await _send_json({"type": "siem_event", "data": payload})

    async def _terminal_output_to_ws() -> None:
        def _get_frame() -> str | None:
            try:
                return terminal_output_queue.get(timeout=0.5)
            except thread_queue.Empty:
                return None

        while True:
            frame = await asyncio.to_thread(_get_frame)
            if frame:
                await _send_json({"type": "terminal_output", "data": {"data": frame}})
                for insight in scan_output_chunk(session_id, session_state["scenario_id"], frame):
                    await _send_json({"type": "output_insight", "data": insight})

    async def _command_worker() -> None:
        while True:
            command = await command_queue.get()
            try:
                await _handle_terminal_command(session_id, session_state, command, _send_json)
            except Exception as exc:
                import logging
                logging.getLogger(__name__).warning(
                    "[WS] Command processing failed for session %s: %s",
                    session_id[:8],
                    exc,
                )
            finally:
                command_queue.task_done()

    async def _heartbeat() -> None:
        while True:
            await asyncio.sleep(20)
            await _send_json({"type": "ws_ping", "data": {"session_id": session_id}})

    async def _send_hint(level: int) -> None:
        hint_text = None
        hint_steps = None
        active_branch = session_state.get("active_branch") or await get_active_branch(session_id)

        ai_hint = await get_ai_hint(session_id, session_state, None, level)
        if ai_hint:
            hint_text = ai_hint
            hint_steps = [ai_hint]
        else:
            branch_steps = get_branch_hint(
                session_state["scenario_id"],
                session_state.get("role", "red"),
                session_state.get("phase", 1),
                active_branch.get("id") if active_branch else None,
                level,
            )
            if branch_steps:
                hint_text = "\n".join(branch_steps)
                hint_steps = branch_steps
            else:
                hints_data = _load_hints(session_state["scenario_id"])
                sc_hints = hints_data.get(session_state["scenario_id"], {})
                role_hints = sc_hints.get(session_state.get("role", "red"), {})
                phase_hints = role_hints.get(str(session_state.get("phase", 1)), {})
                static_hint = phase_hints.get(f"L{level}")

                if isinstance(static_hint, list):
                    hint_text = "\n".join(static_hint)
                    hint_steps = static_hint
                elif static_hint:
                    hint_text = static_hint
                    hint_steps = [static_hint]

        # ── Log hint request + apply score penalty ─────────────────────────
        skill = session_state.get("skill_level", "beginner")
        penalties = _HINT_PENALTIES.get(skill, _HINT_PENALTIES["beginner"])
        penalty = penalties.get(int(level), 5)
        hint_key = f"L{level}_phase{session_state.get('phase', 1)}"
        new_score: int | None = None
        try:
            async with AsyncSessionLocal() as db:
                # Fetch current session to get hints_used list and current score
                sess_res = await db.execute(select(Session).where(Session.id == session_id))
                sess = sess_res.scalar_one_or_none()
                if sess:
                    current_hints = list(sess.hints_used or [])
                    current_hints.append(hint_key)
                    new_score_val = max(0, (sess.score or 100) - penalty)
                    await db.execute(
                        update(Session)
                        .where(Session.id == session_id)
                        .values(score=new_score_val, hints_used=current_hints)
                    )
                    new_score = new_score_val
                # Log hint as a CommandLog activity entry
                db.add(CommandLog(
                    session_id=session_id,
                    command=f"[hint_requested] L{level}",
                    tool=f"hint:L{level}",
                    phase=session_state.get("phase", 1),
                    triggered_siem_events=[],
                    ai_hint_given=True,
                ))
                await record_activity(db, user_id, "hint_request", session_id, {"level": level})
                await db.commit()
        except Exception as _he:
            import logging
            logging.getLogger(__name__).warning("[WS] Hint logging failed for %s: %s", session_id[:8], _he)

        if new_score is not None:
            await _send_json({"type": "score_update", "data": {"score": new_score, "delta": -penalty, "reason": f"Hint L{level}: phase {session_state.get('phase', 1)}"}})

        if hint_text:
            await _send_json({"type": "ai_hint", "data": {
                "text": hint_text, "steps": hint_steps, "level": level,
                "branch": active_branch, "penalty": penalty,
            }})
        else:
            await _send_json({"type": "ai_hint", "data": {
                "text": "No hint available for this phase yet. Try progressing to the next step.",
                "steps": [], "level": level,
            }})

    redis_task = asyncio.create_task(_redis_to_ws())
    terminal_output_task = asyncio.create_task(_terminal_output_to_ws())
    command_task = asyncio.create_task(_command_worker())
    heartbeat_task = asyncio.create_task(_heartbeat())

    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            msg_type = msg.get("type")

            # Keepalive: refresh liveness key on every message so cleanup loop
            # can evict abandoned sessions from cybersim:active_sessions hash.
            try:
                await redis.set(f"cybersim:session:{session_id}:alive", "1", ex=7200)
            except Exception:
                pass  # non-fatal; eviction will happen on next cleanup cycle

            if msg_type == "terminal_raw":
                # ── Raw PTY passthrough: every keystroke → Docker ──────────
                raw_data = msg.get("data", "")
                if raw_data:
                    await send_terminal_input(session_id, raw_data)

            elif msg_type == "terminal_command":
                command = msg.get("data", "")
                if command.strip():
                    try:
                        command_queue.put_nowait(command)
                    except asyncio.QueueFull:
                        await _send_json({
                            "type": "terminal_output",
                            "data": {
                                "data": "\r\n\x1b[31m[terminal busy] Command queue is full. Wait for the current command to finish.\x1b[0m\r\n",
                            },
                        })
            elif msg_type == "terminal_input":
                # ── Legacy: line-buffered input (mock terminal fallback) ────
                command = msg.get("data", "")
                if command:
                    await send_terminal_input(session_id, command)

            elif msg_type == "toggle_mode":
                new_mode = msg.get("mode", "learn")
                if new_mode in ("learn", "challenge"):
                    async with AsyncSessionLocal() as db:
                        await db.execute(
                            update(Session)
                            .where(Session.id == session_id)
                            .values(ai_mode=new_mode)
                        )
                        db.add(CommandLog(
                            session_id=session_id,
                            command=f"[mode_changed] {new_mode}",
                            tool=f"mode:{new_mode}",
                            phase=session_state.get("phase", 1),
                            triggered_siem_events=[],
                        ))
                        await record_activity(
                            db,
                            user_id,
                            "mode_toggle",
                            session_id,
                            {"mode": new_mode},
                        )
                        await db.commit()
                    session_state["ai_mode"] = new_mode
                    await _send_json({
                        "type": "mode_changed",
                        "data": {"mode": new_mode},
                    })

            elif msg_type == "request_hint":
                level = msg.get("level", 1)
                verbosity = msg.get("verbosity", "balanced")
                session_state["ai_verbosity"] = verbosity
                asyncio.create_task(_send_hint(int(level)))

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning(
            "[WS] Unhandled error for session %s: %s", session_id[:8], exc
        )
    finally:
        redis_task.cancel()
        terminal_output_task.cancel()
        command_task.cancel()
        heartbeat_task.cancel()
        try:
            await pubsub.unsubscribe()
        except Exception:
            pass
        try:
            await pubsub.reset()
        except Exception:
            pass
        try:
            await redis.hdel(_ACTIVE_SESSIONS_KEY, session_id)
        except Exception:
            pass
        try:
            await redis.delete(f"cybersim:session:{session_id}:alive")
        except Exception:
            pass
        unregister_terminal_output_listener(session_id, terminal_output_queue)

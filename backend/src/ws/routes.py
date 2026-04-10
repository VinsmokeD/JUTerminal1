import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.db.database import AsyncSessionLocal, Session, CommandLog
from src.sandbox.terminal import stream_terminal_output, send_terminal_input
from src.siem.engine import process_command_for_siem
from src.ai.monitor import get_ai_hint
from src.ai.discovery_tracker import track_command as track_discovery
from src.cache.redis import cache_get, cache_set, lpush_capped, lrange, _get as get_redis_client
from src.scenarios.gatekeeper import check_command
from src.scenarios.loader import load_scenario
from src.scenarios.hint_engine import _load_hints

_GATE_PENALTY = 5  # points deducted per blocked command
_ACTIVE_SESSIONS_KEY = "cybersim:active_sessions"  # Redis hash: session_id → scenario_id

router = APIRouter()


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
        result = await db.execute(
            select(Session).where(Session.id == session_id, Session.user_id == user_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            await websocket.close(code=4004)
            return
        session_state = {
            "scenario_id": session.scenario_id,
            "role": session.role,
            "phase": session.phase,
            "methodology": session.methodology,
            "container_id": session.container_id,
        }

    # Start streaming terminal output from Docker to Redis (idempotent thread launch)
    if session.container_id:
        await stream_terminal_output(session_id, session.container_id, session_state["scenario_id"])

    # Replay persisted history so browser refresh restores terminal context immediately.
    await _send_reconnect_history(websocket, session_id)

    # Register session as active for noise daemon targeting ONLY when a real
    # container is running — prevents spurious SIEM noise when Docker is unavailable.
    redis = get_redis_client()
    has_real_container = bool(
        session.container_id and not session.container_id.startswith("mock-")
    )
    if has_real_container:
        await redis.hset(_ACTIVE_SESSIONS_KEY, session_id, session_state["scenario_id"])

    # Subscribe to SIEM + terminal output channels via Redis pub/sub
    pubsub = redis.pubsub()
    await pubsub.subscribe(f"siem:{session_id}:feed", f"terminal:{session_id}:output")

    async def _redis_to_ws() -> None:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            channel = message["channel"]
            payload = json.loads(message["data"])
            if "siem:" in channel:
                await websocket.send_json({"type": "siem_event", "data": payload})
            else:
                await websocket.send_json({"type": "terminal_output", "data": payload})

    redis_task = asyncio.create_task(_redis_to_ws())

    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            msg_type = msg.get("type")

            if msg_type == "terminal_input":
                command = msg.get("data", "")

                # ── Phase 15: Methodology gate check ────────────────────────
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
                        # Deduct points and surface Socratic redirect in terminal
                        async with AsyncSessionLocal() as db:
                            await db.execute(
                                update(Session)
                                .where(Session.id == session_id)
                                .values(score=Session.score - _GATE_PENALTY)
                            )
                            await db.commit()
                        session_state["phase"] = current_phase  # keep state consistent
                        warn = (
                            f"\r\n\x1b[31m[GATE BLOCKED] {gate_result.redirect_message}\x1b[0m"
                            f"\r\n\x1b[33m[-{_GATE_PENALTY} pts — methodology violation]\x1b[0m\r\n"
                        )
                        await websocket.send_json({"type": "terminal_output", "data": warn})
                        continue  # do NOT forward to Docker

                await send_terminal_input(session_id, command)

                # Log command and trigger SIEM events
                siem_events = await process_command_for_siem(session_id, session_state, command)

                # Persist command to DB for timeline + reports
                first_word = command.strip().split()[0].lower() if command.strip() else ""
                async with AsyncSessionLocal() as db:
                    from src.scenarios.gatekeeper import _parse_tool as _gt
                    tool_name = _gt(command)
                    db.add(CommandLog(
                        session_id=session_id,
                        command=command,
                        tool=tool_name or None,
                        phase=session_state.get("phase", 1),
                    ))
                    await db.commit()

                # Store command in Redis for AI context
                await lpush_capped(f"session:{session_id}:commands", command, max_len=10)
                await cache_set(f"session:{session_id}:last_cmd_time", str(__import__('time').time()), ttl=7200)

                # Track discoveries from command output (non-blocking)
                # Get recent terminal output from history for discovery parsing
                recent_output = await lrange(f"terminal:{session_id}:history", 0, 0)
                output_text = str(recent_output[0]) if recent_output else ""
                discoveries = await track_discovery(session_id, command, output_text, session_state["scenario_id"])

                # If something was newly discovered, notify the frontend for auto-evidence
                if any(discoveries.values()):
                    await websocket.send_json({
                        "type": "auto_evidence",
                        "data": {
                            "command": command,
                            "discoveries": discoveries,
                            "tool": tool_name or first_word if command.strip() else "",
                        },
                    })

                # Trigger AI hint if applicable
                ai_hint = await get_ai_hint(session_id, session_state, command, None)
                if ai_hint:
                    await websocket.send_json({"type": "ai_hint", "data": {"text": ai_hint}})

            elif msg_type == "toggle_mode":
                new_mode = msg.get("mode", "learn")
                if new_mode in ("learn", "challenge"):
                    async with AsyncSessionLocal() as db:
                        await db.execute(
                            update(Session)
                            .where(Session.id == session_id)
                            .values(ai_mode=new_mode)
                        )
                        await db.commit()
                    session_state["ai_mode"] = new_mode
                    await websocket.send_json({
                        "type": "mode_changed",
                        "data": {"mode": new_mode},
                    })

            elif msg_type == "request_hint":
                level = msg.get("level", 1)
                hint_text = None

                # Try AI hint first
                ai_hint = await get_ai_hint(session_id, session_state, None, level)
                if ai_hint:
                    hint_text = ai_hint
                else:
                    # Fall back to static hint JSON files
                    hints_data = _load_hints(session_state["scenario_id"])
                    sc_hints = hints_data.get(session_state["scenario_id"], {})
                    role_hints = sc_hints.get(session_state.get("role", "red"), {})
                    phase_hints = role_hints.get(str(session_state.get("phase", 1)), {})
                    hint_text = phase_hints.get(f"L{level}")

                if hint_text:
                    await websocket.send_json({"type": "ai_hint", "data": {"text": hint_text, "level": level}})
                else:
                    await websocket.send_json({"type": "ai_hint", "data": {"text": "No hint available for this phase yet. Try progressing to the next step.", "level": level}})

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        redis_task.cancel()
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

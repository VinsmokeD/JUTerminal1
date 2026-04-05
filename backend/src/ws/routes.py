import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.db.database import AsyncSessionLocal, Session
from src.sandbox.terminal import stream_terminal_output, send_terminal_input
from src.siem.engine import process_command_for_siem
from src.ai.monitor import get_ai_hint
from src.cache.redis import cache_get, cache_set, lpush_capped, _get as get_redis_client
from src.scenarios.gatekeeper import check_command
from src.scenarios.loader import load_scenario

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
        await stream_terminal_output(session_id, session.container_id)

    # Register session as active for noise daemon targeting
    redis = get_redis_client()
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

                # Store command in Redis for AI context
                await lpush_capped(f"session:{session_id}:commands", command, max_len=10)

                # Trigger AI hint if applicable
                ai_hint = await get_ai_hint(session_id, session_state, command, None)
                if ai_hint:
                    await websocket.send_json({"type": "ai_hint", "data": {"text": ai_hint}})

            elif msg_type == "request_hint":
                level = msg.get("level", 1)
                ai_hint = await get_ai_hint(session_id, session_state, None, level)
                if ai_hint:
                    await websocket.send_json({"type": "ai_hint", "data": {"text": ai_hint, "level": level}})

    except WebSocketDisconnect:
        pass
    finally:
        redis_task.cancel()
        await pubsub.unsubscribe()
        await pubsub.aclose()
        await redis.hdel(_ACTIVE_SESSIONS_KEY, session_id)

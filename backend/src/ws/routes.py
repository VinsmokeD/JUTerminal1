import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.db.database import AsyncSessionLocal, Session
from src.sandbox.terminal import stream_terminal_output, send_terminal_input
from src.siem.engine import process_command_for_siem
from src.ai.monitor import get_ai_hint
from src.cache.redis import cache_get, cache_set, lpush_capped, _get as get_redis_client

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

    # Subscribe to SIEM + terminal output channels via Redis pub/sub
    redis = get_redis_client()
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

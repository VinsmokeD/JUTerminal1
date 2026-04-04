import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError, jwt

from src.config import settings
from src.cache.redis import get_redis, cache_get
from src.siem.engine import process_command_for_siem
from src.ai.monitor import get_ai_hint
from src.sandbox.terminal import TerminalProxy

router = APIRouter()

# Active connections: session_id -> list of websockets
_connections: dict[str, list[WebSocket]] = {}


async def _authenticate_ws(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        return payload
    except JWTError:
        return None


@router.websocket("/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    token: str = Query(...),
):
    payload = await _authenticate_ws(token)
    if not payload:
        await websocket.close(code=4001)
        return

    session_state = await cache_get(f"session:{session_id}:state")
    if not session_state or session_state.get("user_id") != payload.get("sub"):
        await websocket.close(code=4003)
        return

    await websocket.accept()
    _connections.setdefault(session_id, []).append(websocket)

    terminal = TerminalProxy(session_id)
    redis = get_redis()
    pubsub = redis.pubsub()
    await pubsub.subscribe(f"siem:{session_id}:feed")

    # Background task: forward Redis SIEM events to this websocket
    async def siem_forwarder():
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    await websocket.send_json({"type": "siem_event", "data": json.loads(message["data"])})
                except Exception:
                    break

    siem_task = asyncio.create_task(siem_forwarder())

    try:
        await websocket.send_json({"type": "connected", "session_id": session_id, "state": session_state})

        async for raw in websocket.iter_text():
            msg = json.loads(raw)
            msg_type = msg.get("type")

            if msg_type == "terminal_input":
                cmd = msg.get("data", "")
                # Execute in container, stream output back
                output = await terminal.execute(cmd)
                await websocket.send_json({"type": "terminal_output", "data": output})
                # Trigger SIEM + AI analysis asynchronously
                asyncio.create_task(_handle_command(session_id, session_state, cmd, websocket))

            elif msg_type == "request_hint":
                level = msg.get("level", 1)
                hint = await get_ai_hint(session_id, session_state, None, level)
                await websocket.send_json({"type": "ai_hint", "data": hint, "level": level})

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        pass
    finally:
        siem_task.cancel()
        await pubsub.unsubscribe(f"siem:{session_id}:feed")
        conns = _connections.get(session_id, [])
        if websocket in conns:
            conns.remove(websocket)


async def _handle_command(session_id: str, state: dict, command: str, ws: WebSocket):
    """Async: generate SIEM events and AI hint for a terminal command."""
    siem_events = await process_command_for_siem(session_id, state, command)
    if siem_events:
        for event in siem_events:
            try:
                await ws.send_json({"type": "siem_event", "data": event})
            except Exception:
                pass

    hint = await get_ai_hint(session_id, state, command, hint_level=None)
    if hint:
        try:
            await ws.send_json({"type": "ai_hint", "data": hint, "level": 0})
        except Exception:
            pass

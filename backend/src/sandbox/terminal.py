"""WebSocket ↔ Docker exec stream proxy for the student Kali terminal."""
import asyncio
import json

try:
    import docker
    _docker_available = True
except ImportError:
    _docker_available = False

from src.config import settings
from src.cache.redis import _get as get_redis_client, publish


async def send_terminal_input(session_id: str, data: str) -> None:
    """
    Forward input from the WebSocket to the container's exec stream.
    Published on a Redis channel; the exec reader task picks it up.
    """
    await publish(f"terminal:{session_id}:input", {"data": data})


async def stream_terminal_output(session_id: str, container_id: str) -> None:
    """
    Read output from the Docker exec stream and publish to Redis so the
    WebSocket handler can forward it to the browser.

    This function is launched as a background task per session.
    """
    if container_id.startswith("mock-"):
        await _mock_stream(session_id)
        return

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _stream_sync, session_id, container_id)


def _stream_sync(session_id: str, container_id: str) -> None:
    import asyncio as _asyncio

    try:
        client = docker.from_env()
        container = client.containers.get(container_id)
        exec_id = client.api.exec_create(
            container.id,
            ["/bin/bash"],
            stdin=True,
            tty=True,
            environment={"TERM": "xterm-256color"},
        )
        sock = client.api.exec_start(exec_id, socket=True, tty=True)

        redis = get_redis_client()
        loop = _asyncio.new_event_loop()

        # Subscribe to input channel
        pubsub = loop.run_until_complete(_subscribe_input(session_id))

        # Read output from Docker and publish to Redis
        for chunk in sock:
            if not chunk:
                break
            loop.run_until_complete(
                redis.publish(f"terminal:{session_id}:output", json.dumps({"data": chunk.decode("utf-8", errors="replace")}))
            )

    except Exception as e:
        if settings.ENVIRONMENT == "development":
            print(f"[Terminal] Exec stream error: {e}")


async def _subscribe_input(session_id: str):
    redis = get_redis_client()
    pubsub = redis.pubsub()
    await pubsub.subscribe(f"terminal:{session_id}:input")
    return pubsub


async def _mock_stream(session_id: str) -> None:
    """Emit a fake shell prompt in dev when Docker isn't available."""
    redis = get_redis_client()
    await redis.publish(
        f"terminal:{session_id}:output",
        json.dumps({"data": "\r\n\x1b[32mstudent@kali\x1b[0m:\x1b[34m~\x1b[0m$ "}),
    )

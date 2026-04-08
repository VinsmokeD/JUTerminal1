import asyncio
import json
import threading
import socket

try:
    import docker
    _docker_available = True
except ImportError:
    _docker_available = False

from src.config import settings
from src.cache.redis import _get as get_redis_client, lpush_capped, publish

# Track active proxy threads to prevent duplicates per session
_active_sessions = set()
_active_sessions_lock = threading.Lock()


async def send_terminal_input(session_id: str, data: str) -> None:
    """
    Forward input from the WebSocket to the container's exec stream.
    Published on a Redis channel; the terminal thread picks it up.
    """
    await publish(f"terminal:{session_id}:input", {"data": data})


async def stream_terminal_output(session_id: str, container_id: str) -> None:
    """
    Read output from the Docker exec stream and publish to Redis so the
    WebSocket handler can forward it to the browser.
    
    This function creates a background thread to handle synchronous Docker I/O.
    """
    if container_id.startswith("mock-"):
        await _mock_stream(session_id)
        return

    with _active_sessions_lock:
        if session_id in _active_sessions:
            return
        _active_sessions.add(session_id)

    # Run the blocking terminal handler in a background thread
    threading.Thread(
        target=_terminal_proxy_thread,
        args=(session_id, container_id),
        daemon=True
    ).start()


def _terminal_proxy_thread(session_id: str, container_id: str) -> None:
    """Thread-based duplex proxy for Docker exec stream."""
    try:
        client = docker.from_env()
        container = client.containers.get(container_id)
        
        # Create exec instance
        exec_id = client.api.exec_create(
            container.id,
            ["/bin/bash"],
            stdin=True,
            tty=True,
            environment={"TERM": "xterm-256color"},
        )
        
        # Start exec and get socket
        sock = client.api.exec_start(exec_id, socket=True, tty=True)
        # sock is a docker.types.daemon.CancellableStream or similar
        # its ._sock is the raw socket
        raw_sock = sock._sock
        raw_sock.setblocking(False)

        # We need a new event loop for this thread to handle Redis async bits
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        redis = get_redis_client()

        async def _read_docker_to_redis():
            while True:
                try:
                    data = await loop.sock_recv(raw_sock, 4096)
                    if not data:
                        break
                    chunk = data.decode("utf-8", errors="replace")
                    await redis.publish(
                        f"terminal:{session_id}:output",
                        json.dumps({"data": chunk})
                    )
                    await lpush_capped(f"terminal:{session_id}:history", chunk, max_len=500)
                except (OSError, socket.error):
                    break

        async def _read_redis_to_docker():
            pubsub = redis.pubsub()
            await pubsub.subscribe(f"terminal:{session_id}:input")
            async for message in pubsub.listen():
                if message["type"] == "message":
                    payload = json.loads(message["data"])
                    input_data = payload.get("data", "")
                    if input_data:
                        try:
                            await loop.sock_sendall(raw_sock, input_data.encode("utf-8"))
                        except (OSError, socket.error):
                            break
            await pubsub.unsubscribe()

        # Run both directions
        loop.run_until_complete(asyncio.gather(
            _read_docker_to_redis(),
            _read_redis_to_docker()
        ))

    except Exception as e:
        if settings.ENVIRONMENT == "development":
            print(f"[Terminal] Duplex proxy error: {e}")
    finally:
        with _active_sessions_lock:
            if session_id in _active_sessions:
                _active_sessions.remove(session_id)
        try:
            sock.close()
        except:
            pass


async def _mock_stream(session_id: str) -> None:
    """Emit a fake shell prompt in dev when Docker isn't available."""
    redis = get_redis_client()
    await redis.publish(
        f"terminal:{session_id}:output",
        json.dumps({"data": "\r\n\x1b[32mstudent@kali\x1b[0m:\x1b[34m~\x1b[0m$ "}),
    )

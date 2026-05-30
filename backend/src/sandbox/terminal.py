"""
Terminal proxy: bidirectional bridge between the Docker exec stream and Redis channels.

Uses SYNCHRONOUS Redis (redis.Redis) inside background threads to avoid the
cross-event-loop issue that arises when the singleton aioredis.Redis client
(created on the main FastAPI loop) is awaited from a thread-local loop.

Data flow:
  Browser → WS → Redis PUBLISH terminal:{id}:input
                                   ↓
                      _redis_to_docker thread reads & sends to Docker exec socket
  Docker exec socket → _docker_to_redis thread → Redis PUBLISH terminal:{id}:output
                                                                  ↓
                                           WS handler → browser xterm.js
"""

from __future__ import annotations

import json
import queue
import select as _select
import threading
import logging

logger = logging.getLogger(__name__)

try:
    import docker
    from docker.errors import NotFound, DockerException, APIError

    _docker_available = True
except ImportError:
    _docker_available = False

    class DockerException(Exception):
        pass

    class APIError(Exception):
        pass

    class NotFound(Exception):
        pass


import redis as sync_redis  # synchronous client, part of redis[hiredis] already installed

from src.config import settings
from src.cache.redis import _get as get_async_redis
from src.scenarios.loader import load_scenario

# Track active proxy threads — prevent duplicate sessions
_active_sessions: set[str] = set()
_active_input_queues: dict[str, "queue.Queue[str]"] = {}
_active_output_queues: dict[str, list["queue.Queue[str]"]] = {}
_pending_input_buffers: dict[str, list[str]] = {}
_active_sessions_lock = threading.Lock()


# ---------------------------------------------------------------------------
# Public async API (called from ws/routes.py — main event loop)
# ---------------------------------------------------------------------------


async def send_terminal_input(session_id: str, data: str) -> None:
    """Forward keyboard input to the active Docker PTY with Redis as fallback."""
    with _active_sessions_lock:
        input_queue = _active_input_queues.get(session_id)

    if input_queue is not None:
        try:
            input_queue.put_nowait(data)
            return
        except queue.Full:
            pass
    else:
        with _active_sessions_lock:
            pending = _pending_input_buffers.setdefault(session_id, [])
            pending.append(data)
            del pending[:-500]

    redis = get_async_redis()
    await redis.publish(f"terminal:{session_id}:input", json.dumps({"data": data}))


async def stream_terminal_output(
    session_id: str, container_id: str, scenario_id: str = "SC-01"
) -> None:
    """
    Start a background thread that proxies Docker exec <-> Redis.
    Idempotent — subsequent calls for the same session_id are no-ops.
    Falls back to an interactive mock terminal when Docker is unavailable.
    """
    if container_id.startswith("mock-"):
        raise RuntimeError(
            "Strict mode enabled: Mock terminals are no longer supported. Docker targets only."
        )

    with _active_sessions_lock:
        if session_id in _active_sessions:
            return  # Already running
        _active_sessions.add(session_id)

    threading.Thread(
        target=_terminal_proxy_thread,
        args=(session_id, container_id, scenario_id),
        daemon=True,
        name=f"terminal-proxy-{session_id[:8]}",
    ).start()


def register_terminal_output_listener(session_id: str) -> "queue.Queue[str]":
    """Register a live terminal-output queue for one WebSocket consumer."""
    output_queue: "queue.Queue[str]" = queue.Queue(maxsize=1000)
    with _active_sessions_lock:
        _active_output_queues.setdefault(session_id, []).append(output_queue)
    return output_queue


def unregister_terminal_output_listener(session_id: str, output_queue: "queue.Queue[str]") -> None:
    """Remove a live terminal-output queue registered by a WebSocket consumer."""
    with _active_sessions_lock:
        queues = _active_output_queues.get(session_id)
        if not queues:
            return
        try:
            queues.remove(output_queue)
        except ValueError:
            pass
        if not queues:
            _active_output_queues.pop(session_id, None)


# ---------------------------------------------------------------------------
# Sync helpers used inside background threads
# ---------------------------------------------------------------------------


def _make_sync_redis() -> sync_redis.Redis:
    """Open a fresh synchronous Redis connection for use in a background thread."""
    return sync_redis.from_url(settings.REDIS_URL, decode_responses=True)


def _fanout_terminal_output(session_id: str, data: str) -> None:
    """Push terminal output directly to active WebSocket listener queues."""
    with _active_sessions_lock:
        queues = list(_active_output_queues.get(session_id, []))

    for output_queue in queues:
        try:
            output_queue.put_nowait(data)
        except queue.Full:
            try:
                output_queue.get_nowait()
            except queue.Empty:
                pass
            try:
                output_queue.put_nowait(data)
            except queue.Full:
                pass


def _terminal_proxy_thread(session_id: str, container_id: str, scenario_id: str = "SC-01") -> None:
    """
    Background thread: duplex proxy between Docker exec PTY and Redis channels.

    Two child threads are spawned:
      _docker_to_redis — reads Docker socket, publishes to terminal:{id}:output
      _redis_to_docker  — subscribes to terminal:{id}:input, writes to Docker socket

    The parent thread blocks on stop_event and then cleans up.
    """
    exec_sock = None
    raw_sock = None
    input_queue: "queue.Queue[str]" = queue.Queue(maxsize=10000)
    stop_event = threading.Event()

    try:
        if not _docker_available:
            raise RuntimeError("docker SDK not installed")

        client = docker.from_env()
        container = client.containers.get(container_id)

        exec_id = client.api.exec_create(
            container.id,
            ["/bin/bash"],
            stdin=True,
            tty=True,
            environment={"TERM": "xterm-256color"},
        )

        exec_sock = client.api.exec_start(exec_id, socket=True, tty=True)
        # docker-py CancellableStream exposes the raw socket via ._sock
        raw_sock = exec_sock._sock
        raw_sock.setblocking(True)
        with _active_sessions_lock:
            _active_input_queues[session_id] = input_queue
            pending_inputs = _pending_input_buffers.pop(session_id, [])
        for pending_text in pending_inputs:
            try:
                input_queue.put_nowait(pending_text)
            except queue.Full:
                break

        # Send scenario banner on first connect so student sees targets immediately
        r_init = _make_sync_redis()
        banner = _build_banner(scenario_id) if scenario_id else ""
        if banner:
            pipe = r_init.pipeline()
            pipe.lpush(f"terminal:{session_id}:history", banner)
            pipe.ltrim(f"terminal:{session_id}:history", 0, 499)
            pipe.expire(f"terminal:{session_id}:history", 86400)
            pipe.execute()
            r_init.publish(f"terminal:{session_id}:output", json.dumps({"data": banner}))
            _fanout_terminal_output(session_id, banner)
        r_init.close()

        # ── Thread A: Docker stdout → Redis publish ──────────────────────
        def _docker_to_redis() -> None:
            r = _make_sync_redis()
            max_chunk_size = 4096  # Max bytes per WebSocket frame
            while not stop_event.is_set():
                try:
                    # 1-second select timeout lets us honour stop_event promptly
                    ready, _, _ = _select.select([raw_sock], [], [], 1.0)
                    if not ready:
                        continue
                    data = raw_sock.recv(65536)  # Increased from 4096 to reduce publish calls
                    if not data:
                        break
                    chunk = data.decode("utf-8", errors="replace")

                    # Split into ≤4KB frames to prevent overwhelming frontend
                    for i in range(0, len(chunk), max_chunk_size):
                        frame = chunk[i : i + max_chunk_size]
                        r.publish(f"terminal:{session_id}:output", json.dumps({"data": frame}))
                        _fanout_terminal_output(session_id, frame)

                    # Rolling history (capped at 500 entries) for reconnect replay
                    pipe = r.pipeline()
                    pipe.lpush(f"terminal:{session_id}:history", chunk)
                    pipe.ltrim(f"terminal:{session_id}:history", 0, 499)
                    pipe.expire(f"terminal:{session_id}:history", 86400)
                    pipe.execute()
                except (OSError, sync_redis.RedisError, ValueError) as exc:
                    logger.warning(
                        f"[Terminal] Docker->Redis proxy error for session {session_id}: {exc}"
                    )
                    break
            stop_event.set()  # Signal the sibling thread to exit too

        # ── Thread B: Redis subscribe → Docker stdin ─────────────────────
        def _queue_to_docker() -> None:
            while not stop_event.is_set():
                try:
                    text = input_queue.get(timeout=0.5)
                except queue.Empty:
                    continue
                try:
                    if text:
                        raw_sock.sendall(text.encode("utf-8"))
                except OSError as exc:
                    logger.warning(
                        f"[Terminal] Queue->Docker proxy error for session {session_id}: {exc}"
                    )
                    stop_event.set()
                    break
                finally:
                    try:
                        input_queue.task_done()
                    except ValueError:
                        pass

        def _redis_to_queue() -> None:
            r = _make_sync_redis()
            pub = r.pubsub(ignore_subscribe_messages=True)
            pub.subscribe(f"terminal:{session_id}:input")
            try:
                for message in pub.listen():
                    if stop_event.is_set():
                        break
                    if message and message.get("type") == "message":
                        try:
                            payload = json.loads(message["data"])
                            text = payload.get("data", "")
                            if text:
                                try:
                                    input_queue.put_nowait(text)
                                except queue.Full:
                                    pass
                        except (json.JSONDecodeError, KeyError, TypeError) as exc:
                            logger.warning(
                                f"[Terminal] Redis message parse error for session {session_id}: {exc}"
                            )
                            break
            finally:
                try:
                    pub.unsubscribe()
                    pub.close()
                except sync_redis.RedisError as exc:
                    logger.debug(
                        f"[Terminal] Redis unsubscribe error for session {session_id}: {exc}"
                    )
            stop_event.set()

        read_thread = threading.Thread(target=_docker_to_redis, daemon=True)
        write_thread = threading.Thread(target=_queue_to_docker, daemon=True)
        redis_fallback_thread = threading.Thread(target=_redis_to_queue, daemon=True)
        read_thread.start()
        write_thread.start()
        redis_fallback_thread.start()

        stop_event.wait()  # Block until one side exits, then clean up

    except (
        DockerException,
        APIError,
        NotFound,
        OSError,
        sync_redis.RedisError,
        RuntimeError,
    ) as exc:
        logger.error(
            f"[Terminal] Proxy error for session {session_id}, container {container_id}: {exc}"
        )
        if settings.ENVIRONMENT == "development":
            print(f"[Terminal] Proxy error for session {session_id[:8]}: {exc}")
    finally:
        stop_event.set()
        with _active_sessions_lock:
            _active_sessions.discard(session_id)
            if _active_input_queues.get(session_id) is input_queue:
                _active_input_queues.pop(session_id, None)
        try:
            if exec_sock is not None:
                exec_sock.close()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Mock stream (dev without Docker)
# ---------------------------------------------------------------------------


def _build_banner(scenario_id: str) -> str:
    try:
        spec = load_scenario(scenario_id)
    except Exception:
        return ""
    net_raw = spec.get("network", {}) or {}
    if isinstance(net_raw, str):
        net = {"cidr": net_raw, "hosts": spec.get("containers", [])}
    else:
        net = net_raw
    domain = spec.get("domain", {}) or {}
    creds = spec.get("credentials_initial", {}) or {}
    objs = spec.get("objectives", {}) or {}
    tools = spec.get("tools_expected", []) or []

    lines = [
        "",
        "\x1b[1;34m" + "=" * 68 + "\x1b[0m",
        f"\x1b[1;37m  CyberSim Training - \x1b[1;31m{spec.get('display_name') or spec.get('title') or scenario_id}\x1b[0m",
        "\x1b[1;34m" + "=" * 68 + "\x1b[0m",
        "",
        f"\x1b[1;33m  NETWORK:\x1b[0m  {net.get('cidr','')}",
        "\x1b[1;33m  TARGETS:\x1b[0m",
    ]
    for host in net.get("hosts", []):
        lines.append(
            f"    \x1b[1;32m{host.get('ip',''):<18}\x1b[0;36m{host.get('fqdn','')} - {host.get('role','')}\x1b[0m"
        )
    if domain.get("fqdn"):
        lines.append(f"\x1b[1;33m  DOMAIN:\x1b[0m   {domain['fqdn']}")
    if creds.get("user"):
        lines.append(
            f"\x1b[1;33m  CREDS:\x1b[0m    {creds['user']} : {creds.get('password','')}  ({creds.get('note','')})"
        )
    lines.append("")
    red_list = objs.get("red") or []
    blue_list = objs.get("blue") or []
    if red_list:
        lines.append(f"\x1b[1;31m  RED OBJECTIVE:\x1b[0m  {', '.join(red_list)}")
    if blue_list:
        lines.append(f"\x1b[1;36m  BLUE OBJECTIVE:\x1b[0m {', '.join(blue_list)}")
    lines.append("")
    lines.append("\x1b[1;34m" + "-" * 68 + "\x1b[0m")
    if tools:
        tool_str = ", ".join(tools[:8])
        lines.append(f"\x1b[0;33m  Tools available: {tool_str}\x1b[0m")
    lines.append("\x1b[1;34m" + "-" * 68 + "\x1b[0m")
    lines.append("")
    return "\r\n".join(lines)

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
import select as _select
import threading

try:
    import docker
    _docker_available = True
except ImportError:
    _docker_available = False

import redis as sync_redis  # synchronous client, part of redis[hiredis] already installed

from src.config import settings
from src.cache.redis import _get as get_async_redis

# Track active proxy threads — prevent duplicate sessions
_active_sessions: set[str] = set()
_active_sessions_lock = threading.Lock()


# ---------------------------------------------------------------------------
# Public async API (called from ws/routes.py — main event loop)
# ---------------------------------------------------------------------------

async def send_terminal_input(session_id: str, data: str) -> None:
    """Publish keyboard input to Redis so the proxy thread can forward it to Docker."""
    redis = get_async_redis()
    await redis.publish(f"terminal:{session_id}:input", json.dumps({"data": data}))


async def stream_terminal_output(session_id: str, container_id: str, scenario_id: str = "SC-01") -> None:
    """
    Start a background thread that proxies Docker exec <-> Redis.
    Idempotent — subsequent calls for the same session_id are no-ops.
    Falls back to an interactive mock terminal when Docker is unavailable.
    """
    if container_id.startswith("mock-"):
        raise RuntimeError("Strict mode enabled: Mock terminals are no longer supported. Docker targets only.")


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


# ---------------------------------------------------------------------------
# Sync helpers used inside background threads
# ---------------------------------------------------------------------------

def _make_sync_redis() -> sync_redis.Redis:
    """Open a fresh synchronous Redis connection for use in a background thread."""
    return sync_redis.from_url(settings.REDIS_URL, decode_responses=True)


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

        # Send scenario banner on first connect so student sees targets immediately
        r_init = _make_sync_redis()
        banner = _build_banner(scenario_id) if scenario_id else ""
        if banner:
            r_init.publish(f"terminal:{session_id}:output", json.dumps({"data": banner}))
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
                        frame = chunk[i:i+max_chunk_size]
                        r.publish(f"terminal:{session_id}:output", json.dumps({"data": frame}))

                    # Rolling history (capped at 500 entries) for reconnect replay
                    pipe = r.pipeline()
                    pipe.lpush(f"terminal:{session_id}:history", chunk)
                    pipe.ltrim(f"terminal:{session_id}:history", 0, 499)
                    pipe.execute()
                except Exception:
                    break
            stop_event.set()  # Signal the sibling thread to exit too

        # ── Thread B: Redis subscribe → Docker stdin ─────────────────────
        def _redis_to_docker() -> None:
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
                                raw_sock.sendall(text.encode("utf-8"))
                        except Exception:
                            break
            finally:
                try:
                    pub.unsubscribe()
                    pub.close()
                except Exception:
                    pass
            stop_event.set()

        read_thread = threading.Thread(target=_docker_to_redis, daemon=True)
        write_thread = threading.Thread(target=_redis_to_docker, daemon=True)
        read_thread.start()
        write_thread.start()

        stop_event.wait()  # Block until one side exits, then clean up

    except Exception as exc:
        if settings.ENVIRONMENT == "development":
            print(f"[Terminal] Proxy error for session {session_id[:8]}: {exc}")
    finally:
        stop_event.set()
        with _active_sessions_lock:
            _active_sessions.discard(session_id)
        try:
            if exec_sock is not None:
                exec_sock.close()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Mock stream (dev without Docker)
# ---------------------------------------------------------------------------

# Scenario target metadata used by both mock terminal and banner
SCENARIO_TARGETS: dict[str, dict] = {
    "SC-01": {
        "name": "NovaMed Healthcare",
        "network": "172.20.1.0/24",
        "targets": [
            ("172.20.1.20", "PHP/Apache webapp (NovaMed Patient Portal)"),
            ("172.20.1.21", "MySQL Database Server"),
            ("172.20.1.1", "ModSecurity WAF / Gateway"),
        ],
        "objective_red": "Achieve RCE via chained OWASP vulnerabilities (SQLi, LFI, File Upload)",
        "objective_blue": "Monitor WAF logs, triage alerts, write IR report",
        "domain": None,
    },
    "SC-02": {
        "name": "Nexora Financial",
        "network": "172.20.2.0/24",
        "targets": [
            ("172.20.2.20", "Samba4 Active Directory Domain Controller (nexora.local)"),
            ("172.20.2.40", "File Server — Finance + Public shares"),
        ],
        "objective_red": "Kerberoast svc_backup, crack hash, DCSync as Domain Admin",
        "objective_blue": "Detect Event 4769 RC4 downgrades, track lateral movement",
        "domain": "nexora.local",
        "creds": "jsmith : Password123",
    },
    "SC-03": {
        "name": "Orion Logistics",
        "network": "172.20.3.0/24",
        "targets": [
            ("172.20.3.40", "GoPhish (Phishing campaign management)"),
            ("172.20.3.20", "Postfix Mail Server"),
            ("172.20.3.30", "Simulated Windows endpoint"),
        ],
        "objective_red": "Craft phishing campaign, achieve callback from victim endpoint",
        "objective_blue": "Email header analysis, SPF/DKIM validation, detect macro execution",
        "domain": None,
    },
}


def _build_banner(scenario_id: str) -> str:
    """Build a Kali-style MOTD banner showing scenario targets and objectives."""
    info = SCENARIO_TARGETS.get(scenario_id.upper(), SCENARIO_TARGETS["SC-01"])
    lines = [
        "",
        "\x1b[1;34m" + "=" * 68 + "\x1b[0m",
        f"\x1b[1;37m  CyberSim Training Platform — \x1b[1;31m{info['name']}\x1b[0m",
        "\x1b[1;34m" + "=" * 68 + "\x1b[0m",
        "",
        f"\x1b[1;33m  NETWORK:\x1b[0m  {info['network']}",
        "\x1b[1;33m  TARGETS:\x1b[0m",
    ]
    for ip, desc in info["targets"]:
        lines.append(f"    \x1b[1;32m{ip:<18}\x1b[0;36m{desc}\x1b[0m")
    if info.get("domain"):
        lines.append(f"\x1b[1;33m  DOMAIN:\x1b[0m   {info['domain']}")
    if info.get("creds"):
        lines.append(f"\x1b[1;33m  CREDS:\x1b[0m    {info['creds']}")
    lines.append("")
    lines.append(f"\x1b[1;31m  RED OBJECTIVE:\x1b[0m  {info['objective_red']}")
    lines.append(f"\x1b[1;36m  BLUE OBJECTIVE:\x1b[0m {info['objective_blue']}")
    lines.append("")
    lines.append("\x1b[1;34m" + "-" * 68 + "\x1b[0m")
    lines.append("\x1b[0;33m  Type commands to interact. Tools: nmap, gobuster, sqlmap, etc.\x1b[0m")
    lines.append("\x1b[1;34m" + "-" * 68 + "\x1b[0m")
    lines.append("")
    return "\r\n".join(lines)




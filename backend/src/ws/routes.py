import asyncio
import json
import logging
import queue as thread_queue
import time
from typing import Any
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
from src.cache.redis import (
    cache_get,
    cache_set,
    cache_set_if_absent,
    lpush_capped,
    lrange,
    _get as get_redis_client,
)
from src.activity.service import record_activity
from src.scenarios.gatekeeper import check_command
from src.scenarios.loader import load_scenario
from src.scenarios.scope_enforcer import check_scope
from src.scenarios.hint_engine import _load_hints
from src.scenarios.engine import try_advance_phase, check_gate, GateBlock
from src.scenarios.output_patterns import scan_output_chunk, scan_flag_candidates
from src.scenarios.branching import (
    infer_active_branch,
    get_active_branch,
    get_branch_hint,
)
from src.siem.command_bridge import (
    create_command_siem_events,
    publish_command_siem_events,
)

_GATE_PENALTY = 5  # points deducted per blocked command
_HINT_PENALTIES = {
    "beginner": {1: 2, 2: 5, 3: 10},
    "intermediate": {1: 5, 2: 10, 3: 20},
    "experienced": {1: 10, 2: 20, 3: 40},
}
_ACTIVE_SESSIONS_KEY = "parallax:active_sessions"  # Redis hash: session_id â†’ JSON session state

router = APIRouter()

_WS_CONNECTIONS_KEY = "parallax:ws_connections"


async def _increment_ws_counter() -> None:
    try:
        r = get_redis_client()
        await r.incr(_WS_CONNECTIONS_KEY)
    except Exception:
        pass


async def _decrement_ws_counter() -> None:
    try:
        r = get_redis_client()
        val = await r.decr(_WS_CONNECTIONS_KEY)
        if val < 0:
            await r.set(_WS_CONNECTIONS_KEY, 0)
    except Exception:
        pass


def _active_session_payload(session_state: dict[str, Any]) -> str:
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


def _bump_block_streak(session_state: dict[str, Any]) -> int:
    """Increment and return the count of consecutive gate/scope-blocked commands."""
    streak = session_state.get("_block_streak", 0) + 1
    session_state["_block_streak"] = streak
    return streak


def _extract_commands_from_raw(state: dict[str, Any], data: str) -> list[str]:
    """Reconstruct completed command lines from a raw PTY keystroke stream.

    The browser also sends a high-level ``terminal_command`` frame, but that path
    depends on fragile xterm screen-buffer scraping that can silently yield
    nothing — leaving the SIEM feed, AI tutor, discovery tracker and phase
    advancement with no signal. This server-side accumulator makes command
    capture deterministic: every Enter on a real keystroke stream produces the
    typed command, regardless of what the browser extracted.

    Handles backspace, Ctrl-C/-U/-W line editing and ANSI escape sequences
    (arrow keys etc.). Commands completed via Tab-completion are *tainted* and
    skipped here, because the resolved text only exists in the PTY echo, not the
    input stream — the browser screen-scrape path captures those accurately and
    the dedup window collapses any overlap.
    """
    out: list[str] = []
    buf: str = state.get("buf", "")
    esc: int = state.get("esc", 0)
    tainted: bool = state.get("tainted", False)

    for ch in data:
        o = ord(ch)
        if esc == 1:  # char right after ESC
            esc = 2 if ch in ("[", "O") else 0  # CSI/SS3 vs. 2-char escape
            continue
        if esc == 2:  # inside CSI/SS3 — consume until final byte
            if 0x40 <= o <= 0x7E:
                esc = 0
            continue
        if ch == "\x1b":
            esc = 1
            continue
        if ch in ("\r", "\n"):
            cmd = buf.strip()
            if cmd and not tainted:
                out.append(cmd)
            buf = ""
            tainted = False
            continue
        if ch in ("\x7f", "\x08"):  # DEL / Backspace
            buf = buf[:-1]
            continue
        if ch == "\x03":  # Ctrl-C — command aborted
            buf = ""
            tainted = False
            continue
        if ch == "\x15":  # Ctrl-U — clear line
            buf = ""
            continue
        if ch == "\x17":  # Ctrl-W — delete previous word
            stripped = buf.rstrip()
            buf = stripped[: stripped.rfind(" ") + 1] if " " in stripped else ""
            continue
        if ch == "\t":  # Tab completion can't be resolved from input alone
            tainted = True
            continue
        if o >= 0x20:  # printable
            buf += ch
        # other control chars ignored

    state["buf"] = buf[-4096:]
    state["esc"] = esc
    state["tainted"] = tainted
    return out


async def _proactive_activity_nudge(
    session_id: str, session_state: dict[str, Any], signal: str, send_json
) -> None:
    """Observe student activity and proactively reply when they appear stuck.

    Cost-free, deterministic guidance so the monitor reacts to behaviour even
    when no hint was requested. Rate-limited to one nudge per 45s per session so
    it never competes with the AI tutor or spams the panel.
    """
    if not await cache_set_if_absent(f"ai:{session_id}:proactive_cooldown", "1", ttl=45):
        return
    if signal == "repeat":
        text = (
            "I notice you're repeating the same command. If the output isn't changing, the "
            "problem is usually the arguments, the target address, or a prerequisite step you "
            "haven't done yet. Ask yourself what a successful result would actually look like, "
            "change one variable at a time, or request a hint."
        )
    elif signal == "blocked":
        text = (
            "Several commands in a row were blocked by the methodology gate. That means this "
            "phase expects different work first. Review what evidence the current phase asks for, "
            "document what you've already found, then continue — or request a hint to see which "
            "step unlocks the next phase."
        )
    elif signal == "idle":
        text = (
            "You've paused for a while. Re-read your last output and your notes: what is the next "
            "question you need to answer, and which tool would answer it? Request a hint if you're stuck."
        )
    else:
        return
    await send_json(
        {
            "type": "ai_hint",
            "data": {"text": text, "level": 0, "source": "activity_monitor"},
        }
    )


async def _handle_terminal_command(
    session_id: str, session_state: dict[str, Any], command: str, send_json
) -> None:
    """Process complete commands without blocking raw PTY keystrokes."""
    if not command.strip():
        return

    # â”€â”€ Activity monitoring: detect repeated identical commands (a stuck signal) â”€
    recent_cmds: list[str] = session_state.setdefault("_recent_cmds", [])
    recent_cmds.append(command.strip())
    del recent_cmds[:-4]  # keep only the last 4
    if len(recent_cmds) >= 3 and recent_cmds[-1] == recent_cmds[-2] == recent_cmds[-3]:
        await _proactive_activity_nudge(session_id, session_state, "repeat", send_json)

    # â”€â”€ ROE gate: backend hard-check before any processing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async with AsyncSessionLocal() as db:
        roe_result = await db.execute(select(Session).where(Session.id == session_id))
        roe_session = roe_result.scalar_one_or_none()
        if roe_session is None or not roe_session.roe_acknowledged:
            await send_json(
                {
                    "type": "error",
                    "data": {"message": "ROE acknowledgment required before issuing commands."},
                }
            )
            return

    current_phase: int = session_state["phase"]
    try:
        spec = load_scenario(session_state["scenario_id"])
        phases = spec.get("phases", {})
        phase_spec = phases.get(current_phase, phases.get(str(current_phase), {}))
        ptes_phase = phase_spec.get("ptes_phase", "")
    except (WebSocketDisconnect, RuntimeError):
        ptes_phase = ""

    # â”€â”€ ROE scope gate: block explicit out-of-scope targets (fail-open) â”€â”€â”€â”€â”€â”€â”€
    try:
        scope_result = check_scope(command, load_scenario(session_state["scenario_id"]))
    except Exception:
        scope_result = None  # never let a scope-check error drop a command
    if scope_result is not None and scope_result.blocked:
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
            db.add(
                CommandLog(
                    session_id=session_id,
                    command=f"[scope_blocked] {command}",
                    tool=f"scope_block:{scope_result.target}",
                    phase=current_phase,
                    triggered_siem_events=[],
                )
            )
            await record_activity(
                db,
                session_state["user_id"],
                "scope_block",
                session_id,
                {
                    "command": command,
                    "phase": current_phase,
                    "target": scope_result.target,
                },
            )
            await db.commit()
        warn = (
            f"\r\n\x1b[31m[OUT OF SCOPE] {scope_result.message}\x1b[0m"
            f"\r\n\x1b[33m[-{_GATE_PENALTY} pts â€” ROE violation]\x1b[0m\r\n"
        )
        await send_json({"type": "terminal_output", "data": {"data": warn}})
        if new_score is not None:
            await send_json({"type": "score_update", "data": {"score": new_score}})
        if _bump_block_streak(session_state) >= 3:
            await _proactive_activity_nudge(session_id, session_state, "blocked", send_json)
        return

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
                db.add(
                    CommandLog(
                        session_id=session_id,
                        command=f"[gate_blocked] {command}",
                        tool=f"gate_block:{blocked_tool}",
                        phase=current_phase,
                        triggered_siem_events=[],
                    )
                )
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
                f"\r\n\x1b[33m[-{_GATE_PENALTY} pts â€” methodology violation]\x1b[0m\r\n"
            )
            await send_json({"type": "terminal_output", "data": {"data": warn}})
            if new_score is not None:
                await send_json({"type": "score_update", "data": {"score": new_score}})
            if _bump_block_streak(session_state) >= 3:
                await _proactive_activity_nudge(session_id, session_state, "blocked", send_json)
            return

    try:
        async with AsyncSessionLocal() as db:
            await check_gate(command, session_id, session_state["scenario_id"], db)
    except GateBlock as gate_exc:
        new_score = None
        from src.scenarios.gatekeeper import _parse_tool as _gt

        blocked_tool = _gt(command)
        generated_siem_events: list[dict] = []
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                update(Session)
                .where(Session.id == session_id)
                .values(score=Session.score - _GATE_PENALTY)
                .returning(Session.score)
            )
            row = result.fetchone()
            new_score = row[0] if row else None
            cmd_row = CommandLog(
                session_id=session_id,
                command=f"[gate_blocked] {command}",
                tool=f"gate_block:{blocked_tool}",
                phase=current_phase,
                triggered_siem_events=[],
            )
            db.add(cmd_row)
            await db.flush()
            generated_siem_events = await create_command_siem_events(
                command,
                session_id,
                session_state["scenario_id"],
                db,
            )
            if generated_siem_events:
                await db.execute(
                    update(CommandLog)
                    .where(CommandLog.id == cmd_row.id)
                    .values(triggered_siem_events=[event["id"] for event in generated_siem_events])
                )
            await record_activity(
                db,
                session_state["user_id"],
                "gate_block",
                session_id,
                {"command": command, "phase": current_phase, "tool": blocked_tool},
            )
            await db.commit()
        if generated_siem_events:
            await publish_command_siem_events(session_id, generated_siem_events)

        warn = (
            f"\r\n\x1b[31m[GATE BLOCKED] {gate_exc.message}\x1b[0m"
            f"\r\n\x1b[33m[-{_GATE_PENALTY} pts â€” methodology violation]\x1b[0m\r\n"
        )
        await send_json({"type": "terminal_output", "data": {"data": warn}})
        if new_score is not None:
            await send_json({"type": "score_update", "data": {"score": new_score}})
        if _bump_block_streak(session_state) >= 3:
            await _proactive_activity_nudge(session_id, session_state, "blocked", send_json)
        return

    from src.scenarios.gatekeeper import _parse_tool as _gt

    # Command passed every gate — clear the consecutive-block streak.
    session_state["_block_streak"] = 0

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

    generated_siem_events = []
    async with AsyncSessionLocal() as db:
        generated_siem_events = await create_command_siem_events(
            command,
            session_id,
            session_state["scenario_id"],
            db,
        )
        if generated_siem_events and cmd_log_id is not None:
            await db.execute(
                update(CommandLog)
                .where(CommandLog.id == cmd_log_id)
                .values(triggered_siem_events=[event["id"] for event in generated_siem_events])
            )
        await db.commit()
    if generated_siem_events:
        logging.getLogger("src.ws.routes").info(
            f"[WS Command] Publishing {len(generated_siem_events)} SIEM events to channel: siem:{session_id}:feed"
        )
        await publish_command_siem_events(session_id, generated_siem_events)

    await lpush_capped(f"session:{session_id}:commands", command, max_len=50)
    await cache_set(f"session:{session_id}:last_cmd_time", str(time.time()), ttl=7200)

    recent_output = await lrange(f"terminal:{session_id}:history", 0, 2)
    output_text = " ".join(str(c) for c in recent_output if c) if recent_output else ""
    discoveries = await track_discovery(
        session_id, command, output_text, session_state["scenario_id"]
    )

    if any(discoveries.values()):
        await send_json(
            {
                "type": "auto_evidence",
                "data": {
                    "command": command,
                    "discoveries": discoveries,
                    "tool": tool_name or (command.strip().split()[0] if command.strip() else ""),
                },
            }
        )

    ai_hint = await get_ai_hint(session_id, session_state, command, None)
    if ai_hint:
        await send_json({"type": "ai_hint", "data": {"text": ai_hint}})
        if cmd_log_id is not None:
            async with AsyncSessionLocal() as db:
                await db.execute(
                    update(CommandLog).where(CommandLog.id == cmd_log_id).values(ai_hint_given=True)
                )
                await db.commit()

    async with AsyncSessionLocal() as db:
        new_phase = await try_advance_phase(session_id, session_state["scenario_id"], db)
    if new_phase != session_state["phase"]:
        old_phase = session_state["phase"]
        session_state["phase"] = new_phase
        # Log the phase advance as a special activity entry
        async with AsyncSessionLocal() as db:
            db.add(
                CommandLog(
                    session_id=session_id,
                    command=f"[phase_advance] {old_phase} â†’ {new_phase}",
                    tool="phase:advance",
                    phase=new_phase,
                    triggered_siem_events=[],
                )
            )
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
    await _increment_ws_counter()

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
        session_state: dict[str, Any] = {
            "scenario_id": session.scenario_id,
            "user_id": user_id,
            "role": session.role,
            "phase": session.phase,
            "methodology": session.methodology,
            "container_id": session.container_id,
            "skill_level": session.user.skill_level,
        }

    # Print a simulated boot greeting into the terminal on initial connection.
    greeting = (
        "\r\n\x1b[32m"
        "======================================================\r\n"
        "      Parallax Secure Sandbox PTY Terminal v2.0       \r\n"
        "======================================================\r\n"
        "[*] Booting Kali pentest environment...\r\n"
        "[*] Initializing network security interfaces...\r\n"
        "[*] Socratic AI monitor active.\r\n"
        "======================================================\x1b[0m\r\n\r\n"
    )
    await websocket.send_json({"type": "terminal_output", "data": {"data": greeting}})

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

    # Trigger seed-based randomization side-effects (NAT rules + flag injection)
    # asynchronously so WS connection is not delayed.
    if container_id and not container_id.startswith("mock-"):

        async def _apply_rand() -> None:
            try:
                async with AsyncSessionLocal() as _db:
                    from sqlalchemy import select as _sel

                    _r = await _db.execute(_sel(Session).where(Session.id == session_id))
                    _s = _r.scalar_one_or_none()
                    _meta = _s.session_metadata if _s else {}
                if _meta:
                    from src.scenarios.randomizer import apply_randomization

                    await apply_randomization(
                        session_id, session_state["scenario_id"], _meta, container_id
                    )
            except Exception as _exc:

                logging.getLogger(__name__).warning("[WS] Randomization apply failed: %s", _exc)

        asyncio.create_task(_apply_rand())

    # Register direct terminal output before launching the PTY proxy so live
    # frames do not depend on Redis pub/sub delivery.
    terminal_output_queue = register_terminal_output_listener(session_id)

    # Start streaming terminal output from Docker to Redis/direct listeners (idempotent thread launch)
    await stream_terminal_output(session_id, container_id, session_state["scenario_id"])

    # Replay persisted history so browser refresh restores terminal context immediately.
    await _send_reconnect_history(websocket, session_id)

    # Register session as active for noise daemon targeting ONLY when a real
    # container is running â€” prevents spurious SIEM noise when Docker is unavailable.
    redis = get_redis_client()
    has_real_container = bool(
        session_state["container_id"] and not session_state["container_id"].startswith("mock-")
    )
    if has_real_container:
        await redis.hset(_ACTIVE_SESSIONS_KEY, session_id, _active_session_payload(session_state))  # type: ignore[misc]  # redis-py overloads return Awaitable|int
        await redis.set(f"parallax:session:{session_id}:alive", "1", ex=7200)

    # Subscribe to SIEM channels via Redis pub/sub. Terminal output is delivered
    # through the direct listener queue and still persisted to Redis for refresh.
    pubsub = redis.pubsub()
    logging.getLogger("src.ws.routes").info(
        f"[WS Connect] Subscribing to SIEM channel: siem:{session_id}:feed"
    )
    await pubsub.subscribe(f"siem:{session_id}:feed")
    send_lock = asyncio.Lock()
    command_queue: asyncio.Queue[str] = asyncio.Queue(maxsize=50)
    # Per-connection accumulator for server-side command reconstruction from the
    # raw PTY keystroke stream (authoritative, browser-extraction independent).
    raw_cmd_state: dict[str, Any] = {"buf": "", "esc": 0, "tainted": False}

    # If a real Kali container is already attached, unblock terminal input immediately.
    # The full readiness_checker still runs in background and updates the frontend overlay
    # with detailed checks. This prevents the 5-15s window where all keystrokes were
    # silently dropped while target-container port probes ran.
    readiness_status = (
        "ready" if (container_id and not container_id.startswith("mock-")) else "initializing"
    )
    force_unlocked = False
    # Once a session has been ready (real container attached), keep input
    # unlocked. Transient target-port probe failures must never silently drop
    # the student's keystrokes/commands after they've started working.
    input_unlocked = readiness_status == "ready"

    async def _readiness_checker() -> None:
        nonlocal readiness_status, force_unlocked, input_unlocked
        from src.sandbox.readiness import get_session_readiness

        while True:
            try:
                # Query db to see if force_unlocked is set
                async with AsyncSessionLocal() as db:
                    sess_res = await db.execute(select(Session).where(Session.id == session_id))
                    sess = sess_res.scalar_one_or_none()
                    if sess:
                        meta = sess.session_metadata or {}
                        force_unlocked = meta.get("force_unlocked", False)

                if force_unlocked:
                    readiness_status = "ready"
                    input_unlocked = True
                    await _send_json(
                        {
                            "type": "readiness_update",
                            "session_id": session_id,
                            "status": "ready",
                            "force_unlocked": True,
                            "checks": {},
                        }
                    )
                else:
                    res = await get_session_readiness(session_id, session_state["scenario_id"])
                    readiness_status = res["status"]
                    if res["status"] == "ready":
                        input_unlocked = True  # latch — never re-lock after first ready
                    await _send_json(
                        {
                            "type": "readiness_update",
                            "session_id": session_id,
                            "status": res["status"],
                            "checks": res["checks"],
                        }
                    )
            except Exception as e:

                logging.getLogger(__name__).warning("[WS] Readiness check error: %s", e)
            await asyncio.sleep(5)

    async def _send_json(payload: dict) -> None:
        async with send_lock:
            await websocket.send_json(payload)

    async def _enqueue_command(command: str) -> None:
        """Queue a command for processing, collapsing the browser + server-side
        double-capture of the same Enter.

        Both the browser ``terminal_command`` frame and the server-side raw
        accumulator route through here. A short per-command Redis window dedups
        the near-simultaneous pair so each command is processed exactly once,
        while genuine re-runs seconds apart still flow through.
        """
        cmd = command.strip()
        if not cmd:
            return
        import hashlib

        digest = hashlib.sha1(cmd.encode("utf-8", "ignore")).hexdigest()[:16]
        try:
            fresh = await cache_set_if_absent(f"cmddedup:{session_id}:{digest}", "1", ttl=3)
        except Exception:
            fresh = True  # never drop a command because the dedup cache hiccuped
        if not fresh:
            return
        try:
            command_queue.put_nowait(cmd)
        except asyncio.QueueFull:
            await _send_json(
                {
                    "type": "terminal_output",
                    "data": {
                        "data": "\r\n\x1b[31m[terminal busy] Command queue is full. Wait for the current command to finish.\x1b[0m\r\n",
                    },
                }
            )

    async def _redis_to_ws() -> None:
        # IMPORTANT: the Redis client uses socket_timeout=5, so a blocking
        # ``pubsub.listen()`` raises a read-timeout after ~5s of silence and the
        # listener task would die — after which NO live SIEM event reaches the
        # browser until a full page refresh. Poll with a short per-call timeout
        # instead and treat idle timeouts as normal, so the listener stays alive
        # for the entire session and every event is delivered live.
        channel = f"siem:{session_id}:feed"
        while True:
            try:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                # Idle read-timeouts are expected; anything else: re-subscribe and
                # keep going rather than silently dropping the live feed.
                msg = str(exc).lower()
                if "timeout" not in msg:
                    logging.getLogger("src.ws.routes").warning(
                        f"[WS SIEM] listener recovering ({type(exc).__name__}: {exc})"
                    )
                    try:
                        await pubsub.subscribe(channel)
                    except Exception:
                        pass
                    await asyncio.sleep(0.5)
                continue
            if not message or message.get("type") != "message":
                continue
            try:
                data = message["data"]
                if isinstance(data, bytes):
                    data = data.decode("utf-8")
                # Handle double-encoded JSON if it somehow happens.
                payload = json.loads(data)
                if isinstance(payload, str):
                    payload = json.loads(payload)
                await _send_json({"type": "siem_event", "data": payload})
            except Exception as e:
                logging.getLogger("src.ws.routes").error(f"[WS SIEM] Error processing message: {e}")

    async def _terminal_output_to_ws() -> None:
        def _get_frame() -> str | None:
            try:
                return terminal_output_queue.get(timeout=0.5)
            except thread_queue.Empty:
                return None

        while True:
            try:
                frame = await asyncio.to_thread(_get_frame)
                if frame:
                    await _send_json({"type": "terminal_output", "data": {"data": frame}})
                    try:
                        for insight in await scan_output_chunk(
                            session_id,
                            session_state["scenario_id"],
                            frame,
                            session_state.get("phase"),
                        ):
                            await _send_json({"type": "output_insight", "data": insight})
                    except Exception as _scan_exc:
                        logging.getLogger(__name__).warning(
                            "[WS] scan_output_chunk error session %s: %s",
                            session_id[:8],
                            _scan_exc,
                        )
                    try:
                        for candidate in await scan_flag_candidates(
                            session_id,
                            session_state["scenario_id"],
                            frame,
                        ):
                            await _send_json({"type": "flag_candidate", "data": candidate})
                    except Exception as _flag_exc:
                        logging.getLogger(__name__).warning(
                            "[WS] scan_flag_candidates error session %s: %s",
                            session_id[:8],
                            _flag_exc,
                        )
            except Exception as _loop_exc:
                logging.getLogger(__name__).warning(
                    "[WS] terminal_output_to_ws error session %s: %s",
                    session_id[:8],
                    _loop_exc,
                )

    async def _command_worker() -> None:
        while True:
            command = await command_queue.get()
            try:
                await _handle_terminal_command(session_id, session_state, command, _send_json)
            except Exception as exc:
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
            # Activity monitoring: a long pause after the student has started is a
            # struggle signal. Nudge once per idle stretch (240s guard), gated by
            # the shared proactive cooldown so it never spams.
            try:
                last = await cache_get(f"session:{session_id}:last_cmd_time")
                if last and (time.time() - float(last)) > 180:
                    if await cache_set_if_absent(f"ai:{session_id}:idle_nudged", "1", ttl=240):
                        await _proactive_activity_nudge(
                            session_id, session_state, "idle", _send_json
                        )
            except Exception:
                pass

    async def _send_hint(level: int) -> None:
        hint_text = None
        hint_steps = None
        phase = session_state.get("phase", 1)
        role = session_state.get("role", "red")
        scenario = session_state["scenario_id"]
        active_branch = session_state.get("active_branch") or await get_active_branch(session_id)
        branch_id = active_branch.get("id") if active_branch else None

        # Hints already delivered this session, so repeated requests escalate to
        # the NEXT piece of guidance instead of replaying the same text.
        try:
            given_raw = await lrange(f"ai:{session_id}:hints_given", 0, 24)
        except Exception:
            given_raw = []
        given = {str(g).strip() for g in given_raw if g}

        hints_data = _load_hints(scenario)
        sc_hints = hints_data.get(scenario, {})
        role_hints = sc_hints.get(role, {})
        phase_hints = role_hints.get(str(phase), {})

        def _as_text(value) -> str:
            return "\n".join(value) if isinstance(value, list) else (value or "")

        # Escalating candidate pool: static L1â†’L3 interleaved with branch hints.
        candidates: list[tuple[str, list[str]]] = []
        for lvl in (1, 2, 3):
            static_hint = phase_hints.get(f"L{lvl}")
            if static_hint:
                steps = static_hint if isinstance(static_hint, list) else [static_hint]
                candidates.append((_as_text(static_hint).strip(), steps))
            branch_steps = get_branch_hint(scenario, role, phase, branch_id, lvl)
            if branch_steps:
                candidates.append(("\n".join(branch_steps).strip(), branch_steps))

        # Deliver the first candidate the student hasn't seen yet.
        for text, steps in candidates:
            if text and text not in given:
                hint_text = text
                hint_steps = steps
                break

        # Static/branch pool exhausted (or empty) â†’ ask the AI for a fresh,
        # non-repeating hint. build_ai_context feeds it the prior hints so it
        # advances the guidance rather than echoing it.
        if not hint_text:
            ai_hint = await get_ai_hint(session_id, session_state, None, level)
            if ai_hint and not ai_hint.lower().startswith("ai tutor is processing"):
                hint_text = ai_hint
                hint_steps = [ai_hint]

        # Record what we delivered so the next request advances.
        if hint_text:
            try:
                await lpush_capped(f"ai:{session_id}:hints_given", hint_text, max_len=24)
            except Exception:
                pass

        # â”€â”€ Log hint request + apply score penalty â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                db.add(
                    CommandLog(
                        session_id=session_id,
                        command=f"[hint_requested] L{level}",
                        tool=f"hint:L{level}",
                        phase=session_state.get("phase", 1),
                        triggered_siem_events=[],
                        ai_hint_given=True,
                    )
                )
                await record_activity(db, user_id, "hint_request", session_id, {"level": level})
                await db.commit()
        except Exception as _he:

            logging.getLogger(__name__).warning(
                "[WS] Hint logging failed for %s: %s", session_id[:8], _he
            )

        if new_score is not None:
            await _send_json(
                {
                    "type": "score_update",
                    "data": {
                        "score": new_score,
                        "delta": -penalty,
                        "reason": f"Hint L{level}: phase {session_state.get('phase', 1)}",
                    },
                }
            )

        if hint_text:
            await _send_json(
                {
                    "type": "ai_hint",
                    "data": {
                        "text": hint_text,
                        "steps": hint_steps,
                        "level": level,
                        "branch": active_branch,
                        "penalty": penalty,
                    },
                }
            )
        else:
            await _send_json(
                {
                    "type": "ai_hint",
                    "data": {
                        "text": "No hint available for this phase yet. Try progressing to the next step.",
                        "steps": [],
                        "level": level,
                    },
                }
            )

    readiness_task = asyncio.create_task(_readiness_checker())
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
            # can evict abandoned sessions from parallax:active_sessions hash.
            try:
                await redis.set(f"parallax:session:{session_id}:alive", "1", ex=7200)
            except (WebSocketDisconnect, RuntimeError):
                pass  # non-fatal; eviction will happen on next cleanup cycle

            if msg_type == "terminal_raw":
                # â”€â”€ Raw PTY passthrough: every keystroke â†’ Docker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                if not input_unlocked and not force_unlocked:
                    continue
                raw_data = msg.get("data", "")
                if raw_data:
                    await send_terminal_input(session_id, raw_data)
                    # Authoritative server-side command capture: reconstruct
                    # completed commands straight from the keystroke stream so
                    # SIEM/AI/discovery/phase signals never depend on fragile
                    # browser-side extraction.
                    for captured in _extract_commands_from_raw(raw_cmd_state, raw_data):
                        await _enqueue_command(captured)

            elif msg_type == "terminal_command":
                if not input_unlocked and not force_unlocked:
                    await _send_json(
                        {
                            "type": "terminal_output",
                            "data": {
                                "data": "\r\n\x1b[31m[BLOCKED] PTY console is initializing. Please wait for readiness checks to complete.\x1b[0m\r\n",
                            },
                        }
                    )
                    continue
                command = msg.get("data", "")
                if command.strip():
                    await _enqueue_command(command)

            elif msg_type == "tutor_question":
                try:
                    question_data = msg.get("data", {})
                    if isinstance(question_data, dict):
                        question = question_data.get("text", "")
                    elif isinstance(question_data, str):
                        question = question_data
                    else:
                        question = ""
                    question_text = question.strip() if isinstance(question, str) else ""
                    if not question_text or len(question_text) > 1000:
                        await _send_json(
                            {
                                "type": "ai_hint",
                                "data": {
                                    "text": "Ask a shorter question so the tutor can help safely.",
                                    "level": 0,
                                    "source": "validation_error",
                                },
                            }
                        )
                        continue

                    rate_key = f"ai:{session_id}:tutor:last_call"
                    if await cache_get(rate_key):
                        await _send_json(
                            {
                                "type": "ai_hint",
                                "data": {
                                    "text": "Wait a moment â€” the tutor is thinking. Try again in a few seconds.",
                                    "level": 0,
                                    "source": "rate_limit",
                                },
                            }
                        )
                        continue

                    await cache_set(rate_key, time.time(), ttl=10)
                    response_text = await get_ai_hint(
                        session_id=session_id,
                        session_state=session_state,
                        command=None,
                        hint_level=1,
                        question=question_text,
                    )
                    if response_text and not response_text.lower().startswith(
                        ("ai tutor is processing", "[offline tutor]")
                    ):
                        try:
                            await lpush_capped(
                                f"ai:{session_id}:hints_given",
                                response_text,
                                max_len=24,
                            )
                        except Exception:
                            pass
                    await _send_json(
                        {
                            "type": "ai_hint",
                            "data": {
                                "text": response_text
                                or "I couldn't generate a response. Try rephrasing.",
                                "level": 1,
                                "penalty": 5,
                                "source": "tutor_question",
                            },
                        }
                    )
                except Exception as exc:
                    logging.getLogger(__name__).warning(
                        "[tutor_question] session=%s error=%s: %s",
                        session_id[:8],
                        type(exc).__name__,
                        str(exc),
                    )
                    await _send_json(
                        {
                            "type": "ai_hint",
                            "data": {
                                "text": "The tutor is temporarily unavailable. Try again shortly.",
                                "level": 0,
                                "source": "tutor_error",
                            },
                        }
                    )
            elif msg_type == "terminal_input":
                # â”€â”€ Legacy: line-buffered input (mock terminal fallback) â”€â”€â”€â”€
                if not input_unlocked and not force_unlocked:
                    continue
                command = msg.get("data", "")
                if command:
                    await send_terminal_input(session_id, command)

            elif msg_type == "toggle_mode":
                new_mode = msg.get("mode", "learn")
                if new_mode in ("learn", "challenge"):
                    async with AsyncSessionLocal() as db:
                        await db.execute(
                            update(Session).where(Session.id == session_id).values(ai_mode=new_mode)
                        )
                        db.add(
                            CommandLog(
                                session_id=session_id,
                                command=f"[mode_changed] {new_mode}",
                                tool=f"mode:{new_mode}",
                                phase=session_state.get("phase", 1),
                                triggered_siem_events=[],
                            )
                        )
                        await record_activity(
                            db,
                            user_id,
                            "mode_toggle",
                            session_id,
                            {"mode": new_mode},
                        )
                        await db.commit()
                    session_state["ai_mode"] = new_mode
                    await _send_json(
                        {
                            "type": "mode_changed",
                            "data": {"mode": new_mode},
                        }
                    )

            elif msg_type == "request_hint":
                level = msg.get("level", 1)
                verbosity = msg.get("verbosity", "balanced")
                session_state["ai_verbosity"] = verbosity
                asyncio.create_task(_send_hint(int(level)))

    except WebSocketDisconnect:
        pass
    except Exception as exc:

        logging.getLogger(__name__).warning(
            "[WS] Unhandled error for session %s: %s", session_id[:8], exc
        )
    finally:
        readiness_task.cancel()
        redis_task.cancel()
        terminal_output_task.cancel()
        command_task.cancel()
        heartbeat_task.cancel()
        try:
            await pubsub.unsubscribe()
        except (WebSocketDisconnect, RuntimeError):
            pass
        try:
            await pubsub.reset()
        except (WebSocketDisconnect, RuntimeError):
            pass
        try:
            await redis.hdel(_ACTIVE_SESSIONS_KEY, session_id)  # type: ignore[misc]  # redis-py overloads return Awaitable|int
        except (WebSocketDisconnect, RuntimeError):
            pass
        try:
            await redis.delete(f"parallax:session:{session_id}:alive")
        except (WebSocketDisconnect, RuntimeError):
            pass
        unregister_terminal_output_listener(session_id, terminal_output_queue)
        await _decrement_ws_counter()

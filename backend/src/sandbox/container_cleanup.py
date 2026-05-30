"""
Container cleanup task: periodically removes idle Kali containers
that haven't had activity for 60+ minutes, plus an orphan sweep for
containers that survived a backend crash.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from docker import from_env as docker_from_env
from docker.errors import NotFound, APIError

from src.db.database import AsyncSessionLocal, Session, CommandLog

logger = logging.getLogger(__name__)

# Orphan threshold: containers older than this with no active session are removed
_ORPHAN_AGE_SECONDS = 7200  # 2 hours

# Docker client singleton
_docker_client = None


def _container_ids_from_active_sessions(active: dict) -> set[str]:
    """Extract full and short container IDs from Redis active-session JSON values."""
    ids: set[str] = set()
    for value in active.values():
        raw = value.decode() if isinstance(value, bytes) else str(value)
        try:
            payload = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            continue
        if not isinstance(payload, dict):
            continue
        container_id = payload.get("container_id")
        if not container_id or not isinstance(container_id, str):
            continue
        ids.add(container_id)
        ids.add(container_id[:12])
    return ids


def _container_age_seconds(container) -> float:
    """Return Docker container age in seconds, preserving containers on parse failure."""
    try:
        started_at_raw = container.attrs["State"]["StartedAt"]
        started_at_str = started_at_raw[:26].rstrip("Z") + "+00:00"
        started_at = datetime.fromisoformat(started_at_str)
        return (datetime.now(timezone.utc) - started_at).total_seconds()
    except (KeyError, IndexError, ValueError, TypeError) as e:
        logger.debug("[CLEANUP] Failed to parse container age: %s", e)
        return 0.0


def _get_docker_client():
    """Get or create Docker client."""
    global _docker_client
    if _docker_client is None:
        _docker_client = docker_from_env()
    return _docker_client


def _remove_container(container, reason: str) -> bool:
    """Best-effort stop/remove for a Docker container."""
    try:
        if getattr(container, "status", None) == "running":
            container.stop(timeout=5)
        container.remove(force=True)
        logger.info(
            "[CLEANUP] Removed container %s (%s): %s",
            getattr(container, "name", getattr(container, "id", "unknown")),
            getattr(container, "id", "")[:12],
            reason,
        )
        return True
    except NotFound:
        return True
    except APIError as exc:
        logger.warning(
            "[CLEANUP] Failed to remove container %s: %s",
            getattr(container, "id", "unknown"),
            exc,
        )
        return False


def _cleanup_orphans_sync(
    session_index: dict[str, str | None], completed_sessions: set[str]
) -> int:
    """Remove labeled Kali containers that no longer match an active DB session."""
    docker_client = _get_docker_client()
    containers = docker_client.containers.list(
        all=True,
        filters={"label": "cybersim_session"},
    )
    cleaned_count = 0

    for container in containers:
        labels = getattr(container, "labels", {}) or {}
        if labels.get("cybersim_role") != "kali":
            continue

        session_id = labels.get("cybersim_session")
        expected_container_id = session_index.get(session_id or "")
        reason = None

        if not session_id or session_id not in session_index:
            reason = "no matching database session"
        elif session_id in completed_sessions:
            reason = "session already completed"
        elif not expected_container_id:
            reason = "session has no active container pointer"
        elif expected_container_id != container.id:
            reason = "session points at a different container"

        if reason and reason != "session already completed":
            age_seconds = _container_age_seconds(container)
            if age_seconds < _ORPHAN_AGE_SECONDS:
                continue

        if reason and _remove_container(container, reason):
            cleaned_count += 1

    return cleaned_count


async def cleanup_orphaned_containers() -> int:
    """Remove labeled session containers that survived past their DB lifecycle."""
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Session))
            sessions = result.scalars().all()
            session_index = {str(session.id): session.container_id for session in sessions}
            completed_sessions = {
                str(session.id) for session in sessions if session.completed_at is not None
            }

        cleaned_count = await asyncio.to_thread(
            _cleanup_orphans_sync,
            session_index,
            completed_sessions,
        )
        if cleaned_count > 0:
            logger.info("[CLEANUP] Removed %s orphaned containers", cleaned_count)
        return cleaned_count
    except Exception as exc:
        logger.error("[CLEANUP] Error while removing orphaned containers: %s", exc)
        return 0


async def _cleanup_orphans(docker_client, active_container_ids: set[str]) -> int:
    """
    Stop and remove CyberSim Kali containers bearing `com.cybersim.role=kali`
    that are not tracked by any active session and are older than 2 hours.

    Uses the canonical label added in B7-2 (com.cybersim.role=kali) so the
    filter is independent of the legacy `cybersim_role` label.
    """
    removed = 0
    try:
        containers = await asyncio.to_thread(
            lambda: docker_client.containers.list(filters={"label": "com.cybersim.role=kali"})
        )
        for c in containers:
            short_id = c.id[:12]
            if short_id in active_container_ids or c.id in active_container_ids:
                continue  # actively tracked — leave it alone

            age_seconds = _container_age_seconds(c)

            if age_seconds < _ORPHAN_AGE_SECONDS:
                continue  # too young — might still be reconnecting after crash

            try:
                c.stop(timeout=5)
                c.remove(force=True)
                removed += 1
                logger.info(
                    "[CLEANUP] Removed orphan Kali container %s (age %.0fs)",
                    short_id,
                    age_seconds,
                )
                print(f"[Cleanup] Removed orphan Kali container {short_id}")
            except Exception as exc:
                logger.warning(
                    "[CLEANUP] Failed to remove orphan container %s: %s",
                    short_id,
                    exc,
                )
    except Exception as exc:
        logger.warning("[CLEANUP] Orphan sweep error: %s", exc)
    return removed


async def cleanup_idle_containers(idle_threshold_minutes: int = 60):
    """
    Find sessions with no recent activity and kill their containers.

    Args:
        idle_threshold_minutes: Sessions idle for this many minutes get cleaned up
    """
    try:
        async with AsyncSessionLocal() as db:
            # Calculate cutoff time
            cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=idle_threshold_minutes)

            # Find sessions with no recent commands
            query = select(Session).where(
                Session.container_id.isnot(None),
                Session.completed_at.is_(None),  # Only active sessions
            )
            result = await db.execute(query)
            sessions = result.scalars().all()

            docker_client = _get_docker_client()
            cleaned_count = 0

            for session in sessions:
                # Check if session has recent activity
                command_query = (
                    select(CommandLog)
                    .where(CommandLog.session_id == session.id)
                    .order_by(CommandLog.created_at.desc())
                )

                cmd_result = await db.execute(command_query)
                latest_command = cmd_result.scalars().first()

                last_activity_at = (
                    latest_command.created_at if latest_command else session.started_at
                )

                # If the user has not typed yet, use session start time so a
                # newly opened terminal is not deleted before the first command.
                if last_activity_at < cutoff_time:
                    container_id_log = session.container_id
                    try:
                        # Try to kill the container
                        container = docker_client.containers.get(container_id_log)
                        container.stop(timeout=5)
                        container.remove()
                        session.container_id = None
                        session.network_name = None
                        await db.commit()
                        cleaned_count += 1

                        logger.info(
                            f"[CLEANUP] Removed idle container: {container_id_log} "
                            f"from session {session.id} (user: {session.user_id})"
                        )
                    except NotFound:
                        session.container_id = None
                        session.network_name = None
                        await db.commit()
                        logger.info(
                            "[CLEANUP] Cleared stale DB pointer for missing container: %s",
                            container_id_log,
                        )
                    except Exception as e:
                        logger.warning(
                            f"[CLEANUP] Failed to remove container {container_id_log}: {e}"
                        )

            if cleaned_count > 0:
                logger.info(f"[CLEANUP] Removed {cleaned_count} idle containers")

    except Exception as e:
        logger.error(f"[CLEANUP] Error in container cleanup task: {e}")


async def container_cleanup_loop(interval_seconds: int = 60):
    """
    Periodically run container cleanup.

    Runs every 60 seconds. Every 5 cycles (5 minutes) it also runs the
    orphan sweep for Kali containers that survived a backend crash.

    Args:
        interval_seconds: Inner sleep between cleanup passes (default 60s)
    """
    logger.info(
        "[CLEANUP] Starting container cleanup loop (interval: %ss, orphan sweep every 5 cycles)",
        interval_seconds,
    )

    cycle = 0
    while True:
        try:
            cycle += 1

            # ── 60-second pass: idle + DB-orphaned containers ────────────
            await cleanup_idle_containers()
            await cleanup_orphaned_containers()

            # ── Stale session eviction from Redis active-sessions hash ───
            try:
                from src.cache.redis import _get as get_redis

                redis = get_redis()
                active = await redis.hgetall("cybersim:active_sessions")
                for sid_raw, val_raw in active.items():
                    sid = sid_raw.decode() if isinstance(sid_raw, bytes) else sid_raw
                    alive = await redis.exists(f"cybersim:session:{sid}:alive")
                    if not alive:
                        container_id = None
                        try:
                            val = val_raw.decode() if isinstance(val_raw, bytes) else val_raw
                            payload = json.loads(val)
                            container_id = payload.get("container_id")
                        except Exception:
                            pass

                        if container_id:
                            try:
                                docker_client = _get_docker_client()
                                container = docker_client.containers.get(container_id)
                                _remove_container(container, "stale session alive key expired")
                            except Exception as ce:
                                logger.warning(
                                    "[CLEANUP] Failed to remove container %s for stale session %s: %s",
                                    container_id,
                                    sid[:8],
                                    ce,
                                )

                        try:
                            async with AsyncSessionLocal() as db:
                                result = await db.execute(select(Session).where(Session.id == sid))
                                db_sess = result.scalar_one_or_none()
                                if db_sess and db_sess.completed_at is None:
                                    db_sess.completed_at = datetime.now(timezone.utc)
                                    db_sess.container_id = None
                                    db_sess.network_name = None
                                    await db.commit()
                                    logger.info(
                                        "[CLEANUP] Marked stale session %s as completed in DB",
                                        sid[:8],
                                    )
                        except Exception as dbe:
                            logger.error(
                                "[CLEANUP] DB update for stale session %s failed: %s", sid[:8], dbe
                            )

                        await redis.hdel("cybersim:active_sessions", sid)
                        logger.info("[CLEANUP] Evicted stale session %s from active map", sid[:8])
            except Exception as _re:
                logger.warning("[CLEANUP] Redis stale-session eviction failed: %s", _re)

            # ── 5-minute pass: orphan Kali containers (age > 2h) ────────
            if cycle % 5 == 0:
                try:
                    docker_client = _get_docker_client()
                    # Collect container IDs from the Redis active-sessions map
                    try:
                        from src.cache.redis import _get as get_redis2

                        redis2 = get_redis2()
                        active2 = await redis2.hgetall("cybersim:active_sessions")
                    except redis.RedisError:
                        active2 = {}
                    # Also pull from DB for belt-and-suspenders
                    async with AsyncSessionLocal() as db:
                        result = await db.execute(
                            select(Session.container_id).where(
                                Session.completed_at.is_(None),
                                Session.container_id.isnot(None),
                            )
                        )
                        db_ids = {
                            item for row in result.all() if row[0] for item in (row[0], row[0][:12])
                        }

                    active_ids = _container_ids_from_active_sessions(active2) | db_ids
                    await _cleanup_orphans(docker_client, active_ids)
                except Exception as _oe:
                    logger.warning("[CLEANUP] Orphan sweep failed: %s", _oe)

            await asyncio.sleep(interval_seconds)
        except asyncio.CancelledError:
            logger.info("[CLEANUP] Container cleanup loop stopped")
            break
        except Exception as e:
            logger.error(f"[CLEANUP] Unexpected error in cleanup loop: {e}")
            await asyncio.sleep(interval_seconds)  # Continue on errors


def start_cleanup_loop():
    """Start the container cleanup background task."""
    try:
        task = asyncio.create_task(container_cleanup_loop(interval_seconds=60))
        logger.info("[CLEANUP] Container cleanup background task started")
        return task
    except Exception as e:
        logger.error(f"[CLEANUP] Failed to start cleanup loop: {e}")
        return None

"""
Container cleanup task: periodically removes idle Kali containers
that haven't had activity for 60+ minutes.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from docker import from_env as docker_from_env
from docker.errors import NotFound

from src.db.database import AsyncSessionLocal, Session, CommandLog

logger = logging.getLogger(__name__)

# Docker client singleton
_docker_client = None


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
    except Exception as exc:
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

        if reason and _remove_container(container, reason):
            cleaned_count += 1

    return cleaned_count


async def cleanup_orphaned_containers() -> int:
    """Remove labeled session containers that survived past their DB lifecycle."""
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Session))
            sessions = result.scalars().all()
            session_index = {
                str(session.id): session.container_id for session in sessions
            }
            completed_sessions = {
                str(session.id)
                for session in sessions
                if session.completed_at is not None
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


async def cleanup_idle_containers(idle_threshold_minutes: int = 60):
    """
    Find sessions with no recent activity and kill their containers.

    Args:
        idle_threshold_minutes: Sessions idle for this many minutes get cleaned up
    """
    try:
        async with AsyncSessionLocal() as db:
            # Calculate cutoff time
            cutoff_time = datetime.now(timezone.utc) - timedelta(
                minutes=idle_threshold_minutes
            )

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


async def container_cleanup_loop(interval_seconds: int = 300):
    """
    Periodically run container cleanup.

    Args:
        interval_seconds: Run cleanup every this many seconds (default 5 minutes)
    """
    logger.info(
        f"[CLEANUP] Starting container cleanup loop (interval: {interval_seconds}s)"
    )

    while True:
        try:
            await cleanup_idle_containers()
            await cleanup_orphaned_containers()
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
        task = asyncio.create_task(container_cleanup_loop(interval_seconds=300))
        logger.info("[CLEANUP] Container cleanup background task started")
        return task
    except Exception as e:
        logger.error(f"[CLEANUP] Failed to start cleanup loop: {e}")
        return None

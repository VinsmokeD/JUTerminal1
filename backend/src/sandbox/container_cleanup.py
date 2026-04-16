"""
Container cleanup task: periodically removes idle Kali containers
that haven't had activity for 60+ minutes.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from docker import from_env as docker_from_env

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
                Session.completed_at.is_(None)  # Only active sessions
            )
            result = await db.execute(query)
            sessions = result.scalars().all()

            docker_client = _get_docker_client()
            cleaned_count = 0

            for session in sessions:
                # Check if session has recent activity
                command_query = select(CommandLog).where(
                    CommandLog.session_id == session.id
                ).order_by(CommandLog.created_at.desc())

                cmd_result = await db.execute(command_query)
                latest_command = cmd_result.scalars().first()

                # If no commands or last command is old, clean up
                if latest_command is None or latest_command.created_at < cutoff_time:
                    try:
                        # Try to kill the container
                        container = docker_client.containers.get(session.container_id)
                        container.stop(timeout=5)
                        container.remove()
                        cleaned_count += 1

                        logger.info(
                            f"[CLEANUP] Removed idle container: {session.container_id} "
                            f"from session {session.id} (user: {session.user_id})"
                        )
                    except Exception as e:
                        logger.warning(f"[CLEANUP] Failed to remove container {session.container_id}: {e}")

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
    logger.info(f"[CLEANUP] Starting container cleanup loop (interval: {interval_seconds}s)")

    while True:
        try:
            await asyncio.sleep(interval_seconds)
            await cleanup_idle_containers()
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

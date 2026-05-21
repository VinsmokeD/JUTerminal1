from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import AsyncSessionLocal, UserActivity


async def record_activity(
    db: AsyncSession,
    user_id: str,
    event_type: str,
    session_id: str | None = None,
    metadata: dict | None = None,
    commit: bool = False,
) -> None:
    """
    Log an auditable user event to the UserActivity table.
    """
    activity = UserActivity(
        user_id=user_id,
        session_id=session_id,
        event_type=event_type,
        metadata_json=metadata or {},
    )
    db.add(activity)
    if commit:
        await db.commit()


async def record_activity_committed(
    user_id: str,
    event_type: str,
    session_id: str | None = None,
    metadata: dict | None = None,
) -> None:
    """Log an activity row in its own short-lived transaction."""
    async with AsyncSessionLocal() as db:
        await record_activity(db, user_id, event_type, session_id, metadata)
        await db.commit()

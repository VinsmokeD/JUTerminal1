from __future__ import annotations

import os
import sys
import uuid

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "test-secret-for-ci-only-do-not-use-in-prod")
os.environ["POSTGRES_URL"] = os.environ.get(
    "TEST_POSTGRES_URL",
    "postgresql+asyncpg://parallax:change_this_password@localhost:5432/parallax",
)
os.environ["REDIS_URL"] = os.environ.get("TEST_REDIS_URL", "redis://localhost:6379/1")

from src.cache.redis import cache_delete, cache_set
from src.db.database import AsyncSessionLocal, Base, CommandLog, Note, Session, User, engine
from src.scenarios.engine import try_advance_phase, validate_flag


@pytest.fixture
def ids() -> tuple[str, str]:
    suffix = uuid.uuid4().hex
    return f"phase-user-{suffix}", f"phase-session-{suffix}"


async def _set_cached_state(session_id: str, phase: int, flags: list[str] | None = None) -> None:
    await cache_set(
        f"session:{session_id}:state",
        {
            "session_id": session_id,
            "scenario_id": "SC-01",
            "role": "red",
            "methodology": "ptes",
            "phase": phase,
            "score": 100,
            "flags_captured": flags or [],
        },
        ttl=28800,
    )


@pytest.mark.asyncio
async def test_sc01_phase_advancement_kill_chain(ids: tuple[str, str]) -> None:
    user_id, session_id = ids

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, checkfirst=True)

    await cache_delete(f"session:{session_id}:state")
    async with AsyncSessionLocal() as db:
        db.add(User(id=user_id, username=f"user_{uuid.uuid4().hex}", password_hash="x"))
        db.add(
            Session(
                id=session_id,
                user_id=user_id,
                scenario_id="SC-01",
                role="red",
                phase=1,
                score=100,
                session_metadata={},
            )
        )
        await db.commit()

        await _set_cached_state(session_id, 1)
        assert await try_advance_phase(session_id, "SC-01", db) == 1

        db.add_all(
            [
                CommandLog(
                    session_id=session_id, command="whatweb http://target", tool="whatweb", phase=1
                ),
                CommandLog(
                    session_id=session_id, command="curl -I http://target", tool="curl", phase=1
                ),
                Note(session_id=session_id, tag="finding", content="#finding headers", phase=1),
            ]
        )
        await db.commit()
        assert await try_advance_phase(session_id, "SC-01", db) == 2

        db.add_all(
            [
                CommandLog(
                    session_id=session_id,
                    command="gobuster dir -u http://target",
                    tool="gobuster",
                    phase=2,
                ),
                Note(session_id=session_id, tag="finding", content="#finding paths", phase=2),
            ]
        )
        await db.commit()
        assert await try_advance_phase(session_id, "SC-01", db) == 3

        result = await validate_flag("LFI confirmed: root:x:0:0", "SC-01", session_id, db)
        assert result["valid"] is True
        db.add(Note(session_id=session_id, tag="finding", content="#finding lfi", phase=3))
        await db.commit()
        assert await try_advance_phase(session_id, "SC-01", db) == 4

        result = await validate_flag("P@ssw0rd_NovaMed_2023!", "SC-01", session_id, db)
        assert result["valid"] is True
        result = await validate_flag("Patient 1042: Aisha Rahman", "SC-01", session_id, db)
        assert result["valid"] is True
        assert await try_advance_phase(session_id, "SC-01", db) == 5

    await cache_delete(f"session:{session_id}:state")

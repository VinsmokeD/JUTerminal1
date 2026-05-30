import asyncio
import logging
import sys
from pathlib import Path

# Setup path so we can import src
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.config import settings

# Override URLs for host-to-container local access
settings.REDIS_URL = "redis://127.0.0.1:6379/0"
settings.POSTGRES_URL = "postgresql+asyncpg://cybersim:change_this_password@127.0.0.1:5432/cybersim"

from src.cache.redis import init_redis, close_redis
from src.ai.monitor import get_ai_hint
from src.db.database import AsyncSessionLocal, Session, User, AIInteraction

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")


async def test_tutor():
    await init_redis()
    print(
        "OPENROUTER_API_KEY:",
        settings.OPENROUTER_API_KEY[:10] + "..." if settings.OPENROUTER_API_KEY else "Not set",
    )
    print("OPENROUTER_MODEL:", settings.OPENROUTER_MODEL)

    # Let's find or create a test session in the database
    async with AsyncSessionLocal() as db:
        import uuid

        user_id = str(uuid.uuid4())
        session_id = str(uuid.uuid4())
        username = f"test_tutor_{uuid.uuid4().hex[:8]}"

        user = User(
            id=user_id,
            username=username,
            password_hash="noop",
            role="student",
            skill_level="beginner",
        )
        db.add(user)

        session = Session(
            id=session_id,
            user_id=user_id,
            scenario_id="SC-01",
            phase=1,
            role="red",
            score=100,
            roe_acknowledged=True,
        )
        db.add(session)
        await db.commit()
        print(f"Created temporary user {user_id} ({username}) and session {session_id}")

    session_state = {"scenario_id": "SC-01", "phase": 1, "role": "red", "discoveries": {}}

    try:
        print("\n--- Sending Question 1 ---")
        res1 = await get_ai_hint(
            session_id=session_id,
            session_state=session_state,
            command="nmap -sV 172.20.1.20",
            hint_level=1,
            question="How do I scan the target?",
        )
        # Fetch the interaction to see what the raw response was
        async with AsyncSessionLocal() as db:
            import sqlalchemy as sa

            stmt = (
                sa.select(AIInteraction)
                .where(AIInteraction.session_id == session_id)
                .order_by(AIInteraction.created_at.desc())
                .limit(1)
            )
            interaction = (await db.execute(stmt)).scalar_one_or_none()
            if interaction:
                raw_text = repr(interaction.response_text)
                sys.stdout.buffer.write(
                    b"Raw response 1: "
                    + raw_text.encode("ascii", errors="backslashreplace")
                    + b"\n"
                )
        print("Sanitized Response 1:", res1)

        # Sleep to avoid cooldown
        print("\nSleeping for 11 seconds to clear cooldown...")
        await asyncio.sleep(11)

        print("\n--- Sending Question 2 ---")
        res2 = await get_ai_hint(
            session_id=session_id,
            session_state=session_state,
            command="nmap -sV 172.20.1.20",
            hint_level=1,
            question="What port is open?",
        )
        async with AsyncSessionLocal() as db:
            stmt = (
                sa.select(AIInteraction)
                .where(AIInteraction.session_id == session_id)
                .order_by(AIInteraction.created_at.desc())
                .limit(1)
            )
            interaction = (await db.execute(stmt)).scalar_one_or_none()
            if interaction:
                raw_text = repr(interaction.response_text)
                sys.stdout.buffer.write(
                    b"Raw response 2: "
                    + raw_text.encode("ascii", errors="backslashreplace")
                    + b"\n"
                )
        print("Sanitized Response 2:", res2)

    finally:
        # Cleanup
        async with AsyncSessionLocal() as db:
            import sqlalchemy as sa

            # Delete interactions first
            await db.execute(sa.delete(AIInteraction).where(AIInteraction.session_id == session_id))
            # Delete session
            await db.execute(sa.delete(Session).where(Session.id == session_id))
            # Delete user
            await db.execute(sa.delete(User).where(User.id == user_id))
            await db.commit()
            print("Cleaned up temporary user, session, and interactions.")
        await close_redis()


if __name__ == "__main__":
    asyncio.run(test_tutor())

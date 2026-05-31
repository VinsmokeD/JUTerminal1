import os
import pytest

# Configure environment for all pytest runs
os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET"] = os.environ.get(
    "JWT_SECRET", "test-secret-for-ci-only-do-not-use-in-prod"
)
os.environ["POSTGRES_URL"] = os.environ.get(
    "TEST_POSTGRES_URL",
    # Default matches the docker-compose dev stack (POSTGRES_PASSWORD defaults to
    # "parallax"); override with TEST_POSTGRES_URL for any other environment.
    "postgresql+asyncpg://parallax:parallax@127.0.0.1:5432/parallax",
)
os.environ["REDIS_URL"] = os.environ.get("TEST_REDIS_URL", "redis://127.0.0.1:6379/1")

from src.cache.redis import init_redis, close_redis
from src.db.database import init_db
from src.siem.engine import init_siem_batch, close_siem_batch
from src.main import _seed_admin


@pytest.fixture(scope="session", autouse=True)
async def init_services():
    await init_db()
    await _seed_admin()
    await init_redis()
    await init_siem_batch()
    yield
    await close_siem_batch()
    await close_redis()

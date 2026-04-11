from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy import select

from src.config import settings
from src.db.database import init_db, AsyncSessionLocal, User
from src.cache.redis import init_redis, close_redis
from src.siem.engine import init_siem_batch, close_siem_batch
from src.auth.routes import router as auth_router, hash_password
from src.scenarios.routes import router as scenarios_router
from src.scenarios.hint_engine import router as hints_router
from src.sessions.routes import router as sessions_router
from src.notes.routes import router as notes_router
from src.ws.routes import router as ws_router
from src.scoring.routes import router as scoring_router
from src.reports.routes import router as reports_router
from src.instructor.routes import router as instructor_router
from src.sandbox.daemon_noise import start_noise_daemon


async def _seed_admin() -> None:
    """Create the default instructor account if it doesn't exist."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == "admin"))
        if result.scalar_one_or_none() is None:
            admin = User(
                username="admin",
                password_hash=hash_password("CyberSimAdmin!"),
                role="instructor",
            )
            db.add(admin)
            await db.commit()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_db()
    await _seed_admin()
    await init_redis()
    await init_siem_batch()
    start_noise_daemon()
    yield
    await close_siem_batch()
    await close_redis()


app = FastAPI(
    title="CyberSim API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.ENVIRONMENT == "development" else None,
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(scenarios_router, prefix="/api/scenarios", tags=["scenarios"])
app.include_router(sessions_router, prefix="/api/sessions", tags=["sessions"])
app.include_router(notes_router, prefix="/api/notes", tags=["notes"])
app.include_router(hints_router, prefix="/api/hints", tags=["hints"])
app.include_router(ws_router, prefix="/ws", tags=["websocket"])
app.include_router(scoring_router, prefix="/api/scoring", tags=["scoring"])
app.include_router(reports_router, prefix="/api/reports", tags=["reports"])
app.include_router(instructor_router, prefix="/api/instructor", tags=["instructor"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}

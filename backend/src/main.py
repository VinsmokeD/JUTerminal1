from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.db.database import init_db
from src.cache.redis import init_redis, close_redis
from src.auth.routes import router as auth_router
from src.scenarios.routes import router as scenarios_router
from src.scenarios.hint_engine import router as hints_router
from src.sessions.routes import router as sessions_router
from src.notes.routes import router as notes_router
from src.ws.routes import router as ws_router
from src.scoring.routes import router as scoring_router
from src.reports.routes import router as reports_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await init_redis()
    yield
    await close_redis()


app = FastAPI(
    title="CyberSim API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.ENVIRONMENT == "development" else None,
)

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


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}

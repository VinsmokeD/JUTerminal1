import asyncio
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
from src.api.playbooks import router as playbooks_router
from src.ai.routes import router as ai_router
from src.siem.routes import router as siem_router
from src.sandbox.daemon_noise import start_noise_daemon
from src.sandbox.container_cleanup import start_cleanup_loop


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
    cleanup_task = start_cleanup_loop()
    yield
    await close_siem_batch()
    await close_redis()
    if cleanup_task:
        cleanup_task.cancel()
        try:
            await cleanup_task
        except (asyncio.CancelledError, Exception) as exc:
            if not isinstance(exc, asyncio.CancelledError):
                print(f"[Cleanup] Shutdown error: {exc}")


app = FastAPI(
    title="CyberSim API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.ENVIRONMENT == "development" else None,
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
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
app.include_router(playbooks_router, tags=["playbooks"])
app.include_router(ai_router, prefix="/api/ai", tags=["ai"])
app.include_router(siem_router, prefix="/api/siem", tags=["siem"])

@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


@app.get("/api/health/readiness")
async def readiness():
    """
    Deep readiness probe — checks every subsystem.
    Returns 200 when all are healthy, 503 when any are degraded.
    Used by the demo-check script and instructor dashboard.
    """
    import httpx as _httpx
    from sqlalchemy import text as _text
    checks: dict[str, dict] = {}

    # ── Postgres ──────────────────────────────────────────────────────
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(_text("SELECT 1"))
        checks["postgres"] = {"status": "ok"}
    except Exception as exc:
        checks["postgres"] = {"status": "error", "detail": str(exc)[:120]}

    # ── Redis ─────────────────────────────────────────────────────────
    try:
        from src.cache.redis import _get as _get_redis
        r = _get_redis()
        await r.ping()
        active = await r.hlen("cybersim:active_sessions")
        checks["redis"] = {"status": "ok", "active_sessions": active}
    except Exception as exc:
        checks["redis"] = {"status": "error", "detail": str(exc)[:120]}

    # ── Elasticsearch ─────────────────────────────────────────────────
    try:
        async with _httpx.AsyncClient() as client:
            resp = await client.get("http://elasticsearch:9200/_cluster/health", timeout=3.0)
            es_data = resp.json()
        es_status = es_data.get("status", "unknown")
        checks["elasticsearch"] = {
            "status": "ok" if es_status in ("green", "yellow") else "error",
            "cluster_status": es_status,
        }
    except Exception as exc:
        checks["elasticsearch"] = {"status": "error", "detail": str(exc)[:120]}

    # ── OpenRouter Reachability ───────────────────────────────────────
    try:
        if not settings.OPENROUTER_API_KEY:
            checks["openrouter"] = {
                "status": "ok",
                "configured": False,
                "detail": "OPENROUTER_API_KEY not set; static fallback hints enabled.",
            }
        else:
            # Check cache first (cached 60s)
            cached_or = await r.get("health:openrouter:status") if checks.get("redis", {}).get("status") == "ok" else None
            if cached_or:
                checks["openrouter"] = {"status": "ok", "cached": True}
            else:
                async with _httpx.AsyncClient() as client:
                    resp = await client.get("https://openrouter.ai/api/v1/auth/key", headers={"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"}, timeout=3.0)
                    resp.raise_for_status()
                checks["openrouter"] = {"status": "ok"}
                if checks.get("redis", {}).get("status") == "ok":
                    await r.setex("health:openrouter:status", 60, "ok")
    except Exception as exc:
        checks["openrouter"] = {"status": "error", "detail": str(exc)[:120]}

    overall = "ok" if all(c["status"] == "ok" for c in checks.values()) else "degraded"
    from fastapi.responses import JSONResponse
    return JSONResponse(
        content={"status": overall, "checks": checks, "version": "0.1.0"},
        status_code=200 if overall == "ok" else 503,
    )

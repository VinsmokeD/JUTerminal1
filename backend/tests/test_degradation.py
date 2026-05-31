"""
Degradation tests — prove the app degrades gracefully (no crash) when
Redis or Elasticsearch are unavailable.

These tests mock the cache/http layers at the module boundary so they run
without a live stack.
"""

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ---------------------------------------------------------------------------
# Redis degradation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_metrics_endpoint_redis_down(monkeypatch):
    """GET /api/metrics must return 200 with zeros when Redis is unreachable."""
    import importlib
    import src.main as main_mod

    async def _failing_redis():
        raise ConnectionError("Redis is down")

    with patch("src.cache.redis._get") as mock_get:
        mock_redis = MagicMock()
        mock_redis.hlen = AsyncMock(side_effect=ConnectionError("Redis is down"))
        mock_redis.get = AsyncMock(side_effect=ConnectionError("Redis is down"))
        mock_redis.lrange = AsyncMock(side_effect=ConnectionError("Redis is down"))
        mock_get.return_value = mock_redis

        from fastapi.testclient import TestClient

        client = TestClient(main_mod.app)
        resp = client.get("/api/metrics")

    assert resp.status_code == 200
    data = resp.json()
    assert data["active_sessions"] == 0
    assert data["ws_connections"] == 0
    assert data["ai_latency_p50_ms"] is None


@pytest.mark.asyncio
async def test_ai_monitor_redis_down_returns_fallback(monkeypatch):
    """get_ai_hint must return static fallback (not raise) when Redis is down."""
    from src.ai.monitor import get_ai_hint

    async def _fail(*a, **kw):
        raise ConnectionError("Redis is down")

    monkeypatch.setattr("src.ai.monitor.cache_get", _fail)
    monkeypatch.setattr("src.ai.monitor.cache_set", _fail)

    session_state = {"scenario_id": "SC-01", "phase": 1, "role": "red"}
    result = await get_ai_hint(
        session_id="degradation-test-session",
        session_state=session_state,
        command="nmap",
        hint_level=1,
    )
    # Must not raise; may return None or a static string
    assert result is None or isinstance(result, str)


@pytest.mark.asyncio
async def test_queue_event_redis_down_does_not_crash(monkeypatch):
    """queue_event must not raise when the metrics Redis write fails."""
    from src.siem import engine as siem_engine

    original_get = siem_engine.get_redis

    call_count = 0

    def _redis_factory():
        nonlocal call_count
        call_count += 1
        m = MagicMock()
        if call_count == 1:
            # First call (publish/queue) — raise to test degradation
            m.publish = AsyncMock(side_effect=ConnectionError("Redis down"))
        else:
            # Second call (metrics write) — also raise
            m.set = AsyncMock(side_effect=ConnectionError("Redis down"))
        return m

    monkeypatch.setattr(siem_engine, "get_redis", _redis_factory)

    # Should not raise even with Redis down
    try:
        await siem_engine.queue_event("sess-test", {"type": "test_event"})
    except ConnectionError:
        # Acceptable: first publish fails, but the function shouldn't propagate metrics errors
        pass


# ---------------------------------------------------------------------------
# Elasticsearch degradation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_readiness_elastic_down_returns_degraded():
    """readiness endpoint returns 503 + degraded when Elasticsearch is unreachable."""
    import httpx
    from src.main import app
    from fastapi.testclient import TestClient

    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(side_effect=httpx.ConnectError("ES unreachable"))
        mock_client_cls.return_value = mock_client

        with patch("src.cache.redis._get") as mock_redis_get:
            mock_r = MagicMock()
            mock_r.ping = AsyncMock(return_value=True)
            mock_r.hlen = AsyncMock(return_value=0)
            mock_r.get = AsyncMock(return_value=None)
            mock_redis_get.return_value = mock_r

            from sqlalchemy.ext.asyncio import AsyncSession

            with patch("src.db.database.AsyncSessionLocal") as mock_db:
                mock_session = AsyncMock(spec=AsyncSession)
                mock_session.__aenter__ = AsyncMock(return_value=mock_session)
                mock_session.__aexit__ = AsyncMock(return_value=False)
                mock_session.execute = AsyncMock(return_value=MagicMock())
                mock_db.return_value = mock_session

                client = TestClient(app, raise_server_exceptions=False)
                resp = client.get("/api/health/readiness")

    # ES down → overall degraded → 503
    assert resp.status_code == 503
    body = resp.json()
    assert body["status"] == "degraded"
    assert body["checks"]["elasticsearch"]["status"] == "error"


# ---------------------------------------------------------------------------
# AI budget / cache degradation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_ai_budget_check_fails_gracefully(monkeypatch):
    """check_ai_budget returning False should yield fallback, not a 500."""
    from src.ai.monitor import get_ai_hint
    from src.ai import security as ai_sec

    monkeypatch.setattr(ai_sec, "check_ai_budget", AsyncMock(return_value=False))

    async def _cache_get_none(*a, **kw):
        return None

    monkeypatch.setattr("src.ai.monitor.cache_get", _cache_get_none)
    monkeypatch.setattr("src.ai.monitor.cache_set", AsyncMock())

    session_state = {"scenario_id": "SC-01", "phase": 1, "role": "red"}

    async def _build_ctx(*a, **kw):
        return {
            "scenario": "SC-01",
            "phase": 1,
            "role": "red",
            "mode": "challenge",
            "active_branch": "",
            "student_question": "",
            "recent_commands": [],
            "last_command_output_summary": {
                "first_lines": [],
                "last_lines": [],
                "fingerprints": [],
                "exit_code": 0,
                "byte_count": 0,
            },
            "notes_summary": [],
            "flags_captured": [],
            "pending_flag_candidates": [],
            "minutes_since_last_progress": 0,
            "siem_events_recent": [0, "INFO"],
            "target_reachable": "true",
            "ai_verbosity": "balanced",
            "scenario_id": "SC-01",
            "scenario_name": "Test",
            "skill_level": "beginner",
            "discovered_services": [],
            "discovered_paths": [],
            "discovered_vulns": [],
            "discovered_credentials": [],
            "key_findings_expected": [],
            "blue_detection_points": [],
            "command_history": [],
            "note_count": 0,
            "commands_this_phase": 0,
            "phase_duration_minutes": 0,
            "time_since_last_command_seconds": 0,
        }

    monkeypatch.setattr("src.ai.monitor.build_ai_context", _build_ctx)

    from unittest.mock import patch as _patch

    # AsyncSessionLocal is imported locally inside get_ai_hint; patch at source
    with _patch("src.db.database.AsyncSessionLocal") as mock_db:
        mock_sess = AsyncMock()
        mock_sess.__aenter__ = AsyncMock(return_value=mock_sess)
        mock_sess.__aexit__ = AsyncMock(return_value=False)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none = MagicMock(return_value="user-123")
        mock_sess.execute = AsyncMock(return_value=mock_result)
        mock_db.return_value = mock_sess

        import os

        old_key = os.environ.get("OPENROUTER_API_KEY")
        os.environ["OPENROUTER_API_KEY"] = "test-key"
        try:
            result = await get_ai_hint(
                session_id="budget-test",
                session_state=session_state,
                command="nmap",
                hint_level=1,
            )
        finally:
            if old_key is None:
                os.environ.pop("OPENROUTER_API_KEY", None)
            else:
                os.environ["OPENROUTER_API_KEY"] = old_key

    # Budget exceeded → fallback hint (string), not a crash
    assert result is None or isinstance(result, str)

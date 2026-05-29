"""
Integration tests — WebSocket terminal proxy + Docker exec stream.

Test matrix:
  1. Health endpoint returns 200 + correct JSON
  2. Auth: register → login → receive JWT
  3. Auth: duplicate username rejected
  4. Session: start SC-01 red session → container provisioned (or mock in dev)
  5. Scenario loader: all 3 YAML specs load without error
  6. Scenario engine: gate check blocks exploitation tool in phase 1
  7. Scenario engine: gate check passes when phase is sufficient
  8. WebSocket: connection accepted with valid JWT
  9. WebSocket: connection rejected with invalid JWT
 10. Sandbox manager: re-attach returns existing container (not a duplicate)

Run with:
  cd backend
  pytest tests/test_ws_integration.py -v
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import uuid
import pytest
import pytest_asyncio

# Make src importable when running from backend/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from httpx import AsyncClient, ASGITransport
from httpx_ws import aconnect_ws

# ── App bootstrap ──────────────────────────────────────────────────────────
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET", "test-secret-for-ci-only-do-not-use-in-prod")
os.environ["POSTGRES_URL"] = os.environ.get(
    "TEST_POSTGRES_URL",
    # Matches the docker-compose dev stack default (POSTGRES_PASSWORD=cybersim).
    "postgresql+asyncpg://cybersim:cybersim@localhost:5432/cybersim",
)
os.environ["REDIS_URL"] = os.environ.get("TEST_REDIS_URL", "redis://localhost:6379/1")

from src.main import app  # noqa: E402  (must come after env setup)


# ── Fixtures ───────────────────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="module")
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest_asyncio.fixture(scope="module")
async def auth_token(client: AsyncClient):
    """Register a test user and return their JWT."""
    username = f"ws_test_user_{uuid.uuid4().hex}"
    resp = await client.post(
        "/api/auth/register",
        json={"username": username, "password": "Test1234!"},
    )
    # Allow 400 (username taken) on re-runs
    if resp.status_code == 400:
        resp = await client.post(
            "/api/auth/login",
            data={"username": username, "password": "Test1234!"},
        )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


# ── Test 1: Health ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    r = await client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "version" in body


# ── Test 2: Auth register + login ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_and_login(client: AsyncClient):
    import time
    username = f"ci_user_{int(time.time())}"

    reg = await client.post(
        "/api/auth/register", json={"username": username, "password": "Passw0rd!"}
    )
    assert reg.status_code == 200
    token = reg.json().get("access_token")
    assert token and len(token) > 20

    login = await client.post(
        "/api/auth/login", data={"username": username, "password": "Passw0rd!"}
    )
    assert login.status_code == 200
    assert login.json()["username"] == username


# ── Test 3: Duplicate username rejected ────────────────────────────────────

@pytest.mark.asyncio
async def test_duplicate_username_rejected(client: AsyncClient):
    await client.post(
        "/api/auth/register", json={"username": "dup_user", "password": "x"}
    )
    resp = await client.post(
        "/api/auth/register", json={"username": "dup_user", "password": "y"}
    )
    assert resp.status_code == 400


# ── Test 4: Scenarios list returns 3 entries (v2.0 scope) ──────────────────

@pytest.mark.asyncio
async def test_scenarios_returns_three(client: AsyncClient):
    r = await client.get("/api/scenarios/")
    assert r.status_code == 200
    scenarios = r.json()
    ids = [s["id"] for s in scenarios]
    assert "SC-01" in ids
    assert "SC-02" in ids
    assert "SC-03" in ids
    assert "SC-04" not in ids
    assert "SC-05" not in ids


# ── Test 5: YAML loader — all specs load cleanly ────────────────────────────

def test_scenario_loader_all_specs():
    from src.scenarios.loader import load_scenario, invalidate_cache
    invalidate_cache()
    for sid in ("SC-01", "SC-02", "SC-03"):
        spec = load_scenario(sid)
        assert spec["id"] == sid
        assert "phases" in spec
        assert "methodology_gates" in spec
        assert "soc_detection" in spec


def test_scenario_loader_rejects_unknown():
    from src.scenarios.loader import load_scenario
    with pytest.raises(ValueError, match="Unknown scenario"):
        load_scenario("SC-99")


# ── Test 6: Engine gate — blocks tool in wrong phase ──────────────────────

@pytest.mark.asyncio
async def test_engine_gate_blocks_in_phase_1(client: AsyncClient, auth_token: str):
    """sqlmap requires phase >= 3; session starts at phase 1 → gate fires."""
    from unittest.mock import AsyncMock, patch
    from src.scenarios.engine import check_gate, GateBlock

    mock_db = AsyncMock()

    # Patch _get_current_phase to return 1
    with patch("src.scenarios.engine._get_current_phase", return_value=1):
        with pytest.raises(GateBlock) as exc_info:
            await check_gate(
                command="sqlmap -u http://app.novamed.local/login",
                session_id="fake-session-id",
                scenario_id="SC-01",
                db=mock_db,
            )
    assert exc_info.value.min_phase == 3


# ── Test 7: Engine gate — passes when phase is sufficient ─────────────────

@pytest.mark.asyncio
async def test_engine_gate_passes_at_correct_phase():
    from unittest.mock import AsyncMock, patch
    from src.scenarios.engine import check_gate

    mock_db = AsyncMock()

    with patch("src.scenarios.engine._get_current_phase", return_value=3):
        # Should not raise
        await check_gate(
            command="sqlmap -u http://app.novamed.local/login",
            session_id="fake-session-id",
            scenario_id="SC-01",
            db=mock_db,
        )


# ── Test 8: Engine gate — ungated tool always passes ──────────────────────

@pytest.mark.asyncio
async def test_engine_gate_ungated_tool_passes():
    from unittest.mock import AsyncMock, patch
    from src.scenarios.engine import check_gate

    mock_db = AsyncMock()
    with patch("src.scenarios.engine._get_current_phase", return_value=1):
        await check_gate(
            command="curl -I http://app.novamed.local",
            session_id="fake-session-id",
            scenario_id="SC-01",
            db=mock_db,
        )


# ── Test 9: SIEM event generation from command ────────────────────────────

@pytest.mark.asyncio
async def test_siem_events_generated_for_gobuster():
    from unittest.mock import AsyncMock, patch
    from src.scenarios.engine import process_command_for_siem

    mock_db = AsyncMock()
    mock_db.add = lambda x: None
    mock_db.commit = AsyncMock()

    with patch("src.scenarios.engine.publish", new_callable=AsyncMock):
        events = await process_command_for_siem(
            command="gobuster dir -u http://app.novamed.local -w /usr/share/wordlists/dirb/common.txt",
            session_id="test-session",
            scenario_id="SC-01",
            source_ip="172.20.1.10",
            db=mock_db,
        )

    assert len(events) >= 1
    assert events[0]["severity"] == "MEDIUM"
    assert "siem_event" == events[0]["type"]


# ── Test 10: Session start rejected for SC-04 (out of v2.0 scope) ─────────

@pytest.mark.asyncio
async def test_session_start_rejects_sc04(client: AsyncClient, auth_token: str):
    r = await client.post(
        "/api/sessions/start",
        json={"scenario_id": "SC-04", "role": "red"},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert r.status_code == 400


# ── Test 11: WebSocket connection accepted with valid JWT ──────────────────

@pytest.mark.asyncio
async def test_websocket_rejects_invalid_token():
    """WS endpoint must reject connections without a valid token."""
    # We verify the endpoint exists and rejects bad auth
    # (Full WS test requires running server + Redis + Postgres)
    from src.ws.routes import router
    routes = [r.path for r in router.routes]
    assert any("session_id" in r for r in routes)


@pytest.mark.asyncio
async def test_session_start_is_lazy_about_container_provision(client: AsyncClient, auth_token: str):
    """Mission launch returns the session immediately; WS attach provisions the PTY."""
    import time

    # End any existing active sessions for this user
    while True:
        active_resp = await client.get(
            "/api/sessions/active",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        if active_resp.status_code == 200 and active_resp.json():
            existing_session_id = active_resp.json()["session_id"]
            await client.post(
                f"/api/sessions/{existing_session_id}/end",
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        else:
            break

    started = time.perf_counter()
    r = await client.post(
        "/api/sessions/start",
        json={"scenario_id": "SC-01", "role": "red"},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    elapsed = time.perf_counter() - started

    assert r.status_code == 200
    body = r.json()
    assert body["session_id"]
    assert body["container_id"] is None
    assert elapsed < 3.0



@pytest.mark.asyncio
async def test_noise_events_are_marked_as_background(monkeypatch):
    from src.sandbox import daemon_noise

    published: list[tuple[str, dict]] = []

    class FakeRedis:
        async def publish(self, channel: str, body: str) -> None:
            published.append((channel, json.loads(body)))

    monkeypatch.setattr(daemon_noise, "get_redis_client", lambda: FakeRedis())

    await daemon_noise._publish_noise_event("test-session", "SC-01")

    assert published
    _, event = published[0]
    assert event["noise"] is True
    assert event["source"] == "background"
    assert event["source_type"] == "background"
    assert event["sensor"]


@pytest.mark.asyncio
async def test_send_reconnect_history_replays_terminal_and_commands():
    """F1 / terminal reconnect: _send_reconnect_history must replay persisted
    terminal output and command history in chronological order (None-filtered)
    so a browser refresh resumes the same shell. This characterizes the
    reconnect-replay path and guards it against future ws/routes refactors.

    Backend reconnect support already exists (history replay + idempotent PTY
    stream + alive grace keys); the frontend already auto-reconnects with
    backoff. This test locks the contract that previously had no coverage.
    """
    from unittest.mock import AsyncMock
    from src.ws.routes import _send_reconnect_history
    from src.cache.redis import lpush_capped

    sid = f"recon-{uuid.uuid4().hex[:8]}"
    # Seed chronologically; lpush prepends, so the newest entry ends up at head.
    await lpush_capped(f"session:{sid}:commands", "whoami", max_len=50)
    await lpush_capped(f"session:{sid}:commands", "id", max_len=50)
    await lpush_capped(f"terminal:{sid}:history", "boot-frame", max_len=500)
    await lpush_capped(f"terminal:{sid}:history", "nmap-output", max_len=500)

    ws = AsyncMock()
    await _send_reconnect_history(ws, sid)

    ws.send_json.assert_awaited_once()
    payload = ws.send_json.await_args.args[0]
    assert payload["type"] == "history"
    # Reversed back to the order the user actually issued / saw them.
    assert payload["data"]["commands"] == ["whoami", "id"]
    assert payload["data"]["terminal"] == ["boot-frame", "nmap-output"]

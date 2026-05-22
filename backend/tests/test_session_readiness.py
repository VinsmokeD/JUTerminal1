"""
Unit tests for Phase 26 — Mission Shell & Readiness UX diagnostics, self-healing, and API routes.
"""
from __future__ import annotations

import asyncio
from typing import Any, Dict, List
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from docker.errors import NotFound

from src.db.database import Session, User
from src.sandbox.readiness import (
    get_session_readiness,
    check_port_internal,
    self_heal_target,
    _SCENARIO_PROBES
)
from src.sessions.routes import check_session_readiness, override_readiness


# ── Database Mocks (copied pattern from test_instructor_analytics.py) ────────

class _ScalarResult:
    def __init__(self, items):
        self._items = list(items)

    def all(self):
        return list(self._items)

    def first(self):
        return self._items[0] if self._items else None

    def __iter__(self):
        return iter(self._items)


class _Result:
    def __init__(self, *, one=None, many=None):
        self._one = one
        self._many = list(many or [])

    def scalar_one_or_none(self):
        return self._one

    def scalar(self):
        return self._one if self._one is not None else (self._many[0] if self._many else None)

    def scalars(self):
        return _ScalarResult(self._many if self._many else ([] if self._one is None else [self._one]))

    def fetchone(self):
        return self._one

    def all(self):
        return list(self._many)

    def first(self):
        return self._one if self._one else (self._many[0] if self._many else None)


class _FakeDb:
    def __init__(self, *results):
        self.results = list(results)
        self.added = []
        self.deleted = []
        self.commits = 0
        self.refreshed = []

    async def execute(self, _query):
        if not self.results:
            return _Result()
        return self.results.pop(0)

    async def scalar(self, _query):
        if not self.results:
            return None
        res = self.results.pop(0)
        return res._one if hasattr(res, "_one") else res

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.commits += 1

    async def refresh(self, item):
        self.refreshed.append(item)


# ── Tests for Readiness Engine ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_check_port_internal():
    # Mock container
    container = MagicMock()
    
    # 1. Success case (exit_code 0)
    container.exec_run = MagicMock(return_value=(0, b"success"))
    res = await check_port_internal(container, 80)
    assert res is True
    
    # 2. Failure case (exit_code != 0)
    container.exec_run = MagicMock(return_value=(1, b"failure"))
    res = await check_port_internal(container, 80)
    assert res is False


@pytest.mark.asyncio
@patch("src.sandbox.readiness._COMPOSE_FILE")
@patch("subprocess.run")
async def test_self_heal_target(mock_run, mock_compose_file):
    # Setup mock compose file path exists
    mock_compose_file.exists.return_value = True
    
    # Mock process run
    mock_process = MagicMock()
    mock_process.returncode = 0
    mock_run.return_value = mock_process
    
    res = await self_heal_target("sc01-waf")
    assert res is True
    mock_run.assert_called_once()
    assert "restart" in mock_run.call_args[0][0]
    assert "sc01-waf" in mock_run.call_args[0][0]


@pytest.mark.asyncio
@patch("src.sandbox.readiness._get_docker_client")
@patch("src.sandbox.readiness._get_redis")
@patch("httpx.AsyncClient")
async def test_get_session_readiness_all_ok(mock_httpx, mock_get_redis, mock_docker_client):
    # Mock Docker
    mock_client = MagicMock()
    mock_docker_client.return_value = mock_client
    
    # Kali container mock
    mock_kali = MagicMock()
    mock_kali.status = "running"
    mock_kali.id = "kali-container-id-12345"
    
    # Target containers mock
    mock_waf = MagicMock()
    mock_waf.status = "running"
    mock_waf.id = "waf-container-id-12345"
    mock_waf.exec_run = MagicMock(return_value=(0, b"")) # port check passes
    
    mock_php = MagicMock()
    mock_php.status = "running"
    mock_php.id = "php-container-id-12345"
    mock_php.exec_run = MagicMock(return_value=(0, b"")) # port check passes

    mock_db = MagicMock()
    mock_db.status = "running"
    mock_db.id = "db-container-id-12345"
    mock_db.exec_run = MagicMock(return_value=(0, b"")) # port check passes

    mock_webapp = MagicMock()
    mock_webapp.status = "running"
    mock_webapp.id = "webapp-container-id-12345"
    mock_webapp.exec_run = MagicMock(return_value=(0, b"")) # port check passes
    
    def get_container(name):
        if "kali" in name:
            return mock_kali
        if "waf" in name:
            return mock_waf
        if "php" in name:
            return mock_php
        if "db" in name:
            return mock_db
        if "webapp" in name:
            return mock_webapp
        raise NotFound("Not Found")
        
    mock_client.containers.get.side_effect = get_container

    # Mock Redis
    mock_redis = AsyncMock()
    mock_redis.ping = AsyncMock(return_value=True)
    mock_redis.get = AsyncMock(return_value=None)
    mock_get_redis.return_value = mock_redis

    # Mock HTTPX for ES and OpenRouter
    mock_response_es = MagicMock()
    mock_response_es.json.return_value = {"status": "green"}
    mock_response_es.raise_for_status = MagicMock()
    
    mock_response_or = MagicMock()
    mock_response_or.raise_for_status = MagicMock()

    mock_client_instance = AsyncMock()
    mock_client_instance.get.side_effect = [mock_response_es, mock_response_or]
    mock_httpx.return_value.__aenter__.return_value = mock_client_instance

    # Run get_session_readiness for SC-01
    res = await get_session_readiness("session-12345", "SC-01")
    
    assert res["status"] == "ready"
    assert res["checks"]["kali"]["status"] == "ok"
    assert res["checks"]["redis"]["status"] == "ok"
    assert res["checks"]["elasticsearch"]["status"] == "ok"
    assert res["checks"]["openrouter"]["status"] == "ok"
    assert res["checks"]["targets"]["status"] == "ok"


@pytest.mark.asyncio
@patch("src.sandbox.readiness._get_docker_client")
@patch("src.sandbox.readiness._get_redis")
@patch("httpx.AsyncClient")
async def test_get_session_readiness_kali_reboot(mock_httpx, mock_get_redis, mock_docker_client):
    # Mock Docker
    mock_client = MagicMock()
    mock_docker_client.return_value = mock_client
    
    # Kali container mock starts exited, start makes it running
    mock_kali = MagicMock()
    mock_kali.status = "exited"
    mock_kali.id = "kali-container-id-12345"
    
    def start_kali():
        mock_kali.status = "running"
    mock_kali.start = MagicMock(side_effect=start_kali)
    
    # Target containers mock
    mock_waf = MagicMock()
    mock_waf.status = "running"
    mock_waf.id = "waf"
    mock_waf.exec_run = MagicMock(return_value=(0, b""))
    
    mock_php = MagicMock()
    mock_php.status = "running"
    mock_php.id = "php"
    mock_php.exec_run = MagicMock(return_value=(0, b""))

    mock_db = MagicMock()
    mock_db.status = "running"
    mock_db.id = "db"
    mock_db.exec_run = MagicMock(return_value=(0, b""))

    mock_webapp = MagicMock()
    mock_webapp.status = "running"
    mock_webapp.id = "webapp"
    mock_webapp.exec_run = MagicMock(return_value=(0, b""))

    def get_container(name):
        if "kali" in name:
            return mock_kali
        if "waf" in name:
            return mock_waf
        if "php" in name:
            return mock_php
        if "db" in name:
            return mock_db
        if "webapp" in name:
            return mock_webapp
        raise NotFound("Not Found")
        
    mock_client.containers.get.side_effect = get_container

    # Mock Redis
    mock_redis = AsyncMock()
    mock_redis.ping = AsyncMock(return_value=True)
    mock_redis.get = AsyncMock(return_value=None)
    mock_get_redis.return_value = mock_redis

    # Mock HTTPX
    mock_response_es = MagicMock()
    mock_response_es.json.return_value = {"status": "green"}
    
    mock_response_or = MagicMock()
    mock_response_or.raise_for_status = MagicMock()

    mock_client_instance = AsyncMock()
    mock_client_instance.get.side_effect = [mock_response_es, mock_response_or]
    mock_httpx.return_value.__aenter__.return_value = mock_client_instance

    # Run checks
    res = await get_session_readiness("session-12345", "SC-01")
    
    # Assert self-healing triggered
    mock_kali.start.assert_called_once()
    assert res["checks"]["kali"]["status"] == "ok"


# ── Tests for Readiness Routes ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_check_session_readiness_route():
    student = User(id="stud-1", role="student")
    session = Session(id="sess-1", scenario_id="SC-01", user_id="stud-1", session_metadata={"force_unlocked": True})
    
    db = _FakeDb(_Result(one=session))
    
    # We patch the call to get_session_readiness since we want to check overall route logic
    with patch("src.sandbox.readiness.get_session_readiness") as mock_get_readiness:
        mock_get_readiness.return_value = {
            "status": "initializing",
            "checks": {
                "kali": {"status": "ok"},
                "redis": {"status": "ok"},
                "elasticsearch": {"status": "ok"},
                "openrouter": {"status": "ok"},
                "targets": {"status": "degraded"}
            }
        }
        
        # Call route
        res = await check_session_readiness(session_id="sess-1", current_user=student, db=db)
        
        # Since session has force_unlocked=True, the status should be forced to "ready"
        assert res["status"] == "ready"
        assert res["force_unlocked"] is True


@pytest.mark.asyncio
async def test_override_readiness_route():
    student = User(id="stud-1", role="student")
    session = Session(id="sess-1", scenario_id="SC-01", user_id="stud-1", session_metadata={})
    
    db = _FakeDb(_Result(one=session))
    
    # Call override route
    res = await override_readiness(session_id="sess-1", current_user=student, db=db)
    
    assert res["force_unlocked"] is True
    assert session.session_metadata.get("force_unlocked") is True
    assert db.commits == 1

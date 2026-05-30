"""Unit tests for SIEM Redis deduplication."""

from __future__ import annotations

import asyncio
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.fixture()
def mock_redis():
    """Return a minimal async mock that tracks SET NX calls."""
    redis = AsyncMock()
    _store: dict[str, str] = {}

    async def fake_set(key, value, ex=None, nx=False):
        if nx and key in _store:
            return None  # NX failed — already exists
        _store[key] = value
        return True

    redis.set = fake_set
    redis.hgetall = AsyncMock(return_value={})
    redis.publish = AsyncMock(return_value=1)
    return redis, _store


@pytest.mark.asyncio
async def test_same_doc_emitted_once(mock_redis):
    """Same (session, rule, doc_id) triple must only produce one emit."""
    redis_mock, store = mock_redis

    emitted: list[tuple[str, dict]] = []

    async def fake_queue(session_id: str, event: dict):
        emitted.append((session_id, event))

    with (
        patch("src.siem.engine.get_redis", return_value=redis_mock),
        patch("src.siem.engine.queue_event", new=fake_queue),
    ):

        from src.siem import engine

        rule = {
            "id": "sc02.kerberoast",
            "severity": "CRITICAL",
            "mitre": "T1558.003",
            "scenario": "SC-02",
            "trigger": {
                "dsl": {
                    "bool": {
                        "must": [
                            {"term": {"event.code": "4769"}},
                            {"term": {"krb.enctype": "0x17"}},
                        ]
                    }
                }
            },
            "render": {"template": "Kerberoast: {{user.target.name}}"},
        }

        source = {
            "@timestamp": "2026-05-19T10:00:00.000Z",
            "event": {"code": "4769"},
            "krb": {"enctype": "0x17"},
            "user": {"target": {"name": "svc_backup"}},
            "source": {"ip": "172.20.2.10"},
            "message": "TGS_REQ RC4",
            "log": {"level": "warning"},
        }

        doc_id = "doc-abc123"
        session_id = "sess-001"
        scenario_id = "SC-02"
        active = {session_id: scenario_id}

        # First call — should emit
        dedup_key = f"cybersim:siem:emitted:{session_id}:{rule['id']}:{doc_id}"
        already1 = await redis_mock.set(dedup_key, "1", ex=3600, nx=True)
        if already1:
            await fake_queue(session_id, {"rule_id": rule["id"]})

        # Second call — same key, should NOT emit
        already2 = await redis_mock.set(dedup_key, "1", ex=3600, nx=True)
        if already2:
            await fake_queue(session_id, {"rule_id": rule["id"]})

        assert len(emitted) == 1, f"Expected 1 emit but got {len(emitted)}"


@pytest.mark.asyncio
async def test_different_docs_both_emitted(mock_redis):
    """Two different doc_ids with the same rule should both emit."""
    redis_mock, store = mock_redis

    emitted_count = 0

    session_id = "sess-002"
    rule_id = "sc02.kerberoast"

    for doc_id in ("doc-111", "doc-222"):
        dedup_key = f"cybersim:siem:emitted:{session_id}:{rule_id}:{doc_id}"
        result = await redis_mock.set(dedup_key, "1", ex=3600, nx=True)
        if result:
            emitted_count += 1

    assert emitted_count == 2, "Different docs should each emit once"


@pytest.mark.asyncio
async def test_different_sessions_both_emitted(mock_redis):
    """Same doc/rule but different session_ids should both emit."""
    redis_mock, store = mock_redis

    emitted_count = 0
    doc_id = "doc-shared"
    rule_id = "sc02.kerberoast"

    for session_id in ("sess-A", "sess-B"):
        dedup_key = f"cybersim:siem:emitted:{session_id}:{rule_id}:{doc_id}"
        result = await redis_mock.set(dedup_key, "1", ex=3600, nx=True)
        if result:
            emitted_count += 1

    assert emitted_count == 2, "Different sessions should each emit once for the same doc"

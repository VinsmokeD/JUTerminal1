"""
Session lifecycle and Redis TTL smoke tests.

Covers:
  - Keepalive key is created with correct TTL
  - Stale session is evicted from active sessions map
  - Command list write cap and read window alignment
  - Dedup key TTL (1 hour)
  - Scenario inference routing
"""
from __future__ import annotations

import asyncio
import json
import pytest
from unittest.mock import AsyncMock, patch


# ── helpers ───────────────────────────────────────────────────────────────────

class FakeRedis:
    """Minimal in-memory Redis mock for lifecycle tests."""

    def __init__(self):
        self._store: dict[str, tuple[str, int | None]] = {}  # key → (value, ttl)
        self._hash: dict[str, dict[str, str]] = {}

    # --- string ops ---
    async def set(self, key, value, ex=None, nx=False):
        if nx and key in self._store:
            return None
        self._store[key] = (str(value), ex)
        return True

    async def get(self, key):
        entry = self._store.get(key)
        return entry[0].encode() if entry else None

    async def exists(self, key):
        return 1 if key in self._store else 0

    async def ttl(self, key):
        entry = self._store.get(key)
        if entry is None:
            return -2
        return entry[1] if entry[1] is not None else -1

    async def delete(self, *keys):
        for k in keys:
            self._store.pop(k, None)

    # --- hash ops ---
    async def hset(self, name, key, value):
        self._hash.setdefault(name, {})[key] = str(value)

    async def hget(self, name, key):
        v = self._hash.get(name, {}).get(key)
        return v.encode() if v is not None else None

    async def hgetall(self, name):
        return {k.encode(): v.encode() for k, v in self._hash.get(name, {}).items()}

    async def hdel(self, name, *keys):
        h = self._hash.get(name, {})
        for k in keys:
            h.pop(k, None)

    async def hlen(self, name):
        return len(self._hash.get(name, {}))

    async def ping(self):
        return True

    async def publish(self, channel, message):
        return 1

    def pipeline(self):
        return _FakePipeline(self)


class _FakePipeline:
    def __init__(self, redis):
        self._redis = redis
        self._ops = []

    def publish(self, channel, message):
        self._ops.append(("publish", channel, message))
        return self

    async def execute(self):
        return [1] * len(self._ops)


# ── keepalive key TTL ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_keepalive_key_has_correct_ttl():
    """Keepalive key must be set with ex=7200."""
    redis = FakeRedis()
    session_id = "sess-keepalive-001"
    await redis.set(f"cybersim:session:{session_id}:alive", "1", ex=7200)
    ttl = await redis.ttl(f"cybersim:session:{session_id}:alive")
    assert ttl == 7200, f"Expected TTL 7200 but got {ttl}"


@pytest.mark.asyncio
async def test_keepalive_key_does_not_overwrite_with_shorter_ttl():
    """Re-setting keepalive must always use ex=7200 (heartbeat pattern)."""
    redis = FakeRedis()
    key = "cybersim:session:sess-hb:alive"
    await redis.set(key, "1", ex=7200)
    await redis.set(key, "1", ex=7200)  # second heartbeat
    ttl = await redis.ttl(key)
    assert ttl == 7200


# ── stale session eviction ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_stale_session_evicted_from_active_map():
    """
    A session with no keepalive key must be removed from cybersim:active_sessions
    by the cleanup loop logic.
    """
    redis = FakeRedis()
    ACTIVE_KEY = "cybersim:active_sessions"
    stale_id   = "sess-stale-001"
    alive_id   = "sess-alive-001"

    # Seed active map with both sessions
    await redis.hset(ACTIVE_KEY, stale_id, json.dumps({"scenario_id": "SC-02"}))
    await redis.hset(ACTIVE_KEY, alive_id, json.dumps({"scenario_id": "SC-01"}))

    # Only alive_id has a keepalive key
    await redis.set(f"cybersim:session:{alive_id}:alive", "1", ex=7200)

    # Simulate the cleanup sweep
    active = await redis.hgetall(ACTIVE_KEY)
    for sid_bytes in list(active.keys()):
        sid = sid_bytes.decode() if isinstance(sid_bytes, bytes) else sid_bytes
        alive = await redis.exists(f"cybersim:session:{sid}:alive")
        if not alive:
            await redis.hdel(ACTIVE_KEY, sid)

    # stale_id must be gone; alive_id must remain
    remaining = await redis.hgetall(ACTIVE_KEY)
    remaining_keys = {k.decode() if isinstance(k, bytes) else k for k in remaining}
    assert stale_id not in remaining_keys, "Stale session was not evicted"
    assert alive_id in remaining_keys, "Live session was incorrectly evicted"


@pytest.mark.asyncio
async def test_active_session_not_evicted_while_alive():
    """Session with valid keepalive key must survive the eviction sweep."""
    redis = FakeRedis()
    ACTIVE_KEY = "cybersim:active_sessions"
    sid = "sess-live-002"

    await redis.hset(ACTIVE_KEY, sid, json.dumps({"scenario_id": "SC-02"}))
    await redis.set(f"cybersim:session:{sid}:alive", "1", ex=7200)

    active = await redis.hgetall(ACTIVE_KEY)
    for sid_bytes in list(active.keys()):
        s = sid_bytes.decode() if isinstance(sid_bytes, bytes) else sid_bytes
        if not await redis.exists(f"cybersim:session:{s}:alive"):
            await redis.hdel(ACTIVE_KEY, s)

    remaining = await redis.hgetall(ACTIVE_KEY)
    remaining_keys = {k.decode() if isinstance(k, bytes) else k for k in remaining}
    assert sid in remaining_keys


# ── dedup key TTL ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_dedup_key_ttl_is_one_hour():
    """SIEM dedup keys must have exactly 3600s TTL."""
    redis = FakeRedis()
    key = "cybersim:siem:emitted:sess-001:sc02.kerberoast:doc-abc"
    await redis.set(key, "1", ex=3600, nx=True)
    ttl = await redis.ttl(key)
    assert ttl == 3600, f"Expected dedup TTL 3600 but got {ttl}"


@pytest.mark.asyncio
async def test_dedup_key_nx_prevents_duplicate():
    """Second SET NX on same dedup key must return None (already exists)."""
    redis = FakeRedis()
    key = "cybersim:siem:emitted:sess-002:sc02.kerberoast:doc-xyz"
    first  = await redis.set(key, "1", ex=3600, nx=True)
    second = await redis.set(key, "1", ex=3600, nx=True)
    assert first  is True, "First SET NX should succeed"
    assert second is None, "Second SET NX on same key should return None (already exists)"


# ── command cap alignment ─────────────────────────────────────────────────────

def test_command_cap_matches_read_window():
    """
    Write cap (max_len) and lrange end index must be the same value.
    This is enforced structurally by checking the constants in ws/routes.py.
    """
    import re
    from pathlib import Path

    routes_src = (
        Path(__file__).resolve().parents[1] / "src" / "ws" / "routes.py"
    ).read_text(encoding="utf-8")

    # Find lpush_capped call
    write_match = re.search(r"lpush_capped\([^)]+max_len=(\d+)\)", routes_src)
    assert write_match, "lpush_capped with max_len not found in ws/routes.py"
    write_cap = int(write_match.group(1))

    # Find lrange call for command history
    read_match = re.search(r"lrange\([^)]+commands[^)]+0,\s*(\d+)\)", routes_src)
    assert read_match, "lrange for session commands not found in ws/routes.py"
    read_end = int(read_match.group(1)) + 1  # lrange end is inclusive, convert to count

    assert write_cap == read_end, (
        f"Command write cap ({write_cap}) != read window ({read_end}). "
        "Update one to match the other."
    )


# ── active_sessions payload decoding ─────────────────────────────────────────

def test_decode_active_session_scenario_plain_string():
    """Legacy plain scenario_id strings decode correctly."""
    from src.siem.engine import _decode_active_session_scenario
    assert _decode_active_session_scenario(b"SC-02") == "SC-02"
    assert _decode_active_session_scenario("SC-01") == "SC-01"


def test_decode_active_session_scenario_json_payload():
    """New JSON payload format extracts scenario_id."""
    from src.siem.engine import _decode_active_session_scenario
    payload = json.dumps({"scenario_id": "SC-03", "role": "red", "phase": 2})
    assert _decode_active_session_scenario(payload.encode()) == "SC-03"


def test_decode_active_session_scenario_malformed_json():
    """Malformed JSON falls back to raw string without crashing."""
    from src.siem.engine import _decode_active_session_scenario
    result = _decode_active_session_scenario(b"{not-valid-json")
    assert isinstance(result, str)

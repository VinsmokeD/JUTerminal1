import json
import time
from typing import Any
import redis.asyncio as aioredis

from src.config import settings

_client: aioredis.Redis | None = None
_memory_cache: dict[str, Any] = {}
_memory_expiries: dict[str, float] = {}
_memory_lists: dict[str, list[Any]] = {}


async def init_redis() -> None:
    global _client
    _client = aioredis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
        max_connections=50,
        socket_timeout=5,
        socket_connect_timeout=3,
        health_check_interval=30,
    )


async def close_redis() -> None:
    global _client
    if _client:
        await _client.aclose()
        _client = None
    _memory_cache.clear()
    _memory_expiries.clear()
    _memory_lists.clear()


def _get() -> aioredis.Redis:
    if _client is None:
        raise RuntimeError("Redis not initialised — call init_redis() first")
    return _client


def _use_memory_fallback() -> bool:
    return _client is None and settings.ENVIRONMENT == "development"


def _memory_is_expired(key: str) -> bool:
    expires_at = _memory_expiries.get(key)
    if expires_at is None or expires_at > time.time():
        return False
    _memory_cache.pop(key, None)
    _memory_lists.pop(key, None)
    _memory_expiries.pop(key, None)
    return True


async def publish(channel: str, data: dict) -> None:
    if _use_memory_fallback():
        return
    await _get().publish(channel, json.dumps(data))


async def cache_get(key: str) -> Any | None:
    if _use_memory_fallback():
        if _memory_is_expired(key):
            return None
        return _memory_cache.get(key)
    val = await _get().get(key)
    if val is None:
        return None
    try:
        return json.loads(val)
    except (json.JSONDecodeError, TypeError):
        return val


async def cache_set(key: str, value: Any, ttl: int | None = None) -> None:
    if _use_memory_fallback():
        _memory_cache[key] = value
        if ttl:
            _memory_expiries[key] = time.time() + ttl
        else:
            _memory_expiries.pop(key, None)
        return
    serialised = json.dumps(value) if not isinstance(value, str) else value
    if ttl:
        await _get().setex(key, ttl, serialised)
    else:
        await _get().set(key, serialised)


async def cache_delete(key: str) -> None:
    if _use_memory_fallback():
        _memory_cache.pop(key, None)
        _memory_expiries.pop(key, None)
        _memory_lists.pop(key, None)
        return
    await _get().delete(key)


async def cache_increment(key: str, amount: int = 1, ttl: int | None = None) -> int:
    if _use_memory_fallback():
        _memory_is_expired(key)
        current = _memory_cache.get(key, 0)
        try:
            current = int(current)
        except (ValueError, TypeError):
            current = 0
        new_val = current + amount
        _memory_cache[key] = new_val
        if ttl:
            _memory_expiries[key] = time.time() + ttl
        return new_val
    new_val = await _get().incrby(key, amount)
    if ttl:
        await _get().expire(key, ttl)
    return new_val


async def lpush_capped(key: str, value: Any, max_len: int = 10) -> None:
    """Push to a list and trim to max_len most recent."""
    if _use_memory_fallback():
        items = _memory_lists.setdefault(key, [])
        items.insert(0, value)
        del items[max_len:]
        return
    client = _get()
    serialised = json.dumps(value) if not isinstance(value, str) else value
    async with client.pipeline() as pipe:
        pipe.lpush(key, serialised)
        pipe.ltrim(key, 0, max_len - 1)
        pipe.expire(key, 86400)  # 1-day TTL — prevents accumulation on abandoned sessions
        await pipe.execute()


async def lrange(key: str, start: int = 0, end: int = -1) -> list[Any]:
    if _use_memory_fallback():
        items = _memory_lists.get(key, [])
        stop = None if end == -1 else end + 1
        return items[start:stop]
    items = await _get().lrange(key, start, end)
    result = []
    for item in items:
        try:
            result.append(json.loads(item))
        except (json.JSONDecodeError, TypeError):
            result.append(item)
    return result

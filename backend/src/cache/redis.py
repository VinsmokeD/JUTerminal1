import json
from typing import Any
import redis.asyncio as aioredis

from src.config import settings

_client: aioredis.Redis | None = None


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


def _get() -> aioredis.Redis:
    if _client is None:
        raise RuntimeError("Redis not initialised — call init_redis() first")
    return _client


async def publish(channel: str, data: dict) -> None:
    await _get().publish(channel, json.dumps(data))


async def cache_get(key: str) -> Any | None:
    val = await _get().get(key)
    if val is None:
        return None
    try:
        return json.loads(val)
    except (json.JSONDecodeError, TypeError):
        return val


async def cache_set(key: str, value: Any, ttl: int | None = None) -> None:
    serialised = json.dumps(value) if not isinstance(value, str) else value
    if ttl:
        await _get().setex(key, ttl, serialised)
    else:
        await _get().set(key, serialised)


async def cache_delete(key: str) -> None:
    await _get().delete(key)


async def lpush_capped(key: str, value: Any, max_len: int = 10) -> None:
    """Push to a list and trim to max_len most recent."""
    client = _get()
    serialised = json.dumps(value) if not isinstance(value, str) else value
    async with client.pipeline() as pipe:
        pipe.lpush(key, serialised)
        pipe.ltrim(key, 0, max_len - 1)
        await pipe.execute()


async def lrange(key: str, start: int = 0, end: int = -1) -> list[Any]:
    items = await _get().lrange(key, start, end)
    result = []
    for item in items:
        try:
            result.append(json.loads(item))
        except (json.JSONDecodeError, TypeError):
            result.append(item)
    return result

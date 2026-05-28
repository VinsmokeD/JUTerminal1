
import asyncio
import sys
from src.cache.redis import _use_memory_fallback, init_redis, close_redis

async def run():
    print(f"Before init: Memory Fallback Active = {_use_memory_fallback()}")
    await init_redis()
    print(f"After init: Memory Fallback Active = {_use_memory_fallback()}")
    await close_redis()

if __name__ == "__main__":
    asyncio.run(run())

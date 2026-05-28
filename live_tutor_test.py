
import asyncio
import logging
import sys
import time
from src.ai.monitor import get_ai_hint
from src.cache.redis import init_redis, _get, cache_delete

async def test_tutor():
    logging.basicConfig(level=logging.INFO, stream=sys.stdout)
    await init_redis()
    session_id = '088c5751-9182-4e3a-91f6-a50789438971'
    state = {'scenario_id': 'SC-01', 'phase': 1, 'role': 'red'}
    
    # Clear cooldowns
    await cache_delete(f"ai:{session_id}:tutor_cooldown")
    await cache_delete(f"ai:{session_id}:last_call")
    
    print("\n--- Call 1: ls ---")
    res1 = await get_ai_hint(session_id, state, 'ls', 1)
    print(f"RESULT 1: {res1}")
    
    # Clear cooldowns
    await cache_delete(f"ai:{session_id}:tutor_cooldown")
    await cache_delete(f"ai:{session_id}:last_call")
    
    print("\n--- Call 2: whoami ---")
    res2 = await get_ai_hint(session_id, state, 'whoami', 1)
    print(f"RESULT 2: {res2}")

if __name__ == "__main__":
    asyncio.run(test_tutor())

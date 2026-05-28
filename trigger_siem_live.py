
import asyncio
from src.siem.command_bridge import create_command_siem_events, publish_command_siem_events
from src.db.database import AsyncSessionLocal
from src.cache.redis import init_redis

async def run():
    await init_redis()
    session_id = '088c5751-9182-4e3a-91f6-a50789438971'
    scenario_id = 'SC-01'
    cmd = 'nmap -sV 172.20.1.20'
    async with AsyncSessionLocal() as db:
        events = await create_command_siem_events(cmd, session_id, scenario_id, db)
        await publish_command_siem_events(session_id, events)
        print(f"Published {len(events)} events to Redis")

if __name__ == "__main__":
    asyncio.run(run())

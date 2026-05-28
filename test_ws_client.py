
import asyncio
import json
import websockets
import sys
sys.path.append("/app")

from src.auth.routes import create_token
from src.db.database import AsyncSessionLocal, User
from sqlalchemy import select
from datetime import timedelta

async def run_ws():
    # 1. Get a valid token for an existing user in the DB to pass the auth middleware
    async with AsyncSessionLocal() as db:
        from src.db.database import Session
        # Get an active session
        result = await db.execute(select(Session).limit(1))
        session_obj = result.scalar_one_or_none()
        if not session_obj:
            print("No active sessions found.")
            sys.exit(1)

        # Get the user for that session
        result = await db.execute(select(User).where(User.id == session_obj.user_id))
        user = result.scalar_one_or_none()

        token = create_token(user.id, user.username)
        session_id = session_obj.id

    url = f"ws://localhost:8000/ws/{session_id}"
    
    print(f"Connecting to {url}")
    try:
        async with websockets.connect(url) as ws:
            print("Connected.")
            # Send initial auth message
            await ws.send(json.dumps({"token": token}))
            import time
            is_ready = False
            # 2. Start a background task to receive frames
            async def receive():
                nonlocal is_ready
                try:
                    while True:
                        msg = await ws.recv()
                        print(f"Received: {msg[:100]}...")
                        data = json.loads(msg)
                        if data.get("type") == "readiness_update" and data.get("status") == "ready":
                            is_ready = True
                except Exception as e:
                    print(f"Receive error: {e}")
            
            recv_task = asyncio.create_task(receive())
            
            # Wait for readiness
            while not is_ready:
                await asyncio.sleep(0.5)
            
            # Additional small delay to ensure terminal is fully unfrozen
            await asyncio.sleep(1)
            
            # 4. Trigger SIEM event by sending a command
            cmd_payload = {
                "type": "terminal_command",
                "data": "nmap -sV 172.20.1.20"
            }
            print("Sending command...")
            await ws.send(json.dumps(cmd_payload))
            
            # 5. Wait to receive SIEM events
            await asyncio.sleep(5)
            
            recv_task.cancel()
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(run_ws())

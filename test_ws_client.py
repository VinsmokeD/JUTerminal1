
import asyncio
import json
import websockets
import sys
from src.db.database import AsyncSessionLocal
import httpx

async def run_ws():
    # 1. Get a valid token for admin or any user
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "http://localhost:8000/api/auth/login",
            data={"username": "jsmith", "password": "Password123"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        token = resp.json()["access_token"]

    session_id = "088c5751-9182-4e3a-91f6-a50789438971"
    url = f"ws://localhost:8000/ws/{session_id}?token={token}"
    
    print(f"Connecting to {url}")
    try:
        async with websockets.connect(url) as ws:
            print("Connected.")
            # 2. Start a background task to receive frames
            async def receive():
                try:
                    while True:
                        msg = await ws.recv()
                        print(f"Received: {msg[:100]}...")
                except Exception as e:
                    print(f"Receive error: {e}")
            
            recv_task = asyncio.create_task(receive())
            
            # 3. Wait a moment to ensure connection stays open
            await asyncio.sleep(1)
            
            # 4. Trigger SIEM event by sending a command
            cmd_payload = {
                "type": "terminal_command",
                "data": {"command": "nmap -sV 172.20.1.20"}
            }
            print("Sending command...")
            await ws.send(json.dumps(cmd_payload))
            
            # 5. Wait to receive SIEM events
            await asyncio.sleep(3)
            
            recv_task.cancel()
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(run_ws())

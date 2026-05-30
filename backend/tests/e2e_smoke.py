import asyncio
import json
import uuid
import pytest
import httpx
from httpx_ws import aconnect_ws

BASE_URL = "http://localhost:8001"
WS_URL = "ws://localhost:8001/ws"


@pytest.mark.asyncio
async def test_full_lifecycle_smoke():
    """
    E2E integration smoke test:
    1. Register a test user
    2. Log in and get JWT token
    3. Start an SC-01 (NovaMed) session
    4. Acknowledge ROE
    5. Connect to the PTY WebSocket, authenticate, and check for greeting
    6. Send 'nmap -sV 172.20.1.20' command via WebSocket
    7. Verify a matching 'siem_event' (for version scanning) is sent back via WebSocket within 5s
    8. Send a tutor question via WebSocket and verify an 'ai_hint' response is sent back
    9. Submit the LFI flag via HTTP and verify validation
    10. End the session and cleanup database
    """
    user_suffix = uuid.uuid4().hex[:8]
    username = f"smoke_user_{user_suffix}"
    password = "SmokeTestPass1!"

    # Use a long timeout (30 seconds) for the client to accommodate container startup and teardown
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Register
        reg_resp = await client.post(
            f"{BASE_URL}/api/auth/register", json={"username": username, "password": password}
        )
        assert reg_resp.status_code in (200, 201), f"Registration failed: {reg_resp.text}"

        # 2. Log in
        login_resp = await client.post(
            f"{BASE_URL}/api/auth/login", data={"username": username, "password": password}
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3. Start SC-01 session
        sess_resp = await client.post(
            f"{BASE_URL}/api/sessions/start",
            json={"scenario_id": "SC-01", "role": "red", "methodology": "ptes"},
            headers=headers,
        )
        assert sess_resp.status_code in (200, 201), f"Start session failed: {sess_resp.text}"
        session_id = sess_resp.json()["session_id"]

        # 4. Acknowledge ROE
        roe_resp = await client.post(
            f"{BASE_URL}/api/sessions/roe-ack", json={"session_id": session_id}, headers=headers
        )
        assert roe_resp.status_code == 200, f"ROE ack failed: {roe_resp.text}"

        # 5. Connect to WebSocket
        ws_endpoint = f"{WS_URL}/{session_id}"
        async with aconnect_ws(ws_endpoint, client) as ws:
            # Send auth token
            await ws.send_json({"token": token})

            # Check for terminal greeting
            first_msg = await ws.receive_json()
            assert (
                first_msg["type"] == "terminal_output"
            ), f"Expected terminal_output greeting, got: {first_msg}"
            assert "CyberSim Secure Sandbox PTY" in first_msg["data"]["data"]

            print("Waiting for readiness status to become 'ready'...")
            ready = False
            for _ in range(25):
                try:
                    msg = await asyncio.wait_for(ws.receive_json(), timeout=2.0)
                    if msg["type"] == "readiness_update":
                        print(f"Readiness update: {msg['status']}")
                        if msg["status"] == "ready":
                            ready = True
                            break
                except asyncio.TimeoutError:
                    pass

            # 6 & 7. Send terminal command via WebSocket
            print("Sending terminal command 'nmap -sV 172.20.1.20'...")
            await ws.send_json({"type": "terminal_command", "data": "nmap -sV 172.20.1.20"})

            # Listen to WS and look for 'siem_event' of type 'siem_event'
            siem_matched = None
            for _ in range(15):
                try:
                    msg = await asyncio.wait_for(ws.receive_json(), timeout=3.0)
                    if msg["type"] == "siem_event":
                        print(f"Received SIEM event over WS: {msg['data']['message']}")
                        if "nmap" in msg["data"]["message"].lower():
                            siem_matched = msg["data"]
                            break
                except asyncio.TimeoutError:
                    pass

            assert (
                siem_matched is not None
            ), "Did not receive expected nmap SIEM event over WebSocket"
            assert siem_matched["severity"] == "LOW"

            # 8. Send tutor question via WebSocket
            print("Sending tutor question...")
            await ws.send_json(
                {"type": "tutor_question", "data": {"text": "How do I scan the target?"}}
            )

            # Wait for AI hint response
            tutor_hint = None
            for _ in range(15):
                try:
                    msg = await asyncio.wait_for(ws.receive_json(), timeout=12.0)
                    if msg["type"] == "ai_hint":
                        print(f"Received AI hint over WS: {msg['data']['text']}")
                        tutor_hint = msg["data"]
                        break
                except asyncio.TimeoutError:
                    pass

            assert tutor_hint is not None, "Did not receive AI hint over WebSocket"
            assert "text" in tutor_hint
            assert tutor_hint["level"] == 1

        # 9. Submit the LFI flag
        print("Submitting LFI flag...")
        flag_resp = await client.post(
            f"{BASE_URL}/api/sessions/{session_id}/flag",
            json={"flag_value": "LFI confirmed: root:x:0:0"},
            headers=headers,
        )
        assert flag_resp.status_code == 200, f"Flag submission failed: {flag_resp.text}"
        assert flag_resp.json()["valid"] is True

        # 10. End the session
        print("Ending session...")
        end_resp = await client.post(f"{BASE_URL}/api/sessions/{session_id}/end", headers=headers)
        assert end_resp.status_code == 200, f"End session failed: {end_resp.text}"

        # Cleanup DB
        from src.db.database import (
            AsyncSessionLocal,
            User,
            Session,
            AIInteraction,
            SiemEvent,
            CommandLog,
            UserActivity,
        )
        import sqlalchemy as sa

        async with AsyncSessionLocal() as db:
            user_res = await db.execute(sa.select(User).where(User.username == username))
            user_obj = user_res.scalar_one_or_none()
            if user_obj:
                await db.execute(sa.delete(UserActivity).where(UserActivity.user_id == user_obj.id))
            await db.execute(sa.delete(AIInteraction).where(AIInteraction.session_id == session_id))
            await db.execute(sa.delete(SiemEvent).where(SiemEvent.session_id == session_id))
            await db.execute(sa.delete(CommandLog).where(CommandLog.session_id == session_id))
            await db.execute(sa.delete(Session).where(Session.id == session_id))
            if user_obj:
                await db.execute(sa.delete(User).where(User.id == user_obj.id))
            await db.commit()
            print("Successfully cleaned up test user and session database entries.")

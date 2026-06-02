"""Tests for the auth-hardening pass:
- password-complexity policy on registration
- server-side JWT revocation via /logout (Redis blocklist)

These run against the same live Postgres/Redis the rest of the suite uses
(see conftest.py).
"""
import time

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from src.main import app


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


def _username(tag: str = "") -> str:
    return f"hardening_{tag}_{int(time.time() * 1000)}"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "weak",
    [
        "short1A",        # < 8 chars
        "alllowercase1",  # no uppercase
        "ALLUPPERCASE1",  # no lowercase
        "NoDigitsHere",   # no digit
    ],
)
async def test_weak_password_is_rejected(client, weak):
    resp = await client.post(
        "/api/auth/register", json={"username": _username("weak"), "password": weak}
    )
    # Pydantic validation rejects before the endpoint body runs (422).
    assert resp.status_code == 422, f"weak password {weak!r} should be rejected"


@pytest.mark.asyncio
async def test_strong_password_is_accepted(client):
    resp = await client.post(
        "/api/auth/register",
        json={"username": _username("strong"), "password": "StrongPass123"},
    )
    if resp.status_code == 429:
        pytest.skip("registration rate-limited in this window")
    assert resp.status_code == 200
    assert resp.json()["access_token"]


@pytest.mark.asyncio
async def test_logout_revokes_the_token(client):
    reg = await client.post(
        "/api/auth/register",
        json={"username": _username("logout"), "password": "StrongPass123"},
    )
    if reg.status_code == 429:
        pytest.skip("registration rate-limited in this window")
    assert reg.status_code == 200
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Token is valid before logout.
    assert (await client.get("/api/auth/me", headers=headers)).status_code == 200

    # Logout adds the token's jti to the Redis blocklist.
    out = await client.post("/api/auth/logout", headers=headers)
    assert out.status_code == 200
    assert out.json()["revoked"] is True

    # The same token is now rejected.
    after = await client.get("/api/auth/me", headers=headers)
    assert after.status_code == 401

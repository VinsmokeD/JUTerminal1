"""
Phase 14 — Background noise daemon.

Runs as a global asyncio task for the lifetime of the FastAPI process.
Generates two types of noise:
  1. Real HTTP probes to scenario container IPs (populates container access logs)
  2. Synthetic low-severity SIEM events published to active session feeds

This makes the Blue Team SIEM feed realistic — students must filter signal from noise
instead of seeing only attacker-generated events.
"""
from __future__ import annotations

import asyncio
import json
import random
import uuid
from datetime import datetime, timezone

import httpx

from src.cache.redis import _get as get_redis_client

_ACTIVE_SESSIONS_KEY = "cybersim:active_sessions"

# ---------------------------------------------------------------------------
# Per-scenario noise profiles
# ---------------------------------------------------------------------------
_NOISE_PROFILES: dict[str, dict] = {
    "SC-01": {
        "http_targets": [
            "http://172.20.1.20/",
            "http://172.20.1.20/login",
            "http://172.20.1.20/favicon.ico",
            "http://172.20.1.20/robots.txt",
        ],
        "siem_events": [
            {
                "severity": "low",
                "message": "Health check from load balancer 172.20.0.1 — GET / → 200",
                "mitre": None,
                "source": "load_balancer",
            },
            {
                "severity": "low",
                "message": "Scheduled backup: cron job accessed /var/www/html/backup at 02:00 UTC",
                "mitre": None,
                "source": "cron",
            },
            {
                "severity": "low",
                "message": "Apache access log rotation completed — 0 errors",
                "mitre": None,
                "source": "syslog",
            },
            {
                "severity": "low",
                "message": "ModSecurity: rule match on User-Agent scanner (CVE scan noise) — blocked",
                "mitre": "T1595",
                "source": "waf",
            },
        ],
    },
    "SC-02": {
        "http_targets": [],  # AD environment — no HTTP targets
        "siem_events": [
            {
                "severity": "low",
                "message": "EventID 4624 — Logon Type 3: svc_print$ from NEXORA-WS01 (routine service)",
                "mitre": "T1078",
                "source": "windows_security",
            },
            {
                "severity": "low",
                "message": "EventID 4769 — Kerberos TGS-REQ for HOST/nexora-dc.nexora.local (AES256 — normal)",
                "mitre": "T1558",
                "source": "windows_security",
            },
            {
                "severity": "low",
                "message": "EventID 4648 — Explicit credentials logon: scheduled task svc_backup (routine)",
                "mitre": "T1078",
                "source": "windows_security",
            },
            {
                "severity": "low",
                "message": "DNS query: nexora-dc.nexora.local → 172.20.2.10 (routine lookup)",
                "mitre": None,
                "source": "dns",
            },
        ],
    },
    "SC-03": {
        "http_targets": [
            "http://172.20.3.40:3333/",
        ],
        "siem_events": [
            {
                "severity": "low",
                "message": "Email delivered: newsletter@orion-logistics.local → 42 recipients — SPF PASS",
                "mitre": None,
                "source": "postfix",
            },
            {
                "severity": "low",
                "message": "DKIM signature verified for mail.orion-logistics.local — routine outbound",
                "mitre": None,
                "source": "postfix",
            },
            {
                "severity": "low",
                "message": "Tracking pixel fired: helpdesk@orion-logistics.local opened internal comms digest",
                "mitre": None,
                "source": "mail_gateway",
            },
        ],
    },
}

_HTTP_TIMEOUT = httpx.Timeout(3.0)  # short timeout — containers may be down


async def _probe_http(url: str) -> None:
    """Fire-and-forget HTTP request to populate container access logs."""
    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            await client.get(
                url,
                headers={
                    "User-Agent": random.choice([
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        "python-httpx/0.27.0",
                        "curl/7.88.1",
                    ])
                },
            )
    except Exception:
        pass  # Container may be down — noise daemon must never crash the app


async def _publish_noise_event(session_id: str, scenario_id: str) -> None:
    """Publish one random low-severity noise event to this session's SIEM feed."""
    profile = _NOISE_PROFILES.get(scenario_id)
    if not profile:
        return

    event = random.choice(profile["siem_events"])
    # Normalize severity to uppercase for consistent frontend rendering
    raw_severity = event["severity"].upper()
    severity = "MED" if raw_severity == "MEDIUM" else raw_severity
    payload = {
        "id": str(uuid.uuid4()),
        "type": "siem_event",
        "session_id": session_id,
        "severity": severity,
        "message": event["message"],
        "mitre_technique": event.get("mitre"),
        "source": event.get("source", "system"),
        "noise": True,  # flag so frontend can optionally dim noise events
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        redis = get_redis_client()
        await redis.publish(f"siem:{session_id}:feed", json.dumps(payload))
    except Exception:
        pass


async def _run_noise_loop() -> None:
    """
    Main daemon loop.
    - Every 8–20 seconds: publish a noise SIEM event to each active session
    - Every 30–90 seconds: fire an HTTP probe to a random container target
    """
    http_tick = 0

    while True:
        sleep_secs = random.uniform(8.0, 20.0)
        await asyncio.sleep(sleep_secs)
        http_tick += sleep_secs

        try:
            redis = get_redis_client()
            active: dict[bytes, bytes] = await redis.hgetall(_ACTIVE_SESSIONS_KEY)
        except Exception:
            continue

        if not active:
            continue

        for session_id_raw, scenario_id_raw in active.items():
            session_id = session_id_raw.decode() if isinstance(session_id_raw, bytes) else session_id_raw
            scenario_id = scenario_id_raw.decode() if isinstance(scenario_id_raw, bytes) else scenario_id_raw

            await _publish_noise_event(session_id, scenario_id)

            # HTTP probes: run less frequently than SIEM events
            if http_tick >= random.uniform(30.0, 90.0):
                profile = _NOISE_PROFILES.get(scenario_id, {})
                targets = profile.get("http_targets", [])
                if targets:
                    asyncio.create_task(_probe_http(random.choice(targets)))

        if http_tick >= 90.0:
            http_tick = 0


def start_noise_daemon() -> asyncio.Task:
    """Create and return the background noise task. Call from lifespan."""
    return asyncio.create_task(_run_noise_loop(), name="noise_daemon")

"""
Phase 14 â€” Background noise daemon.

Runs as a global asyncio task for the lifetime of the FastAPI process.
Generates two types of noise:
  1. Real HTTP probes to scenario container IPs (populates container access logs)
  2. Synthetic low-severity SIEM events published to active session feeds

This makes the Blue Team SIEM feed realistic â€” students must filter signal from noise
instead of seeing only attacker-generated events.
"""

from __future__ import annotations

import asyncio
import json
import logging
import random
import time
import uuid
from redis.exceptions import RedisError as RedisError
from datetime import datetime, timezone

import httpx

from src.cache.redis import _get as get_redis_client

logger = logging.getLogger(__name__)

_ACTIVE_SESSIONS_KEY = "parallax:active_sessions"

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
                "message": "Health check from load balancer 172.20.0.1 â€” GET / â†’ 200",
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
                "message": "Apache access log rotation completed â€” 0 errors",
                "mitre": None,
                "source": "syslog",
            },
            {
                "severity": "low",
                "message": "ModSecurity: rule match on User-Agent scanner (CVE scan noise) â€” blocked",
                "mitre": "T1595",
                "source": "waf",
            },
        ],
    },
    "SC-02": {
        "http_targets": [],  # AD environment â€” no HTTP targets
        "siem_events": [
            {
                "severity": "low",
                "message": "EventID 4624 â€” Logon Type 3: svc_print$ from NEXORA-WS01 (routine service)",
                "mitre": "T1078",
                "source": "windows_security",
            },
            {
                "severity": "low",
                "message": "EventID 4769 â€” Kerberos TGS-REQ for HOST/nexora-dc01.nexora.local (AES256 â€” normal)",
                "mitre": "T1558",
                "source": "windows_security",
            },
            {
                "severity": "low",
                "message": "EventID 4648 â€” Explicit credentials logon: scheduled task svc_backup (routine)",
                "mitre": "T1078",
                "source": "windows_security",
            },
            {
                "severity": "low",
                "message": "DNS query: nexora-dc01.nexora.local â†’ 172.20.2.10 (routine lookup)",
                "mitre": None,
                "source": "dns",
            },
        ],
    },
    "SC-03": {
        "http_targets": [
            "http://172.20.3.10:3333/",
        ],
        "siem_events": [
            {
                "severity": "low",
                "message": "Email delivered: newsletter@orion-logistics.local â†’ 42 recipients â€” SPF PASS",
                "mitre": None,
                "source": "postfix",
            },
            {
                "severity": "low",
                "message": "DKIM signature verified for mail.orion-logistics.local â€” routine outbound",
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

_HTTP_TIMEOUT = httpx.Timeout(3.0)  # short timeout â€” containers may be down
_MIN_SECONDS_AFTER_COMMAND = 90.0
_MIN_SECONDS_BETWEEN_NOISE = 150.0


def _decode_active_session_scenario(value: object) -> str:
    """Support both legacy scenario_id values and JSON active-session payloads."""
    raw = value.decode() if isinstance(value, bytes) else str(value)
    try:
        payload = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return raw
    if isinstance(payload, dict):
        return str(payload.get("scenario_id") or "")
    return raw


async def _probe_http(url: str) -> None:
    """Fire-and-forget HTTP request to populate container access logs."""
    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            await client.get(
                url,
                headers={
                    "User-Agent": random.choice(
                        [
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                            "python-httpx/0.27.0",
                            "curl/7.88.1",
                        ]
                    )
                },
            )
    except (httpx.RequestError, asyncio.TimeoutError) as e:
        logger.debug("[NOISE] HTTP probe to %s failed (container may be down): %s", url, e)
        pass  # Container may be down â€” noise daemon must never crash the app


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
        "source": "background",
        "source_type": "background",
        "sensor": event.get("source", "system"),
        "noise": True,  # flag so frontend can optionally dim noise events
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        redis = get_redis_client()
        await redis.publish(f"siem:{session_id}:feed", json.dumps(payload))
    except RedisError as e:
        logger.warning("[NOISE] Failed to publish noise event for session %s: %s", session_id, e)


async def _get_session_seed(redis: object, session_id: str) -> int | None:
    """Retrieve the randomization seed stored in Redis for a session, if any."""
    try:
        import json as _json

        raw = await redis.get(f"session:{session_id}:rand_seed")  # type: ignore[attr-defined]
        if raw:
            return int(raw.decode() if isinstance(raw, bytes) else raw)
    except RedisError as e:
        logger.warning(
            "[NOISE] Failed to get session seed from redis for session %s: %s", session_id, e
        )
    return None


async def _run_noise_loop() -> None:
    """
    Main daemon loop.
    - Every 30â€“60 seconds (jittered per-session seed): publish one noise SIEM event
    - Every 90â€“180 seconds: fire an HTTP probe to a random container target

    Interval is intentionally long so noise doesn't overwhelm students who
    haven't typed any commands yet. Noise events are also dimmed in the UI.
    """
    http_tick: float = 0.0
    try:
        redis = get_redis_client()
        await redis.delete(_ACTIVE_SESSIONS_KEY)
    except RedisError as e:
        logger.warning("[NOISE] Failed to clear active sessions key on startup: %s", e)

    while True:
        sleep_secs = random.uniform(30.0, 60.0)
        await asyncio.sleep(sleep_secs)
        http_tick += sleep_secs

        try:
            redis = get_redis_client()
            active: dict[bytes, bytes] = await redis.hgetall(_ACTIVE_SESSIONS_KEY)  # type: ignore[misc]  # redis-py stub returns Awaitable|dict
        except RedisError as e:
            logger.warning("[NOISE] Failed to get active sessions: %s", e)
            continue

        if not active:
            continue

        for session_id_raw, scenario_id_raw in active.items():
            session_id = (
                session_id_raw.decode() if isinstance(session_id_raw, bytes) else session_id_raw
            )
            scenario_id = _decode_active_session_scenario(scenario_id_raw)

            now = time.time()
            try:
                last_noise_raw = await redis.get(f"noise:{session_id}:last_event_time")
                if last_noise_raw:
                    last_noise = float(
                        last_noise_raw.decode()
                        if isinstance(last_noise_raw, bytes)
                        else last_noise_raw
                    )

                    # Use session seed for jitter: sessions with even seeds get
                    # slightly shorter intervals to create realistic variation.
                    seed = await _get_session_seed(redis, session_id)
                    if seed is not None:
                        rng = random.Random(seed ^ int(now / 60))
                        min_between = rng.uniform(120.0, 200.0)
                    else:
                        min_between = _MIN_SECONDS_BETWEEN_NOISE

                    if now - last_noise < min_between:
                        continue
            except RedisError as e:
                logger.warning(
                    "[NOISE] Failed to get last noise time for session %s: %s", session_id, e
                )
                continue

            # Use session RNG for event selection if seed available
            seed = await _get_session_seed(redis, session_id)
            profile = _NOISE_PROFILES.get(scenario_id)
            if not profile:
                continue
            if seed is not None:
                rng = random.Random(seed ^ int(now / 30))
                event = rng.choice(profile["siem_events"])
            else:
                event = random.choice(profile["siem_events"])

            await _publish_noise_event_direct(session_id, scenario_id, event)

            try:
                await redis.set(f"noise:{session_id}:last_event_time", str(now), ex=7200)
            except RedisError as e:
                logger.warning(
                    "[NOISE] Failed to update last noise time for session %s: %s", session_id, e
                )

            # HTTP probes: run much less frequently than SIEM events
            if http_tick >= random.uniform(90.0, 180.0):
                targets = profile.get("http_targets", [])
                if targets:
                    asyncio.create_task(_probe_http(random.choice(targets)))

        if http_tick >= 180.0:
            http_tick = 0


async def _publish_noise_event_direct(
    session_id: str,
    scenario_id: str,
    event: dict,
) -> None:
    """Publish a specific noise event to this session's SIEM feed."""
    raw_severity = event["severity"].upper()
    severity = "MED" if raw_severity == "MEDIUM" else raw_severity
    payload = {
        "id": str(uuid.uuid4()),
        "type": "siem_event",
        "session_id": session_id,
        "severity": severity,
        "message": event["message"],
        "mitre_technique": event.get("mitre"),
        "source": "background",
        "source_type": "background",
        "sensor": event.get("source", "system"),
        "noise": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        redis = get_redis_client()
        await redis.publish(f"siem:{session_id}:feed", json.dumps(payload))
    except RedisError as e:
        logger.warning("[NOISE] Failed to publish noise event for session %s: %s", session_id, e)


def start_noise_daemon() -> asyncio.Task:
    """Create and return the background noise task. Call from lifespan."""
    return asyncio.create_task(_run_noise_loop(), name="noise_daemon")

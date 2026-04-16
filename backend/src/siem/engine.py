import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict

import httpx

from src.cache.redis import _get as get_redis

# Global event batch queue and flush task
_event_queue: Optional[asyncio.Queue] = None
_batch_flush_task: Optional[asyncio.Task] = None
_elk_poll_task: Optional[asyncio.Task] = None

# Track last polled timestamp to avoid duplicate events
_last_poll_time: str = "now-1m"

# Track active sessions for routing logs
_active_sessions: Dict[str, str] = {}  # session_id -> scenario_id


async def queue_event(session_id: str, event: dict) -> None:
    """Queue an event for batched publishing (reduces Redis round-trips)."""
    if _event_queue is None:
        redis = get_redis()
        await redis.publish(f"siem:{session_id}:feed", json.dumps(event))
    else:
        await _event_queue.put((session_id, event))


async def _batch_flush() -> None:
    """Background task that flushes batched events every 100ms or when queue reaches 10 events."""
    global _event_queue
    if _event_queue is None:
        return

    batch: dict[str, list[dict]] = {}
    while True:
        try:
            while len(batch) < 10:
                try:
                    session_id, event = _event_queue.get_nowait()
                    if session_id not in batch:
                        batch[session_id] = []
                    batch[session_id].append(event)
                except asyncio.QueueEmpty:
                    if batch:
                        try:
                            session_id, event = await asyncio.wait_for(_event_queue.get(), timeout=0.1)
                            if session_id not in batch:
                                batch[session_id] = []
                            batch[session_id].append(event)
                        except asyncio.TimeoutError:
                            break
                    else:
                        session_id, event = await _event_queue.get()
                        if session_id not in batch:
                            batch[session_id] = []
                        batch[session_id].append(event)
                        break

            if batch:
                redis = get_redis()
                pipe = redis.pipeline()
                for session_id, events in batch.items():
                    for event in events:
                        pipe.publish(f"siem:{session_id}:feed", json.dumps(event))
                await pipe.execute()
                batch.clear()

        except Exception as e:
            print(f"Error in SIEM batch flush: {e}")
            batch.clear()
            await asyncio.sleep(0.1)


def _infer_severity(source: dict) -> str:
    """Derive a severity level from Elasticsearch log fields."""
    # Filebeat/ECS fields that carry severity info
    level = (
        source.get("log", {}).get("level", "")
        or source.get("log_level", "")
        or source.get("level", "")
        or ""
    ).lower()
    if level in ("critical", "emergency", "alert"):
        return "CRITICAL"
    if level in ("error", "err"):
        return "HIGH"
    if level in ("warning", "warn"):
        return "MED"
    # Heuristic: WAF block / auth failure keywords → HIGH
    msg = (source.get("message", "") or "").lower()
    if any(kw in msg for kw in ("denied", "blocked", "unauthorized", "failed", "attack", "exploit")):
        return "HIGH"
    if any(kw in msg for kw in ("warning", "suspicious", "anomaly", "brute")):
        return "MED"
    return "LOW"


def _infer_scenario(source: dict) -> str | None:
    """
    Guess the scenario a log event belongs to from its content/index.

    Returns a scenario ID string like 'SC-01', 'SC-02', 'SC-03', or None
    if it cannot be determined (broadcast to all in that case).
    """
    fields = json.dumps(source).lower()
    if any(kw in fields for kw in ("nexora", "samba", "kerberos", "ldap", "winbind", "domain")):
        return "SC-02"
    if any(kw in fields for kw in ("gophish", "phish", "postfix", "smtp", "orion")):
        return "SC-03"
    if any(kw in fields for kw in ("modsecurity", "novamed", "apache", "mysql", "owasp")):
        return "SC-01"
    return None


async def _poll_elasticsearch() -> None:
    """Background daemon to poll the Elastic Stack for real target telemetry logs."""
    global _last_poll_time, _active_sessions

    async with httpx.AsyncClient() as client:
        while True:
            await asyncio.sleep(2.0)  # Poll every 2 seconds

            if not _active_sessions:
                continue

            try:
                query = {
                    "query": {"range": {"@timestamp": {"gte": _last_poll_time}}},
                    "sort": [{"@timestamp": "asc"}],
                    "size": 100,
                }

                response = await client.post(
                    "http://elasticsearch:9200/_search", json=query, timeout=5.0
                )
                if response.status_code != 200:
                    continue

                data = response.json()
                hits = data.get("hits", {}).get("hits", [])
                if not hits:
                    continue

                _last_poll_time = hits[-1]["_source"]["@timestamp"]

                for hit in hits:
                    source = hit["_source"]
                    now = datetime.now(timezone.utc).isoformat()
                    event = {
                        "id": hit["_id"],
                        "timestamp": source.get("@timestamp", now),
                        "created_at": now,
                        "severity": _infer_severity(source),
                        "message": source.get("message", "Log event detected"),
                        "raw_log": json.dumps(source),
                        "mitre_technique": source.get("mitre_technique", ""),
                        "source": "elasticsearch",
                        "source_ip": source.get("source", {}).get("ip", "172.20.0.0/16"),
                        "tool_triggered": "filebeat",
                    }

                    # Route only to sessions running the matching scenario;
                    # fall back to all sessions when scenario can't be inferred.
                    target_scenario = _infer_scenario(source)
                    for session_id, scenario_id in list(_active_sessions.items()):
                        if target_scenario is None or scenario_id == target_scenario:
                            await queue_event(session_id, event)

            except httpx.RequestError:
                await asyncio.sleep(5.0)
            except Exception as e:
                print(f"Elasticsearch polling error: {e}")
                await asyncio.sleep(5.0)


async def register_session(session_id: str, scenario_id: str) -> None:
    """Register a new session so its logs can be forwarded from Elastic"""
    _active_sessions[session_id] = scenario_id


async def unregister_session(session_id: str) -> None:
    """Stop forwarding logs for a closed session"""
    if session_id in _active_sessions:
        del _active_sessions[session_id]


async def init_siem_batch() -> None:
    """Initialize the SIEM batch system (call from main.py lifespan)."""
    global _event_queue, _batch_flush_task, _elk_poll_task
    _event_queue = asyncio.Queue(maxsize=1000)
    _batch_flush_task = asyncio.create_task(_batch_flush())
    _elk_poll_task = asyncio.create_task(_poll_elasticsearch())


async def close_siem_batch() -> None:
    """Close the SIEM batch system (call from main.py lifespan)."""
    global _batch_flush_task, _elk_poll_task
    if _batch_flush_task:
        _batch_flush_task.cancel()
    if _elk_poll_task:
        _elk_poll_task.cancel()
        
    try:
        if _batch_flush_task:
            await _batch_flush_task
        if _elk_poll_task:
            await _elk_poll_task
    except asyncio.CancelledError:
        pass


async def process_command_for_siem(session_id: str, state: dict, command: str) -> list[dict]:
    """
    Match terminal commands against SIEM event definitions and queue triggered events.

    For SC-01: SQL injection, LFI, IDOR, file upload, XSS, authentication, etc.
    For SC-02: AD enumeration, Kerberoasting, lateral movement, DCSync, etc.
    For SC-03: OSINT, phishing campaign, payload execution, C2 callback, etc.

    Returns list of triggered events.
    """
    import os
    import re
    import json as json_lib

    triggered_events = []
    scenario_id = state.get("scenario_id", "sc01")

    try:
        # Load scenario-specific SIEM event definitions
        events_file = os.path.join(
            os.path.dirname(__file__),
            "events",
            f"{scenario_id}_events.json"
        )

        if not os.path.exists(events_file):
            # No event definitions for this scenario
            return []

        with open(events_file, 'r') as f:
            events_data = json_lib.load(f)

        # Flatten all event categories into a single list
        all_events = []
        if isinstance(events_data, dict):
            for category, events in events_data.items():
                if isinstance(events, list):
                    all_events.extend(events)
        else:
            all_events = events_data if isinstance(events_data, list) else []

        # Match command against each event's trigger pattern
        for event in all_events:
            if not isinstance(event, dict):
                continue

            trigger_pattern = event.get("trigger_pattern", "")
            if not trigger_pattern:
                continue

            # Case-insensitive regex matching
            try:
                if re.search(trigger_pattern, command, re.IGNORECASE):
                    # Event triggered! Clone the event and add metadata
                    triggered_event = event.copy()
                    triggered_event["id"] = event.get("id", f"event_{uuid.uuid4().hex[:8]}")
                    triggered_event["timestamp"] = datetime.now(timezone.utc).isoformat()
                    triggered_event["created_at"] = datetime.now(timezone.utc).isoformat()

                    # Queue the event for Redis pub/sub broadcast
                    await queue_event(session_id, triggered_event)
                    triggered_events.append(triggered_event)

            except re.error:
                # Skip malformed regex patterns
                continue

        return triggered_events

    except Exception as e:
        print(f"Error processing SIEM events for {scenario_id}: {e}")
        return []

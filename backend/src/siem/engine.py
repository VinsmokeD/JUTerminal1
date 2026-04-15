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


async def _poll_elasticsearch() -> None:
    """Background daemon to poll the Elastic Stack for real target telemetry logs."""
    global _last_poll_time, _active_sessions
    
    async with httpx.AsyncClient() as client:
        while True:
            await asyncio.sleep(2.0)  # Poll every 2 seconds
            
            if not _active_sessions:
                continue
                
            try:
                # Query Elasticsearch for any log events since last poll
                query = {
                    "query": {
                        "range": {
                            "@timestamp": {
                                "gte": _last_poll_time
                            }
                        }
                    },
                    "sort": [{"@timestamp": "asc"}],
                    "size": 100
                }
                
                response = await client.post("http://elasticsearch:9200/_search", json=query, timeout=5.0)
                if response.status_code == 200:
                    data = response.json()
                    hits = data.get("hits", {}).get("hits", [])
                    
                    if hits:
                        # Update last poll time to the latest document timestamp
                        _last_poll_time = hits[-1]["_source"]["@timestamp"]
                        
                        for hit in hits:
                            source = hit["_source"]
                            
                            # Convert generic Elastic log to SIEM-friendly React format
                            now = datetime.now(timezone.utc).isoformat()
                            event = {
                                "id": hit["_id"],
                                "timestamp": source.get("@timestamp", now),
                                "created_at": now,
                                "severity": "MED",
                                "message": source.get("message", "Log event detected"),
                                "raw_log": json.dumps(source),
                                "mitre_technique": "",
                                "source": "elasticsearch",
                                "source_ip": "172.20.0.0/16",
                                "tool_triggered": "filebeat",
                            }
                            
                            # Broadcast the authentic log to all active sessions!
                            for session_id in _active_sessions.keys():
                                await queue_event(session_id, event)

            except httpx.RequestError as e:
                # Elastic might be down or not ready yet, just back off
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
    Deprecated: Commands no longer trigger SIEM directly in regex mode.
    Elasticsearch agent handles actual target polling now.
    """
    return []

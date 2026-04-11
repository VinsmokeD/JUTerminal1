import asyncio
import functools
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from src.cache.redis import _get as get_redis

EVENTS_DIR = Path(__file__).parent / "events"

# Global event batch queue and flush task
_event_queue: Optional[asyncio.Queue] = None
_batch_flush_task: Optional[asyncio.Task] = None


@functools.lru_cache(maxsize=16)
def _load_event_map(scenario_id: str) -> dict:
    path = EVENTS_DIR / f"{scenario_id.lower().replace('-', '')}_events.json"
    if path.exists():
        return json.loads(path.read_text())
    return {}


# Parse which tool is being run from a command string
def _detect_tool(command: str) -> str:
    command = command.strip().lower()
    tools = ["nmap", "nikto", "gobuster", "ffuf", "sqlmap", "wfuzz", "hydra",
             "curl", "wget", "burpsuite", "msfconsole", "metasploit", "bloodhound",
             "crackmapexec", "impacket", "rubeus", "mimikatz", "hashcat", "john",
             "awscli", "aws", "pacu", "s3scanner", "trufflehog", "gobuster"]
    for tool in tools:
        if command.startswith(tool) or f" {tool}" in command:
            return tool
    return "shell"


async def queue_event(session_id: str, event: dict) -> None:
    """Queue an event for batched publishing (reduces Redis round-trips)."""
    if _event_queue is None:
        # Fallback to direct publish if batch system not initialized
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
            # Try to collect events for up to 100ms
            while len(batch) < 10:  # Up to 10 events before flushing
                try:
                    session_id, event = _event_queue.get_nowait()
                    if session_id not in batch:
                        batch[session_id] = []
                    batch[session_id].append(event)
                except asyncio.QueueEmpty:
                    if batch:
                        # If we have events, wait up to 100ms for more
                        try:
                            session_id, event = await asyncio.wait_for(_event_queue.get(), timeout=0.1)
                            if session_id not in batch:
                                batch[session_id] = []
                            batch[session_id].append(event)
                        except asyncio.TimeoutError:
                            break
                    else:
                        # No events, wait indefinitely for the next one
                        session_id, event = await _event_queue.get()
                        if session_id not in batch:
                            batch[session_id] = []
                        batch[session_id].append(event)
                        break

            # Publish batch via pipeline
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
            await asyncio.sleep(0.1)  # Backoff on error


async def init_siem_batch() -> None:
    """Initialize the SIEM batch system (call from main.py lifespan)."""
    global _event_queue, _batch_flush_task
    _event_queue = asyncio.Queue(maxsize=1000)
    _batch_flush_task = asyncio.create_task(_batch_flush())


async def close_siem_batch() -> None:
    """Close the SIEM batch system (call from main.py lifespan)."""
    global _batch_flush_task
    if _batch_flush_task:
        _batch_flush_task.cancel()
        try:
            await _batch_flush_task
        except asyncio.CancelledError:
            pass


async def process_command_for_siem(session_id: str, state: dict, command: str) -> list[dict]:
    """Map a terminal command to SIEM events and queue them for publishing."""
    scenario_id = state.get("scenario_id", "SC-01")
    event_map = _load_event_map(scenario_id)
    tool = _detect_tool(command)
    events = event_map.get(tool, [])

    result = []
    for template in events:
        # Normalize severity to uppercase for consistent frontend rendering
        raw_severity = template.get("severity", "INFO").upper()
        # Map 'MEDIUM' → 'MED' to match frontend styles
        severity = "MED" if raw_severity == "MEDIUM" else raw_severity
        now = datetime.now(timezone.utc).isoformat()
        event = {
            "id": str(uuid.uuid4()),
            "timestamp": now,
            "created_at": now,
            "severity": severity,
            "message": template.get("message", ""),
            "raw_log": template.get("raw_log", "").replace("{src_ip}", "172.20.1.10"),
            "mitre_technique": template.get("mitre_technique"),
            "source": template.get("source", "attacker"),
            "source_ip": "172.20.1.10",
            "tool_triggered": tool,
        }
        result.append(event)
        await queue_event(session_id, event)

    return result

"""SIEM engine â€” ES-poll driven, Sigma-style rule matching, Redis dedup."""

from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import httpx
import yaml

from src.cache.redis import _get as get_redis

# ---------------------------------------------------------------------------
# Global task handles
# ---------------------------------------------------------------------------
_event_queue: Optional[asyncio.Queue] = None
_batch_flush_task: Optional[asyncio.Task] = None
_elk_poll_task: Optional[asyncio.Task] = None

# Baseline timestamp; advances with each poll so no doc is processed twice
_last_poll_time: str = "now-1m"

# Compiled rule list loaded at startup from backend/src/siem/rules/*.yaml
_RULES: list[dict] = []

_RULES_DIR = Path(__file__).resolve().parent / "rules"
_ACTIVE_KEY = "parallax:active_sessions"
_DEDUP_TTL = 3600  # 1 hour


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


# ---------------------------------------------------------------------------
# Rule loader
# ---------------------------------------------------------------------------


def _load_rules() -> list[dict]:
    rules: list[dict] = []
    for path in sorted(_RULES_DIR.glob("*.yaml")):
        try:
            data = yaml.safe_load(path.read_text(encoding="utf-8"))
            rules.extend(data.get("rules", []))
        except Exception as exc:
            print(f"[SIEM] Failed to load rule file {path}: {exc}")
    return rules


# ---------------------------------------------------------------------------
# Batch event publisher
# ---------------------------------------------------------------------------


async def queue_event(session_id: str, event: dict) -> None:
    import time as _time

    if _event_queue is None:
        redis = get_redis()
        await redis.publish(f"siem:{session_id}:feed", json.dumps(event))
    else:
        await _event_queue.put((session_id, event))
    try:
        r = get_redis()
        await r.set("metrics:siem_last_event_ts", str(_time.time()), ex=3600)
    except Exception:
        pass


async def _batch_flush() -> None:
    global _event_queue
    if _event_queue is None:
        return

    batch: dict[str, list[dict]] = {}
    while True:
        try:
            while len(batch) < 10:
                try:
                    session_id, event = _event_queue.get_nowait()
                    batch.setdefault(session_id, []).append(event)
                except asyncio.QueueEmpty:
                    if batch:
                        try:
                            session_id, event = await asyncio.wait_for(
                                _event_queue.get(), timeout=0.1
                            )
                            batch.setdefault(session_id, []).append(event)
                        except asyncio.TimeoutError:
                            break
                    else:
                        session_id, event = await _event_queue.get()
                        batch.setdefault(session_id, []).append(event)
                        break

            if batch:
                redis = get_redis()
                pipe = redis.pipeline()
                for sid, events in batch.items():
                    for ev in events:
                        pipe.publish(f"siem:{sid}:feed", json.dumps(ev))
                await pipe.execute()
                batch.clear()

        except Exception as exc:
            print(f"[SIEM] Batch flush error: {exc}")
            batch.clear()
            await asyncio.sleep(0.1)


# ---------------------------------------------------------------------------
# Severity / scenario inference helpers
# ---------------------------------------------------------------------------


def _infer_severity(source: dict) -> str:
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
    msg = (source.get("message", "") or "").lower()
    if any(
        kw in msg for kw in ("denied", "blocked", "unauthorized", "failed", "attack", "exploit")
    ):
        return "HIGH"
    if any(kw in msg for kw in ("warning", "suspicious", "anomaly", "brute")):
        return "MED"
    return "LOW"


def _infer_scenario(source: dict) -> str | None:
    fields = json.dumps(source).lower()
    if any(kw in fields for kw in ("nexora", "samba", "kerberos", "ldap", "winbind", "domain")):
        return "SC-02"
    if any(kw in fields for kw in ("gophish", "phish", "postfix", "smtp", "orion")):
        return "SC-03"
    if any(kw in fields for kw in ("modsecurity", "novamed", "apache", "mysql", "owasp")):
        return "SC-01"
    return None


# ---------------------------------------------------------------------------
# Sigma-rule DSL matcher (shallow but sufficient for Parallax field depth)
# ---------------------------------------------------------------------------


def _get_field(source: dict, dotted: str) -> object:
    """Traverse dotted ECS field path in a nested dict."""
    parts = dotted.split(".")
    node: object = source
    for p in parts:
        if not isinstance(node, dict):
            return None
        node = node.get(p)
    return node


def _match_dsl(source: dict, dsl: dict) -> bool:
    """Recursively evaluate a simplified ES-DSL clause against a log source dict."""
    for op, value in dsl.items():
        if op == "bool":
            must = value.get("must", [])
            should = value.get("should", [])
            must_not = value.get("must_not", [])
            if must and not all(_match_dsl(source, clause) for clause in must):
                return False
            if should and not any(_match_dsl(source, clause) for clause in should):
                return False
            if must_not and any(_match_dsl(source, clause) for clause in must_not):
                return False
        elif op == "term":
            for field, expected in value.items():
                if str(_get_field(source, field)) != str(expected):
                    return False
        elif op == "match":
            for field, needle in value.items():
                haystack = str(_get_field(source, field) or "")
                if needle.lower() not in haystack.lower():
                    return False
        elif op == "range":
            for field, bounds in value.items():
                try:
                    v = float(str(_get_field(source, field) or 0))
                    if "gte" in bounds and v < bounds["gte"]:
                        return False
                    if "lte" in bounds and v > bounds["lte"]:
                        return False
                except (TypeError, ValueError):
                    return False
        elif op == "regexp":
            import re

            for field, pattern in value.items():
                if not re.search(pattern, str(_get_field(source, field) or ""), re.IGNORECASE):
                    return False
    return True


def _render_template(template: str, source: dict) -> str:
    """Replace {{field.path}} placeholders with source values."""
    import re

    def replacer(m: re.Match) -> str:
        return str(_get_field(source, m.group(1)) or "?")

    return re.sub(r"\{\{([^}]+)\}\}", replacer, template)


# ---------------------------------------------------------------------------
# Main Elasticsearch poll + rule-match loop
# ---------------------------------------------------------------------------


async def _poll_elasticsearch() -> None:
    global _last_poll_time

    async with httpx.AsyncClient() as client:
        while True:
            await asyncio.sleep(2.0)
            try:
                redis = get_redis()
                raw = await redis.hgetall(_ACTIVE_KEY)  # type: ignore[misc]  # redis-py stub
            except Exception:
                continue

            if not raw:
                _last_poll_time = datetime.now(timezone.utc).isoformat()
                continue

            active: dict[str, str] = {
                (k.decode() if isinstance(k, bytes) else k): _decode_active_session_scenario(v)
                for k, v in raw.items()
            }

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
                    _last_poll_time = datetime.now(timezone.utc).isoformat()
                    continue

                _last_poll_time = hits[-1]["_source"]["@timestamp"]

                for hit in hits:
                    source = hit["_source"]
                    doc_id = hit["_id"]
                    now = datetime.now(timezone.utc)

                    doc_ts_str = source.get("@timestamp", now.isoformat())
                    try:
                        doc_ts = datetime.fromisoformat(doc_ts_str.replace("Z", "+00:00"))
                        latency_ms = int((now - doc_ts).total_seconds() * 1000)
                    except ValueError:
                        latency_ms = 0

                    target_scenario = _infer_scenario(source)

                    for rule in _RULES:
                        try:
                            dsl = rule.get("trigger", {}).get("dsl", {})
                            if not _match_dsl(source, dsl):
                                continue
                        except Exception:
                            continue

                        rule_scenario = rule.get("scenario")
                        severity = rule.get("severity", _infer_severity(source))
                        message = _render_template(
                            rule.get("render", {}).get(
                                "template", source.get("message", "SIEM event")
                            ),
                            source,
                        )

                        for session_id, scenario_id in active.items():
                            # Skip rules not relevant to this session's scenario
                            if rule_scenario and rule_scenario != scenario_id:
                                if target_scenario and target_scenario != scenario_id:
                                    continue

                            # Redis-based dedup: one emit per (session, rule, doc) per hour
                            dedup_key = f"parallax:siem:emitted:{session_id}:{rule['id']}:{doc_id}"
                            redis = get_redis()
                            already = await redis.set(dedup_key, "1", ex=_DEDUP_TTL, nx=True)
                            if not already:
                                continue

                            event = {
                                "id": f"{rule['id']}-{uuid.uuid4().hex[:8]}",
                                "rule_id": rule["id"],
                                "timestamp": source.get("@timestamp", now.isoformat()),
                                "created_at": now.isoformat(),
                                "severity": severity,
                                "message": message,
                                "raw_log": json.dumps(source),
                                "mitre_technique": rule.get("mitre", ""),
                                "source": "elasticsearch",
                                "source_ip": str((_get_field(source, "source.ip") or "")),
                                "tool_triggered": "sigma_rule",
                                "detection_latency_ms": latency_ms,
                            }
                            await queue_event(session_id, event)

            except httpx.RequestError:
                await asyncio.sleep(5.0)
            except Exception as exc:
                print(f"[SIEM] Elasticsearch poll error: {exc}")
                await asyncio.sleep(5.0)


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------


async def _ensure_es_ilm(client: httpx.AsyncClient) -> None:
    """
    Create (or update) an ILM policy + index template on Elasticsearch so
    parallax-logs-* and filebeat-* indices roll over at 5 GB / 7 days and
    are deleted after 30 days.  Runs once at startup; is idempotent (PUT).
    """
    policy = {
        "policy": {
            "phases": {
                "hot": {
                    "min_age": "0ms",
                    "actions": {"rollover": {"max_size": "5gb", "max_age": "7d"}},
                },
                "delete": {
                    "min_age": "30d",
                    "actions": {"delete": {}},
                },
            }
        }
    }
    index_template = {
        "index_patterns": ["parallax-logs-*", "filebeat-*"],
        "template": {"settings": {"index.lifecycle.name": "parallax-logs"}},
    }
    await client.put(
        "http://elasticsearch:9200/_ilm/policy/parallax-logs",
        json=policy,
        timeout=10.0,
    )
    await client.put(
        "http://elasticsearch:9200/_index_template/parallax-logs-template",
        json=index_template,
        timeout=10.0,
    )


async def _apply_es_ilm_on_startup() -> None:
    last_error: Exception | None = None
    for attempt in range(1, 7):
        try:
            async with httpx.AsyncClient() as client:
                await _ensure_es_ilm(client)
                print("[SIEM] Elasticsearch ILM policy and index template applied.")
                return
        except Exception as exc:
            last_error = exc
            if attempt < 6:
                await asyncio.sleep(min(2 * attempt, 10))
    print(f"[SIEM] Could not apply ES ILM policy (non-fatal): {last_error}")


async def init_siem_batch() -> None:
    global _event_queue, _batch_flush_task, _elk_poll_task, _RULES
    _RULES = _load_rules()
    print(f"[SIEM] Loaded {len(_RULES)} Sigma rules from {_RULES_DIR}")
    _event_queue = asyncio.Queue(maxsize=1000)
    _batch_flush_task = asyncio.create_task(_batch_flush())
    _elk_poll_task = asyncio.create_task(_poll_elasticsearch())
    # Apply ILM policy in the background â€” failure must not block startup
    asyncio.create_task(_apply_es_ilm_on_startup())


async def close_siem_batch() -> None:
    global _batch_flush_task, _elk_poll_task
    for task in (_batch_flush_task, _elk_poll_task):
        if task:
            task.cancel()
    try:
        if _batch_flush_task:
            await _batch_flush_task
        if _elk_poll_task:
            await _elk_poll_task
    except (asyncio.CancelledError, Exception) as exc:
        if not isinstance(exc, asyncio.CancelledError):
            print(f"[SIEM] Shutdown error: {exc}")

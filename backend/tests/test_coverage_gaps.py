from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from src.db.database import CommandLog, Note, Session, SiemEvent, User
from src.notes.routes import NoteCreate, create_note, list_notes
from src.reports.routes import get_consolidated_report
from src.scoring.engine import compute_hint_penalty, compute_time_bonus, final_score
from src.scoring.routes import get_score


class _ScalarResult:
    def __init__(self, items):
        self._items = list(items)

    def all(self):
        return list(self._items)

    def first(self):
        return self._items[0] if self._items else None

    def __iter__(self):
        return iter(self._items)


class _Result:
    def __init__(self, *, one=None, many=None):
        self._one = one
        self._many = list(many or [])

    def scalar_one_or_none(self):
        return self._one

    def scalars(self):
        return _ScalarResult(self._many if self._many else ([] if self._one is None else [self._one]))

    def fetchone(self):
        return self._one

    def all(self):
        return list(self._many)


class _FakeDb:
    def __init__(self, *results):
        self.results = list(results)
        self.added = []
        self.deleted = []
        self.commits = 0
        self.refreshed = []

    async def execute(self, _query):
        if not self.results:
            raise AssertionError("unexpected execute call")
        return self.results.pop(0)

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.commits += 1

    async def refresh(self, item):
        if not getattr(item, "id", None):
            item.id = f"fake-{len(self.refreshed) + 1}"
        if not getattr(item, "created_at", None):
            item.created_at = datetime(2026, 5, 20, tzinfo=timezone.utc)
        self.refreshed.append(item)

    async def delete(self, item):
        self.deleted.append(item)


def _user(user_id: str = "user-1") -> User:
    return User(id=user_id, username="student", password_hash="hash")


def _session(**overrides) -> Session:
    data = {
        "id": "sess-1",
        "user_id": "user-1",
        "scenario_id": "SC-01",
        "role": "red",
        "methodology": "ptes",
        "phase": 2,
        "score": 85,
        "hints_used": [{"level": 1}, {"level": 3}],
        "roe_acknowledged": True,
        "started_at": datetime(2026, 5, 20, 9, 0, tzinfo=timezone.utc),
        "completed_at": datetime(2026, 5, 20, 10, 0, tzinfo=timezone.utc),
        "container_id": "abc123",
    }
    data.update(overrides)
    return Session(**data)


def _note(**overrides) -> Note:
    data = {
        "id": "note-1",
        "session_id": "sess-1",
        "tag": "finding",
        "content": "Found exposed admin path",
        "phase": 2,
        "created_at": datetime(2026, 5, 20, 9, 15, tzinfo=timezone.utc),
    }
    data.update(overrides)
    return Note(**data)


def _command(**overrides) -> CommandLog:
    data = {
        "id": "cmd-1",
        "session_id": "sess-1",
        "command": "nmap -sV 172.20.1.20",
        "tool": "nmap",
        "phase": 1,
        "ai_hint_given": False,
        "created_at": datetime(2026, 5, 20, 9, 5, tzinfo=timezone.utc),
    }
    data.update(overrides)
    return CommandLog(**data)


def _event(**overrides) -> SiemEvent:
    data = {
        "id": "evt-1",
        "session_id": "sess-1",
        "severity": "HIGH",
        "message": "WAF detected SQL injection probe",
        "mitre_technique": "T1190",
        "source": "elasticsearch",
        "created_at": datetime(2026, 5, 20, 9, 6, tzinfo=timezone.utc),
    }
    data.update(overrides)
    return SiemEvent(**data)


def test_scoring_applies_hint_deductions_and_time_bonus():
    started = datetime(2026, 5, 20, 9, 0, tzinfo=timezone.utc)
    completed = started + timedelta(minutes=30)

    assert compute_time_bonus(started, completed) == 15
    assert compute_hint_penalty([{"level": 1}, {"level": 2}, {"level": 3}, {"level": 99}]) == 40
    assert final_score(90, [{"level": 1}, {"level": 3}], started, completed) == 80
    assert final_score(4, [{"level": 3}], started, None) == 0
    assert final_score(99, [], started, completed) == 100


@pytest.mark.asyncio
async def test_score_route_returns_deducted_final_score_and_completion_state():
    sess = _session(score=90, hints_used=[{"level": 1}, {"level": 2}])
    db = _FakeDb(_Result(one=sess))

    payload = await get_score("sess-1", current_user=_user(), db=db)

    assert payload["session_id"] == "sess-1"
    assert payload["base_score"] == 90
    assert payload["hints_used"] == 2
    assert payload["completed"] is True
    assert payload["final_score"] == 85


@pytest.mark.asyncio
async def test_score_route_rejects_missing_session():
    db = _FakeDb(_Result(one=None))

    with pytest.raises(HTTPException) as exc:
        await get_score("missing", current_user=_user(), db=db)

    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_notes_create_and_list_round_trip_behavior():
    sess = _session()
    db = _FakeDb(
        _Result(one=sess),
        _Result(one=sess),
        _Result(many=[_note(), _note(id="note-2", tag="evidence")]),
    )

    created = await create_note(
        NoteCreate(session_id="sess-1", tag="finding", content="Admin portal exposed", phase=2),
        current_user=_user(),
        db=db,
    )
    listed = await list_notes("sess-1", current_user=_user(), db=db)

    assert db.commits == 1
    assert created["id"].startswith("fake-")
    assert created["tag"] == "finding"
    assert created["content"] == "Admin portal exposed"
    assert [item["id"] for item in listed] == ["note-1", "note-2"]
    assert listed[1]["tag"] == "evidence"


@pytest.mark.asyncio
async def test_notes_reject_invalid_tag_before_db_write():
    db = _FakeDb()

    with pytest.raises(HTTPException) as exc:
        await create_note(
            NoteCreate(session_id="sess-1", tag="payload", content="bad tag", phase=1),
            current_user=_user(),
            db=db,
        )

    assert exc.value.status_code == 400
    assert db.added == []
    assert db.commits == 0


@pytest.mark.asyncio
async def test_reports_consolidated_endpoint_returns_session_fields(monkeypatch):
    sess = _session()
    cmd = _command()
    evt = _event()
    note = _note()
    db = _FakeDb(
        _Result(one=sess),
        _Result(many=[note]),
        _Result(many=[cmd]),
        _Result(many=[evt]),
    )

    async def fake_insights(_session, _db):
        return {"summary": "Student correlated command and alert", "recommendations": ["Document evidence"]}

    monkeypatch.setattr("src.reports.routes.build_learning_insights", fake_insights)

    report = await get_consolidated_report("sess-1", current_user=_user(), db=db)

    assert report["session"]["id"] == "sess-1"
    assert report["session"]["scenario_id"] == "SC-01"
    assert report["score"]["final_score"] == 70
    assert report["notes"][0]["content"] == "Found exposed admin path"
    assert report["commands"][0]["command"].startswith("nmap")
    assert report["siem_events"][0]["mitre_technique"] == "T1190"
    assert [entry["type"] for entry in report["timeline"]] == ["command", "siem_event"]
    assert report["learning_insights"]["summary"].startswith("Student")


@pytest.mark.asyncio
async def test_reports_consolidated_endpoint_rejects_missing_session():
    db = _FakeDb(_Result(one=None))

    with pytest.raises(HTTPException) as exc:
        await get_consolidated_report("missing", current_user=_user(), db=db)

    assert exc.value.status_code == 404


def test_output_patterns_sc01_sqli_output_triggers_insight(monkeypatch):
    from src.scenarios import output_patterns

    monkeypatch.setattr(output_patterns.time, "monotonic", lambda: 1000.0)
    output_patterns._buffers.clear()
    output_patterns._last_emit.clear()

    insights = output_patterns.scan_output_chunk(
        "sess-sqli",
        "SC-01",
        "Parameter 'id' is vulnerable. Type: UNION query\n",
    )

    assert [item["id"] for item in insights] == ["sc01-sqlmap-injectable"]
    assert "SQL injection" in insights[0]["what"]
    assert "id" in insights[0]["matched_line"]


def test_output_patterns_sc02_failed_auth_triggers_insight(monkeypatch):
    from src.scenarios import output_patterns

    monkeypatch.setattr(output_patterns.time, "monotonic", lambda: 2000.0)
    output_patterns._buffers.clear()
    output_patterns._last_emit.clear()

    insights = output_patterns.scan_output_chunk(
        "sess-auth",
        "SC-02",
        "STATUS_LOGON_FAILURE for user jsmith during password spray\n",
    )

    assert [item["id"] for item in insights] == ["sc02-password-spray"]
    assert "Password spray" in insights[0]["what"]


def test_output_patterns_empty_chunk_returns_empty_list():
    from src.scenarios.output_patterns import scan_output_chunk

    assert scan_output_chunk("sess-empty", "SC-01", "") == []


def test_output_patterns_partial_line_is_buffered_not_emitted():
    from src.scenarios import output_patterns

    output_patterns._buffers.clear()
    output_patterns._last_emit.clear()

    first = output_patterns.scan_output_chunk("sess-partial", "SC-01", "available databases")
    second = output_patterns.scan_output_chunk("sess-partial", "SC-01", " [2]: novamed\n")

    assert first == []
    assert second[0]["id"] == "sc01-sqlmap-dbs"


class _FakeDockerContainer:
    def __init__(self, started_at: datetime, container_id: str = "abcdef1234567890"):
        self.id = container_id
        self.status = "running"
        self.attrs = {"State": {"StartedAt": started_at.isoformat().replace("+00:00", "Z")}}
        self.stopped = False
        self.removed = False

    def stop(self, timeout=5):
        self.stopped = True

    def remove(self, force=True):
        self.removed = True


class _ContainerList:
    def __init__(self, containers):
        self._containers = containers

    def list(self, filters=None):
        assert filters == {"label": "com.cybersim.role=kali"}
        return self._containers


@pytest.mark.asyncio
async def test_container_cleanup_orphan_younger_than_two_hours_is_not_removed(monkeypatch):
    from src.sandbox import container_cleanup

    now = datetime(2026, 5, 20, 12, 0, tzinfo=timezone.utc)
    young = _FakeDockerContainer(now - timedelta(minutes=30))
    docker_client = SimpleNamespace(containers=_ContainerList([young]))

    class FrozenDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return now if tz else now.replace(tzinfo=None)

    monkeypatch.setattr(container_cleanup, "datetime", FrozenDateTime)

    removed = await container_cleanup._cleanup_orphans(docker_client, set())

    assert removed == 0
    assert young.stopped is False
    assert young.removed is False


@pytest.mark.asyncio
async def test_container_cleanup_old_orphan_is_stopped_and_removed(monkeypatch):
    from src.sandbox import container_cleanup

    now = datetime(2026, 5, 20, 12, 0, tzinfo=timezone.utc)
    old = _FakeDockerContainer(now - timedelta(hours=3))
    docker_client = SimpleNamespace(containers=_ContainerList([old]))

    class FrozenDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return now if tz else now.replace(tzinfo=None)

    monkeypatch.setattr(container_cleanup, "datetime", FrozenDateTime)

    removed = await container_cleanup._cleanup_orphans(docker_client, set())

    assert removed == 1
    assert old.stopped is True
    assert old.removed is True


def test_container_cleanup_extracts_full_and_short_ids_from_active_sessions():
    from src.sandbox.container_cleanup import _container_ids_from_active_sessions

    active = {
        b"sess-1": json.dumps({"container_id": "abcdef1234567890"}).encode(),
        "sess-2": "SC-01",
        "sess-3": "{not-json",
    }

    assert _container_ids_from_active_sessions(active) == {"abcdef1234567890", "abcdef123456"}

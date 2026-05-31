"""
Unit tests for Phase 25 â€” Instructor Learning Analytics helper logic and API routes.
"""

from __future__ import annotations

import csv
import io
import math
from datetime import datetime, timedelta, timezone
import pytest
from fastapi import HTTPException

from src.db.database import User, Session, Note, CommandLog, SiemEvent, SiemTriage, AIInteraction
from src.instructor.analytics import (
    get_instructor_analytics,
    calculate_session_struggle,
    analyze_cohort_blind_spots,
    generate_kde_svg_coords,
)
from src.instructor.routes import (
    list_all_sessions,
    get_analytics,
    export_grades,
    session_timeline,
    session_live_inspect,
)


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

    def scalar(self):
        return self._one if self._one is not None else (self._many[0] if self._many else None)

    def scalars(self):
        return _ScalarResult(
            self._many if self._many else ([] if self._one is None else [self._one])
        )

    def fetchone(self):
        return self._one

    def all(self):
        return list(self._many)

    def first(self):
        return self._one if self._one else (self._many[0] if self._many else None)


class _FakeDb:
    def __init__(self, *results):
        self.results = list(results)
        self.added = []
        self.deleted = []
        self.commits = 0
        self.refreshed = []

    async def execute(self, _query):
        if not self.results:
            # Fallback default empty result
            return _Result()
        return self.results.pop(0)

    async def scalar(self, _query):
        if not self.results:
            return None
        res = self.results.pop(0)
        return res._one if hasattr(res, "_one") else res

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.commits += 1

    async def refresh(self, item):
        self.refreshed.append(item)


# â”€â”€ Helper Builders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


def _student(user_id: str = "student-1", username: str = "stud1") -> User:
    return User(id=user_id, username=username, role="student", skill_level="intermediate")


def _session(session_id: str = "sess-1", **overrides) -> Session:
    data = {
        "id": session_id,
        "user_id": "student-1",
        "scenario_id": "SC-01",
        "role": "red",
        "methodology": "ptes",
        "phase": 1,
        "score": 100,
        "hints_used": [],
        "roe_acknowledged": True,
        "started_at": datetime.now(timezone.utc) - timedelta(hours=1),
        "completed_at": None,
    }
    data.update(overrides)
    return Session(**data)


# â”€â”€ Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


def test_generate_kde_svg_coords_normal():
    """Verify KDE SVG generator scales X inside [0, 500] and Y inside [0, 100]."""
    scores = [70, 80, 80, 90, 100]
    coords = generate_kde_svg_coords(scores)
    assert len(coords) == 51  # 0 to 50 inclusive
    for pt in coords:
        assert 0.0 <= pt["x"] <= 500.0
        assert 0.0 <= pt["y"] <= 100.0


def test_generate_kde_svg_coords_single_or_empty():
    """Verify KDE fallbacks generate valid curves for single/empty lists."""
    coords_empty = generate_kde_svg_coords([])
    assert len(coords_empty) == 51
    for pt in coords_empty:
        assert 0.0 <= pt["x"] <= 500.0
        assert 0.0 <= pt["y"] <= 100.0

    coords_one = generate_kde_svg_coords([85])
    assert len(coords_one) == 51
    # Should peak near center score (85 * 5 = 425)
    center_pt = min(coords_one, key=lambda pt: pt["y"])
    assert abs(center_pt["x"] - 425) <= 15.0


@pytest.mark.asyncio
async def test_calculate_session_struggle_recon_paralysis():
    """Test struggle calculation flags Recon Paralysis when stuck >30m with 0 notes/milestones."""
    db = _FakeDb(
        _Result(many=[]),  # commands query (empty)
        _Result(one=0),  # notes count query
        _Result(many=[]),  # events query
    )
    started = datetime.now(timezone.utc) - timedelta(minutes=45)
    sess = _session(started_at=started, phase=1, score=100)

    # Mock commands list to trigger threshold (10 commands run)
    db.results[0] = _Result(
        many=[
            CommandLog(
                session_id=sess.id,
                command="nmap -sV 172.20.1.20",
                phase=1,
                created_at=started + timedelta(minutes=i),
            )
            for i in range(12)
        ]
    )

    struggle = await calculate_session_struggle(db, sess, datetime.now(timezone.utc))
    assert struggle["struggle_score"] > 0
    assert any("Recon Paralysis" in r for r in struggle["reasons"])


@pytest.mark.asyncio
async def test_calculate_session_struggle_command_loops():
    """Test struggle calculation flags Command Loops when repeating a command."""
    db = _FakeDb(
        _Result(many=[]),  # commands query (mock loop below)
        _Result(one=0),  # notes count query
        _Result(many=[]),  # events query
    )
    sess = _session(score=100)
    now = datetime.now(timezone.utc)

    # 6 identical commands in a 2-minute window
    db.results[0] = _Result(
        many=[
            CommandLog(
                session_id=sess.id,
                command="sqlmap -u http://172.20.1.20",
                created_at=now - timedelta(seconds=i * 20),
            )
            for i in range(7)
        ]
    )

    struggle = await calculate_session_struggle(db, sess, now)
    assert struggle["struggle_score"] > 0
    assert any("Command Loops" in r for r in struggle["reasons"])


@pytest.mark.asyncio
async def test_calculate_session_struggle_hint_dependency():
    """Test struggle calculation flags Hint Dependency when L3 hint requested right after gate block."""
    sess = _session(score=80, hints_used=["Phase 1 L3"])
    now = datetime.now(timezone.utc)
    db = _FakeDb(
        _Result(many=[]),  # commands query (will be overwritten below)
        _Result(one=0),  # notes count query
        _Result(
            many=[  # AIInteraction query
                AIInteraction(session_id=sess.id, kind="hint", hint_level=3, created_at=now)
            ]
        ),
        _Result(many=[]),  # events query
    )

    db.results[0] = _Result(
        many=[
            CommandLog(session_id=sess.id, command="hint:L3", tool="hint:L3", created_at=now),
            CommandLog(
                session_id=sess.id,
                command="sqlmap -u http://172.20.1.20",
                tool="gate_block:sqlmap",
                created_at=now - timedelta(seconds=10),
            ),
        ]
    )

    struggle = await calculate_session_struggle(db, sess, now)
    assert any("Hint Dependency" in r for r in struggle["reasons"])


@pytest.mark.asyncio
async def test_calculate_session_struggle_defensive_blind_spot():
    """Test struggle calculation flags Defensive Blind Spot when SIEM events left untriaged."""
    db = _FakeDb(
        _Result(many=[]),  # commands query
        _Result(one=0),  # notes count query
        _Result(
            many=[  # events query
                SiemEvent(id=f"evt-{i}", session_id="sess-1", source="attacker", message="Alert")
                for i in range(6)
            ]
        ),
        _Result(
            many=[SiemTriage(event_id="evt-1", classification="investigating")]  # triage query
        ),
    )
    sess = _session()
    now = datetime.now(timezone.utc)

    struggle = await calculate_session_struggle(db, sess, now)
    assert any("Defensive Blind Spot" in r for r in struggle["reasons"])


@pytest.mark.asyncio
async def test_analyze_cohort_blind_spots():
    """Test blind spot analysis detects undocumented SQL injection alerts."""
    db = _FakeDb(
        _Result(
            many=[Note(session_id="sess-1", tag="finding", content="Enumerating targets")]
        ),  # notes
        _Result(
            many=[
                SiemEvent(
                    session_id="sess-1", source="attacker", message="WAF Rule 942100: SQL Injection"
                )
            ]
        ),  # events
    )

    spots = await analyze_cohort_blind_spots(db, ["sess-1"])
    assert len(spots) == 1
    assert spots[0]["title"] == "SQL Injection Exposure"
    assert spots[0]["undocumented_percentage"] == 100


@pytest.mark.asyncio
async def test_get_instructor_analytics_endpoint():
    """Verify instructor analytics endpoint returns cohort averages, KDE coordinates, and gaps."""
    db = _FakeDb(
        _Result(
            many=[
                (
                    _session(
                        "sess-1",
                        score=90,
                        hints_used=["L1", "L2"],
                        completed_at=datetime.now(timezone.utc),
                    ),
                    "student1",
                    "student",
                ),
                (_session("sess-2", score=80, completed_at=None), "student2", "student"),
                (_session("sess-3", score=100), "admin1", "instructor"),  # ignored
            ]
        ),
        # sess-1 struggle
        _Result(many=[]),  # commands
        _Result(many=[]),  # events
        # sess-2 struggle
        _Result(many=[]),  # commands
        _Result(one=0),  # notes count
        _Result(many=[]),  # events
        # Gaps count query
        _Result(many=[("gate_block:sqlmap", 5), ("gate_block:gobuster", 3)]),
        # sess-1 blind spots
        _Result(many=[]),  # notes
        _Result(many=[]),  # events
        # sess-2 blind spots
        _Result(many=[]),  # notes
        _Result(many=[]),  # events
    )

    data = await get_analytics(db=db, _=User(role="instructor"))
    assert data["total_student_sessions"] == 2
    assert data["active_student_sessions"] == 1
    assert data["averages"]["score"] == 85.0
    assert len(data["methodology_gaps"]) == 2
    assert data["methodology_gaps"][0]["tool"] == "sqlmap"
    assert len(data["score_distribution"]) == 51


@pytest.mark.asyncio
async def test_export_grades_canvas_csv():
    """Verify Canvas-compatible grade CSV output."""
    db = _FakeDb(
        _Result(
            many=[
                (
                    _session("sess-1", score=95, completed_at=datetime.now(timezone.utc)),
                    _student("u-1", "student1"),
                )
            ]
        ),
        _Result(one=2),  # 2 gate blocks count for adherence deduction
    )

    resp = await export_grades(format="canvas", db=db, _=User(role="instructor"))
    assert resp.media_type == "text/csv"
    assert "attachment; filename=" in resp.headers["Content-Disposition"]

    content = resp.body.decode("utf-8")
    reader = csv.reader(io.StringIO(content))
    rows = list(reader)

    # Headers
    assert rows[0] == [
        "Student",
        "ID",
        "SIS User ID",
        "SIS Login ID",
        "Section",
        "Parallax Score",
        "Parallax Time (m)",
        "Adherence %",
    ]
    # Row contents
    assert rows[1][0] == "student1"
    assert rows[1][5] == "95"
    assert rows[1][7] == "90"  # 100 - (2 * 5) = 90%


@pytest.mark.asyncio
async def test_export_grades_moodle_csv():
    """Verify Moodle-compatible grade CSV output."""
    db = _FakeDb(
        _Result(many=[(_session("sess-1", score=88), _student("u-1", "student1"))]),
        _Result(many=["Discovered sensitive credentials"]),
    )

    resp = await export_grades(format="moodle", db=db, _=User(role="instructor"))
    assert resp.media_type == "text/csv"

    content = resp.body.decode("utf-8")
    reader = csv.reader(io.StringIO(content))
    rows = list(reader)

    # Headers
    assert rows[0] == [
        "First name",
        "Surname",
        "ID number",
        "Institution",
        "Department",
        "Email address",
        "Grade",
        "Feedback",
    ]
    # Row contents
    assert rows[1][0] == "student1"
    assert rows[1][5] == "student1@example.com"
    assert rows[1][6] == "88"
    assert "Discovered sensitive credentials" in rows[1][7]


@pytest.mark.asyncio
async def test_session_timeline():
    """Verify timeline endpoint correctly fetches and orders commands and SIEM alerts."""
    db = _FakeDb(
        _Result(
            many=[
                CommandLog(
                    id="c-1",
                    command="nmap 172.20.1.20",
                    tool="nmap",
                    phase=1,
                    created_at=datetime.now(timezone.utc),
                )
            ]
        ),
        _Result(
            many=[
                SiemEvent(
                    id="e-1",
                    severity="HIGH",
                    message="Nmap Scan",
                    source="attacker",
                    created_at=datetime.now(timezone.utc),
                )
            ]
        ),
    )

    timeline = await session_timeline("sess-1", db=db, _=User(role="instructor"))
    assert len(timeline["commands"]) == 1
    assert timeline["commands"][0]["command"] == "nmap 172.20.1.20"
    assert len(timeline["siem_events"]) == 1
    assert timeline["siem_events"][0]["severity"] == "HIGH"


@pytest.mark.asyncio
async def test_session_live_inspect():
    """Verify session live inspect returns session details, commands, events with triage, and notes."""
    db = _FakeDb(
        _Result(many=[(_session("sess-1"), "student1")]),  # Session query
        _Result(
            many=[
                CommandLog(
                    command="whoami", tool="whoami", phase=2, created_at=datetime.now(timezone.utc)
                )
            ]
        ),  # Commands query
        _Result(
            many=[
                SiemEvent(
                    id="e-1",
                    severity="LOW",
                    message="Access",
                    source="background",
                    created_at=datetime.now(timezone.utc),
                )
            ]
        ),  # Events query
        _Result(
            many=[
                SiemTriage(event_id="e-1", classification="investigating", notes="looks suspicious")
            ]
        ),  # Triage query
        _Result(
            many=[
                Note(
                    tag="finding",
                    content="Logged in",
                    phase=2,
                    created_at=datetime.now(timezone.utc),
                )
            ]
        ),  # Notes query
    )

    data = await session_live_inspect("sess-1", db=db, _=User(role="instructor"))
    assert data["session"]["username"] == "student1"
    assert len(data["commands"]) == 1
    assert data["commands"][0]["command"] == "whoami"
    assert len(data["events"]) == 1
    assert data["events"][0]["classification"] == "investigating"
    assert data["events"][0]["notes"] == "looks suspicious"
    assert len(data["notes"]) == 1
    assert data["notes"][0]["content"] == "Logged in"

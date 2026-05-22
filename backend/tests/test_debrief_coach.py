import pytest
from unittest.mock import AsyncMock, patch
from src.ai.debrief_coach import generate_debrief_coaching, handle_debrief_qa, redact_text
from src.config import settings

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
        return _ScalarResult(self._many if self._many else ([] if self._one is None else [self._one]))

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


@pytest.mark.anyio
async def test_redact_text():
    # Test flag scrubbing
    assert redact_text("The flag is FLAG{SC01_XYZ}", None) == "The flag is [REDACTED_FLAG]"
    assert redact_text("flag{hello_world}", None) == "[REDACTED_FLAG]"

    # Test credential scrubbing
    assert redact_text("password: mySuperSecretPassword", None) == "password: [REDACTED_CREDENTIAL]"
    assert redact_text("key = somekeyval", None) == "key: [REDACTED_CREDENTIAL]"

    # Test dynamic metadata scrubbing
    metadata = {
        "flag_hash": "FLAG-SC01-3:e8b2a1a8c9e0d1b2",
        "random_db_pass": "MedStaffPortal99!",
        "ignored": "admin"
    }
    context = "We found FLAG-SC01-3:e8b2a1a8c9e0d1b2 and logged in with password MedStaffPortal99! as admin"
    redacted = redact_text(context, metadata)
    assert "e8b2a1a8c9e0d1b2" not in redacted
    assert "MedStaffPortal99!" not in redacted
    assert "admin" in redacted  # admin is ignored from redacting

@pytest.mark.anyio
async def test_generate_debrief_coaching_fallback():
    # Test offline fallback (when OPENROUTER_API_KEY is not set or empty)
    db = _FakeDb(_Result(one=None))  # Mocking scalar query for Session to return None or a mocked Session
    with patch.object(settings, "OPENROUTER_API_KEY", ""):
        report_data = {
            "session": {"scenario_id": "sc-01", "methodology": "ptes"},
            "score": {"final_score": 85},
            "notes": [{"tag": "#recon", "content": "enumerated port 80"}],
            "commands": [{"command": "nmap -F 172.20.1.20"}],
            "siem_events": []
        }
        res = await generate_debrief_coaching("test-session-id", report_data, db)
        assert "summary" in res
        assert "strengths" in res
        assert "improvement_areas" in res
        assert "missed_detections" in res
        assert "next_practice" in res
        assert "NovaMed" in res["summary"]

@pytest.mark.anyio
async def test_debrief_qa_limit():
    # Test Q&A rate limit of 3
    db = _FakeDb(_Result(one=None), _Result(one=None), _Result(one=None), _Result(one=None))
    report_data = {
        "session": {"scenario_id": "sc-01"},
    }
    
    session_id = "test-session-qa-limit"
    
    # Call 1
    res1 = await handle_debrief_qa(session_id, "How to do recon?", report_data, db)
    assert res1["qa_count"] == 1
    assert res1["remaining"] == 2
    assert "response" in res1

    # Call 2
    res2 = await handle_debrief_qa(session_id, "What about WAF?", report_data, db)
    assert res2["qa_count"] == 2
    assert res2["remaining"] == 1

    # Call 3
    res3 = await handle_debrief_qa(session_id, "Any final tips?", report_data, db)
    assert res3["qa_count"] == 3
    assert res3["remaining"] == 0

    # Call 4 (should block)
    res4 = await handle_debrief_qa(session_id, "One more?", report_data, db)
    assert res4["qa_count"] == 3
    assert res4["remaining"] == 0
    assert "limit of 3" in res4["response"]

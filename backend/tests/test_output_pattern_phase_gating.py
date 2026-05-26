import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def _reset_output_pattern_state(monkeypatch):
    from src.cache import redis as redis_cache
    from src.scenarios import output_patterns

    output_patterns._buffers.clear()
    redis_cache._memory_cache.clear()
    redis_cache._memory_expiries.clear()
    monkeypatch.setattr(output_patterns, "cache_set_if_absent", _always_allow_cache)


async def _always_allow_cache(*args, **kwargs):
    return True


@pytest.mark.asyncio
async def test_sc02_kerberos_insight_does_not_fire_in_phase_1(monkeypatch):
    """A phase-3 Kerberos insight must not fire while the student is still in recon."""
    _reset_output_pattern_state(monkeypatch)
    from src.scenarios.output_patterns import scan_output_chunk

    insights = await scan_output_chunk(
        session_id="test-sess-sc02-blocked",
        scenario_id="SC-02",
        chunk="GetUserSPNs.py output: $krb5tgs$23$svc_backup...\n",
        current_phase=1,
    )
    kerberos_ids = [i for i in insights if "kerberoast" in (i.get("id") or "")]
    assert kerberos_ids == [], "Kerberos insight leaked into phase 1"


@pytest.mark.asyncio
async def test_sc02_kerberos_insight_does_fire_in_phase_3(monkeypatch):
    _reset_output_pattern_state(monkeypatch)
    from src.scenarios.output_patterns import scan_output_chunk

    insights = await scan_output_chunk(
        session_id="test-sess-sc02-allowed",
        scenario_id="SC-02",
        chunk="$krb5tgs$23$svc_backup...\n",
        current_phase=3,
    )
    assert any("kerberoast" in (i.get("id") or "") for i in insights)


@pytest.mark.asyncio
async def test_sc03_beacon_insight_does_not_fire_in_phase_1(monkeypatch):
    _reset_output_pattern_state(monkeypatch)
    from src.scenarios.output_patterns import scan_output_chunk

    insights = await scan_output_chunk(
        session_id="test-sess-sc03-blocked",
        scenario_id="SC-03",
        chunk="meterpreter session opened from reverse connected callback\n",
        current_phase=1,
    )
    beacon_ids = [i for i in insights if "beacon" in (i.get("id") or "")]
    assert beacon_ids == [], "Post-exploitation beacon insight leaked into phase 1"


@pytest.mark.asyncio
async def test_sc03_beacon_insight_does_fire_in_phase_4(monkeypatch):
    _reset_output_pattern_state(monkeypatch)
    from src.scenarios.output_patterns import scan_output_chunk

    insights = await scan_output_chunk(
        session_id="test-sess-sc03-allowed",
        scenario_id="SC-03",
        chunk="meterpreter session opened from reverse connected callback\n",
        current_phase=4,
    )
    assert any("beacon" in (i.get("id") or "") for i in insights)

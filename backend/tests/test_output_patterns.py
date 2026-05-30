import os
import sys
import uuid

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def _reset_output_pattern_state():
    from src.cache import redis as redis_cache
    from src.scenarios import output_patterns

    output_patterns._buffers.clear()
    redis_cache._memory_cache.clear()
    redis_cache._memory_expiries.clear()


@pytest.mark.asyncio
async def test_banner_does_not_trigger_domain_admin_insight():
    _reset_output_pattern_state()
    chunk = "RED OBJECTIVE:  Kerberoast svc_backup, crack hash, DCSync as Domain Admin\n"
    from src.scenarios.output_patterns import scan_output_chunk

    insights = await scan_output_chunk(f"test-sess-{uuid.uuid4().hex}", "SC-02", chunk)
    assert all(i.get("id") != "sc02-domain-admin" for i in insights)


@pytest.mark.asyncio
async def test_real_domain_admin_line_triggers_insight():
    _reset_output_pattern_state()
    chunk = "memberOf=CN=Domain Admins,CN=Users,DC=nexora,DC=local\n"
    from src.scenarios.output_patterns import scan_output_chunk

    insights = await scan_output_chunk(f"test-sess-2-{uuid.uuid4().hex}", "SC-02", chunk, 4)
    assert any(i.get("id") == "sc02-domain-admin" for i in insights)


@pytest.mark.asyncio
async def test_option_alone_shell_error_gets_recovery_insight():
    _reset_output_pattern_state()
    chunk = "bash: -dc-ip: command not found\n"
    from src.scenarios.output_patterns import scan_output_chunk

    insights = await scan_output_chunk(f"test-sess-3-{uuid.uuid4().hex}", "SC-02", chunk)
    assert any(i.get("id") == "shell-option-alone" for i in insights)


@pytest.mark.asyncio
async def test_missing_rockyou_gets_wordlist_recovery_insight():
    _reset_output_pattern_state()
    chunk = "/usr/share/wordlists/rockyou.txt: No such file or directory\n"
    from src.scenarios.output_patterns import scan_output_chunk

    insights = await scan_output_chunk(f"test-sess-4-{uuid.uuid4().hex}", "SC-02", chunk)
    assert any(i.get("id") == "wordlist-missing" for i in insights)


@pytest.mark.asyncio
async def test_placeholder_fallback_is_silent():
    _reset_output_pattern_state()
    from src.scenarios.output_patterns import scan_output_chunk

    insights = await scan_output_chunk(
        f"test-sess-5-{uuid.uuid4().hex}", "SC-02", "bash: syntax error near unexpected token `<'\n"
    )

    assert insights == []


@pytest.mark.asyncio
async def test_phase_filter_blocks_out_of_phase_sc01_schema_hint():
    _reset_output_pattern_state()
    from src.scenarios.output_patterns import scan_output_chunk

    sess_blocked = f"phase-blocked-{uuid.uuid4().hex}"
    sess_allowed = f"phase-allowed-{uuid.uuid4().hex}"
    phase_one = await scan_output_chunk(
        sess_blocked, "SC-01", "available databases [2]: novamed\n", 1
    )
    phase_four = await scan_output_chunk(
        sess_allowed, "SC-01", "available databases [2]: novamed\n", 4
    )

    assert phase_one == []
    assert [item["id"] for item in phase_four] == ["sc01-sqlmap-dbs"]


@pytest.mark.asyncio
async def test_global_cooldown_suppresses_second_insight_within_30_seconds():
    _reset_output_pattern_state()
    from src.scenarios.output_patterns import scan_output_chunk

    sess_cooldown = f"cooldown-sess-{uuid.uuid4().hex}"
    first = await scan_output_chunk(sess_cooldown, "SC-01", "Apache/2.4.54\n", 1)
    second = await scan_output_chunk(sess_cooldown, "SC-01", "80/tcp open\n", 1)

    assert [item["id"] for item in first] == ["sc01-apache-2454"]
    assert second == []

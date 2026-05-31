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


# ── scan_flag_candidates tests ─────────────────────────────────────────────────


def _reset_flag_candidate_state():
    from src.cache import redis as redis_cache
    from src.scenarios import output_patterns

    output_patterns._buffers.clear()
    # Clear compiled flag pattern cache so each test gets a fresh compile
    output_patterns._compile_flag_patterns.cache_clear()
    redis_cache._memory_cache.clear()
    redis_cache._memory_expiries.clear()


@pytest.mark.asyncio
async def test_sc01_lfi_flag_triggers_candidate():
    """A terminal line containing the /etc/passwd root entry fires FLAG-SC01-1."""
    _reset_flag_candidate_state()
    from src.scenarios.output_patterns import scan_flag_candidates

    sess = f"fc-sc01-lfi-{uuid.uuid4().hex}"
    chunk = "root:x:0:0:root:/root:/bin/bash\n"
    candidates = await scan_flag_candidates(sess, "SC-01", chunk)

    assert len(candidates) == 1
    assert candidates[0]["flag_id"] == "FLAG-SC01-1"
    assert "root:x:0:0" in candidates[0]["matched_text"]
    assert "already_captured" not in candidates[0]


@pytest.mark.asyncio
async def test_sc01_admin_password_flag_triggers_candidate():
    """A line containing the NovaMed admin password fires FLAG-SC01-2."""
    _reset_flag_candidate_state()
    from src.scenarios.output_patterns import scan_flag_candidates

    sess = f"fc-sc01-pass-{uuid.uuid4().hex}"
    chunk = "-- admin password: P@ssw0rd_NovaMed_2023!\n"
    candidates = await scan_flag_candidates(sess, "SC-01", chunk)

    assert any(c["flag_id"] == "FLAG-SC01-2" for c in candidates)


@pytest.mark.asyncio
async def test_sc01_db_pass_flag_triggers_candidate():
    """A line containing WebAppPass2024! fires FLAG-SC01-3."""
    _reset_flag_candidate_state()
    from src.scenarios.output_patterns import scan_flag_candidates

    sess = f"fc-sc01-db-{uuid.uuid4().hex}"
    chunk = "define('DB_PASS', 'WebAppPass2024!');\n"
    candidates = await scan_flag_candidates(sess, "SC-01", chunk)

    assert any(c["flag_id"] == "FLAG-SC01-3" for c in candidates)


@pytest.mark.asyncio
async def test_already_captured_flag_suppressed():
    """A flag that is already in flags_captured must not produce a candidate."""
    _reset_flag_candidate_state()
    from src.cache.redis import cache_set
    from src.scenarios.output_patterns import scan_flag_candidates

    sess = f"fc-already-{uuid.uuid4().hex}"
    await cache_set(f"session:{sess}:state", {"flags_captured": ["FLAG-SC01-1"]}, ttl=300)

    chunk = "root:x:0:0:root:/root:/bin/bash\n"
    candidates = await scan_flag_candidates(sess, "SC-01", chunk)

    assert all(c["flag_id"] != "FLAG-SC01-1" for c in candidates)


@pytest.mark.asyncio
async def test_dedup_suppresses_repeat_nudge_same_session():
    """Calling scan_flag_candidates twice for the same session+flag returns candidate
    only on the first call (dedup TTL prevents repeated nudging)."""
    _reset_flag_candidate_state()
    from src.scenarios.output_patterns import scan_flag_candidates

    sess = f"fc-dedup-{uuid.uuid4().hex}"
    chunk = "root:x:0:0:root:/root:/bin/bash\n"

    first = await scan_flag_candidates(sess, "SC-01", chunk)
    # Buffer the second call; the flag_candidate dedup key is now set
    _reset_flag_candidate_state.__wrapped__ = None  # don't clear redis this time
    from src.scenarios import output_patterns

    output_patterns._buffers.clear()  # reset line buffer only
    second = await scan_flag_candidates(sess, "SC-01", chunk)

    assert any(c["flag_id"] == "FLAG-SC01-1" for c in first)
    assert all(c["flag_id"] != "FLAG-SC01-1" for c in second)


@pytest.mark.asyncio
async def test_unrelated_output_produces_no_candidate():
    """Generic terminal output with no flag content produces no candidates."""
    _reset_flag_candidate_state()
    from src.scenarios.output_patterns import scan_flag_candidates

    sess = f"fc-noise-{uuid.uuid4().hex}"
    chunk = "Starting Nmap 7.94 — https://nmap.org\n22/tcp open ssh\n"
    candidates = await scan_flag_candidates(sess, "SC-01", chunk)

    assert candidates == []

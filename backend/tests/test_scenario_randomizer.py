"""
Phase 28 — Tests for scenario randomizer.

Covers:
- Bypass logic for demo / test* sessions
- Deterministic seeding (same session_id → same seed)
- Per-scenario metadata field presence
- validate_flag with metadata overrides and value_pattern regex
- iptables rule generation (build_iptables_rules)
- build_flag_tarball produces valid tar bytes
"""
from __future__ import annotations

import io
import re
import tarfile
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.scenarios.randomizer import (
    _is_bypass,
    apply_randomization,
    build_flag_tarball,
    build_iptables_rules,
    generate_randomized_session_metadata,
    get_seed,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

REAL_SESSION_ID = "abc12345-0000-0000-0000-000000000001"
DEMO_SESSION_ID = "demo"
TEST_SESSION_ID = "test-session-xyz"


# ---------------------------------------------------------------------------
# Bypass logic
# ---------------------------------------------------------------------------

def test_bypass_demo():
    assert _is_bypass("demo") is True


def test_bypass_test_prefix():
    assert _is_bypass("test-anything") is True
    assert _is_bypass("testing") is True


def test_no_bypass_real_session():
    assert _is_bypass(REAL_SESSION_ID) is False


def test_demo_returns_empty_metadata():
    meta = generate_randomized_session_metadata(DEMO_SESSION_ID, "SC-01")
    assert meta == {}


def test_test_prefix_returns_empty_metadata():
    meta = generate_randomized_session_metadata(TEST_SESSION_ID, "SC-02")
    assert meta == {}


# ---------------------------------------------------------------------------
# Deterministic seeding
# ---------------------------------------------------------------------------

def test_seed_is_deterministic():
    s1 = get_seed(REAL_SESSION_ID)
    s2 = get_seed(REAL_SESSION_ID)
    assert s1 == s2


def test_different_sessions_different_seeds():
    s1 = get_seed("aaaaaaaa-0000-0000-0000-000000000001")
    s2 = get_seed("bbbbbbbb-0000-0000-0000-000000000002")
    assert s1 != s2


# ---------------------------------------------------------------------------
# Per-scenario metadata
# ---------------------------------------------------------------------------

def test_sc01_metadata_fields():
    meta = generate_randomized_session_metadata(REAL_SESSION_ID, "SC-01")
    assert meta["seed"] == get_seed(REAL_SESSION_ID)
    assert meta["scenario_variant"] in ("SQLI", "LFI")
    assert "target_ip" in meta
    assert "db_user" in meta
    assert "db_pass" in meta
    assert "flag_path" in meta
    assert "flags" in meta
    flag = meta["flags"]["FLAG-SC01-1"]
    assert "value" in flag
    assert "value_pattern" in flag
    assert re.match(flag["value_pattern"], flag["value"])


def test_sc02_metadata_fields():
    meta = generate_randomized_session_metadata(REAL_SESSION_ID, "SC-02")
    assert "dc_host" in meta
    assert "gpp_dir" in meta
    assert "kerberoastable_spn" in meta
    assert "flags" in meta


def test_sc03_metadata_fields():
    meta = generate_randomized_session_metadata(REAL_SESSION_ID, "SC-03")
    assert "phish_subject" in meta
    assert "victim_pretext" in meta
    assert "mail_relay" in meta
    assert "flags" in meta


def test_metadata_deterministic_for_same_session():
    m1 = generate_randomized_session_metadata(REAL_SESSION_ID, "SC-01")
    m2 = generate_randomized_session_metadata(REAL_SESSION_ID, "SC-01")
    assert m1 == m2


def test_unknown_scenario_returns_empty():
    meta = generate_randomized_session_metadata(REAL_SESSION_ID, "SC-99")
    assert meta == {}


# ---------------------------------------------------------------------------
# iptables rule generation
# ---------------------------------------------------------------------------

def test_build_iptables_rules_bypass():
    rules = build_iptables_rules(DEMO_SESSION_ID, "SC-01", {"target_ip": "172.20.1.25"})
    assert rules == []


def test_build_iptables_rules_no_remap_needed():
    # When virtual_ip == real_ip, no rules should be generated
    rules = build_iptables_rules(REAL_SESSION_ID, "SC-01", {"target_ip": "172.20.1.20"})
    assert rules == []


def test_build_iptables_rules_remap():
    rules = build_iptables_rules(REAL_SESSION_ID, "SC-01", {"target_ip": "172.20.1.25"})
    assert len(rules) == 3
    assert any("172.20.1.25" in r for r in rules)
    assert any("172.20.1.20" in r for r in rules)


def test_build_iptables_rules_empty_metadata():
    rules = build_iptables_rules(REAL_SESSION_ID, "SC-01", {})
    assert rules == []


# ---------------------------------------------------------------------------
# build_flag_tarball
# ---------------------------------------------------------------------------

def test_build_flag_tarball_valid_tar():
    flag_path = "/var/www/html/.secret/flag.txt"
    flag_value = "FLAG{test_value_12345}"
    tar_bytes = build_flag_tarball(flag_path, flag_value)
    assert len(tar_bytes) > 0
    buf = io.BytesIO(tar_bytes)
    with tarfile.open(fileobj=buf, mode="r") as tf:
        members = tf.getmembers()
        assert len(members) == 1
        assert flag_path.lstrip("/") in members[0].name
        content = tf.extractfile(members[0]).read().decode()
        assert content == flag_value


# ---------------------------------------------------------------------------
# validate_flag integration (metadata override + value_pattern)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_validate_flag_metadata_exact_match():
    """validate_flag finds flag using exact value from session_metadata."""
    from unittest.mock import patch, AsyncMock, MagicMock

    flag_value = "FLAG{NovaMed_deadbeef}"
    mock_session = MagicMock()
    mock_session.session_metadata = {
        "flags": {
            "FLAG-SC01-1": {
                "value": flag_value,
                "value_pattern": r"FLAG\{NovaMed_[0-9a-f]{8}\}",
                "points": 50,
            }
        }
    }
    mock_session.phase = 1
    mock_session.score = 100

    mock_scalar = MagicMock()
    mock_scalar.scalar_one_or_none = MagicMock(return_value=mock_session)
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=mock_scalar)
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()

    with patch("src.scenarios.engine.get_flags", return_value=[]), \
         patch("src.scenarios.engine.cache_get", AsyncMock(return_value={})), \
         patch("src.scenarios.engine.cache_set", AsyncMock()):
        from src.scenarios.engine import validate_flag
        result = await validate_flag(flag_value, "SC-01", REAL_SESSION_ID, mock_db)

    assert result["valid"] is True
    assert result["flag_id"] == "FLAG-SC01-1"
    assert result["points_awarded"] == 50


@pytest.mark.asyncio
async def test_validate_flag_metadata_pattern_match():
    """validate_flag matches using value_pattern regex when exact value differs."""
    flag_value = "FLAG{NovaMed_cafebabe}"
    stored_value = "FLAG{NovaMed_12345678}"  # different exact, but pattern matches

    mock_session = MagicMock()
    mock_session.session_metadata = {
        "flags": {
            "FLAG-SC01-1": {
                "value": stored_value,
                "value_pattern": r"FLAG\{NovaMed_[0-9a-f]{8}\}",
                "points": 50,
            }
        }
    }
    mock_session.phase = 1
    mock_session.score = 100

    mock_scalar = MagicMock()
    mock_scalar.scalar_one_or_none = MagicMock(return_value=mock_session)
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=mock_scalar)
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()

    with patch("src.scenarios.engine.get_flags", return_value=[]), \
         patch("src.scenarios.engine.cache_get", AsyncMock(return_value={})), \
         patch("src.scenarios.engine.cache_set", AsyncMock()):
        from src.scenarios.engine import validate_flag
        result = await validate_flag(flag_value, "SC-01", REAL_SESSION_ID, mock_db)

    assert result["valid"] is True
    assert result["flag_id"] == "FLAG-SC01-1"


@pytest.mark.asyncio
async def test_validate_flag_invalid_returns_false():
    """validate_flag returns invalid for completely wrong input."""
    mock_session = MagicMock()
    mock_session.session_metadata = {}
    mock_session.phase = 1
    mock_session.score = 100

    mock_scalar = MagicMock()
    mock_scalar.scalar_one_or_none = MagicMock(return_value=mock_session)
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=mock_scalar)

    with patch("src.scenarios.engine.get_flags", return_value=[
        {"id": "FLAG-SC01-1", "value": "FLAG{correct}", "points": 50}
    ]), \
         patch("src.scenarios.engine.cache_get", AsyncMock(return_value={})):
        from src.scenarios.engine import validate_flag
        result = await validate_flag("FLAG{wrong}", "SC-01", REAL_SESSION_ID, mock_db)

    assert result["valid"] is False


# ---------------------------------------------------------------------------
# apply_randomization (Docker unavailable — silent skip)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_apply_randomization_skips_bypass():
    """apply_randomization does nothing for demo sessions."""
    meta = generate_randomized_session_metadata("session-xyz", "SC-01")
    # should not raise even with no Docker available
    await apply_randomization(DEMO_SESSION_ID, "SC-01", meta, "mock-container")


@pytest.mark.asyncio
async def test_apply_randomization_no_docker():
    """apply_randomization silently skips when docker SDK is unavailable."""
    import builtins
    real_import = builtins.__import__

    def _block_docker(name, *args, **kwargs):
        if name == "docker":
            raise ImportError("docker not installed")
        return real_import(name, *args, **kwargs)

    meta = generate_randomized_session_metadata(REAL_SESSION_ID, "SC-01")
    with patch("builtins.__import__", side_effect=_block_docker):
        # Should not raise even when docker is unavailable
        await apply_randomization(REAL_SESSION_ID, "SC-01", meta, "container-abc")

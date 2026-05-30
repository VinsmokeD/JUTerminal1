"""Unit tests for the Sigma-style SIEM rule engine."""

from __future__ import annotations

import json
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch


# ---------------------------------------------------------------------------
# Helpers — import engine internals without running the async tasks
# ---------------------------------------------------------------------------


def _import_engine():
    from src.siem import engine

    return engine


def _make_kerberoast_doc() -> dict:
    """Minimal ECS document that should trigger sc02.kerberoast."""
    return {
        "@timestamp": "2026-05-19T10:00:00.000Z",
        "event": {"code": "4769", "category": ["authentication"], "module": "samba"},
        "krb": {"enctype": "0x17"},
        "user": {"target": {"name": "svc_backup"}},
        "source": {"ip": "172.20.2.10"},
        "message": "TGS_REQ RC4 for svc_backup",
        "log": {"level": "warning"},
    }


def _make_benign_aes_tgs_doc() -> dict:
    """AES256 TGS — should NOT trigger sc02.kerberoast."""
    return {
        "@timestamp": "2026-05-19T10:00:01.000Z",
        "event": {"code": "4769", "category": ["authentication"], "module": "samba"},
        "krb": {"enctype": "0x12"},
        "user": {"target": {"name": "host_svc"}},
        "source": {"ip": "172.20.2.50"},
        "message": "TGS_REQ AES256 for host_svc",
        "log": {"level": "info"},
    }


# ---------------------------------------------------------------------------
# _match_dsl unit tests
# ---------------------------------------------------------------------------


def test_term_match():
    engine = _import_engine()
    dsl = {"term": {"event.code": "4769"}}
    assert engine._match_dsl({"event": {"code": "4769"}}, dsl)


def test_term_no_match():
    engine = _import_engine()
    dsl = {"term": {"event.code": "4769"}}
    assert not engine._match_dsl({"event": {"code": "4625"}}, dsl)


def test_match_substring():
    engine = _import_engine()
    dsl = {"match": {"message": "TGS_REQ"}}
    assert engine._match_dsl({"message": "TGS_REQ RC4 for svc_backup"}, dsl)


def test_bool_must_all_pass():
    engine = _import_engine()
    dsl = {
        "bool": {
            "must": [
                {"term": {"event.code": "4769"}},
                {"term": {"krb.enctype": "0x17"}},
            ]
        }
    }
    assert engine._match_dsl(_make_kerberoast_doc(), dsl)


def test_bool_must_partial_fail():
    engine = _import_engine()
    dsl = {
        "bool": {
            "must": [
                {"term": {"event.code": "4769"}},
                {"term": {"krb.enctype": "0x17"}},
            ]
        }
    }
    # AES doc should NOT match
    assert not engine._match_dsl(_make_benign_aes_tgs_doc(), dsl)


# ---------------------------------------------------------------------------
# Rule loading tests
# ---------------------------------------------------------------------------


def test_rules_loaded():
    engine = _import_engine()
    rules = engine._load_rules()
    assert len(rules) > 0, "No rules were loaded from siem/rules/*.yaml"
    ids = [r["id"] for r in rules]
    assert "sc02.kerberoast" in ids
    assert "sc01.sqli_detected" in ids
    assert "sc03.phish_link_click" in ids


def test_kerberoast_rule_matches_rc4_doc():
    engine = _import_engine()
    rules = engine._load_rules()
    kerberoast = next(r for r in rules if r["id"] == "sc02.kerberoast")
    dsl = kerberoast["trigger"]["dsl"]
    assert engine._match_dsl(_make_kerberoast_doc(), dsl)


def test_kerberoast_rule_does_not_match_aes_doc():
    engine = _import_engine()
    rules = engine._load_rules()
    kerberoast = next(r for r in rules if r["id"] == "sc02.kerberoast")
    dsl = kerberoast["trigger"]["dsl"]
    assert not engine._match_dsl(_make_benign_aes_tgs_doc(), dsl)


# ---------------------------------------------------------------------------
# Template rendering test
# ---------------------------------------------------------------------------


def test_render_template():
    engine = _import_engine()
    tpl = "Kerberoasting: RC4 TGS for {{user.target.name}} from {{source.ip}}"
    result = engine._render_template(tpl, _make_kerberoast_doc())
    assert "svc_backup" in result
    assert "172.20.2.10" in result


def test_render_template_missing_field():
    engine = _import_engine()
    tpl = "Event from {{source.ip}} user {{winlog.event_data.TargetUserName}}"
    result = engine._render_template(tpl, {"source": {"ip": "1.2.3.4"}})
    assert "1.2.3.4" in result
    assert "?" in result  # missing field placeholder


# ---------------------------------------------------------------------------
# Scenario inference
# ---------------------------------------------------------------------------


def test_infer_scenario_sc02():
    engine = _import_engine()
    assert engine._infer_scenario({"message": "nexora DC kerberos TGS"}) == "SC-02"


def test_infer_scenario_sc01():
    engine = _import_engine()
    assert engine._infer_scenario({"message": "modsecurity blocked novamed"}) == "SC-01"


def test_infer_scenario_none():
    engine = _import_engine()
    assert engine._infer_scenario({"message": "generic log line"}) is None


# ---------------------------------------------------------------------------
# Command-string SIEM path must stay removed (regex theater dead)
# ---------------------------------------------------------------------------


def test_process_command_for_siem_stub_removed():
    engine = _import_engine()
    assert not hasattr(engine, "process_command_for_siem")


def test_siem_engine_keeps_sigma_rule_helpers():
    """Real detection should continue through the ES/Sigma helper path."""
    engine = _import_engine()
    assert callable(engine._poll_elasticsearch)
    assert callable(engine._match_dsl)

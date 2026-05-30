"""Tests for server-side ROE scope enforcement (scope_enforcer.check_scope)."""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from src.scenarios.scope_enforcer import check_scope

SC01 = {"network": {"cidr": "172.20.1.0/24"}}
SC02 = {"network": {"cidr": "172.20.2.0/24"}}
NO_CIDR = {"network": {}}  # e.g. SC-03 phishing — no subnet declared


# ── In-scope and ambiguous inputs are always allowed ─────────────────────────

@pytest.mark.parametrize(
    "command",
    [
        "nmap -sV 172.20.1.20",                 # in-scope host
        "nmap 172.20.1.0/24",                   # in-scope subnet scan
        "curl http://172.20.1.21:3306",         # in-scope DB
        "curl http://app.novamed.local/login",  # hostname, no IP
        "gobuster dir -u http://app.novamed.local -w /usr/share/wordlists/dirb/common.txt",
        "echo running apache 2.4.54 with php 7.4.33",  # version strings, not IPs
        "curl http://127.0.0.1:8080/health",    # loopback
        "nmap -p- -T4 --open",                  # no target IP at all
        "",                                      # empty command
    ],
)
def test_in_scope_or_ambiguous_is_allowed(command: str) -> None:
    result = check_scope(command, SC01)
    assert result.blocked is False, f"unexpectedly blocked: {command!r} ({result.message})"


# ── Out-of-scope IPs are blocked ─────────────────────────────────────────────

@pytest.mark.parametrize(
    ("command", "expected_target"),
    [
        ("nmap -sV 8.8.8.8", "8.8.8.8"),              # public internet
        ("curl https://1.1.1.1", "1.1.1.1"),          # public internet
        ("hydra -l admin 93.184.216.34 http", "93.184.216.34"),
        ("nmap 172.20.2.20", "172.20.2.20"),          # another scenario's subnet
    ],
)
def test_out_of_scope_ip_is_blocked(command: str, expected_target: str) -> None:
    result = check_scope(command, SC01)
    assert result.blocked is True
    assert result.target == expected_target
    assert "scope" in result.message.lower()


def test_scope_is_relative_to_active_scenario() -> None:
    # 172.20.1.20 is in scope for SC-01 but out of scope for SC-02.
    assert check_scope("nmap 172.20.1.20", SC01).blocked is False
    assert check_scope("nmap 172.20.1.20", SC02).blocked is True


def test_no_cidr_means_no_enforcement_fail_open() -> None:
    # A scenario without a declared subnet (e.g. phishing) never blocks.
    assert check_scope("nmap 8.8.8.8", NO_CIDR).blocked is False
    assert check_scope("curl https://1.1.1.1", {}).blocked is False


def test_invalid_octets_are_ignored() -> None:
    # 999.1.1.1 is not a valid IP; must not raise or block.
    assert check_scope("echo 999.1.1.1", SC01).blocked is False


def test_first_out_of_scope_ip_wins() -> None:
    result = check_scope("scan 172.20.1.20 then pivot 8.8.8.8", SC01)
    assert result.blocked is True
    assert result.target == "8.8.8.8"

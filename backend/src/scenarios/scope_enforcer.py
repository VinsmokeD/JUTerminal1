"""Server-side Rules-of-Engagement (ROE) scope enforcement.

Blocks commands that explicitly target hosts outside the authorised scenario
scope: public/internet IPs, or IPs belonging to a *different* scenario subnet
(a cross-scenario pivot). This is defence-in-depth and pedagogy layered on top
of the `internal: true` network isolation — it teaches scope discipline and
surfaces a clear, logged ROE violation instead of a silent connection timeout.

Design principle: **conservative / fail-open.** Only a reliably-parsed IPv4
literal that is provably out of scope is blocked. Hostnames, file paths,
in-scope IPs, loopback/link-local, version strings, and commands without any
IP are always allowed. When in doubt, allow — the isolated network already
prevents real egress, so a false *allow* is harmless while a false *block*
would break a legitimate in-scope command.
"""

from __future__ import annotations

import ipaddress
import re
from typing import NamedTuple

# Four dotted octets, word-bounded. Octet *ranges* are validated by ipaddress
# below, so this deliberately stays loose here (it will not match 3-part
# version strings like "2.4.54" because that has only three groups).
_IPV4_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")

# The RFC1918 supernet that every scenario subnet lives under. An IP inside
# this block but outside the active scenario's cidr is a cross-scenario pivot.
_SCENARIO_SUPERNET = ipaddress.ip_network("172.20.0.0/16")


class ScopeResult(NamedTuple):
    blocked: bool
    target: str | None
    message: str


def _allowed_cidr(scenario_spec: dict) -> ipaddress.IPv4Network | None:
    """Return the scenario's authorised subnet, or None if it declares none."""
    net = (scenario_spec or {}).get("network") or {}
    cidr = net.get("cidr")
    if not cidr:
        return None
    try:
        network = ipaddress.ip_network(cidr, strict=False)
    except ValueError:
        return None
    return network if isinstance(network, ipaddress.IPv4Network) else None


def _block_reason(ip_str: str, allowed: ipaddress.IPv4Network) -> str | None:
    """Return a human reason if `ip_str` is out of scope, else None (allowed)."""
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return None  # not a valid IP (e.g. an octet > 255) -> ignore
    if not isinstance(ip, ipaddress.IPv4Address):
        return None
    if ip in allowed:
        return None
    # Always-safe locals (the sandbox/tooling itself, never an external target).
    if ip.is_loopback or ip.is_unspecified or ip.is_link_local or ip.is_multicast:
        return None
    if ip.is_global:
        return "a public internet address"
    if ip in _SCENARIO_SUPERNET:
        return "another scenario's subnet"
    # Other private ranges (10/8, 192.168/16, …) are unreachable on the
    # isolated network anyway; allow to avoid false positives.
    return None


def check_scope(command: str, scenario_spec: dict) -> ScopeResult:
    """Return a ScopeResult; `blocked` is True only for a provably out-of-scope IP."""
    allowed = _allowed_cidr(scenario_spec)
    if allowed is None or not command:
        return ScopeResult(False, None, "")
    for candidate in _IPV4_RE.findall(command):
        reason = _block_reason(candidate, allowed)
        if reason:
            return ScopeResult(
                blocked=True,
                target=candidate,
                message=(
                    f"Target {candidate} is {reason}, outside the authorised "
                    f"engagement scope ({allowed}). Rules of Engagement permit "
                    f"testing only within scope — re-read the ROE briefing."
                ),
            )
    return ScopeResult(False, None, "")

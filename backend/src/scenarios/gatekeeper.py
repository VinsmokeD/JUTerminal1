"""
Synchronous methodology gatekeeper (Phase 15).

Called from ws/routes.py before forwarding commands to Docker exec.
No DB, no async — operates on the PTES phase name from the in-memory
session state cache (Redis). Complements engine.py's async check_gate()
which validates against numeric phase IDs post-DB-read.

Usage:
    from src.scenarios.gatekeeper import check_command, GateResult

    result = check_command(command="sqlmap -u http://...", current_ptes_phase="Reconnaissance")
    if result.blocked:
        await ws.send_text(f"[GATE] {result.redirect_message}")
        return
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class GateResult:
    blocked: bool
    redirect_message: str = ""


# ---------------------------------------------------------------------------
# Phase gate table
# Key: PTES phase name (matches `ptes_phase` field in scenario YAMLs)
# Value: dict of { tool_prefix → Socratic redirect message }
# ---------------------------------------------------------------------------
_PHASE_GATES: dict[str, dict[str, str]] = {
    # SC-01: Passive recon phase — no active exploitation tools
    "Passive Reconnaissance": {
        "sqlmap": (
            "Automated SQLi is blocked in Passive Reconnaissance. "
            "Have you confirmed an injection point manually first?"
        ),
        "metasploit": (
            "Exploitation is blocked. You're still in passive recon — "
            "what have you learned about the target's technology stack?"
        ),
        "msfconsole": (
            "Exploitation is blocked. You're still in passive recon — "
            "what have you learned about the target's technology stack?"
        ),
        "hydra": (
            "Credential attacks are blocked in Passive Reconnaissance. "
            "Do you have a login form identified yet?"
        ),
        "john": (
            "Password cracking is blocked. Have you obtained a hash to crack first?"
        ),
        "hashcat": (
            "Password cracking is blocked. Have you obtained a hash to crack first?"
        ),
    },

    # SC-01: Active scanning — exploitation still blocked
    "Active Scanning": {
        "sqlmap": (
            "Automated SQLi requires manually confirming the injection point first. "
            "Have you sent a single-quote test to the login form and observed the response?"
        ),
        "metasploit": (
            "Exploitation is blocked in Active Scanning phase. "
            "Complete your enumeration — what services and versions have you identified?"
        ),
        "msfconsole": (
            "Exploitation is blocked in Active Scanning phase. "
            "Complete your enumeration — what services and versions have you identified?"
        ),
    },

    # SC-01: Vulnerability ID — automation still needs manual confirmation first
    "Vulnerability Identification": {
        "metasploit": (
            "Automated exploitation is blocked. "
            "Have you documented the vulnerability and its CVSS score before attempting exploitation?"
        ),
        "msfconsole": (
            "Automated exploitation is blocked. "
            "Have you documented the vulnerability and its CVSS score before attempting exploitation?"
        ),
    },

    # SC-02 & SC-03: Intelligence Gathering / Reconnaissance
    "Intelligence Gathering": {
        "sqlmap": (
            "Automated exploitation is blocked during Intelligence Gathering. "
            "Have you completed your manual service enumeration yet?"
        ),
        "metasploit": (
            "Automated exploitation is blocked during Intelligence Gathering. "
            "Have you completed your manual service enumeration yet?"
        ),
        "msfconsole": (
            "Automated exploitation is blocked during Intelligence Gathering. "
            "Have you completed your manual service enumeration yet?"
        ),
        "msfvenom": (
            "Payload generation is blocked. "
            "Complete Target Research (Phase 1) before crafting payloads."
        ),
        "gophish": (
            "Campaign launch is blocked during Intelligence Gathering. "
            "Have you designed and tested your pretext first?"
        ),
        "hashcat": (
            "Password cracking requires first obtaining a hash. "
            "What credential material have you captured so far?"
        ),
        "secretsdump": (
            "DCSync / credential dumping is blocked in the Reconnaissance phase. "
            "Have you enumerated the domain and identified your target account?"
        ),
    },

    # SC-02: Pre-engagement phase for phishing
    "Pre-engagement": {
        "msfvenom": (
            "Payload crafting requires completing Pretext Design first. "
            "Is your GoPhish landing page and email template ready?"
        ),
        "gophish": (
            "Campaign launch requires a completed and tested payload. "
            "Have you confirmed your document macro executes on the simulated endpoint?"
        ),
    },

    # SC-02: Threat Modeling — before active attack
    "Threat Modeling": {
        "secretsdump": (
            "DCSync attacks are blocked in Threat Modeling. "
            "Have you performed Kerberoasting and lateral movement first?"
        ),
        "mimikatz": (
            "Credential dumping is blocked in Threat Modeling. "
            "Document your attack plan before proceeding to credential access."
        ),
    },
}


def check_command(command: str, current_ptes_phase: str) -> GateResult:
    """
    Synchronous gate check — no DB required.

    Args:
        command: Raw terminal command string (e.g. "sqlmap -u http://...")
        current_ptes_phase: PTES phase name from session cache
                            (e.g. "Reconnaissance", "Pre-engagement")

    Returns:
        GateResult(blocked=False) if the command is allowed.
        GateResult(blocked=True, redirect_message=...) if gated.
    """
    tool = _parse_tool(command)
    if not tool:
        return GateResult(blocked=False)

    gates = _PHASE_GATES.get(current_ptes_phase, {})
    for blocked_prefix, message in gates.items():
        if tool == blocked_prefix or tool.startswith(blocked_prefix):
            return GateResult(blocked=True, redirect_message=message)

    return GateResult(blocked=False)


def _parse_tool(command: str) -> str:
    """
    Extract the canonical tool name from a raw shell command.

    Strips: sudo, env var assignments, absolute paths.
    Examples:
        "sudo sqlmap -u ..." → "sqlmap"
        "/usr/bin/nmap -sV" → "nmap"
        "PYTHONPATH=/x python3 script.py" → "python3"
    """
    stripped = command.strip()

    # Strip sudo prefix
    if stripped.startswith("sudo "):
        stripped = stripped[5:].lstrip()

    # Strip env var assignments (FOO=bar cmd → cmd)
    parts = stripped.split()
    while parts and "=" in parts[0]:
        parts = parts[1:]

    if not parts:
        return ""

    # Strip absolute path prefix
    return parts[0].split("/")[-1].lower()

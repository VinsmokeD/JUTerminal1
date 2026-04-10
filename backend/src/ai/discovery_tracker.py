"""
Discovery tracker: parses terminal command outputs to track what the student
has found so far (services, paths, vulnerabilities, credentials).

Stores discovered items in Redis hashes keyed by session_id for fast retrieval
by the context builder.
"""
from __future__ import annotations

import json
import re
from typing import Any

from src.cache.redis import _get as get_redis


# ── Keys ────────────────────────────────────────────────────────────────────
def _key(session_id: str, kind: str) -> str:
    return f"discovery:{session_id}:{kind}"


# ── Public API ──────────────────────────────────────────────────────────────

async def track_command(session_id: str, command: str, output: str, scenario_id: str) -> dict[str, Any]:
    """
    Parse a command + output pair and update the discovery state in Redis.
    Returns a dict of what was newly discovered this call.
    """
    redis = get_redis()
    newly_discovered: dict[str, list] = {"services": [], "paths": [], "vulns": [], "credentials": []}
    cmd_lower = command.strip().lower()
    first_word = cmd_lower.split()[0] if cmd_lower else ""

    # ── nmap output → discovered services ───────────────────────────────
    if first_word == "nmap":
        port_pattern = re.compile(r"(\d+)/tcp\s+open\s+(\S+)\s*(.*)", re.IGNORECASE)
        for match in port_pattern.finditer(output):
            port, service, version = match.group(1), match.group(2), match.group(3).strip()
            entry = f"{service}:{port}" + (f"/{version}" if version else "")
            if await _add_to_set(redis, session_id, "services", entry):
                newly_discovered["services"].append(entry)

    # ── gobuster / dirb / feroxbuster → discovered paths ────────────────
    if first_word in ("gobuster", "dirb", "feroxbuster", "dirsearch"):
        path_pattern = re.compile(r"(/\S+)\s+\(Status:\s*(\d+)\)", re.IGNORECASE)
        for match in path_pattern.finditer(output):
            path, status = match.group(1), match.group(2)
            entry = f"{path} ({status})"
            if await _add_to_set(redis, session_id, "paths", entry):
                newly_discovered["paths"].append(entry)

    # ── sqlmap → discovered vulnerabilities ─────────────────────────────
    if first_word == "sqlmap":
        if "injectable" in output.lower():
            param_match = re.search(r"parameter '(\w+)'.*injectable", output, re.IGNORECASE)
            param = param_match.group(1) if param_match else "unknown"
            entry = f"sqli:{param}"
            if await _add_to_set(redis, session_id, "vulns", entry):
                newly_discovered["vulns"].append(entry)
        if "available databases" in output.lower():
            db_pattern = re.compile(r"^\[\*\]\s+(\S+)", re.MULTILINE)
            for m in db_pattern.finditer(output):
                entry = f"database:{m.group(1)}"
                await _add_to_set(redis, session_id, "services", entry)

    # ── nikto → discovered paths and potential vulns ────────────────────
    if first_word == "nikto":
        vuln_patterns = [
            (r"OSVDB-\d+.*?(/\S+)", "nikto_finding"),
            (r"Possible\s+(\w+)\s+vulnerability", "potential_vuln"),
        ]
        for pattern, prefix in vuln_patterns:
            for match in re.finditer(pattern, output, re.IGNORECASE):
                entry = f"{prefix}:{match.group(1)}"
                if await _add_to_set(redis, session_id, "vulns", entry):
                    newly_discovered["vulns"].append(entry)

    # ── curl headers → technology fingerprinting ────────────────────────
    if first_word == "curl":
        server_match = re.search(r"Server:\s*(.+)", output, re.IGNORECASE)
        if server_match:
            await _add_to_set(redis, session_id, "services", f"server:{server_match.group(1).strip()}")
        php_match = re.search(r"X-Powered-By:\s*(.+)", output, re.IGNORECASE)
        if php_match:
            await _add_to_set(redis, session_id, "services", f"runtime:{php_match.group(1).strip()}")

    # ── whatweb → technology stack ──────────────────────────────────────
    if first_word == "whatweb":
        techs = re.findall(r"(\w+)\[([^\]]+)\]", output)
        for name, version in techs:
            if name.lower() not in ("country", "html5"):
                await _add_to_set(redis, session_id, "services", f"{name.lower()}:{version}")

    # ── bloodhound → AD recon ──────────────────────────────────────────
    if first_word in ("bloodhound", "bloodhound.py", "bloodhound-python"):
        user_match = re.findall(r"Found\s+(\d+)\s+users", output, re.IGNORECASE)
        kerberoast_match = re.findall(r"Kerberoastable user:\s*(\S+)", output, re.IGNORECASE)
        for user in kerberoast_match:
            entry = f"kerberoastable:{user}"
            if await _add_to_set(redis, session_id, "vulns", entry):
                newly_discovered["vulns"].append(entry)

    # ── crackmapexec / netexec → SMB auth results ──────────────────────
    if first_word in ("crackmapexec", "netexec", "cme"):
        pwned = re.findall(r"\(Pwn3d!\)", output, re.IGNORECASE)
        creds = re.findall(r"\[\+\]\s+\S+\\(\S+):(\S+)", output)
        for user, pwd in creds:
            entry = f"{user}:{pwd}"
            if await _add_to_set(redis, session_id, "credentials", entry):
                newly_discovered["credentials"].append(entry)

    # ── impacket tools → various AD findings ───────────────────────────
    if "impacket" in first_word or first_word in ("getuserspns", "secretsdump", "getnpusers"):
        hash_match = re.findall(r"\$krb5tgs\$\d+\$\*(\S+?)\$", output)
        for account in hash_match:
            entry = f"kerberos_hash:{account}"
            if await _add_to_set(redis, session_id, "vulns", entry):
                newly_discovered["vulns"].append(entry)

    # ── hashcat → cracked credentials ──────────────────────────────────
    if first_word == "hashcat":
        if "cracked" in output.lower() or "recovered" in output.lower():
            cred_match = re.findall(r"\*(\S+?)\$.*?:(\S+)", output)
            for account, password in cred_match:
                entry = f"{account}:{password}"
                if await _add_to_set(redis, session_id, "credentials", entry):
                    newly_discovered["credentials"].append(entry)

    # ── hydra → brute-forced credentials ───────────────────────────────
    if first_word == "hydra":
        cred_match = re.findall(r"login:\s*(\S+)\s+password:\s*(\S+)", output, re.IGNORECASE)
        for user, pwd in cred_match:
            entry = f"{user}:{pwd}"
            if await _add_to_set(redis, session_id, "credentials", entry):
                newly_discovered["credentials"].append(entry)

    return newly_discovered


async def get_discoveries(session_id: str) -> dict[str, list[str]]:
    """Return all discoveries for a session."""
    redis = get_redis()
    result = {}
    for kind in ("services", "paths", "vulns", "credentials"):
        members = await redis.smembers(_key(session_id, kind))
        result[kind] = sorted(members) if members else []
    return result


async def clear_discoveries(session_id: str) -> None:
    """Clear all discoveries for a session (on reset)."""
    redis = get_redis()
    for kind in ("services", "paths", "vulns", "credentials"):
        await redis.delete(_key(session_id, kind))


# ── Internals ───────────────────────────────────────────────────────────────

async def _add_to_set(redis, session_id: str, kind: str, value: str) -> bool:
    """Add to Redis set, return True if newly added."""
    return bool(await redis.sadd(_key(session_id, kind), value))

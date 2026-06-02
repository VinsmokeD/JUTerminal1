"""
Context builder: assembles the full AI context payload for a session.

This replaces the minimal context previously sent to OpenRouter. The AI now
receives complete target knowledge, student discovery state, command history,
note summaries, and behavioral signals.
"""

from __future__ import annotations

import time
from typing import Any

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.cache.redis import _get as get_redis, lrange, cache_get
from src.db.database import AsyncSessionLocal, Session, Note, CommandLog
from src.ai.discovery_tracker import get_discoveries
from src.ai.security import redact_for_ai

LAB_CREDENTIALS = (
    "Password123",
    "Backup2023!",
    "P@ssw0rd_NovaMed_2023!",
    "WebAppPass2024!",
)


def redact_lab_credentials_for_prompt(
    prompt: str,
    discovered_credentials: list[Any] | None,
) -> str:
    """Hide lab credentials from model prompts until the session has earned them."""
    if not prompt:
        return ""

    discovered = {
        item.strip()
        for item in (discovered_credentials or [])
        if isinstance(item, str) and item.strip()
    }
    redacted = prompt
    for credential in LAB_CREDENTIALS:
        if credential not in discovered:
            redacted = redacted.replace(credential, "<REDACTED:credential>")
    return redacted


# ── Full target knowledge per scenario ──────────────────────────────────────
# The AI knows EVERYTHING about the environment — all services, all vulns,
# all attack paths. This lets it give precise, context-aware guidance.

SCENARIO_KNOWLEDGE: dict[str, dict] = {
    "SC-01": {
        "name": "NovaMed Healthcare",
        "network": "172.20.1.0/24",
        "hosts": [
            {
                "ip": "172.20.1.20",
                "hostname": "novamed-web",
                "services": [
                    "ssh:22/OpenSSH_8.9p1",
                    "http:80/Apache_2.4.54/PHP_7.4.33",
                    "https:443/Apache_2.4.54",
                    "mysql:3306/MySQL_8.0.32",
                ],
                "vulns": [
                    {
                        "id": "sqli_login",
                        "type": "SQL Injection",
                        "location": "/login POST parameter 'username'",
                        "severity": "CRITICAL",
                        "cwe": "CWE-89",
                    },
                    {
                        "id": "lfi_records",
                        "type": "Local File Inclusion",
                        "location": "/records/?file= parameter",
                        "severity": "HIGH",
                        "cwe": "CWE-22",
                    },
                    {
                        "id": "idor_patients",
                        "type": "Insecure Direct Object Reference",
                        "location": "/records/?id= sequential IDs",
                        "severity": "HIGH",
                        "cwe": "CWE-639",
                    },
                    {
                        "id": "unrestricted_upload",
                        "type": "Unrestricted File Upload",
                        "location": "/uploads/ accepts .php files",
                        "severity": "CRITICAL",
                        "cwe": "CWE-434",
                    },
                ],
                "attack_path": "SQLi → extract creds → LFI to read config → upload PHP shell → RCE",
            },
            {
                "ip": "172.20.1.21",
                "hostname": "novamed-db",
                "services": ["mysql:3306/MySQL_8.0.32"],
                "vulns": [],
                "attack_path": "Accessible only from webapp via SQLi",
            },
            {
                "ip": "172.20.1.1",
                "hostname": "novamed-waf",
                "services": ["http:80/ModSecurity_WAF"],
                "vulns": [],
                "attack_path": "WAF blocks obvious attacks — requires evasion or less-detected vectors",
            },
        ],
        "key_findings_expected": [
            "Apache/PHP stack identification",
            "Open ports (22,80,443,3306)",
            "Directory enumeration (/admin, /backup, /records, /uploads)",
            "SQL injection in login form",
            "LFI via file parameter",
            "IDOR in patient records",
            "PHP file upload to webshell",
            "RCE via webshell",
        ],
        "blue_detection_points": [
            "WAF alerts on SQLi patterns",
            "Anomalous 404 rates from enumeration",
            "Database auth failures",
            "File upload to /uploads/",
            "Shell process spawn from PHP",
        ],
    },
    "SC-02": {
        "name": "Nexora Financial",
        "network": "172.20.2.0/24",
        "hosts": [
            {
                "ip": "172.20.2.20",
                "hostname": "NEXORA-DC01",
                "services": [
                    "dns:53/Samba_4.x",
                    "kerberos:88/Samba_kdc",
                    "msrpc:135",
                    "netbios:139/Samba_4.17",
                    "ldap:389/Samba_LDAP",
                    "smb:445/Samba_4.17",
                    "kpasswd:464",
                ],
                "vulns": [
                    {
                        "id": "kerberoast_svc",
                        "type": "Kerberoastable Account",
                        "location": "svc_backup (SPN: CIFS/NEXORA-FS01.nexora.local)",
                        "severity": "HIGH",
                        "cwe": "CWE-916",
                    },
                    {
                        "id": "dcsync",
                        "type": "DCSync Privilege",
                        "location": "Domain Admin can replicate all hashes",
                        "severity": "CRITICAL",
                        "cwe": "CWE-269",
                    },
                ],
                "attack_path": "BloodHound recon → find svc_backup SPN → Kerberoast → crack hash → lateral move → DCSync",
            },
            {
                "ip": "172.20.2.40",
                "hostname": "NEXORA-FS01",
                "services": ["smb:445/Samba_4.17"],
                "vulns": [
                    {
                        "id": "share_access",
                        "type": "Excessive Share Permissions",
                        "location": "Finance share readable by svc_backup",
                        "severity": "MEDIUM",
                        "cwe": "CWE-732",
                    },
                ],
                "attack_path": "Accessible via svc_backup credentials after Kerberoast crack",
            },
        ],
        "domain": "nexora.local",
        "initial_creds": {"username": "jsmith", "password": "Password123"},
        "key_accounts": {
            "jsmith": {"role": "Low-privilege domain user", "groups": ["Domain Users"]},
            "svc_backup": {
                "role": "Service account (Kerberoastable)",
                "spn": "CIFS/NEXORA-FS01.nexora.local",
                "password": "Backup2023!",
                "groups": ["Domain Users"],
            },
            "it.admin": {
                "role": "Domain Administrator",
                "groups": ["Domain Admins", "Enterprise Admins"],
            },
        },
        "key_findings_expected": [
            "AD domain discovery (nexora.local)",
            "BloodHound data collection",
            "Kerberoastable account identification (svc_backup)",
            "TGS hash extraction",
            "Hash cracking (Backup2023!)",
            "Lateral movement to file server",
            "DCSync attack for all hashes",
        ],
        "blue_detection_points": [
            "Event 4769 with RC4 encryption (Kerberoasting)",
            "Event 4625 failed auth attempts",
            "Event 4624 Type 3 from unusual IPs",
            "Event 4648 explicit credential usage",
            "Event 4662 replication rights (DCSync)",
        ],
    },
    "SC-03": {
        "name": "Orion Logistics",
        "network": "172.20.3.0/24",
        "hosts": [
            {
                "ip": "172.20.3.10",
                "hostname": "gophish",
                "services": ["http:80/GoPhish", "http:3333/GoPhish_admin"],
                "vulns": [],
                "attack_path": "Campaign management — configure sending profile, email template, landing page",
            },
            {
                "ip": "172.20.3.20",
                "hostname": "mail-relay",
                "services": ["smtp:25/Postfix"],
                "vulns": [
                    {
                        "id": "open_relay",
                        "type": "Open SMTP Relay",
                        "location": "Postfix accepts relay from scenario network",
                        "severity": "MEDIUM",
                        "cwe": "CWE-284",
                    },
                ],
                "attack_path": "Used as sending relay for phishing campaign — passes SPF for scenario domain",
            },
            {
                "ip": "172.20.3.30",
                "hostname": "victim-endpoint",
                "services": ["http:80/simulated_windows"],
                "vulns": [
                    {
                        "id": "macro_exec",
                        "type": "Macro Execution Allowed",
                        "location": "Simulated Office with macros enabled",
                        "severity": "HIGH",
                        "cwe": "CWE-94",
                    },
                ],
                "attack_path": "Opens phishing email → executes macro → reverse shell callback",
            },
        ],
        "key_findings_expected": [
            "OSINT on target organization",
            "GoPhish campaign setup",
            "Sending profile configuration via Postfix",
            "Phishing email template creation",
            "Payload generation (msfvenom)",
            "Campaign launch and tracking",
            "Callback/reverse shell received",
        ],
        "blue_detection_points": [
            "Email header anomalies (SPF/DKIM/DMARC)",
            "Tracking pixel fires",
            "Event 4688 Office spawning cmd.exe",
            "Event 4104 PowerShell script block",
            "Scheduled task creation (persistence)",
            "C2 beacon traffic",
        ],
    },
}


async def build_ai_context(session_id: str, student_question: str | None = None) -> dict[str, Any]:
    """
    Assemble the full AI context payload for a given session.
    This builds the exact structured envelope required by Task A.2.
    """
    import re
    import datetime
    from src.ai.security import redact_text
    from src.scenarios.branching import get_active_branch
    from src.db.database import SiemEvent, User

    redis = get_redis()

    # ── Load session from DB ────────────────────────────────────────────
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Session).where(Session.id == session_id))
        session = result.scalar_one_or_none()
        if not session:
            return {}

        # Get command count this phase
        cmd_count = await db.execute(
            select(func.count(CommandLog.id)).where(
                CommandLog.session_id == session_id, CommandLog.phase == session.phase
            )
        )
        commands_this_phase = cmd_count.scalar() or 0

        # Load recent notes
        note_result = await db.execute(
            select(Note)
            .where(Note.session_id == session_id)
            .order_by(Note.created_at.desc())
            .limit(5)
        )
        recent_notes = note_result.scalars().all()

        # Load total notes for summary
        all_notes_res = await db.execute(select(Note).where(Note.session_id == session_id))
        all_notes = all_notes_res.scalars().all()
        note_summary = _summarize_notes(list(all_notes))

        # Load user skill level
        user_result = await db.execute(select(User).where(User.id == session.user_id))
        user = user_result.scalar_one_or_none()
        skill_level = getattr(user, "skill_level", "beginner") if user else "beginner"

        # Load recent SIEM events (last 10)
        siem_res = await db.execute(
            select(SiemEvent)
            .where(SiemEvent.session_id == session_id)
            .order_by(SiemEvent.created_at.desc())
            .limit(10)
        )
        recent_siem_events = siem_res.scalars().all()

        # Load last progress times
        last_note_res = await db.execute(
            select(Note.created_at)
            .where(Note.session_id == session_id)
            .order_by(Note.created_at.desc())
            .limit(1)
        )
        last_note_time = last_note_res.scalar_one_or_none()

        last_flag_res = await db.execute(
            select(CommandLog.created_at)
            .where(CommandLog.session_id == session_id, CommandLog.tool == "flag:capture")
            .order_by(CommandLog.created_at.desc())
            .limit(1)
        )
        last_flag_time = last_flag_res.scalar_one_or_none()

    # ── Load discoveries from Redis ─────────────────────────────────────
    discoveries = await get_discoveries(session_id)

    # ── Hints already delivered (so the tutor never repeats guidance) ───
    raw_prior_hints = await lrange(f"ai:{session_id}:hints_given", 0, 7)
    prior_hints = [
        (h.decode() if isinstance(h, bytes) else str(h))[:240] for h in (raw_prior_hints or []) if h
    ]

    # ── Load command history from Redis (last 10 commands) ──────────────
    raw_commands = await lrange(f"session:{session_id}:commands", 0, 9)
    command_history = (
        [c.decode() if isinstance(c, bytes) else str(c) for c in raw_commands if c]
        if raw_commands
        else []
    )

    recent_commands = []
    for cmd in command_history:
        redacted_cmd = redact_text(cmd, session.session_metadata)
        capped_cmd = redacted_cmd[:200]
        wrapped_cmd = (
            f'<UNTRUSTED_DATA source="kali_terminal_command">\n{capped_cmd}\n</UNTRUSTED_DATA>'
        )
        recent_commands.append(wrapped_cmd)

    # ── Construct last command output summary ───────────────────────────
    # Redis capped list history
    terminal_chunks = await lrange(f"terminal:{session_id}:history", 0, 19)
    reconstructed_text = "".join(
        list(
            reversed([c.decode() if isinstance(c, bytes) else str(c) for c in terminal_chunks if c])
        )
    )

    ANSI_RE = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]")
    cleaned_text = ANSI_RE.sub("", reconstructed_text).replace("\r", "")
    output_lines = [ln.strip() for ln in cleaned_text.split("\n") if ln.strip()]

    last_cmd = ""
    if command_history:
        last_cmd = command_history[0].strip()

    output_start_idx = 0
    if last_cmd:
        for idx in range(len(output_lines) - 1, -1, -1):
            if last_cmd in output_lines[idx]:
                output_start_idx = idx + 1
                break

    cmd_output_lines = output_lines[output_start_idx:]
    if not cmd_output_lines:
        cmd_output_lines = output_lines[-30:]

    processed_output_lines = []
    for line in cmd_output_lines:
        redacted_line = redact_text(line, session.session_metadata)
        capped_line = redacted_line[:240]
        wrapped_line = (
            f'<UNTRUSTED_DATA source="kali_terminal_output">\n{capped_line}\n</UNTRUSTED_DATA>'
        )
        processed_output_lines.append(wrapped_line)

    first_lines = processed_output_lines[:20]
    last_lines = processed_output_lines[-20:]

    # Heuristic exit code
    exit_code = 0
    full_output_str = "\n".join(cmd_output_lines).lower()
    error_keywords = [
        "command not found",
        "permission denied",
        "access denied",
        "failed",
        "invalid option",
        "error:",
        "syntax error",
        "traceback",
    ]
    if any(kw in full_output_str for kw in error_keywords):
        exit_code = 1

    # Fingerprints
    fingerprints = []
    if re.search(r"\d+/tcp\s+(open|filtered)", full_output_str):
        fingerprints.append("nmap_port_list")
    if re.search(
        r"you have an error in your sql syntax|mariadb|mysql\s+error|syntax\s+error\s+near",
        full_output_str,
    ):
        fingerprints.append("sqli_error")
    if re.search(r"samba|smb|cifs|domain\s+controller", full_output_str):
        fingerprints.append("smb_banner")
    if "root:x:0:0" in full_output_str:
        fingerprints.append("lfi_etc_passwd")
    if "$krb5tgs$" in full_output_str or "$23$" in full_output_str:
        fingerprints.append("kerberoast_hash")
    if re.search(r"krbtgt:502:.*[a-f0-9]{32}", full_output_str):
        fingerprints.append("dcsync_hash")

    last_command_output_summary = {
        "exit_code": exit_code,
        "first_lines": first_lines,
        "last_lines": last_lines,
        "fingerprints": fingerprints,
        "byte_count": len("\n".join(cmd_output_lines)),
    }

    # ── Notes summary (up to 5 most recent note titles wrapped) ─────────
    notes_summary = []
    for note in recent_notes:
        note_title = f"[{note.tag}] {note.content[:50]}"
        redacted_title = redact_text(note_title, session.session_metadata)
        wrapped_title = (
            f'<UNTRUSTED_DATA source="student_notebook">\n{redacted_title}\n</UNTRUSTED_DATA>'
        )
        notes_summary.append(wrapped_title)

    # ── Flags captured + pending candidates (flag_candidate WS1 nudges) ─
    cached_state = await cache_get(f"session:{session_id}:state") or {}
    flags_captured = cached_state.get("flags_captured", [])

    # Pending candidates: flags the terminal has revealed but student hasn't submitted
    # Checked via the same dedup keys used by scan_flag_candidates
    from src.scenarios.loader import get_flags as _get_flags

    pending_candidates: list[str] = []
    try:
        for _f in _get_flags(session.scenario_id):
            _fid = _f.get("id", "")
            if not _fid or _fid in flags_captured:
                continue
            _dedup = await cache_get(f"flagcandidate:{session_id}:{_fid}")
            if _dedup:
                pending_candidates.append(_fid)
    except Exception:
        pass

    # ── Compute minutes since last progress ─────────────────────────────
    last_progress_time = session.started_at
    if last_note_time and last_note_time > last_progress_time:
        last_progress_time = last_note_time
    if last_flag_time and last_flag_time > last_progress_time:
        last_progress_time = last_flag_time

    now = datetime.datetime.now(datetime.timezone.utc)
    last_progress = (
        last_progress_time.replace(tzinfo=datetime.timezone.utc)
        if last_progress_time.tzinfo is None
        else last_progress_time
    )
    minutes_since_last_progress = int((now - last_progress).total_seconds() / 60)

    # ── SIEM events recent ──────────────────────────────────────────────
    siem_count = len(recent_siem_events)
    top_severity = "INFO"
    severity_rank = {
        "CRITICAL": 4,
        "HIGH": 3,
        "MEDIUM": 2,
        "MED": 2,
        "LOW": 1,
        "INFO": 0,
    }
    for ev in recent_siem_events:
        sev = (ev.severity or "INFO").upper()
        if severity_rank.get(sev, 0) > severity_rank.get(top_severity, 0):
            top_severity = sev
    siem_events_recent = [siem_count, top_severity]

    # ── Active branch ───────────────────────────────────────────────────
    branch_info = await get_active_branch(session_id)
    active_branch = branch_info.get("label") if branch_info else ""

    # ── Student question ────────────────────────────────────────────────
    wrapped_question = ""
    if student_question:
        redacted_q = redact_text(student_question, session.session_metadata)
        wrapped_q = f'<UNTRUSTED_DATA source="student_question">\n{redacted_q}\n</UNTRUSTED_DATA>'
        wrapped_question = wrapped_q

    # ── Compute behavioral signals ──────────────────────────────────────
    phase_start_key = f"session:{session_id}:phase_start"
    phase_start = await cache_get(phase_start_key)
    phase_duration_minutes = 0
    if phase_start:
        try:
            phase_duration_minutes = int((time.time() - float(phase_start)) / 60)
        except (ValueError, TypeError):
            pass

    last_cmd_key = f"session:{session_id}:last_cmd_time"
    last_cmd_time = await cache_get(last_cmd_key)
    time_since_last_cmd = 0
    if last_cmd_time:
        try:
            time_since_last_cmd = int(time.time() - float(last_cmd_time))
        except (ValueError, TypeError):
            pass

    ai_mode = getattr(session, "ai_mode", "learn")
    scenario_id = session.scenario_id.upper()
    target_knowledge = SCENARIO_KNOWLEDGE.get(scenario_id, {})
    redacted_knowledge = redact_for_ai(target_knowledge, current_phase=session.phase)

    # Return unified payload mapping both the requested task envelope and internal metadata
    return {
        # A.2 envelope keys
        "scenario": scenario_id,
        "phase": session.phase,
        "role": session.role,
        "active_branch": active_branch,
        "student_question": wrapped_question,
        "recent_commands": recent_commands,
        "last_command_output_summary": last_command_output_summary,
        "notes_summary": notes_summary,
        "flags_captured": flags_captured,
        "pending_flag_candidates": pending_candidates,
        "prior_hints_given": prior_hints,
        "minutes_since_last_progress": minutes_since_last_progress,
        "siem_events_recent": siem_events_recent,
        # Internal metadata keys (needed by monitor.py and other parts)
        "scenario_id": scenario_id,
        "scenario_name": target_knowledge.get("name", "Unknown"),
        "skill_level": skill_level,
        "mode": ai_mode,
        "target_environment": {
            "network": redacted_knowledge.get("network", ""),
            "hosts": redacted_knowledge.get("hosts", []),
            "domain": redacted_knowledge.get("domain"),
            "initial_creds": redacted_knowledge.get("initial_creds"),
            "key_accounts": redacted_knowledge.get("key_accounts"),
        },
        "discovered_services": discoveries.get("services", []),
        "discovered_paths": discoveries.get("paths", []),
        "discovered_vulns": discoveries.get("vulns", []),
        "discovered_credentials": discoveries.get("credentials", []),
        "key_findings_expected": target_knowledge.get("key_findings_expected", []),
        "blue_detection_points": target_knowledge.get("blue_detection_points", []),
        "command_history": command_history,
        "note_count": len(all_notes),
        "commands_this_phase": commands_this_phase,
        "phase_duration_minutes": phase_duration_minutes,
        "time_since_last_command_seconds": time_since_last_cmd,
    }


def _summarize_notes(notes: list) -> dict[str, Any]:
    """Summarize notes into a compact representation for the AI."""
    if not notes:
        return {
            "summary": "No notes taken yet.",
            "total": 0,
            "has_findings": False,
            "has_evidence": False,
            "has_iocs": False,
        }

    tags: dict[str, int] = {}
    contents = []
    for note in notes:
        tags[note.tag] = tags.get(note.tag, 0) + 1
        contents.append(f"[{note.tag}] {note.content[:100]}")

    summary_parts = [f"{count} {tag} notes" for tag, count in sorted(tags.items())]
    summary = f"Student has {len(notes)} notes ({', '.join(summary_parts)}). "
    summary += "Recent: " + " | ".join(contents[-5:])

    return {
        "summary": summary,
        "total": len(notes),
        "has_findings": tags.get("finding", 0) > 0,
        "has_evidence": tags.get("evidence", 0) > 0,
        "has_iocs": tags.get("ioc", 0) > 0,
    }

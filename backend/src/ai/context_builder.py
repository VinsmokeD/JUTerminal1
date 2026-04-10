"""
Context builder: assembles the full AI context payload for a session.

This replaces the minimal context previously sent to Gemini. The AI now
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
from src.sandbox.terminal import SCENARIO_TARGETS


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
                "services": ["ssh:22/OpenSSH_8.9p1", "http:80/Apache_2.4.54/PHP_8.1.12", "https:443/Apache_2.4.54", "mysql:3306/MySQL_8.0.32"],
                "vulns": [
                    {"id": "sqli_login", "type": "SQL Injection", "location": "/login POST parameter 'username'", "severity": "CRITICAL", "cwe": "CWE-89"},
                    {"id": "lfi_records", "type": "Local File Inclusion", "location": "/records/?file= parameter", "severity": "HIGH", "cwe": "CWE-22"},
                    {"id": "idor_patients", "type": "Insecure Direct Object Reference", "location": "/records/?id= sequential IDs", "severity": "HIGH", "cwe": "CWE-639"},
                    {"id": "unrestricted_upload", "type": "Unrestricted File Upload", "location": "/uploads/ accepts .php files", "severity": "CRITICAL", "cwe": "CWE-434"},
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
        "key_findings_expected": ["Apache/PHP stack identification", "Open ports (22,80,443,3306)", "Directory enumeration (/admin, /backup, /records, /uploads)", "SQL injection in login form", "LFI via file parameter", "IDOR in patient records", "PHP file upload to webshell", "RCE via webshell"],
        "blue_detection_points": ["WAF alerts on SQLi patterns", "Anomalous 404 rates from enumeration", "Database auth failures", "File upload to /uploads/", "Shell process spawn from PHP"],
    },
    "SC-02": {
        "name": "Nexora Financial",
        "network": "172.20.2.0/24",
        "hosts": [
            {
                "ip": "172.20.2.20",
                "hostname": "NEXORA-DC01",
                "services": ["dns:53/Samba_4.x", "kerberos:88/Samba_kdc", "msrpc:135", "netbios:139/Samba_4.17", "ldap:389/Samba_LDAP", "smb:445/Samba_4.17", "kpasswd:464"],
                "vulns": [
                    {"id": "kerberoast_svc", "type": "Kerberoastable Account", "location": "svc_backup (SPN: CIFS/NEXORA-FS01.nexora.local)", "severity": "HIGH", "cwe": "CWE-916"},
                    {"id": "dcsync", "type": "DCSync Privilege", "location": "Domain Admin can replicate all hashes", "severity": "CRITICAL", "cwe": "CWE-269"},
                ],
                "attack_path": "BloodHound recon → find svc_backup SPN → Kerberoast → crack hash → lateral move → DCSync",
            },
            {
                "ip": "172.20.2.40",
                "hostname": "NEXORA-FS01",
                "services": ["smb:445/Samba_4.17"],
                "vulns": [
                    {"id": "share_access", "type": "Excessive Share Permissions", "location": "Finance share readable by svc_backup", "severity": "MEDIUM", "cwe": "CWE-732"},
                ],
                "attack_path": "Accessible via svc_backup credentials after Kerberoast crack",
            },
        ],
        "domain": "nexora.local",
        "initial_creds": {"username": "jsmith", "password": "Welcome1!"},
        "key_accounts": {
            "jsmith": {"role": "Low-privilege domain user", "groups": ["Domain Users"]},
            "svc_backup": {"role": "Service account (Kerberoastable)", "spn": "CIFS/NEXORA-FS01.nexora.local", "password": "Backup2024!", "groups": ["Domain Users"]},
            "it.admin": {"role": "Domain Administrator", "groups": ["Domain Admins", "Enterprise Admins"]},
        },
        "key_findings_expected": ["AD domain discovery (nexora.local)", "BloodHound data collection", "Kerberoastable account identification (svc_backup)", "TGS hash extraction", "Hash cracking (Backup2024!)", "Lateral movement to file server", "DCSync attack for all hashes"],
        "blue_detection_points": ["Event 4769 with RC4 encryption (Kerberoasting)", "Event 4625 failed auth attempts", "Event 4624 Type 3 from unusual IPs", "Event 4648 explicit credential usage", "Event 4662 replication rights (DCSync)"],
    },
    "SC-03": {
        "name": "Orion Logistics",
        "network": "172.20.3.0/24",
        "hosts": [
            {
                "ip": "172.20.3.40",
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
                    {"id": "open_relay", "type": "Open SMTP Relay", "location": "Postfix accepts relay from scenario network", "severity": "MEDIUM", "cwe": "CWE-284"},
                ],
                "attack_path": "Used as sending relay for phishing campaign — passes SPF for scenario domain",
            },
            {
                "ip": "172.20.3.30",
                "hostname": "victim-endpoint",
                "services": ["http:80/simulated_windows"],
                "vulns": [
                    {"id": "macro_exec", "type": "Macro Execution Allowed", "location": "Simulated Office with macros enabled", "severity": "HIGH", "cwe": "CWE-94"},
                ],
                "attack_path": "Opens phishing email → executes macro → reverse shell callback",
            },
        ],
        "key_findings_expected": ["OSINT on target organization", "GoPhish campaign setup", "Sending profile configuration via Postfix", "Phishing email template creation", "Payload generation (msfvenom)", "Campaign launch and tracking", "Callback/reverse shell received"],
        "blue_detection_points": ["Email header anomalies (SPF/DKIM/DMARC)", "Tracking pixel fires", "Event 4688 Office spawning cmd.exe", "Event 4104 PowerShell script block", "Scheduled task creation (persistence)", "C2 beacon traffic"],
    },
}


async def build_ai_context(session_id: str) -> dict[str, Any]:
    """
    Assemble the full AI context payload for a given session.
    This is the brain's complete view of the student's situation.
    """
    redis = get_redis()

    # ── Load session from DB ────────────────────────────────────────────
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Session).where(Session.id == session_id))
        session = result.scalar_one_or_none()
        if not session:
            return {}

        # Count notes by tag
        note_result = await db.execute(
            select(Note).where(Note.session_id == session_id)
        )
        notes = note_result.scalars().all()
        note_summary = _summarize_notes(notes)

        # Get command count this phase
        cmd_count = await db.execute(
            select(func.count(CommandLog.id))
            .where(CommandLog.session_id == session_id, CommandLog.phase == session.phase)
        )
        commands_this_phase = cmd_count.scalar() or 0

    # ── Load discoveries from Redis ─────────────────────────────────────
    discoveries = await get_discoveries(session_id)

    # ── Load command history from Redis ─────────────────────────────────
    raw_commands = await lrange(f"session:{session_id}:commands", 0, 19)
    command_history = list(reversed([str(c) for c in raw_commands if c])) if raw_commands else []

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

    # ── Get AI mode from session ────────────────────────────────────────
    ai_mode = getattr(session, 'ai_mode', 'learn')

    # ── Get skill level from user ───────────────────────────────────────
    async with AsyncSessionLocal() as db:
        from src.db.database import User
        user_result = await db.execute(select(User).where(User.id == session.user_id))
        user = user_result.scalar_one_or_none()
        skill_level = getattr(user, 'skill_level', 'beginner') if user else 'beginner'

    # ── Assemble full context ───────────────────────────────────────────
    scenario_id = session.scenario_id.upper()
    target_knowledge = SCENARIO_KNOWLEDGE.get(scenario_id, {})

    return {
        "scenario_id": scenario_id,
        "scenario_name": target_knowledge.get("name", "Unknown"),
        "role": session.role,
        "phase": session.phase,
        "methodology": session.methodology,
        "skill_level": skill_level,
        "mode": ai_mode,

        # Full target knowledge
        "target_environment": {
            "network": target_knowledge.get("network", ""),
            "hosts": target_knowledge.get("hosts", []),
            "domain": target_knowledge.get("domain"),
            "initial_creds": target_knowledge.get("initial_creds"),
            "key_accounts": target_knowledge.get("key_accounts"),
        },

        # What student has found so far
        "discovered_services": discoveries.get("services", []),
        "discovered_paths": discoveries.get("paths", []),
        "discovered_vulns": discoveries.get("vulns", []),
        "discovered_credentials": discoveries.get("credentials", []),

        # Expected findings for progress tracking
        "key_findings_expected": target_knowledge.get("key_findings_expected", []),
        "blue_detection_points": target_knowledge.get("blue_detection_points", []),

        # Command history
        "command_history": command_history[-20:],

        # Notes
        "notes_summary": note_summary["summary"],
        "note_count": note_summary["total"],
        "has_findings": note_summary["has_findings"],
        "has_evidence": note_summary["has_evidence"],
        "has_iocs": note_summary["has_iocs"],

        # Behavioral signals
        "commands_this_phase": commands_this_phase,
        "phase_duration_minutes": phase_duration_minutes,
        "time_since_last_command_seconds": time_since_last_cmd,
    }


def _summarize_notes(notes: list) -> dict[str, Any]:
    """Summarize notes into a compact representation for the AI."""
    if not notes:
        return {"summary": "No notes taken yet.", "total": 0, "has_findings": False, "has_evidence": False, "has_iocs": False}

    tags = {}
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

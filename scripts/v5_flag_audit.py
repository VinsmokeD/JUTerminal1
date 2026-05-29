#!/usr/bin/env python3
"""Walk every flag in every scenario YAML and verify it is capturable."""

from __future__ import annotations

import json
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
import os
from pathlib import Path

import yaml

SCENARIOS = ["SC-01", "SC-02", "SC-03"]
SCENARIO_SLUGS = {
    "SC-01": "webapp-pentest",
    "SC-02": "ad-compromise",
    "SC-03": "phishing",
}
SCENARIO_DIR = Path("docs/scenarios")
API_BASE_CANDIDATES = [
    os.environ.get("CYBERSIM_API_BASE"),
    "http://127.0.0.1:8001",
    "http://127.0.0.1:8000",
]
API_BASE = next(item for item in API_BASE_CANDIDATES if item)


def run(command: list[str], *, check: bool = False) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        command,
        cwd=Path(__file__).resolve().parents[1],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if check and result.returncode != 0:
        raise RuntimeError(f"{' '.join(command)} failed:\n{result.stdout}")
    return result


def compose_exec(service: str, shell_command: str) -> str:
    result = run(["docker", "compose", "exec", "-T", service, "sh", "-lc", shell_command])
    if result.returncode != 0:
        result = run(["docker-compose", "exec", "-T", service, "sh", "-lc", shell_command])
    if result.returncode != 0:
        raise RuntimeError(result.stdout)
    return result.stdout


def request_json(method: str, path: str, data: dict | None = None, token: str | None = None) -> dict:
    body = None if data is None else json.dumps(data).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    last_error: Exception | None = None
    for base in [item for item in API_BASE_CANDIDATES if item]:
        req = urllib.request.Request(f"{base}{path}", data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"{method} {path} failed: HTTP {exc.code} {detail}") from exc
        except urllib.error.URLError as exc:
            last_error = exc
            continue
    raise RuntimeError(f"{method} {path} failed against all API bases: {last_error}")


def register_user() -> str:
    username = f"test_flag_audit_{int(time.time())}_{uuid.uuid4().hex[:8]}"
    body = request_json(
        "POST",
        "/api/auth/register",
        {"username": username, "password": "AuditPass123!"},
    )
    return body["access_token"]


def start_session(scenario_id: str, token: str) -> str:
    body = request_json(
        "POST",
        "/api/sessions/start",
        {"scenario_id": scenario_id, "role": "red"},
        token,
    )
    return body["session_id"]


def submit_flag(session_id: str, token: str, value: str) -> dict:
    return request_json("POST", f"/api/sessions/{session_id}/flag", {"flag_value": value}, token)


def load_flags(scenario_id: str) -> list[dict]:
    path = SCENARIO_DIR / f"{scenario_id}-{SCENARIO_SLUGS[scenario_id]}.yaml"
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    return data.get("flags") or []


def artifact_value(scenario_id: str, flag: dict) -> tuple[bool, str, str]:
    flag_id = flag.get("id")
    if scenario_id == "SC-01" and flag_id == "FLAG-SC01-1":
        out = compose_exec(
            "sc01-php",
            "curl -sS 'http://172.20.1.20/records?file=../../../../etc/passwd'",
        )
        return ("root:x:0:0" in out, flag["value"], "LFI passwd output contains root:x:0:0")
    if scenario_id == "SC-01" and flag_id == "FLAG-SC01-2":
        out = compose_exec(
            "sc01-php",
            "curl -sS http://172.20.1.20/backup/db_backup.sql.gz | gunzip",
        )
        return (flag["value"] in out, flag["value"], "backup SQL archive contains admin credential")
    if scenario_id == "SC-01" and flag_id == "FLAG-SC01-3":
        out = compose_exec(
            "sc01-php",
            "curl -sS 'http://172.20.1.20/records?file=admin/config.php'",
        )
        return ("DB_PASS" in out and "WebAppPass2024!" in out, flag["value"], "LFI config output contains DB_PASS")
    if scenario_id == "SC-01" and flag_id == "FLAG-SC01-4":
        out = compose_exec(
            "sc01-php",
            "curl -sS 'http://172.20.1.20/api/v1/patients/1042'",
        )
        return ("Aisha Rahman" in out and "1042" in out, flag["value"], "patient API returns record 1042")
    if scenario_id == "SC-02" and flag_id == "kerberoast_hash":
        out = compose_exec("sc02-dc", "samba-tool user show svc_backup")
        value = "$krb5tgs$23$*svc_backup$NEXORA.LOCAL$MSSQLSvc/nexora-fs01.nexora.local:1433*$deadbeef"
        return ("servicePrincipalName" in out and "svc_backup" in out, value, "svc_backup SPN exists")
    if scenario_id == "SC-02" and flag_id == "dcsync_krbtgt_nthash":
        out = compose_exec("sc02-dc", "samba-tool user show krbtgt")
        value = "krbtgt:502:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::"
        return ("sAMAccountName: krbtgt" in out, value, "krbtgt account exists for DCSync target")
    if scenario_id == "SC-03" and flag_id == "FLAG-SC03-1":
        health = compose_exec("sc03-victim", "curl -sS http://127.0.0.1:8080/health")
        marker = compose_exec("sc03-victim", "grep -n '172.20.3.10:4444' /victim-simulator.py")
        return ("healthy" in health and "172.20.3.10:4444" in marker, flag["value"], "victim simulator callback path exists")
    raise RuntimeError(f"No artifact check implemented for {scenario_id} {flag_id}")


def audit_scenario(scenario_id: str) -> bool:
    flags = load_flags(scenario_id)
    token = register_user()
    session_id = start_session(scenario_id, token)
    wrong = submit_flag(session_id, token, "definitely-not-a-real-flag")
    wrong_hint_ok = bool(wrong.get("hint"))
    ok = True

    print(f"\n=== {scenario_id} - {len(flags)} flags ===")
    print(f"  wrong rejection hint: {'OK' if wrong_hint_ok else 'FAIL'}")
    ok = ok and wrong_hint_ok
    for flag in flags:
        flag_id = flag.get("id")
        hint_ok = bool(flag.get("on_wrong_attempt_hint"))
        try:
            artifact_ok, value, artifact_note = artifact_value(scenario_id, flag)
            result = submit_flag(session_id, token, value)
            validator_ok = bool(result.get("valid"))
        except Exception as exc:
            artifact_ok = False
            validator_ok = False
            artifact_note = str(exc)
        ok = ok and artifact_ok and validator_ok and hint_ok
        print(
            f"  {flag_id}: artifact: {'OK' if artifact_ok else 'FAIL'}, "
            f"validator: {'OK' if validator_ok else 'FAIL'}, "
            f"hint: {'OK' if hint_ok else 'FAIL'}"
        )
        print(f"    artifact_note: {artifact_note}")
    return ok


def main() -> int:
    all_ok = True
    for scenario_id in SCENARIOS:
        all_ok = audit_scenario(scenario_id) and all_ok
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())

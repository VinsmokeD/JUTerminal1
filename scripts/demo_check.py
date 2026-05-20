#!/usr/bin/env python3
"""
CyberSim Demo Readiness Check
==============================
One-command pre-flight before a graduation demo or lab session.

Usage:
    python scripts/demo_check.py                  # check core only
    python scripts/demo_check.py --scenarios all  # check SC-01 + SC-02 + SC-03
    python scripts/demo_check.py --scenarios sc02

Exit codes:  0 = all green  |  1 = one or more checks failed
"""
from __future__ import annotations

import argparse
import json
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


# ── ANSI colours ──────────────────────────────────────────────────────────────

GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def ok(msg: str)   -> str: return f"{GREEN}  ✔  {RESET}{msg}"
def warn(msg: str) -> str: return f"{YELLOW}  ⚠  {RESET}{msg}"
def fail(msg: str) -> str: return f"{RED}  ✘  {RESET}{msg}"
def head(msg: str) -> str: return f"\n{BOLD}{msg}{RESET}"


# ── HTTP helpers ──────────────────────────────────────────────────────────────

def _get_json(url: str, timeout: int = 5) -> dict:
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read())


def _tcp_open(host: str, port: int, timeout: float = 2.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def _compose_exec_tcp(service: str, port: int, timeout: int = 8) -> bool:
    """Check a TCP listener from inside a compose service for Docker Desktop hosts."""
    try:
        result = subprocess.run(
            [
                "docker",
                "compose",
                "exec",
                "-T",
                service,
                "sh",
                "-lc",
                f"nc -z 127.0.0.1 {port}",
            ],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return result.returncode == 0
    except Exception:
        return False


# ── Check result ─────────────────────────────────────────────────────────────

@dataclass
class Result:
    label: str
    passed: bool
    detail: str = ""

    def render(self) -> str:
        fn = ok if self.passed else fail
        suffix = f" — {self.detail}" if self.detail else ""
        return fn(f"{self.label}{suffix}")


# ── Individual checks ─────────────────────────────────────────────────────────

def check_backend(base: str) -> list[Result]:
    results = []
    # simple liveness
    try:
        d = _get_json(f"{base}/health")
        results.append(Result("Backend /health", d.get("status") == "ok", d.get("version", "")))
    except Exception as exc:
        results.append(Result("Backend /health", False, str(exc)[:80]))
        return results  # no point continuing if backend is down

    # deep readiness
    try:
        req = urllib.request.Request(f"{base}/api/health/readiness")
        try:
            with urllib.request.urlopen(req, timeout=8) as resp:
                d = json.loads(resp.read())
                code = resp.status
        except urllib.error.HTTPError as e:
            d = json.loads(e.read())
            code = e.code

        for svc, info in d.get("checks", {}).items():
            passed = info.get("status") == "ok"
            detail = info.get("detail") or info.get("cluster_status") or ""
            if svc == "redis" and passed:
                detail = f"active_sessions={info.get('active_sessions', 0)}"
            results.append(Result(f"  {svc}", passed, detail))
    except Exception as exc:
        results.append(Result("Deep readiness", False, str(exc)[:80]))

    return results


def check_frontend(frontend_url: str) -> list[Result]:
    try:
        req = urllib.request.Request(frontend_url)
        with urllib.request.urlopen(req, timeout=5) as resp:
            body = resp.read(256).decode(errors="ignore")
        has_cybersim = "cybersim" in body.lower() or "CyberSim" in body
        return [Result("Frontend serves HTML", has_cybersim, frontend_url)]
    except Exception as exc:
        return [Result("Frontend serves HTML", False, str(exc)[:80])]


def check_scenario_sc01() -> list[Result]:
    results = []
    results.append(Result("SC-01 WAF port 80",     _tcp_open("172.20.1.1",  80)))
    results.append(Result("SC-01 Webapp port 80",  _tcp_open("172.20.1.20", 80)))
    results.append(Result("SC-01 DB port 3306",    _tcp_open("172.20.1.21", 3306)))
    return results


def check_scenario_sc02() -> list[Result]:
    results = []
    results.append(
        Result("SC-02 DC  Kerberos 88", _tcp_open("172.20.2.20", 88) or _compose_exec_tcp("sc02-dc", 88))
    )
    results.append(
        Result("SC-02 DC  LDAP     389", _tcp_open("172.20.2.20", 389) or _compose_exec_tcp("sc02-dc", 389))
    )
    results.append(
        Result("SC-02 DC  SMB      445", _tcp_open("172.20.2.20", 445) or _compose_exec_tcp("sc02-dc", 445))
    )
    results.append(
        Result(
            "SC-02 FS  SMB      445",
            _tcp_open("172.20.2.40", 445) or _compose_exec_tcp("sc02-fileserver", 445),
        )
    )
    return results


def check_scenario_sc03() -> list[Result]:
    results = []
    results.append(Result("SC-03 Mail SMTP 25",      _tcp_open("172.20.3.20", 25)))
    results.append(Result("SC-03 GoPhish admin 3333", _tcp_open("172.20.3.10", 3333)))
    results.append(Result("SC-03 Victim HTTP 8080",  _tcp_open("172.20.3.30", 8080)))
    return results


def check_docker_compose() -> list[Result]:
    """Verify core services are running and healthy via docker compose ps."""
    results = []
    try:
        out = subprocess.run(
            ["docker", "compose", "ps", "--format", "json"],
            capture_output=True, text=True, timeout=10,
        )
        if out.returncode != 0:
            return [Result("docker compose ps", False, out.stderr[:80])]

        lines = [l.strip() for l in out.stdout.splitlines() if l.strip().startswith("{")]
        services = [json.loads(l) for l in lines]

        core = {"postgres", "redis", "elasticsearch", "filebeat", "backend", "frontend"}
        found: dict[str, str] = {}
        for svc in services:
            name = svc.get("Service") or svc.get("Name", "")
            state = (svc.get("Health") or svc.get("State") or "").lower()
            for c in core:
                if c in name.lower():
                    found[c] = state

        for c in sorted(core):
            state = found.get(c, "missing")
            passed = state in ("healthy", "running")
            results.append(Result(f"  docker: {c}", passed, state))

    except FileNotFoundError:
        results.append(Result("docker compose", False, "docker not on PATH"))
    except Exception as exc:
        results.append(Result("docker compose ps", False, str(exc)[:80]))

    return results


# ── Main ─────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(description="CyberSim demo readiness check")
    parser.add_argument("--backend",  default="http://localhost:8001")
    parser.add_argument("--frontend", default="http://localhost:3000")
    parser.add_argument("--scenarios", default="", help="all | sc01 | sc02 | sc03 (comma-sep)")
    args = parser.parse_args()

    print(f"\n{BOLD}{'=' * 54}{RESET}")
    print(f"{BOLD}  CyberSim Demo Readiness Check  {RESET}")
    print(f"{BOLD}{'=' * 54}{RESET}")
    print(f"  Backend:  {args.backend}")
    print(f"  Frontend: {args.frontend}")
    print(f"  Time:     {time.strftime('%Y-%m-%d %H:%M:%S')}")

    all_results: list[Result] = []

    print(head("Core Services (docker compose)"))
    r = check_docker_compose()
    all_results.extend(r)
    for res in r: print(res.render())

    print(head("Backend API"))
    r = check_backend(args.backend)
    all_results.extend(r)
    for res in r: print(res.render())

    print(head("Frontend"))
    r = check_frontend(args.frontend)
    all_results.extend(r)
    for res in r: print(res.render())

    # Scenario network checks
    want = {s.strip().lower() for s in args.scenarios.split(",") if s.strip()}
    if "all" in want:
        want = {"sc01", "sc02", "sc03"}

    for sc_id, fn in [("sc01", check_scenario_sc01), ("sc02", check_scenario_sc02), ("sc03", check_scenario_sc03)]:
        if sc_id in want:
            print(head(f"Scenario {sc_id.upper()} Network"))
            r = fn()
            all_results.extend(r)
            for res in r: print(res.render())

    # Summary
    passed = sum(1 for r in all_results if r.passed)
    total  = len(all_results)
    failed = total - passed

    print(f"\n{BOLD}{'─' * 54}{RESET}")
    if failed == 0:
        print(f"{GREEN}{BOLD}  ALL {total} CHECKS PASSED — ready to demo!{RESET}")
    else:
        print(f"{RED}{BOLD}  {failed}/{total} CHECKS FAILED{RESET}")
        print(f"{YELLOW}  Fix the red items above before starting the demo.{RESET}")
    print(f"{BOLD}{'─' * 54}{RESET}\n")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

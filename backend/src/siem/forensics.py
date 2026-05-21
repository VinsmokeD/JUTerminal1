from __future__ import annotations

from src.sandbox.manager import _SCENARIO_TARGETS

_SIMULATED_ROWS: dict[str, dict[str, list[dict]]] = {
    "sc01": {
        "listening_ports": [
            {"pid": "1", "port": "80", "protocol": "tcp", "process": "apache2"},
            {"pid": "1", "port": "443", "protocol": "tcp", "process": "apache2"},
            {"pid": "42", "port": "3306", "protocol": "tcp", "process": "mysqld"},
        ],
        "processes": [
            {"pid": "1", "name": "apache2", "path": "/usr/sbin/apache2", "state": "S"},
            {"pid": "42", "name": "mysqld", "path": "/usr/sbin/mysqld", "state": "S"},
            {"pid": "314", "name": "php-fpm", "path": "/usr/sbin/php-fpm", "state": "S"},
        ],
        "default": [
            {"artifact": "web_upload_dir", "value": "/var/www/html/uploads", "risk": "review"},
            {"artifact": "access_log", "value": "/var/log/apache2/access.log", "risk": "high"},
        ],
    },
    "sc02": {
        "listening_ports": [
            {"pid": "1", "port": "88", "protocol": "tcp", "process": "samba"},
            {"pid": "1", "port": "389", "protocol": "tcp", "process": "samba"},
            {"pid": "1", "port": "445", "protocol": "tcp", "process": "smbd"},
        ],
        "processes": [
            {"pid": "1", "name": "samba", "path": "/usr/sbin/samba", "state": "S"},
            {"pid": "77", "name": "smbd", "path": "/usr/sbin/smbd", "state": "S"},
            {"pid": "91", "name": "winbindd", "path": "/usr/sbin/winbindd", "state": "S"},
        ],
        "default": [
            {"artifact": "security_log", "value": "Event IDs 4769/4624/4648", "risk": "high"},
            {"artifact": "share_access", "value": "Finance/Public SMB shares", "risk": "review"},
        ],
    },
    "sc03": {
        "listening_ports": [
            {"pid": "1", "port": "25", "protocol": "tcp", "process": "postfix"},
            {"pid": "42", "port": "80", "protocol": "tcp", "process": "gophish"},
            {"pid": "42", "port": "3333", "protocol": "tcp", "process": "gophish"},
        ],
        "processes": [
            {"pid": "1", "name": "postfix", "path": "/usr/sbin/postfix", "state": "S"},
            {"pid": "42", "name": "gophish", "path": "/opt/gophish/gophish", "state": "S"},
            {"pid": "204", "name": "endpoint-sim", "path": "/opt/sim/endpoint.py", "state": "S"},
        ],
        "default": [
            {"artifact": "mail_queue", "value": "simulated campaign messages", "risk": "review"},
            {"artifact": "beacon_log", "value": "/var/log/cybersim/beacons.jsonl", "risk": "high"},
        ],
    },
}


async def run_osquery(scenario_id: str, target_container: str, query: str) -> dict:
    """
    Return deterministic simulated osquery-style host artifacts.
    """
    profile = scenario_id.lower().replace("-", "")
    allowed = _SCENARIO_TARGETS.get(profile, [])

    if target_container not in allowed:
        return {
            "status": "failed",
            "detail": f"Target container {target_container} is not valid for {scenario_id}.",
            "rows": [],
            "simulated": True,
        }

    if not query or "select" not in query.lower():
        return {
            "status": "failed",
            "detail": "Simulated forensics accepts SELECT-style artifact queries.",
            "rows": [],
            "simulated": True,
        }

    table = _classify_query(query)
    rows = _SIMULATED_ROWS.get(profile, {}).get(table)
    if rows is None:
        rows = _SIMULATED_ROWS.get(profile, {}).get("default", [])

    return {
        "status": "success",
        "detail": (
            f"Simulated osquery result for {target_container}; "
            "scenario containers are not modified and do not require osqueryi."
        ),
        "rows": rows,
        "simulated": True,
    }


async def list_forensic_targets(scenario_id: str) -> list[str]:
    """Return list of containers that support forensic investigation."""
    profile = scenario_id.lower().replace("-", "")
    return _SCENARIO_TARGETS.get(profile, [])


def _classify_query(query: str) -> str:
    normalized = query.lower()
    if "listening_ports" in normalized or "open_sockets" in normalized:
        return "listening_ports"
    if "processes" in normalized or "process_open_sockets" in normalized:
        return "processes"
    return "default"

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from src.cache.redis import publish

EVENTS_DIR = Path(__file__).parent / "events"


def _load_event_map(scenario_id: str) -> dict:
    path = EVENTS_DIR / f"{scenario_id.lower().replace('-', '')}_events.json"
    if path.exists():
        return json.loads(path.read_text())
    return {}


# Parse which tool is being run from a command string
def _detect_tool(command: str) -> str:
    command = command.strip().lower()
    tools = ["nmap", "nikto", "gobuster", "ffuf", "sqlmap", "wfuzz", "hydra",
             "curl", "wget", "burpsuite", "msfconsole", "metasploit", "bloodhound",
             "crackmapexec", "impacket", "rubeus", "mimikatz", "hashcat", "john",
             "awscli", "aws", "pacu", "s3scanner", "trufflehog", "gobuster"]
    for tool in tools:
        if command.startswith(tool) or f" {tool}" in command:
            return tool
    return "shell"


async def process_command_for_siem(session_id: str, state: dict, command: str) -> list[dict]:
    """Map a terminal command to SIEM events and publish them."""
    scenario_id = state.get("scenario_id", "SC-01")
    event_map = _load_event_map(scenario_id)
    tool = _detect_tool(command)
    events = event_map.get(tool, [])

    result = []
    for template in events:
        # Normalize severity to uppercase for consistent frontend rendering
        raw_severity = template.get("severity", "INFO").upper()
        # Map 'MEDIUM' → 'MED' to match frontend styles
        severity = "MED" if raw_severity == "MEDIUM" else raw_severity
        now = datetime.now(timezone.utc).isoformat()
        event = {
            "id": str(uuid.uuid4()),
            "timestamp": now,
            "created_at": now,
            "severity": severity,
            "message": template.get("message", ""),
            "raw_log": template.get("raw_log", "").replace("{src_ip}", "172.20.1.10"),
            "mitre_technique": template.get("mitre_technique"),
            "source": template.get("source", "attacker"),
            "source_ip": "172.20.1.10",
            "tool_triggered": tool,
        }
        result.append(event)
        await publish(f"siem:{session_id}:feed", event)

    return result

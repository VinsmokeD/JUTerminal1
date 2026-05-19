"""
Blue Team Incident Response Playbook API
Serves comprehensive IR playbooks for SC-01, SC-02, SC-03
"""

from fastapi import APIRouter, HTTPException
from pathlib import Path
import json

router = APIRouter(prefix="/api/playbooks", tags=["playbooks"])

PLAYBOOKS_DIR = Path(__file__).parent.parent / "scenarios" / "playbooks"

# Structured step arrays used by the BlueWorkspace IR Playbook panel.
# These mirror the scenario playbook content in a consumable format.
_STEPS: dict[str, list[dict]] = {
    "SC-01": [
        {"step": "Identify source IP of all HIGH/CRITICAL WAF alerts", "hint": "Look at the source_ip field in SIEM events"},
        {"step": "Correlate WAF events with Apache access log timestamps", "hint": "Events within seconds of each other likely share a cause"},
        {"step": "Determine if SQLi attempt resulted in a 200 response", "hint": "A 200 response to a SQL injection attempt means it succeeded"},
        {"step": "Check if any PHP files were uploaded to /uploads/", "hint": "File upload plus PHP indicates a potential webshell"},
        {"step": "Identify affected patient record IDs via IDOR alerts", "hint": "Sequential ID access patterns indicate IDOR exploitation"},
        {"step": "Block source IP at WAF level", "hint": "Document the exact firewall rule you would create"},
        {"step": "Reset any exposed credentials", "hint": "Any credentials visible in SQLi output are compromised"},
        {"step": "Write IR report: timeline, IOCs, affected data, RCA", "hint": "The report is the deliverable - structure it with clear sections"},
    ],
    "SC-02": [
        {"step": "Identify Event 4769 with RC4 encryption (0x17)", "hint": "RC4 in Kerberos TGS requests is the signature of Kerberoasting"},
        {"step": "Determine which account was Kerberoasted", "hint": "Check the TargetUserName field in Event 4769"},
        {"step": "Correlate 4769 with 4768 (TGT request) timestamps", "hint": "TGT request immediately before TGS request confirms the chain"},
        {"step": "Identify lateral movement: Event 4624 Type 3", "hint": "Type 3 logons from non-standard IPs indicate lateral movement"},
        {"step": "Alert on Event 4625 bursts (credential spray)", "hint": "Multiple 4625 events from one IP indicate credential spray or brute force"},
        {"step": "CRITICAL: Event 4662 with replication rights = DCSync", "hint": "DCSync is the final stage - escalate immediately"},
        {"step": "Disable compromised svc_backup account", "hint": "Any Kerberoasted account with cracked password must be disabled"},
        {"step": "Force Kerberos ticket expiry (purge all TGTs)", "hint": "Prevents use of stolen tickets"},
        {"step": "Document full lateral movement path", "hint": "Source host -> destination -> technique used for each hop"},
        {"step": "Write IR report with AD hardening recommendations", "hint": "Include: disable RC4, SPN cleanup, tiered admin model"},
    ],
    "SC-03": [
        {"step": "Review email headers: SPF, DKIM, DMARC results", "hint": "Headers reveal whether the email passed authentication checks"},
        {"step": "Check if sending IP is in SPF record", "hint": "SPF failures mean the sender is unauthorized"},
        {"step": "Check DMARC alignment", "hint": "From domain vs envelope sender mismatch indicates spoofing"},
        {"step": "Identify which recipients opened the email", "hint": "Tracking pixel SIEM events show who opened it"},
        {"step": "Check for macro execution (Event 4688)", "hint": "Office process spawning cmd.exe is the indicator"},
        {"step": "Identify PowerShell download cradle (Event 4104)", "hint": "Script block logging captures PowerShell command activity"},
        {"step": "Look for scheduled task creation (persistence)", "hint": "Attackers create scheduled tasks to survive reboot"},
        {"step": "Block external C2 IP at perimeter firewall", "hint": "The reverse shell destination IP is the C2 server"},
        {"step": "Isolate endpoints that executed the payload", "hint": "Any host that ran the macro needs isolation"},
        {"step": "Write phishing IR report with IOC list", "hint": "Include sender domain, attachment hash, C2 IP, and email security recommendations"},
    ],
}


@router.get("")
async def get_playbook_steps(scenario: str = "SC-01"):
    """Return structured {steps:[{step,hint}]} for the given scenario."""
    sid = scenario.upper().replace("-", "").replace("SC", "SC-")
    if not sid.startswith("SC-"):
        sid = f"SC-{sid}"
    steps = _STEPS.get(sid)
    if steps is None:
        raise HTTPException(status_code=404, detail=f"Playbook steps not found for {sid}")
    return {"scenario_id": sid, "title": get_playbook_title(sid), "steps": steps}


@router.get("/list")
async def list_playbooks():
    """List all available playbooks"""
    playbooks = []

    for scenario_id in ["SC-01", "SC-02", "SC-03"]:
        playbook_file = PLAYBOOKS_DIR / f"{scenario_id.lower()}_playbook.md"
        if playbook_file.exists():
            playbooks.append({
                "scenario_id": scenario_id,
                "title": get_playbook_title(scenario_id),
                "file_path": str(playbook_file),
                "available": True
            })

    return {"playbooks": playbooks}


@router.get("/{scenario_id}")
async def get_playbook(scenario_id: str):
    """Retrieve full playbook for a scenario"""

    # Normalize scenario_id (SC-01 or sc01)
    scenario_id = scenario_id.upper().replace("-", "").replace("SC", "SC-")
    if not scenario_id.startswith("SC-"):
        scenario_id = f"SC-{scenario_id}"

    playbook_file = PLAYBOOKS_DIR / f"{scenario_id.lower()}_playbook.md"

    if not playbook_file.exists():
        raise HTTPException(status_code=404, detail=f"Playbook not found for {scenario_id}")

    try:
        with open(playbook_file, "r") as f:
            content = f.read()

        return {
            "scenario_id": scenario_id,
            "title": get_playbook_title(scenario_id),
            "content": content,
            "format": "markdown"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading playbook: {str(e)}")


@router.get("/{scenario_id}/sections")
async def get_playbook_sections(scenario_id: str):
    """Get playbook sections (structured outline)"""

    scenario_id = scenario_id.upper().replace("-", "").replace("SC", "SC-")
    if not scenario_id.startswith("SC-"):
        scenario_id = f"SC-{scenario_id}"

    playbook_file = PLAYBOOKS_DIR / f"{scenario_id.lower()}_playbook.md"

    if not playbook_file.exists():
        raise HTTPException(status_code=404, detail=f"Playbook not found for {scenario_id}")

    try:
        with open(playbook_file, "r") as f:
            content = f.read()

        # Parse markdown sections
        sections = parse_playbook_sections(content)

        return {
            "scenario_id": scenario_id,
            "title": get_playbook_title(scenario_id),
            "sections": sections
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing playbook: {str(e)}")


def get_playbook_title(scenario_id: str) -> str:
    """Get human-readable title for playbook"""
    titles = {
        "SC-01": "NovaMed Healthcare - Web Application IR Playbook",
        "SC-02": "Nexora Financial - Active Directory Compromise Playbook",
        "SC-03": "Orion Logistics - Phishing & Initial Access Playbook"
    }
    return titles.get(scenario_id, f"Playbook for {scenario_id}")


def parse_playbook_sections(content: str) -> list:
    """Parse markdown playbook into sections"""
    sections = []
    current_section = None

    for line in content.split("\n"):
        if line.startswith("## "):
            if current_section:
                sections.append(current_section)
            current_section = {
                "title": line.replace("## ", "").strip(),
                "content": [],
                "subsections": []
            }
        elif line.startswith("### ") and current_section:
            subsection = {
                "title": line.replace("### ", "").strip(),
                "content": []
            }
            current_section["subsections"].append(subsection)
        elif line.startswith("#### ") and current_section and current_section["subsections"]:
            # Sub-subsection
            pass
        elif current_section and line.strip():
            if current_section["subsections"]:
                current_section["subsections"][-1]["content"].append(line)
            else:
                current_section["content"].append(line)

    if current_section:
        sections.append(current_section)

    return sections

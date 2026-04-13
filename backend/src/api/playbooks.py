"""
Blue Team Incident Response Playbook API
Serves comprehensive IR playbooks for SC-01, SC-02, SC-03
"""

from fastapi import APIRouter, HTTPException
from pathlib import Path
import json

router = APIRouter(prefix="/api/playbooks", tags=["playbooks"])

PLAYBOOKS_DIR = Path(__file__).parent.parent / "scenarios" / "playbooks"

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

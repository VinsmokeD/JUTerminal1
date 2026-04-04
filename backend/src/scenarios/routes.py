from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

SCENARIOS = [
    {
        "id": "SC-01",
        "title": "Web Application Penetration Test — NovaMed Healthcare Portal",
        "description": "Black-box web app assessment. Find and document SQLi, LFI, IDOR, and file upload vulnerabilities in a simulated healthcare portal.",
        "difficulty": "Intermediate",
        "duration_hours": 3,
        "frameworks": ["OWASP Testing Guide v4.2", "PTES", "NIST CSF"],
        "mitre_tactics": ["TA0043", "TA0007", "TA0001", "TA0006", "TA0009"],
    },
    {
        "id": "SC-02",
        "title": "Active Directory Compromise — Nexora Financial",
        "description": "Gray-box internal network test. Starting from a low-privilege domain user, reach Domain Admin via Kerberoasting, lateral movement, and DCSync.",
        "difficulty": "Advanced",
        "duration_hours": 4,
        "frameworks": ["PTES", "MITRE ATT&CK"],
        "mitre_tactics": ["TA0006", "TA0008", "TA0004"],
    },
    {
        "id": "SC-03",
        "title": "Phishing & Initial Access — Orion Logistics",
        "description": "OSINT-driven phishing simulation. Design a pretext, craft a payload, and measure the campaign using GoPhish.",
        "difficulty": "Intermediate",
        "duration_hours": 3,
        "frameworks": ["PTES", "MITRE ATT&CK"],
        "mitre_tactics": ["TA0043", "TA0001"],
    },
    {
        "id": "SC-04",
        "title": "Cloud Misconfiguration Audit — StratoStack AWS",
        "description": "AWS environment assessment using LocalStack. Enumerate S3, escalate IAM privileges, and exploit SSRF to reach the metadata service.",
        "difficulty": "Advanced",
        "duration_hours": 4,
        "frameworks": ["PTES", "MITRE ATT&CK", "CIS AWS Benchmark"],
        "mitre_tactics": ["TA0006", "TA0004", "TA0040"],
    },
    {
        "id": "SC-05",
        "title": "Ransomware Incident Response — Veridian Corp",
        "description": "Full kill chain simulation with dual perspective. Red team deploys simulated ransomware; blue team detects, contains, eradicates, and writes the IR report.",
        "difficulty": "Advanced",
        "duration_hours": 5,
        "frameworks": ["NIST 800-61", "MITRE ATT&CK", "PTES"],
        "mitre_tactics": ["TA0001", "TA0002", "TA0006", "TA0008", "TA0040"],
    },
]


@router.get("/")
async def list_scenarios() -> list[dict]:
    return SCENARIOS


@router.get("/{scenario_id}")
async def get_scenario(scenario_id: str) -> dict:
    sc = next((s for s in SCENARIOS if s["id"] == scenario_id.upper()), None)
    if not sc:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Scenario not found")
    return sc

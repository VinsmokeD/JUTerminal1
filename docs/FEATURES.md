# CyberSim Features

## Implemented Platform Areas

| Feature | Status | Notes |
| --- | --- | --- |
| JWT auth | Implemented | Register/login routes and default instructor seed exist |
| Scenario dashboard | Implemented | React scenario selection flow exists |
| Red Team terminal | Partially verified | xterm.js frontend and backend WebSocket/sandbox modules exist; full Docker terminal path needs runtime verification |
| Blue Team SIEM feed | Partially verified | Event maps and feed components exist; live stream needs full-stack verification |
| Notes | Implemented | Backend routes and frontend notebook components exist |
| AI hints | Implemented with fallback risk | Gemini integration exists; requires valid key and runtime safety testing |
| Scoring and debrief | Implemented | Scoring/report routes and timeline UI exist |
| Instructor dashboard | Implemented | Role-gated backend and frontend page exist |
| Docker scenario profiles | Implemented | Compose profiles exist for SC-01, SC-02, and SC-03 |
| Load testing | Separate tool | Locust file exists and should be run with `locust`, not `pytest` |

## MVP Scenarios

### SC-01: NovaMed Healthcare

Web application pentest scenario with OWASP-style behaviors, WAF/log telemetry, and Blue Team triage.

### SC-02: Nexora Financial

Samba4 Active Directory scenario with domain controller, file server, Kerberos-focused detections, and lateral-movement style telemetry.

### SC-03: Orion Logistics

Phishing and initial access scenario using GoPhish, a mail relay, and a victim simulator that emits endpoint-style events.

## Out of MVP Scope

SC-04 and SC-05 may appear in historical notes, but they are not part of the current MVP defined by `docs/architecture/MASTER_BLUEPRINT.md` and are not represented in the active root Compose profiles.

# Scenario Dossier: SC-03 Orion Logistics

## 1. Overview
*   **ID**: SC-03
*   **Title**: Phishing Campaign & Initial Access — Orion Logistics
*   **Difficulty**: Beginner
*   **Estimated Duration**: 180 Minutes
*   **Focus**: Social Engineering, Email Infrastructure, and C2 Basics.

## 2. Tactical Context (MITRE ATT&CK)
*   **Reconnaissance** (`TA0043`): Harvesting email addresses and employee data.
*   **Initial Access** (`TA0001`): Spearphishing with a malicious link or attachment.
*   **Execution** (`TA0002`): User execution of a simulated reverse shell payload.
*   **Command and Control** (`TA0011`): Establishing a beacon callback to the attacker's host.

## 3. Target Infrastructure
| Host | IP | Role | OS/Tech |
| :--- | :--- | :--- | :--- |
| **Postfix Mailer** | `172.20.3.20` | Internal Mail Relay | Postfix |
| **GoPhish Server** | `172.20.3.40` | Phishing Platform | GoPhish |
| **Endpoint Sim** | `172.20.3.30` | Victim Workstation | Python/Windows Sim |

## 4. Missions

### Red Team (Attacker)
**Objective**: Launch a targeted phishing campaign against Orion Logistics staff and achieve a reverse shell callback from an internal workstation.
*   **Key Tasks**:
    1.  Perform OSINT to harvest target email addresses.
    2.  Configure a convincing phishing template and landing page in GoPhish.
    3.  Generate a simulated payload (Macro/HTA) and attach it to the campaign.
    4.  Monitor for callbacks and perform basic host enumeration.
*   **Tools**: `gophish`, `theHarvester`, `msfvenom`, `netcat`.

### Blue Team (Defender/Analyst)
**Objective**: Detect the phishing campaign at the mail gateway or workstation level and respond to the C2 callback.
*   **Key Detections**:
    1.  Email tracking pixels triggered by internal users.
    2.  Macro execution events on the workstation simulator.
    3.  Reverse shell callbacks (C2 beacons) on non-standard ports.
    4.  SPF/DMARC authentication failures.
*   **Tools**: Elastic SIEM, Email Logs, Endpoint Telemetry.

## 5. Flag Inventory
| ID | Description |
| :--- | :--- |
| `FLAG-SC03-1` | Reverse shell callback received |

## 6. Scoring Breakdown
*   **Red Team**: 100 Base + 50 Flag Points + 10 Time Bonus.
*   **Blue Team**: 100 Base + Bonuses for flagging the email before a click occurs.

---
*Generated for CyberSim Graduation Project - 2026-05-23*

# Scenario Dossier: SC-01 NovaMed Healthcare

## 1. Overview
*   **ID**: SC-01
*   **Title**: Web Application Penetration Test — NovaMed Healthcare Portal
*   **Difficulty**: Intermediate
*   **Estimated Duration**: 240 Minutes
*   **Focus**: OWASP Top 10, WAF Evasion, and Healthcare Data Privacy.

## 2. Tactical Context (MITRE ATT&CK)
*   **Reconnaissance** (`TA0043`): Passive and active mapping of the NovaMed portal.
*   **Initial Access** (`TA0001`): Exploiting web vulnerabilities (SQLi, LFI) for entry.
*   **Credential Access** (`TA0006`): Extracting admin hashes from the backend database.
*   **Collection** (`TA0009`): Accessing sensitive patient records (simulated PII).

## 3. Target Infrastructure
| Host | FQDN | Role | OS/Tech |
| :--- | :--- | :--- | :--- |
| **NOVAMED-WAF** | `novamed.local` | Gateway / WAF | ModSecurity / Apache |
| **NOVAMED-WEB** | `app.novamed.local` | Primary Web Server | PHP 8.x / Apache |
| **NOVAMED-DB** | `db.novamed.local` | MariaDB Database | Linux / MariaDB |

## 4. Missions

### Red Team (Attacker)
**Objective**: Breach the NovaMed portal and extract administrative credentials and patient records without triggering the WAF's critical blocks.
*   **Key Tasks**:
    1.  Perform passive recon to identify server versions and `robots.txt` entries.
    2.  Use directory brute-forcing to find hidden `/admin` or `/backup` folders.
    3.  Identify and exploit SQL Injection on the login form.
    4.  Chain LFI to read the `config.php` file and extract database secrets.
*   **Tools**: `nmap`, `gobuster`, `sqlmap`, `curl`, `nikto`.

### Blue Team (Defender/Analyst)
**Objective**: Detect and triage the attacker's activities in the Elastic SIEM, and identify the specific exploitation path.
*   **Key Detections**:
    1.  High-frequency 404 errors (Directory brute-force).
    2.  SQLi patterns in POST requests.
    3.  Path traversal attempts (`../`).
    4.  Unauthorized access to backup artifacts.
*   **Tools**: Elastic SIEM, Kibana, ModSecurity Audit Logs.

## 5. Flag Inventory
| ID | Description |
| :--- | :--- |
| `FLAG-SC01-1` | Contents of `/etc/passwd` via LFI |
| `FLAG-SC01-2` | Admin password from `db_backup` |
| `FLAG-SC01-3` | Contents of `/admin/config.php` via SQLi+LFI chain |
| `FLAG-SC01-4` | Patient record #1042 via IDOR |

## 6. Scoring Breakdown
*   **Red Team**: 100 Base + up to 90 Flag Points + 10 Time Bonus.
*   **Blue Team**: 100 Base + Bonuses for rapid triage and blocking the webshell upload.

---
*Generated for CyberSim Graduation Project - 2026-05-23*

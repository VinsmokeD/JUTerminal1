# Scenario Dossier: SC-02 Nexora Financial

## 1. Overview
*   **ID**: SC-02
*   **Title**: Active Directory Compromise — Nexora Financial Services
*   **Difficulty**: Advanced
*   **Estimated Duration**: 150 Minutes
*   **Focus**: Active Directory internals, Kerberos attacks, and Privilege Escalation.

## 2. Tactical Context (MITRE ATT&CK)
*   **Discovery** (`TA0007`): Enumerating domain users, groups, and SPNs.
*   **Credential Access** (`TA0006`): Kerberoasting service accounts and cracking hashes.
*   **Lateral Movement** (`TA0008`): Moving from a low-priv user to a sensitive file server.
*   **Privilege Escalation** (`TA0004`): Exploiting domain-level configurations to gain Domain Admin.

## 3. Target Infrastructure
| Host | FQDN | Role | OS/Tech |
| :--- | :--- | :--- | :--- |
| **NEXORA-DC01** | `nexora-dc01.nexora.local` | Domain Controller | Samba4 AD DC |
| **NEXORA-FS01** | `nexora-fs01.nexora.local` | File Server | Linux / SMB |

## 4. Missions

### Red Team (Attacker)
**Objective**: Compromise the `nexora.local` domain, starting from a low-privilege employee account (`jsmith`), and escalate to Domain Admin.
*   **Key Tasks**:
    1.  Enumerate the domain using `bloodhound-python` and `ldapsearch`.
    2.  Perform Kerberoasting on the `svc_backup` account.
    3.  Crack the service ticket hash to gain `svc_backup`'s plaintext password.
    4.  Access sensitive shares on `NEXORA-FS01` and exploit unconstrained delegation.
    5.  Perform DCSync to dump the NTDS.dit database.
*   **Tools**: `crackmapexec`, `impacket-getuserspns`, `hashcat`, `secretsdump.py`.

### Blue Team (Defender/Analyst)
**Objective**: Identify Kerberos-based attacks and lateral movement within the Windows domain environment.
*   **Key Detections**:
    1.  EventID 4769: Kerberos TGS requests with RC4 encryption.
    2.  EventID 4662: Unauthorized replication requests (DCSync).
    3.  Multiple failed logon attempts (Credential Spraying).
    4.  Access to `Groups.xml` in SYSVOL.
*   **Tools**: Elastic SIEM, Windows Event Logs (via Filebeat/Winlogbeat).

## 5. Flag Inventory
| ID | Description |
| :--- | :--- |
| `kerberoast_hash` | `svc_backup` SPN ticket (RC4-HMAC) |
| `dcsync_krbtgt_nthash` | NT Hash for the `krbtgt` account |

## 6. Scoring Breakdown
*   **Red Team**: 100 Base + 70 Flag Points + 15 Time Bonus.
*   **Blue Team**: 100 Base + Bonuses for detecting Kerberoasting within 2 minutes and blocking DCSync.

---
*Generated for CyberSim Graduation Project - 2026-05-23*

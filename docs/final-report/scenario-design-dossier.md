# Scenario Design Dossier

This dossier compiles the pedagogical framework, structural design, threat vectors, and scoring mechanics for the three high-fidelity scenarios in the CyberSim MVP:
* **SC-01 NovaMed**: Web Application Security & ModSecurity WAF.
* **SC-02 Nexora**: Active Directory Security & Lateral Movement.
* **SC-03 Orion**: Phishing, Email Analysis, and Endpoint Forensics.

---

## 1. Pedagogical Rationale

CyberSim scenarios are structured around a dual-perspective learning loop. Rather than separating offensive operations and defensive monitoring, the platform forces students to analyze both sides.

### The Attack-to-Detection Causality
Every action taken in the Red Team terminal translates directly to defensive logs, teaching students how tools trigger specific telemetry events:

```text
[Attacker Action] ────────► [Log Generation] ────────► [Ingestion] ────────► [SIEM Event]
 e.g., sqlmap scan           WAF audit.log              Filebeat             severity: MEDIUM
```

### Sequential Methodology Gating
To prevent students from jumping directly to exploit scripts without understanding the threat surface, the platform implements **Methodology Gating**. Attacker commands are locked behind methodology phases:
1. **Reconnaissance**: Verifies that host ports and basic services are mapped.
2. **Scanning & Enumeration**: Focuses on software versions, web endpoints, and directories.
3. **Exploitation**: Explores identified vulnerabilities to gain shell access.
4. **Post-Exploitation / Privilege Escalation**: Establishes persistence, lateral movement, or collection.

Attempting to run an exploit tool (e.g., `sqlmap` or `impacket`) in the Reconnaissance phase triggers a gate block warning, and deductions are applied.

---

## 2. Scenario Blueprint Comparison

| Attribute | SC-01: NovaMed Healthcare | SC-02: Nexora Financial | SC-03: Orion Logistics |
|---|---|---|---|
| **Vulnerability Domain** | OWASP Top 10 Web Application | Active Directory & Networks | Phishing & Host Forensics |
| **Network IP Scheme** | `172.20.1.0/24` | `172.20.2.0/24` | `172.20.3.0/24` |
| **Primary Target IP** | `172.20.1.20` | `172.20.2.20` | `172.20.3.10` |
| **OS / Environment** | Alpine Linux / Apache / PHP | Samba4 AD Domain Controller | Ubuntu / GoPhish / Postfix |
| **Offensive Toolset** | `nmap`, `whatweb`, `gobuster`, `curl` | `impacket`, `smbclient`, `bloodhound` | `swaks`, `curl`, `dig` |
| **Telemetry Ingested** | ModSecurity WAF Audit Logs | Samba4 Security / Audit Logs | Postfix Mail Logs / Endpoint JSON |
| **SIEM Rule Ingestion** | Suricata signatures & WAF Regex | Windows Event 4624/4769 mappings | SMTP Header matching & Process trees |

---

## 3. Detailed Topology Configurations

```mermaid
graph TD
    subgraph SC-01 NovaMed Network (172.20.1.0/24)
        WAF01[WAF Proxy: 172.20.1.1] --> Web01[Web Server: 172.20.1.20]
        Web01 --> DB01[MySQL DB: 172.20.1.21]
    end

    subgraph SC-02 Nexora Network (172.20.2.0/24)
        DC02[Samba4 DC: 172.20.2.20] --- FS02[File Server: 172.20.2.40]
    end

    subgraph SC-03 Orion Network (172.20.3.0/24)
        GoPhish03[GoPhish: 172.20.3.10] --> Relay03[Postfix Relay: 172.20.3.20]
        Relay03 --> Victim03[Victim VM: 172.20.3.30]
    end
```

### 3.1 SC-01 NovaMed (Web App Pentest)
* **WAF Topology**: ModSecurity acts as a transparent reverse proxy at `172.20.1.1`. All scanning requests target this proxy, which generates WAF logs for Filebeat collection. Direct requests to the web portal at `172.20.1.20` bypass ModSecurity and mock configurations.
* **Exploitation Paths**:
  * SQL Injection (`SQLi`): Vulnerable search field allows exfiltration of DB records.
  * Local File Inclusion (`LFI`): Exploitable via page routing parameter to read local target files.
  * Arbitrary File Upload: Bypassing primitive extension checks to upload a PHP shell.

### 3.2 SC-02 Nexora (Active Directory Compromise)
* **Samba4 Active Directory**: Standard Domain Controller configuration hosted at `172.20.2.20` domain `nexora.local`. Low-privilege users (`jsmith`) and service accounts are pre-seeded in the database directory.
* **Exploitation Paths**:
  * Active Directory Reconnaissance: Running Impacket search queries.
  * Kerberoasting: Requesting Service Principal Names (SPN) tickets for account `svc_backup`.
  * Lateral Movement: Authenticating with cracked credentials via SMB to target the file server.

### 3.3 SC-03 Orion (Phishing & Initial Access)
* **Phishing Campaign Engine**: GoPhish acts as the campaign console at `172.20.3.10`, communicating through Postfix SMTP relay at `172.20.3.20`.
* **Exploitation Paths**:
  * Phishing Campaign Design: Sending high-fidelity phishing emails to user `victim@orion-logistics.sim`.
  * Telemetry Callback: Simulated victim executes a macro payload, triggering beacon execution back to the attacker environment.

---

## 4. Assessment and Scoring Mechanics

Every student starts a session with **100 base points**. The score fluctuates based on training adherence and help requested.

### 4.1 Scoring Penalties
* **Methodology Gate Violations**: Attempting to execute out-of-phase tools (e.g., exploitation scripts during reconnaissance) deducts **5 points** per blocked attempt.
* **AI Hint Deductions**: Points are deducted progressively when asking the tutor for assistance:
  * **Level 1 (Concept/Hint)**: Deducts **5 points** (Experienced student: 10).
  * **Level 2 (Strategy)**: Deducts **10 points** (Experienced student: 20).
  * **Level 3 (Specific Guidance)**: Deducts **20 points** (Experienced student: 40).
* **Incorrect Flag Submissions**: Submitting wrong flags to the verification api deducts **2 points** to discourage brute-forcing.

### 4.2 Score Bonuses
* **Flag Captures**: Successfully validating scenario flags rewards the user:
  * SC-01 Flags: **25 points** each.
  * SC-02 Flags: **30 points** each.
  * SC-03 Flags: **35 points** each.
* **Time Bonus**: Completing the scenario under the allotted target time (e.g., 2 hours) rewards a pro-rated bonus up to **15 points**.

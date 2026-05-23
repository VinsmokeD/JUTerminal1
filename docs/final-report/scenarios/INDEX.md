# Scenario Design Dossier Index

This index provides a comparison of the three MVP scenarios included in the CyberSim graduation project. Detailed dossiers for each scenario are available in this directory.

## Scenario Comparison Table

| Feature | SC-01 NovaMed | SC-02 Nexora | SC-03 Orion |
| --- | --- | --- | --- |
| **Domain** | Web Application Security | Directory Services (AD) | Phishing & SOC Response |
| **Organization** | Healthcare Provider | Financial Services | Logistics Company |
| **Primary OS** | Linux (Alpine/Debian) | Linux (Samba AD) | Linux (GoPhish/Ubuntu) |
| **Vulnerabilities** | SQLi, LFI, File Upload | AD Misconfigurations | Phishing, Initial Access |
| **Red Team Tooling** | sqlmap, ffuf, curl, netcat | smbclient, rpcclient, enum4linux | gophish, mail relay |
| **Blue Team Telemetry** | ModSecurity WAF, Access Logs | Kerberos Auth, Samba Logs | SMTP Logs, Sysmon/EDR |
| **Learning Goal** | Web attack/detect correlation | Auth/Directory forensics | Email security & IR loop |
| **Complexity** | Beginner | Intermediate | Intermediate/Advanced |

## Dossier List

1.  **[SC-01 NovaMed Healthcare](sc-01-novamed-dossier.md)**: Focuses on OWASP Top 10 vulnerabilities and WAF-based detection.
2.  **[SC-02 Nexora Financial](sc-02-nexora-dossier.md)**: Focuses on Active Directory enumeration and credential-based telemetry.
3.  **[SC-03 Orion Logistics](sc-03-orion-dossier.md)**: Focuses on the end-to-end phishing lifecycle and SOC analyst triage.

## Methodology Alignment

All scenarios align with the **PTES (Penetration Testing Execution Standard)** methodology enforced by the platform's gatekeeper:

1.  **Reconnaissance**: Passive and active information gathering.
2.  **Scanning**: Port scanning and service identification.
3.  **Enumeration**: Detailed service probing and user discovery.
4.  **Exploitation**: Gaining initial access via vulnerabilities or credentials.
5.  **Post-Exploitation**: Lateral movement and flag capture.

## Safety and Isolation

Each scenario operates in a dedicated Docker network with `internal: true` isolation. No traffic is permitted to exit the scenario boundary to the public internet, ensuring a safe and controlled university lab environment.

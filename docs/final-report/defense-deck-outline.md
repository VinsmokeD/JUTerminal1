# CyberSim Defense Deck Outline

This document outlines the structure and content for the final graduation project defense presentation.

## 1. Title Slide
- **Project Title:** CyberSim: A Dual-Perspective Cybersecurity Training Platform
- **Team:** [Team Names]
- **Supervisor:** [Supervisor Name]
- **Date:** May 2026
- **Institution:** University of Jordan, KASIT

## 2. The Problem & Motivation
- **The Gap:** Offset between offensive and defensive training.
- **Siloed Learning:** Students use Kali in one lab and SIEM in another, never seeing the causal link.
- **Complexity:** Setting up realistic, safe sandboxes is difficult for students.

## 3. The CyberSim Solution
- **Dual Workspace:** Side-by-side Terminal (Red) and SIEM (Blue).
- **Instant Feedback:** See an alert the moment a command is run.
- **Socratic AI:** Adaptive guidance without giving away answers.
- **Containerized:** Disposable, isolated Docker environments.

## 4. System Architecture
- **Frontend:** React 18, Vite, Tailwind CSS, xterm.js, Three.js.
- **Backend:** FastAPI (Python), fully async.
- **Data:** PostgreSQL (Persistence), Redis (Real-time/WS), Elasticsearch (SIEM).
- **Sandbox:** Docker SDK orchestration with internal-only networks.

## 5. Red Team Workspace (Live Demo/Video)
- **Features:** Kali terminal, Methodology tracker (PTES), Scoped notes.
- **Methodology Gating:** Enforcing structured thinking (Recon -> Enum -> Exploit).

## 6. Blue Team Workspace (Live Demo/Video)
- **Features:** Real-time SIEM feed, Alert triage, Forensic markers.
- **Linkage:** Correlating terminal commands to Suricata/Zeek logs.

## 7. Scenario SC-01: NovaMed Healthcare
- **Vulnerabilities:** OWASP Top 10 (SQLi, LFI, File Upload).
- **Defenses:** ModSecurity WAF, Access Logs.
- **Learning Goal:** Web app exploitation and detection.

## 8. Scenario SC-02: Nexora Financial
- **Vulnerabilities:** Active Directory Misconfigurations.
- **Telemetry:** Kerberos Events (4768, 4769), Lateral Movement tracking.
- **Learning Goal:** Directory service security.

## 9. Scenario SC-03: Orion Logistics
- **Vulnerabilities:** Phishing and Initial Access.
- **Tools:** GoPhish simulation, Mail relay analysis.
- **Learning Goal:** Email security and endpoint forensic markers.

## 10. Socratic AI & Safety
- **Mechanism:** Command-level triggers, bounded context.
- **Safety:** PII/Credential redaction, no exploit payload generation.
- **Educational Impact:** Forcing conceptual understanding over rote memorization.

## 11. Infrastructure & Security
- **Isolation:** Docker internal networks (`0.0.0.0/0` blocked).
- **Resources:** Capped CPU/RAM per container to prevent DoS.
- **Secrets:** Environment-based configuration, no hardcoded keys.

## 12. Testing & Verification
- **Automated:** Pytest suite, Linting, Docker health checks.
- **Performance:** Sub-100ms SIEM latency, instant terminal attachment.
- **UI/UX:** Responsive HUD design with immersive effects.

## 13. Results & Achievements
- **Complete MVP:** 3 High-fidelity scenarios.
- **Instructor Control:** Centralized dashboard for class monitoring.
- **Reporting:** Automated pentest/IR report generation.

## 14. Future Work
- **Scale:** More scenarios (Cloud, IoT).
- **Analytics:** Deeper student performance insights.
- **Packaging:** easy-to-deploy OVA or Cloud AMI.

## 15. Q&A
- **Closing Statement:** Bridging the gap between offense and defense.
- **Contact Info:** [Team Emails]

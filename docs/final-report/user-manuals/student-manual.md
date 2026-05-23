# CyberSim Student Manual

## 🛠 Getting Started
Welcome to CyberSim, your dual-perspective cybersecurity training environment. 

### 1. The Dashboard
*   **Mission Selection**: Choose from NovaMed (Web), Nexora (Active Directory), or Orion (Phishing).
*   **Role Selection**: 
    *   **Red Team**: Focus on offensive penetration testing.
    *   **Blue Team**: Focus on defensive SOC analysis and incident response.
*   **Methodology**: Select a framework (PTES/OWASP) to guide your mission.

### 2. The Workspace
*   **Terminal**: Your primary tool for Red Team actions. It is a live Kali Linux PTY.
*   **SIEM Feed**: Real-time log monitoring for Blue Team actions.
*   **Notes**: Document every finding (`#finding`) and piece of evidence (`#evidence`).
*   **AI Tutor**: Your Socratic mentor. Request hints (L1-L3) if you're stuck. Note that hints deduct from your final score.

## 🔴 Red Team Workflow
1.  **Reconnaissance**: Map the target network. Use `nmap`, `whatweb`, and `curl`.
2.  **Enumeration**: Find hidden files and services.
3.  **Exploitation**: Capture flags (e.g., `FLAG-SC01-1`).
4.  **Reporting**: Your session notes are automatically compiled into a debrief report.

## 🔵 Blue Team Workflow
1.  **Triage**: Monitor the SIEM feed for suspicious activity.
2.  **Classification**: Tag events as *True Positive* or *False Positive*.
3.  **Containment**: Identify the source IP and recommend blocking actions.
4.  **Forensics**: Investigate the raw logs to understand the attack path.

## 🏆 Scoring
*   **Base Score**: 100 points.
*   **Flag Bonuses**: Awarded for successful exploitation.
*   **Detection Bonuses**: Awarded for accurate and rapid triage.
*   **Penalties**: Hint usage and out-of-scope actions.

---
*University of Jordan - KASIT Graduation Project 2026*

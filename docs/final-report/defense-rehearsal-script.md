# Defense Rehearsal Script

This document provides a 15-minute presentation script and rehearsal guide for the CyberSim graduation project defense. It includes timings, slide cues, key talking points, live demo actions, and backup procedures.

---

## 1. Presentation Timing Overview

Total duration: **15 minutes** (strict KASIT panel time limit).

| Section | Timing | Slides | Focus |
|---|---|---|---|
| **1. Introduction** | 2 minutes | 1 - 3 | Problem statement, training gap, and project objectives. |
| **2. System Architecture** | 3 minutes | 4 - 6 | Tech stack, C4 diagram, and Docker isolation. |
| **3. Live Demonstration** | 5 minutes | (Live) | Running SC-01 and SC-02, Red/Blue WS, notes, and AI hints. |
| **4. Verification & Testing** | 3 minutes | 7 - 9 | Pytest coverage, performance latency, and Locust tests. |
| **5. Future Work & Conclusion**| 2 minutes | 10 - 11 | Limitations, scaling, and final summary. |

---

## 2. Talk Track & Slide Script

### 2.1 Part 1: Project Introduction & Motivation (0:00 - 2:00)

*   **Slide 1: Title Slide**
    *   *Speaker 1*: "Good morning respected committee members. Today, we are presenting our graduation project: **CyberSim**, a dual-perspective cybersecurity training platform designed for university labs."
*   **Slide 2: The Security Education Gap**
    *   *Speaker 1*: "In current computer science and security programs, students learn offensive penetration testing and defensive SOC analysis in separate, isolated courses. Offensive courses focus on executing tools like `nmap` or `sqlmap` to capture a flag, while defensive courses analyze static log dumps. This creates a cognitive gap: students lack visibility into the exact network telemetry their offensive keystrokes generate."
*   **Slide 3: Project Vision & Objectives**
    *   *Speaker 1*: "CyberSim solves this by integrating attacker terminals and defender SIEM dashboards side-by-side. The platform provides a sandboxed environment where students run real methodologies (like PTES and NIST CSF), guided by a Socratic AI monitor that helps them understand the *why* rather than just copying commands."

---

### 2.2 Part 2: System Architecture & Sandbox Isolation (2:00 - 5:00)

*   **Slide 4: Full-Stack Containerized Architecture**
    *   *Speaker 2*: "To maintain security and zero cost, CyberSim deploys as a containerized stack on a single Docker host. The frontend is built on React 18, Vite, and xterm.js for high-fidelity terminal proxying. The backend is an asynchronous FastAPI service utilizing PostgreSQL for session persistence and Redis for real-time WebSockets."
*   **Slide 5: Telemetry Pipeline & Event Ingestion**
    *   *Speaker 2*: "The Blue Team SIEM runs a realistic telemetry pipeline. Container logs (such as Apache, MySQL, and Samba4 logs) are collected using Filebeat and shipped to Elasticsearch. An event engine polls Elasticsearch every 2 seconds, correlating events using a custom Sigma-like engine, and publishes alerts directly to the student's browser over WebSockets."
*   **Slide 6: Hardened Sandbox Isolation**
    *   *Speaker 2*: "Because students execute live exploit commands, the sandboxes are completely isolated. Every scenario network has the `internal: true` property, preventing containers from reaching the host network or public internet. Furthermore, containers are capped at 0.5 CPU cores and 512 MB RAM, and run without root privileges."

---

### 2.3 Part 3: Live Demonstration (5:00 - 10:00)

*   **Action 1: Register and Scenario Start**
    *   *Presenter*: Register a new student user at `http://localhost:3000/auth`. Navigate to the scenario selection screen. Select **SC-01: NovaMed Healthcare** and click **Start Scenario**. Show that the target is offline during container provisioning and then goes green.
*   **Action 2: Red Team Enumeration & Gate Block**
    *   *Presenter*: Explain the PTES phases. In the Kali terminal, attempt to run:
        ```bash
        curl -d "username=admin' OR '1'='1" http://172.20.1.20/login.php
        ```
        Show the **Gate Block Warning**: the command is blocked because the student has not completed the Reconnaissance phase (e.g., running `nmap` first). Note the score deduction.
*   **Action 3: Progress and SIEM Alerts**
    *   *Presenter*: Run `nmap -sV 172.20.1.20`. Point out the immediate **educational bridge SIEM alert** appearing on the right panel. Highlight that the student can triage this alert, categorize it, and write analyst notes.
*   **Action 4: AI Tutor Socratic Hint**
    *   *Presenter*: In the AI tutor panel, ask: *"How do I find open directories?"* Show the Socratic response explaining the concept of web directory traversal, directing the student to use `gobuster` conceptually without giving the exact command.
*   **Action 5: Submit Flag & Debrief**
    *   *Presenter*: Submit the flag `P@ssw0rd_NovaMed_2023!` via the flag widget. Navigate to the **Debrief page** and show the dual-axis chronological timeline matching Red Team commands with Blue Team alerts.

---

### 2.4 Part 4: Testing, Performance & Latency (10:00 - 13:00)

*   **Slide 7: Automated QA & Linting**
    *   *Speaker 1*: "To ensure reliability, our backend includes a comprehensive test suite covering config loading, token verification, and scoring engines, achieving **84% code coverage** across 78 unit/integration tests. The frontend compiles cleanly with 0 ESLint warnings."
*   **Slide 8: Locust Performance Benchmarks**
    *   *Speaker 1*: "We stress-tested the platform under a simulated class size of 100 concurrent students using Locust. The database handles notebook saves with a median response time of 12 ms. The critical Red-to-Blue event WebSocket latency is **68 ms**, ensuring immediate feedback under load."

---

### 2.5 Part 5: Future Work & Conclusion (13:00 - 15:00)

*   **Slide 9: Project Limitations**
    *   *Speaker 2*: "Currently, the platform runs on a single Docker host. Additionally, AD initialization requires up to 90 seconds. We are addressing these challenges in our future roadmap."
*   **Slide 10: Platform Roadmap**
    *   *Speaker 2*: "Our future phases focus on moving to Kubernetes orchestration to allow horizontal clustering, implementing LTI 1.3 standards to integrate directly with LMS platforms like Canvas, and expanding forensics containment controls."
*   **Slide 11: Closing Slide**
    *   *Speaker 2*: "In conclusion, CyberSim bridges the gap between offensive execution and defensive visibility. We are ready to take your questions. Thank you."

---

## 3. Demo Backup & Recovery Procedures

If the live demo environment experiences issues during presentation, execute the following recovery steps:

### 3.1 Scenario Reset (Soft Recovery - 15 seconds)
If a Kali container becomes unresponsive, soft reset it via the command line:
```bash
docker compose exec backend python -c "from src.sandbox.manager import destroy_kali_container; destroy_kali_container('SESSION_ID')"
```
Refreshing the browser will automatically trigger the backend to provision a new, clean Kali container.

### 3.2 Full Stack Re-boot (Hard Recovery - 45 seconds)
If the backend or search services crash:
```bash
docker compose down
docker compose up -d
docker compose --profile sc01 up -d
```
All persistent user data remains in PostgreSQL volumes.

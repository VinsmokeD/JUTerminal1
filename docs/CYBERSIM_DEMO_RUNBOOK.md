# CyberSim 10-Minute Academic Demo Runbook

**Goal**: Showcase the unified, dual-perspective "Attack & Defend" educational engine to professors, judges, or stakeholders in under 10 minutes, highlighting the "SOC Duality" infrastructure and the complete technical isolation of target containers.

---

## ⏱️ Pre-Demo Setup (Do this 5 minutes before presenting)

1. Ensure the unified local node is running (Docker Desktop must be open):
   ```bash
   docker compose up -d postgres redis backend frontend nginx
   ```
2. Open **two distinct browser windows** side-by-side (left side for Red Team, right side for Blue/Instructor Team).
3. Navigate to `http://localhost/` on both:
   - **Left Window:** Log in as a newly created `student1` account.
   - **Right Window:** Log in as the `admin` account (Role: `instructor`).

---

## 🕒 0:00 - 2:00: The Duality Introduction
* **Concept to Explain**: Cybersecurity labs historically teach offense and defense in silos. CyberSim teaches them simultaneously on a closed, unified network.
* **Visuals**: Show the sleek, Red vs. Blue "SOC Dark Mode" dashboard.
* **Action**:
  1. On the **Left Window (Student)**, select **SC-01: NovaMed Healthcare**.
  2. Choose the **Red Team** persona and initiate a session.
  3. Point out the instant bootstrapping of the dedicated, air-gapped Kali Linux container mapped to the frontend terminal instance. 

---

## 🕒 2:00 - 5:00: Red Team Execution (SC-01 Web Pentest)
* **Concept to Explain**: The sandbox uses real Docker targets (not simulated outputs) that restrict outgoing internet completely. Note the Socratic AI Mentor tracking terminal commands.
* **Action**:
  1. In the Red Workspace terminal, execute a basic recon: `nmap -sV -p 80 172.20.1.20`. 
  2. Wait for the scan to reveal the Apache web app.
  3. Execute an aggressive exploratory scan using Nikto: `nikto -h http://172.20.1.20`.
  4. Deliberately attempt an SQL injection against the target.
  5. Demonstrate the **AI Hint Panel** in the top-right overlay. Click to request a "Level 1" guidance hint. Read aloud how the Gemini model answers *socratically* using Context-Aware awareness rather than just handing over flags.

---

## 🕒 5:00 - 8:00: Blue Team SIEM View
* **Concept to Explain**: Every command the attacker (Student) runs generates telemetry and leaves a footprint that the Blue Team (Instructor/Defender) sees in real-time.
* **Action**:
  1. Switch focus to the **Right Window (Admin)**. 
  2. Navigate into the **Blue Workspace** or **Instructor Dashboard** observing the identical active session.
  3. Expand the **SIEM Event Feed**. 
  4. Show the audience the telemetry stream generated from the SQL Injection and the `nikto` scan triggers.
  5. Highlight the exact timestamp, MITRE ATT&CK tags (e.g., T1190 for Exploit Public-Facing App), and the severity badges mapped via the `siem_events.json` correlation engine. Points out background "noise" events that force the analyst to use their intuition.

---

## 🕒 8:00 - 10:00: The Debrief & Timeline Alignment
* **Concept to Explain**: When the scenario terminates, traditional capture-the-flag exercises offer no closure. CyberSim generates complete chronological playbooks bridging both sides of the attack map.
* **Action**:
  1. In the Left Window, terminate the session and transition to the **Debrief Screen**.
  2. Scroll down to the **Kill Chain Timeline**.
  3. Explain the Dual-Axis graph to the audience: Command executions (Red side) visually align horizontally with their resultant detections (Blue side).
  4. Conclude by demonstrating how the overall score dynamically factored in Hint Penalties vs. Timeline Speed, proving its value as a genuine educational tool. 

---

## 🛑 Fallback Scenarios / Recovery
- **Terminal Stalls**: Press `Enter` to refresh the prompt. If the browser freezes, simply hit refresh (<kbd>F5</kbd>). Persistent `re-attach` Docker lifecycle ensures the session seamlessly resumes exactly where it left off.
- **Lost AI Context**: If hint generation fails due to API limits, point out the localized, built-in fallback hints derived directly from the scenario schema structures.

# CyberSim 10-Minute Academic Demo Runbook

**Goal**: Demonstrate CyberSim as a dual-perspective cybersecurity training platform: one student acts as Red Team in a real Kali-backed terminal while the Blue Team observes matching telemetry, notes, scoring, and report output.

## Pre-Demo Setup

Run this 5 to 10 minutes before presenting.

1. Open Docker Desktop and wait until it reports the engine is running.
2. Start the core platform:

   ```powershell
   docker compose up -d postgres redis elasticsearch filebeat backend frontend nginx
   ```

3. Start the scenario targets you plan to show:

   ```powershell
   docker compose --profile sc01 --profile sc02 --profile sc03 up -d
   ```

4. Verify the baseline:

   ```powershell
   docker compose config --quiet
   python -m pytest -p no:cacheprovider backend/tests
   cd frontend
   npm run build
   ```

5. Open two browser windows side by side:
   - Left window: `http://localhost` as a student.
   - Right window: `http://localhost` as `admin` for instructor/Blue Team views.

## 0:00 - 2:00: Concept And Scope

Explain that CyberSim connects offensive and defensive learning in one safe local lab. Red Team actions happen only inside Docker-isolated scenario networks. Blue Team telemetry is generated from those same actions, so students see cause and effect rather than a disconnected lecture.

Show the dashboard and point out the three MVP scenarios:

- SC-01 NovaMed Healthcare: web application assessment.
- SC-02 Nexora Financial: Active Directory compromise and detection.
- SC-03 Orion Logistics: phishing and initial access analysis.

## 2:00 - 5:00: Red Team Workspace

1. In the student window, launch SC-01 as Red Team.
2. Acknowledge the scope/ROE briefing.
3. Open the terminal and type:

   ```bash
   scope
   ```

4. Run a safe reconnaissance command against the authorized target:

   ```bash
   nmap -sV -p 80 172.20.1.20
   ```

5. Optionally show a web technology check:

   ```bash
   whatweb http://172.20.1.20
   ```

6. Request a Level 1 AI hint. Emphasize that the tutor gives Socratic guidance and does not hand the student a full attack chain.

## 5:00 - 8:00: Blue Team And Instructor View

1. In the right window, open the Blue Workspace or Instructor Dashboard.
2. Show the SIEM feed and call out:
   - Severity badges.
   - Background/noise events.
   - Source and host details in expanded events.
   - The relationship between terminal commands and detections.
3. In the Instructor Dashboard, show:
   - Active sessions.
   - Scenario and score columns.
   - CSV export.
   - Per-session Markdown report download.

## 8:00 - 10:00: Debrief And Evidence

1. End or open a completed session.
2. Navigate to the Debrief screen.
3. Show the Kill Chain Timeline:
   - Red Team commands on one rail.
   - Blue Team detections on the other rail.
   - Detection timing as the educational bridge between both perspectives.
4. Download or preview the report and explain that it can support grading, reflection, and instructor review.

## Recovery Notes

- If Docker is not responding, restart Docker Desktop and run the core `docker compose up` command again.
- If the terminal looks idle, click inside it and press `Enter`; refresh the page if needed. The backend reattaches to the existing Kali container and replays terminal history.
- If OpenRouter hints fail because of a missing or limited API key, use the built-in static hint trees and continue the demo.
- If a browser build was created before recent frontend changes, rebuild with `npm run build` or restart the frontend container.

## Final Human Smoke

Before the actual presentation, physically type this in the browser terminal:

```bash
echo final-demo-terminal-check
```

Seeing the echoed text confirms keyboard focus, WebSocket transport, backend PTY proxying, and Kali output rendering on the exact machine used for the demo.

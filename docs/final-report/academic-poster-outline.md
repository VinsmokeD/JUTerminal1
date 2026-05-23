# CyberSim Academic Poster Outline

This document outlines the visual and textual content for the academic poster.

## 1. Header
- **Project Title:** CyberSim
- **Subtitle:** Dual-Perspective Cybersecurity Sandbox
- **Authors:** [Team Names]
- **Advisor:** [Supervisor Name]
- **Logo:** University of Jordan / KASIT

## 2. Abstract / Overview
- A browser-based platform for simultaneous Red/Blue team training.
- Uses Docker isolation and Socratic AI guidance to teach causal links between attack and detection.

## 3. The Architecture (Visual)
- **Central Graphic:** Simplified C4 Container Diagram.
- **Key Components:**
  - Browser Workspace (React)
  - Async API Layer (FastAPI)
  - Telemetry Bus (Redis/Elastic)
  - Isolated Scenarios (Docker)

## 4. Core Innovation: The Red/Blue Loop
- **Graphic:** Circular flow from "Attacker Action" -> "Container Telemetry" -> "SIEM Alert" -> "Defender Response".
- **Benefit:** Reduces cognitive load in understanding security events.

## 5. Scenario Highlights (Grid of 3)
- **SC-01 NovaMed:** Web Security & WAF analysis.
- **SC-02 Nexora:** Active Directory & Auth Telemetry.
- **SC-03 Orion:** Phishing & Endpoint Forensics.

## 6. Socratic AI Tutor
- Adaptive hint system (Level 1-3).
- Ensures students "learn why" not just "do what".

## 7. Security & Safety Controls
- Air-gapped scenario networks.
- No live malware in source.
- Automated resource limits.

## 8. Key Results
- Verified end-to-end learning loop.
- Instructor dashboard for grading and metrics.
- Sub-second event latency.

## 9. Conclusion
- CyberSim effectively bridges the gap between offensive tools and defensive analysis in a safe, controlled environment.

## 10. Footer / QR Code
- Repository Link (Github)
- Acknowledgments

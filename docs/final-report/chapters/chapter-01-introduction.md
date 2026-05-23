# CHAPTER 1: INTRODUCTION

## 1.1 Background

Cybersecurity education requires both technical practice and operational understanding. Students often learn offensive techniques such as reconnaissance, vulnerability discovery, exploitation methodology, and post-exploitation reasoning separately from defensive analysis topics such as log review, alert triage, incident response, and reporting. This separation can make it difficult for students to understand the cause-and-effect relationship between an attacker action and the evidence observed by a defender.

CyberSim addresses this learning gap through a dual-perspective training platform. It provides a browser-based Red Team workspace where students interact with isolated scenario environments through a Kali-style terminal, and a Blue Team workspace where corresponding telemetry, SIEM events, notes, and response activities are analyzed. The platform is designed for university training, so all offensive learning activities are constrained to deliberately vulnerable Docker containers and internal Docker networks.

## 1.2 Motivation

The motivation for CyberSim is to make cybersecurity training more realistic, connected, and safe. Traditional exercises may emphasize either attack execution or defensive monitoring, but students need to see both perspectives in one controlled environment. CyberSim makes this relationship visible by linking terminal actions, scenario progress, SIEM telemetry, notes, scoring, AI hints, and debrief reports.

The project is also motivated by classroom needs. Instructors need a way to monitor student progress, evaluate methodology adherence, review evidence, and export grade-ready data. Students need a guided environment where they can practice without accidentally targeting real systems or receiving unsafe instructions.

## 1.3 Problem Statement

Cybersecurity students lack an integrated training environment that combines:

- Safe offensive practice inside isolated targets.
- Real-time defensive telemetry and SIEM-style investigation.
- Structured methodology guidance.
- Scenario-based learning objectives.
- Instructor visibility and grading support.
- Post-mission debriefs that explain cause and effect.

Existing tools often solve only part of this problem. CyberSim proposes a unified platform that connects Red Team and Blue Team workflows in a single browser-based application.

## 1.4 Project Aim

The aim of CyberSim is to design and implement a dual-perspective cybersecurity training platform that allows students to practice Red Team and Blue Team workflows safely inside Docker-isolated scenarios while receiving structured guidance, scoring, telemetry, and debrief reports.

## 1.5 Project Objectives

| Objective ID | Objective | Success Indicator |
| --- | --- | --- |
| OBJ-01 | Provide safe scenario-based offensive practice | All scenario targets run in isolated Docker networks |
| OBJ-02 | Provide Blue Team visibility into scenario activity | SIEM events and triage workflows are available in the Blue workspace |
| OBJ-03 | Support learning through guidance | AI hints and structured hint trees provide bounded Socratic support |
| OBJ-04 | Track methodology and progress | Scenario phases, notes, flags, and gates reflect student progress |
| OBJ-05 | Support assessment | Scoring, reports, and instructor analytics produce reviewable evidence |
| OBJ-06 | Support deployment and demonstration | Docker Compose and demo scripts verify readiness |

## 1.6 Project Scope

The active MVP scope includes exactly three scenarios:

| Scenario | Name | Focus |
| --- | --- | --- |
| SC-01 | NovaMed Healthcare | Web application penetration testing and OWASP-style findings |
| SC-02 | Nexora Financial | Active Directory compromise simulation and defender correlation |
| SC-03 | Orion Logistics | Phishing campaign simulation and SOC response |

Out of scope:

- Testing real external systems.
- Building real malware.
- Allowing scenario containers unrestricted internet access.
- Expanding beyond SC-01 through SC-03 before the MVP is fully verified.

## 1.7 Target Users and Stakeholders

| Stakeholder | Need |
| --- | --- |
| Student as Red Team operator | Practice structured offensive methodology in a safe environment |
| Student as Blue Team analyst | Investigate telemetry, triage alerts, and write evidence-driven reports |
| Instructor | Monitor progress, review sessions, export grades, and identify common weaknesses |
| System administrator | Deploy, configure, verify, and recover the platform |
| Examiner | Evaluate technical depth, project completeness, safety, and educational contribution |

## 1.8 Software and Hardware Requirements

Software requirements:

- Docker Desktop or Docker Engine with Docker Compose v2.
- Python 3.11 for backend development.
- Node.js 18 or newer for frontend development.
- Modern web browser.
- PostgreSQL, Redis, Elasticsearch, Filebeat, Nginx/Caddy through Docker services.

Hardware requirements:

- Minimum 8 GB RAM for local development.
- Recommended 16 GB RAM for smoother full-stack scenario execution.
- CPU and storage sufficient for Docker images, Elasticsearch, and scenario containers.

## 1.9 Limitations and Assumptions

CyberSim assumes a local or demo Docker host with enough resources to run the core stack and selected scenario profiles. The platform is optimized for a university demonstration and classroom lab, not for large-scale multi-tenant production without future scaling work.

The AI hint system can operate in fallback mode when the external AI key is unavailable. This keeps the platform usable, but live AI quality depends on valid provider configuration and rate/budget controls.

## 1.10 Expected Outputs

Expected project outputs include:

- Browser-based CyberSim application.
- Red Team and Blue Team workspaces.
- Three scenario environments.
- Scenario notes, hints, scoring, and reports.
- Instructor dashboard and analytics.
- Docker-based deployment configuration.
- Final graduation report, technical appendices, diagrams, Canva visual report, presentation, and poster.

## 1.11 Project Schedule and Methodology

CyberSim was developed incrementally through phases covering planning, infrastructure, backend foundation, frontend workspaces, scenario engine, terminal proxy, SIEM, AI monitor, reports, scoring, instructor analytics, readiness, and scenario depth. The documentation package follows the KASIT product-based structure and adds a commercial-grade technical documentation layer.

## 1.12 Report Outline

Chapter 1 introduces the project, motivation, scope, users, requirements, and expected outputs. Chapter 2 reviews related systems. Chapter 3 defines requirements and analysis. Chapter 4 presents system design. Chapter 5 explains implementation. Chapter 6 presents testing, installation, and user guidance. Chapter 7 concludes the project and proposes future work.


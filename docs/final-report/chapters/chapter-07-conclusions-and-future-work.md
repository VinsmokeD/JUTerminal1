# CHAPTER 7: CONCLUSIONS AND FUTURE WORK

## 7.1 Introduction

This chapter concludes the Parallax graduation project report. It reviews the system's achievements against the original objectives, discusses the results and limitations of the current implementation, and proposes future work to expand the platform's educational utility and technical scalability.

## 7.2 Project Achievements

The Parallax platform has successfully achieved all six core objectives defined in Chapter 1. The following sections map each objective to its completed implementation evidence:

### OBJ-01: Safe Scenario-Based Offensive Practice
- **Achievement**: Parallax containerizes target environments and binds them to isolated Docker bridge networks (`sc01-net`, `sc02-net`, `sc03-net`) using the `internal: true` network property. Attacker containers can interact only with services on their assigned scenario network. There is zero internet connectivity or outbound routing to the real host's network, ensuring complete safety.

### OBJ-02: Blue Team Visibility
- **Achievement**: The Blue Team workspace displays real-time telemetry from target containers. Telemetry flows via Filebeat from container logs (e.g., ModSecurity WAF in SC-01, Samba audit events in SC-02, Postfix logs in SC-03) into an Elasticsearch SIEM instance. The backend polls Elasticsearch and pushes events to the student's browser over WebSockets, allowing event triage and incident notes capture.

### OBJ-03: Learning Support through Bounded Guidance
- **Achievement**: The platform implements a graduated hint system (Level 1 Concept, Level 2 Strategy, Level 3 Specific Nudge) with score penalties to guide students when stuck. In addition, every command submission is evaluated by a rate-limited, safety-bounded AI monitor powered by Gemini Flash, which returns Socratic questions rather than direct commands or flags. Fallback hints ensure usability if the AI key is unavailable.

### OBJ-04: Methodology and Progress Tracking
- **Achievement**: Parallax enforces sequential progression (Reconnaissance -> Scanning -> Exploitation -> Post-Exploitation) via a backend scope enforcer. If a student attempts an exploitation action (e.g., running `sqlmap`) without documenting reconnaissance findings, the system blocks the command and outputs a guiding warning in the terminal.

### OBJ-05: Scoring and Assessment Support
- **Achievement**: Student actions, notes, alerts, triage classifications, and hint usages are scored in real time. The Debrief page renders a dual-axis SVG Kill Chain Timeline aligning Red commands with Blue detections, alongside an interactive competency radar chart and score breakdown. Instructors can monitor student metrics, inspect active sessions, and download markdown graduation reports.

### OBJ-06: Deployment and Demonstration Verification
- **Achievement**: The entire Parallax stack is packaged into a single local Docker Compose file. A dedicated Python verification script (`demo_check.py`) runs automated checks on all scenario services, databases, Redis, and Elasticsearch endpoints to confirm the platform's readiness before live presentations or classroom sessions.

## 7.3 Discussion of Results

The primary output of this project is a functional, integrated cybersecurity training platform that successfully bridges the gap between offensive and defensive training.

By linking the Kali PTY stream to live target telemetry, Parallax makes cause-and-effect visible to students. The custom "Immersive HUD" frontend redesign provides an operator-centric, responsive visual environment, leveraging vanilla Three.js particle grids and glassmorphism.

The system was verified through automated backend test suites, frontend production builds, and container health checks. The local runtime footprint is optimized to run comfortably on a single host with 16 GB of RAM, fulfilling the requirements for university lab setups.

## 7.4 Limitations of the Current System

Despite successful implementation, the platform has several limitations that should be noted:

1. **Single-Node Resource Bounds**: Running PostgreSQL, Redis, Elasticsearch, Filebeat, Nginx, FastAPI, Vite, and multiple scenario target containers on a single host can stress systems with less than 16 GB of RAM. While Compose profiles allow starting scenarios one at a time, resource limits must be carefully managed.
2. **AI Provider Dependency**: The live Socratic tutor depends on external API connectivity (e.g., Google AI Studio/OpenRouter). If the API key is not configured, or if the external service experiences downtime or rate-limiting, the system falls back to pre-seeded static hints, which are less dynamic.
3. **Manual Export Workflow**: While instructors can download student report markdowns and view classroom metrics, the platform does not natively integrate with university Learning Management Systems (LMS) such as Moodle or Canvas for automated grade sync.

## 7.5 Future Work

To build on the current foundation, the following enhancements are proposed for future developmental phases:

### 7.5.1 Scenario Library Expansion
Introduce additional scenario profiles to cover other critical areas of cybersecurity:
- **SC-04 (Cloud Security)**: Attacking and defending misconfigured AWS/LocalStack metadata endpoints, IAM policies, and container registries.
- **SC-05 (Defensive Forensics)**: Analyzing memory images, disk logs, and Windows event registries retrospectively in a specialized forensic workbench.

### 7.5.2 Offline Local AI Models
Integrate lightweight, local Socratic models (such as Llama-3-8B-Instruct or Gemma-2-9B via Ollama) running directly on the host machine. This will eliminate dependencies on external API keys, bypass internet access requirements, and ensure complete data privacy within the sandboxed platform.

### 7.5.3 Multi-Tenant and Distributed Orchestration
For university-wide deployments, separate the platform's core services from the scenario runtime:
- Deploy the frontend and backend to a central web server.
- Outsource scenario container provisioning to dedicated, isolated Docker host worker nodes or Kubernetes clusters, isolating student sandboxes at the hypervisor or namespace level.

### 7.5.4 Automated LMS Integration
Implement LTI (Learning Tools Interoperability) support to allow instructors to sync grading rubrics, student scores, and incident reports directly into systems like Moodle, Blackboard, or Canvas.

## 7.6 Final Reflections

Parallax demonstrates that high-fidelity cybersecurity training does not require complex, expensive cloud-based cyber ranges. By using containerization, open-source telemetry tools, and bounded Socratic feedback, it is possible to deliver a safe, dual-perspective learning experience on a single local computer. The platform is ready for university deployment, providing students with the tools to understand both how attacks are executed and how they are detected.

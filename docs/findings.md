# Findings & Discoveries

## Research Notes
### 1. Terminal Proxy (WebSocket + xterm.js)
- **Reference**: [webterm](https://github.com/abhishekkrthakur/webterm) - FastAPI/WebSocket/xterm.js implementation.
- **Mechanism**: FastAPI backend acts as a proxy between WebSocket and `docker.exec_run` streams.

### 2. Cyber Range Orchestration
- **Reference**: [GoibhniUWE](https://github.com/GoibhniUWE/GoibhniUWE) - Automates container-based cyber range deployment with Python/Docker.
- **Reference**: [AI-cyber-range](https://github.com/Mr-Infect/AI-cyber-range) - FastAPI + Docker for automated scenario environments.

### 3. SIEM & Event Engines
- **Reference**: [LogESP](https://github.com/dogoncouch/LogESP) - Python-based SIEM for log parsing and rule matching.
- **Reference**: [Sigma](https://github.com/SigmaHQ/sigma) - Industry standard for defining detection rules (can be used for SIEM event mapping).

## Constraints & Discoveries
- CyberSim Architecture: React (Vite) + FastAPI (Python) + Docker.
- Existing `claude.md` defines current project state (Phase 1 Infrastructure Complete).
- Gemini Flash integration for AI monitoring.
- Need to implement Layer 1 SOPs in `architecture/` for Terminal, SIEM, and Scenario Engines.

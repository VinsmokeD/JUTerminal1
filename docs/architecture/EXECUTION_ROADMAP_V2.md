# CyberSim Execution Roadmap (v2.0)

This roadmap focuses on transforming the fully coded CyberSim project into a verifiable, end-to-end operational platform.

## Agent Division of Labor

- **Antigravity**: Handles orchestration, host interactions (Docker/Bash), and frontend React/Tailwind styling polish.
- **Claude Code**: Handles backend Python engineering, advanced Dockerfile container logic (Active Directory, PHP exploitation), and Alembic database migration tuning.

## PHASE A: Foundation Boot
**Assignee**: Antigravity
**Goal**: Docker stack starts reliably without errors. Health endpoint returns 200. One user can register and log in.
- [ ] Fix `infrastructure/docker/kali/Dockerfile` (pin Debian/Kali versions, fix `apt-get` issues).
- [ ] Fix `backend/Dockerfile` and `frontend/Dockerfile` dependencies to ensure clean builds.
- [ ] Run `docker-compose up -d postgres redis backend frontend nginx`.
- [ ] Verify `http://localhost:8000/health`.
- [ ] Test user registration and login flow.

## PHASE B: One Scenario End-to-End (SC-01 Only)
**Assignee**: Claude Code
**Goal**: Complete end-to-end functionality for the NovaMed Webapp pentest.
- [ ] Make SC-01 target containers realistically exploitable (actual PHP vulnerabilities, not just simulated).
- [ ] Ensure terminal I/O streams flawlessly via WebSocket proxy.
- [ ] Verify SIEM mapping correctly parses attacking action into the correct `sc01_events.json` object.
- [ ] Validate scoring and report generation mechanisms post-scenario completion.

## PHASE C: Remaining Scenarios (SC-02 and SC-03)
**Assignee**: Claude Code
**Goal**: Complete environment setup for AD Compromise and Phishing.
- [ ] Configure SC-02 Samba4 AD DC environment locally and verify enumeration.
- [ ] Configure SC-03 GoPhish + Victim Simulator Python script to generate authentic telemetry log beacons.

## PHASE D: Frontend Polish & Accessibility
**Assignee**: Antigravity
**Goal**: Bring UI/UX to a commercial-grade standard.
- [ ] Overhaul `Dashboard`, `RedWorkspace`, and `BlueWorkspace` with professional Slate/Cyan dark mode themes.
- [ ] Ensure Red/Blue split panes are resizable (`xterm.js` FitAddon correctly responding).
- [ ] Improve `AttackTimeline.jsx` into a dual-axis SVG graph emphasizing cause-and-effect latency.

## PHASE E: Hardening & Testing
**Assignee**: Claude Code
**Goal**: Reliability at scale.
- [ ] Implement and verify Alembic DB schema migrations (e.g., instructor roles).
- [ ] Ensure `manager.py` elegantly handles container teardown upon session abandonment to prevent RAM bloat.
- [ ] Finalize the integration test suite in `test_ws_integration.py`.

## PHASE F: Demo Preparation
**Assignee**: Antigravity
**Goal**: Perfect alignment for a live academic presentation.
- [ ] Rehearse and finalize the demo script.
- [ ] Verify documentation files (README, architecture diagram).

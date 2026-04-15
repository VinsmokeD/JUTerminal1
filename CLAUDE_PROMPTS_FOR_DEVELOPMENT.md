# 🎯 Claude Development Prompts (Phase A-F Execution)

**Last Updated**: 2026-04-15 | **Project Status**: Phase A complete (bootstapped), focusing on Phase B, C, & E

**NOTICE**: Antigravity is handling Phases A, D, and F. Claude Code focuses exclusively on Backend Python logic and complex Target Container definitions.

---

## 📋 Priority Queue (Claude's Tasks)

1. ⏳ **Phase B: SC-01 E2E Operationalization**
2. ⏳ **Phase C: SC-02 AD Target Configuration**
3. ⏳ **Phase C: SC-03 Phishing Victim Simulator**
4. ⏳ **Phase E: Database Alembic Migrations & Hardening**

---

# PROMPT 1: Phase B — SC-01 (NovaMed) Real Exploitation & Flow
```text
MISSION: Upgrade the SC-01 NovaMed web application container into a realistic, exploitable PHP target, and verify the E2E terminal-to-SIEM flow.

CONTEXT:
Antigravity has executed Phase A (Foundation Boot). All core systems are running. We need to make SC-01 an actual working pentest experience (not just simulated text). 

GOAL:
1. Update `infrastructure/docker/scenarios/sc01/Dockerfile.webapp` to deploy a functional PHP web app containing real vulnerabilities (SQL injection, LFI, IDOR).
2. Ensure the `siem/engine.py` pipeline is actively catching commands mapped in `sc01_events.json`.

DELIVERABLES:
- Functional PHP vulnerabilities in SC-01 webapp.
- Fully mapped and tested E2E connection between the proxy terminal input and the generated SIEM events.
- Update CONTINUOUS_STATE.md when verified.
```

---

# PROMPT 2: Phase C — SC-02 (Nexora) Samba4 Configuration
```text
MISSION: Tackle the complex Samba4 Active Directory container configuration to ensure it enumerates correctly for Red Team reconnaissance.

CONTEXT:
SC-02 requires a Samba4 AD DC and a domains-joined file server. 

GOAL:
1. Review `provision-dc.sh`, `setup-shares.sh`, and the Dockerfiles in `infrastructure/docker/scenarios/sc02/`.
2. Ensure Kerberoasting (RC4 downgrades) and BloodHound enumeration function perfectly against this instance.
3. Validate that Samba logs correctly generate the event signatures mapped in `sc02_events.json`.

DELIVERABLES:
- A functional enum4linux and Bloodhound environment for SC-02.
- Update CONTINUOUS_STATE.md when verified.
```

---

# PROMPT 3: Phase C — SC-03 (Orion) GoPhish Victim Simulation
```text
MISSION: Implement the deterministic victim simulation Python script for SC-03.

CONTEXT:
SC-03 requires a script that "catches" GoPhish emails and deterministically mimics realistic user behavior (opening email → latency → clicking link → macro execution beacon).

GOAL:
1. Review `victim-simulator.py` located in `infrastructure/docker/scenarios/sc03/`.
2. Ensure the logic accurately produces SIEM telemetry that parses into `sc03_events.json`.

DELIVERABLES:
- Responsive python simulator generating telemetry.
- Update CONTINUOUS_STATE.md when verified.
```

---

# PROMPT 4: Phase E — Alembic & Hardening
```text
MISSION: Implement Alembic database migrations and harden sandbox lifecycle handling.

CONTEXT:
The web backend is robust but currently lacks a migration schema. In addition, zombie containers could crash the 8GB RAM limit.

GOAL:
1. Create Alembic schemas in `backend/migrations/` and track the `role` column for Instructor logic.
2. Review `manager.py` to ensure it tears down old target containers flawlessly if sessions become orphaned.
3. Review and complete Python integration tests in `test_ws_integration.py`.

DELIVERABLES:
- Alembic tracking active.
- Sandbox teardown validated.
- Update CONTINUOUS_STATE.md when verified.
```

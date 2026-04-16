# 🎯 Claude Development Prompts (Phase A-F Execution)

**Last Updated**: 2026-04-15 | **Project Status**: Phase B complete — SIEM engine live. Now executing Phase C.

**NOTICE**: Antigravity handles Phases A, D, and F. Claude Code focuses exclusively on Backend Python and complex Target Container infrastructure.

---

## 📋 Priority Queue (Claude's Tasks)

1. ✅ **Phase B: SC-01 E2E SIEM Engine & Event Mapping** — COMPLETE
2. ✅ **Phase C: SC-02 Samba4 AD Environment** — COMPLETE (Verified via CONTINUOUS_STATE.md on 2026-04-15)
3. ✅ **Phase C: SC-03 GoPhish + Victim Simulator** — COMPLETE (Verified via CONTINUOUS_STATE.md on 2026-04-10)
4. ✅ **Phase E: Alembic DB Migrations & Sandbox Hardening** — COMPLETE (Verified Alembic schema and indexes applied, main.py lifespan active)

---

## ✅ Phase B Deliverables — Verified
- `backend/src/siem/events/sc01_events.json` — 38 events (SQLi, LFI, IDOR, file upload, auth)
- `backend/src/siem/events/sc02_events.json` — 45+ events (BloodHound, Kerberoasting, DCSync, lateral movement)
- `backend/src/siem/events/sc03_events.json` — 40+ events (OSINT, GoPhish, macro exec, C2, persistence)
- `backend/src/siem/engine.py` — Regex command-matching engine that queues events to Redis pub/sub
- `docs/phases/PHASE_B_STATUS.md` — Documentation

---

# PROMPT 2: Phase C — SC-02 (Nexora) Samba4 Active Directory

```text
MISSION: Build and validate the SC-02 Active Directory environment. This is the hardest infrastructure piece in the project.

CONTEXT:
- Project: CyberSim — cybersecurity training platform
- Reference: docs/architecture/MASTER_BLUEPRINT.md, docs/scenarios/SC-02-ad-compromise.yaml
- SC-02 requires: Samba4 AD DC, domain-joined file server, 4 pre-seeded users
- Read CONTINUOUS_STATE.md and docs/architecture/MASTER_BLUEPRINT.md first

CURRENT STATE:
- docker-compose.yml already defines sc02-dc and sc02-fileserver services (profile: sc02)
- infrastructure/docker/scenarios/sc02/ contains Dockerfile.dc, Dockerfile.fileserver, provision-dc.sh, setup-shares.sh
- sc02_events.json is complete (45 events for detection coverage)

GOAL:
1. Review and fix provision-dc.sh to ensure it runs samba-tool domain provision correctly
2. Create the 4 required users: jsmith (low-priv), svc_backup (Kerberoastable — SPN: CIFS/NEXORA-FS01.nexora.local), it.admin (Domain Admin), admin
3. Ensure Fileserver container successfully joins the nexora.local domain
4. Test independently: docker compose --profile sc02 up -d, then from Kali: enum4linux 172.20.2.20 returns user listing

ACCEPTANCE TEST:
- From within a Kali container on sc02-net: enum4linux 172.20.2.20 returns user list including jsmith, svc_backup, it.admin
- GetUserSPNs.py -dc-ip 172.20.2.20 nexora.local/jsmith:Password123 returns the svc_backup SPN hash

DELIVERABLES:
- Functional Samba4 AD DC that passes the enum4linux acceptance test
- Update CONTINUOUS_STATE.md when verified
```

---

# PROMPT 3: Phase C — SC-03 (Orion) GoPhish + Victim Simulation

```text
MISSION: Implement the deterministic victim simulation for SC-03 (phishing scenario).

CONTEXT:
- Project: CyberSim — cybersecurity training platform
- Reference: docs/architecture/MASTER_BLUEPRINT.md, docs/scenarios/SC-03-phishing.yaml
- SC-03 requires: GoPhish, Postfix mail relay, Python victim simulator
- Read CONTINUOUS_STATE.md and MASTER_BLUEPRINT.md first

CURRENT STATE:
- docker-compose.yml defines sc03-phish, sc03-mailrelay, sc03-victim (profile: sc03)
- infrastructure/docker/scenarios/sc03/ contains Dockerfiles
- sc03_events.json is complete (40+ events)

GOAL:
1. Review and complete infrastructure/docker/scenarios/sc03/victim-simulator.py
2. The simulator must: poll GoPhish API for campaign events, simulate "user opens email" after 15-60s random delay, simulate "user clicks link" after another delay, generate endpoint telemetry that maps to sc03_events.json trigger patterns
3. Postfix relay must accept SMTP connections from GoPhish and log them

ACCEPTANCE TEST:
- docker compose --profile sc03 up -d starts cleanly
- After launching a GoPhish campaign via API, the sc03-victim container logs show simulated user interaction
- The backend SIEM engine correctly triggers sc03 events from those interactions

DELIVERABLES:
- Functional victim simulation pipeline
- Update CONTINUOUS_STATE.md when verified
```

---

# PROMPT 4: Phase E — Alembic DB Migrations & Container Hardening

```text
MISSION: Add database migration infrastructure and harden the sandbox container lifecycle.

CONTEXT:
- Project: CyberSim — cybersecurity training platform
- Read CONTINUOUS_STATE.md and MASTER_BLUEPRINT.md first
- Backend uses FastAPI + SQLAlchemy async + asyncpg against PostgreSQL

CURRENT STATE:
- backend/src/models/ has SQLAlchemy models but NO Alembic setup
- The users table needs a role VARCHAR column (student/instructor) for InstructorDashboard
- backend/src/sandbox/manager.py handles container lifecycle but needs orphan cleanup

GOAL:
1. Set up Alembic in backend/migrations/: alembic init migrations, configure env.py to use async engine
2. Write the initial migration: create all current tables from models.py
3. Write second migration: add role column to users, add indexes on session/siem tables
4. Add a FastAPI lifespan background task in main.py that every 5 minutes kills Kali containers whose sessions have been idle for 60+ minutes
5. Add DB indexes: sessions.user_id, sessions.scenario_id, command_log.session_id, siem_events.session_id, siem_events.created_at

ACCEPTANCE TEST:
- alembic upgrade head runs without error
- psql shows role column on users and all required indexes
- A mock idle session container is terminated within 5 minutes of the cleanup task running

DELIVERABLES:
- Alembic configured and first two migrations written
- Orphan container cleanup background task in main.py
- Update CONTINUOUS_STATE.md when verified
```

---

## 📊 Progress Tracker

- [x] Phase B: SIEM Events (123 total) + engine.py regex matching
- [x] Phase C-1: SC-02 Samba4 AD environment
- [x] Phase C-2: SC-03 GoPhish victim simulation
- [x] Phase E: Alembic migrations + container cleanup

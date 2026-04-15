# 🎯 Claude Development Prompts for CyberSim Continuation

**Last Updated**: 2026-04-10 | **Project Status**: 80% complete, focused on SC-01 to SC-03 completion sprint

---

## ⚡ How to Use These Prompts

1. Copy the **exact prompt** below (from "---" to "---")
2. Paste into Claude Code chat
3. Claude will execute autonomously with full context
4. Claude will update `CONTINUOUS_STATE.md` when complete
5. Move to next prompt when complete

Each prompt is **self-contained** but builds on previous work. Execute in order for best results.

---

## 📋 Priority Queue (Recommended Order)

1. ✅ **Terminal & Hints** — Already complete
2. ⏳ **SC-02 Complete Docker Targets** — HIGH PRIORITY
2. ⏳ **SC-03 Complete Docker Targets** — HIGH PRIORITY
3. ⏳ **SIEM Event Maps Enhancement (SC-01 to SC-03)** — HIGH PRIORITY
4. ⏳ **End-to-End Integration Testing (SC-01 to SC-03)** — HIGH PRIORITY
5. ⏳ **Performance Optimization** — MEDIUM PRIORITY
6. ⏳ **Blue Team Playbooks (SC-01 to SC-03)** — MEDIUM PRIORITY

---

# PROMPT 1: SC-02 (Nexora AD) Complete Docker Targets & Hardening

```
MISSION: Complete SC-02 (Nexora Financial AD Compromise) Docker infrastructure with realistic Active Directory setup.

CONTEXT:
- Project: CyberSim cybersecurity training platform
- You have: Raw PTY Kali terminal, real Docker targets, step-by-step hints (all already implemented)
- Reference files: docs/architecture/MASTER_BLUEPRINT.md, docs/scenarios/SC-02-ad-compromise.yaml, CONTINUOUS_STATE.md
- Current status: SC-02 skeleton exists but needs complete implementation

GOAL: 
Implement Nexora AD scenario with realistically exploitable vulnerabilities for Red Team (Kerberoasting, lateral movement, DCSync) while Blue Team monitors Event Log patterns.

REQUIREMENTS:

**1. Dockerfile.dc (Samba4 Domain Controller) — infrastructure/docker/scenarios/sc02/Dockerfile.dc**
- Base: ubuntu:22.04 + samba + winbind + krb5
- Domain: nexora.local | Realm: NEXORA.LOCAL
- Create users:
  - admin@NEXORA.LOCAL (Domain Admin)
  - jsmith (Low-priv user, no special privs)
  - svc_backup (Service account, SPN: CIFS/NEXORA-FS01.nexora.local → Kerberoastable)
  - it.admin (IT Admin)
- Kerberos config: Enable RC4 (weaker, for educational CTF feel)
- Enable audit logging for Event ID: 4625, 4768, 4769, 4776, 4624, 4648, 4728
- Expose ports: 389 (LDAP), 636 (LDAPS), 88 (Kerberos), 445 (SMB), 3268 (Global Catalog)

**2. Dockerfile.fileserver (Samba File Server) — infrastructure/docker/scenarios/sc02/Dockerfile.fileserver**
- Base: ubuntu:22.04 + samba
- Shares: \\NEXORA-FS01\Finance (restricted to Finance group), \\NEXORA-FS01\Public (read-only)
- Files: Place "budget-2024.xlsx" in Finance share, "employee-handbook.pdf" in Public
- Join domain: nexora.local (DC at 172.20.2.20)
- Enable audit logging
- Expose port: 445 (SMB)

**3. docker-compose.yml Profile sc02 — Add to docker-compose.yml**
```yaml
sc02-dc:
  build:
    context: ./infrastructure/docker/scenarios/sc02
    dockerfile: Dockerfile.dc
  networks:
    sc02-net:
      ipv4_address: 172.20.2.20
  environment:
    - DOMAIN=nexora.local
    - REALM=NEXORA.LOCAL
    - ADMINPASS=NexoraAdmin2024!
  profiles: ["sc02"]
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "smbclient", "-L", "127.0.0.1", "-N"]
    interval: 10s
    timeout: 5s
    retries: 3

sc02-fileserver:
  build:
    context: ./infrastructure/docker/scenarios/sc02
    dockerfile: Dockerfile.fileserver
  networks:
    sc02-net:
      ipv4_address: 172.20.2.40
  depends_on:
    sc02-dc:
      condition: service_healthy
  environment:
    - DC_IP=172.20.2.20
    - DOMAIN=nexora.local
  profiles: ["sc02"]
  restart: unless-stopped

sc02-net:
  driver: bridge
  driver_opts:
    com.docker.network.bridge.enable_ip_masquerade: "false"
  ipam:
    config:
      - subnet: 172.20.2.0/24
  internal: true
```

**4. SIEM Event Coverage — backend/src/siem/events/sc02_events.json**
- Map terminal commands to realistic AD audit events:
  - `bloodhound-python` → Event 4768 (Kerberos authentication request)
  - `GetUserSPNs.py` / Kerberoasting → Event 4769 (Service ticket request)
  - `hashcat -m 13100` (crack hash) → (no event, local action)
  - `secretsdump.py` / DCSync → Event 4728 (member added to domain admins)
- Each event includes: id, source_ip, severity, message, mitre_technique, cwe

**5. Verification Steps**
After building, verify:
```bash
docker-compose --profile sc02 up -d
docker exec sc02-dc samba-tool user list
docker exec sc02-dc samba-tool user setexpiry svc_backup --noexpiry
docker exec sc02-fileserver smbclient //172.20.2.40/Finance -U jsmith --max-protocol=SMB3
```

CONSTRAINTS:
- All containers run on isolated bridge network (internal: true)
- No internet access (0.0.0.0/0 forbidden)
- CPU: 0.5 cores, RAM: 512MB (hard limits)
- Run as unprivileged user inside containers
- Passwords stored ONLY in .env, never in Dockerfiles

DELIVERABLES:
- ✅ Dockerfile.dc (complete, functional Samba4 setup)
- ✅ Dockerfile.fileserver (complete, domain-joined file server)
- ✅ docker-compose.yml updated with sc02-net + services
- ✅ sc02_events.json populated with 20+ realistic event templates
- ✅ All syntax validated (`docker-compose config`, `docker build`)
- ✅ CONTINUOUS_STATE.md updated with full technical breakdown

TESTING CHECKLIST:
- [ ] Kali container can reach 172.20.2.20 and 172.20.2.40
- [ ] `enum4linux` successfully enumerates users
- [ ] `nmap -p 88,389,445` shows open ports
- [ ] Kerberoasting works: `GetUserSPNs.py` finds svc_backup SPN
- [ ] Hash cracking finds plaintext password
- [ ] DCSync succeeds as Domain Admin
```

---

# PROMPT 2: SC-03 (Orion Phishing) Complete Docker Targets

```
MISSION: Complete SC-03 (Orion Logistics Phishing) Docker infrastructure with realistic phishing campaign and endpoint simulation.

CONTEXT:
- Project: CyberSim cybersecurity training — phishing and initial access scenario
- Red Team objective: Conduct OSINT, launch phishing campaign, achieve callback from victim simulation
- Blue Team objective: Monitor email telemetry, detect macro execution, investigate suspicious outbound activity
- Network: 172.20.3.0/24 (isolated, no internet)

GOAL:
Implement realistic phishing infrastructure (GoPhish + mail relay + victim simulation) with actionable telemetry for both Red and Blue teams.

REQUIREMENTS:

**1. docker-compose.yml Profile sc03 hardening**
- Ensure services are complete and reliable for SC-03:
  - GoPhish service at `172.20.3.40`
  - Mail relay service at `172.20.3.20`
  - Victim endpoint simulation at `172.20.3.30`
- Add healthchecks and explicit startup dependencies
- Keep network `sc03-net` internal and isolated

**2. GoPhish seed/setup script — infrastructure/docker/scenarios/sc03/init-gophish.sh**
- Auto-create training campaign template
- Create one sender profile and landing page
- Seed one target user list (safe fake users)
- Configure callback endpoint to victim simulator

**3. Victim simulator improvements — infrastructure/docker/scenarios/sc03/**
- Implement deterministic simulation for:
  - Email open
  - Link click
  - Macro-like execution event
  - Outbound callback beacon
- Emit structured logs consumable by SIEM mapping

**4. SIEM Event Coverage — backend/src/siem/events/sc03_events.json**
- Map commands/actions to realistic phishing telemetry:
  - campaign launch → mail dispatch event
  - email open/click → user interaction events
  - macro execution simulation → endpoint alert
  - callback beacon → suspicious outbound event
- Each event includes: id, source_ip, severity, message, mitre_technique, cwe

**5. Verification Steps**
```bash
docker-compose --profile sc03 up -d
docker ps | grep sc03
docker logs sc03-phish --tail 100
docker logs sc03-victim --tail 100
```

CONSTRAINTS:
- Same isolation rules: internal network, 0.5 CPU, 512MB RAM
- Credentials stored in .env only
- No real phishing to external systems, only internal simulation traffic

DELIVERABLES:
- ✅ SC-03 profile hardened and startup reliable
- ✅ init-gophish.sh setup script complete
- ✅ victim simulator emits deterministic telemetry
- ✅ sc03_events.json populated with 20+ event templates
- ✅ CONTINUOUS_STATE.md updated with SC-03 details
```

---

# PROMPT 3: SIEM Event Maps Enhancement for SC-01 to SC-03

```
MISSION: Expand SIEM event coverage across SC-01 to SC-03 to provide comprehensive Blue Team detection capabilities.

CONTEXT:
- Current: ~40 SIEM event templates total
- Goal: 80+ event templates (minimum 20+ per scenario)
- Focus: Realistic security alerts triggered by attacker commands and simulated telemetry

GOAL:
Provide dense, realistic event coverage for web attacks, AD compromise behaviors, and phishing kill chain detection.

REQUIREMENTS:

**1. SC-01 Expansion (Web App) — backend/src/siem/events/sc01_events.json**
Current triggers: nmap, sqlmap, gobuster, curl
Add:
- WAF blocks: XSS attempt, CSRF token bypass, Path traversal
- Database audit logs: Failed login attempts, unexpected SELECT statements
- File upload audit: Executable upload attempts, suspicious MIME type
- Web server logs: 404 patterns (directory brute force), 403 Access Denied
- Application logs: Error 500 on SQL injection, file access violations
- IDS alerts: Payload pattern matches (SQLi, XSS signatures)
Total target: 25 unique event templates

**2. SC-02 Expansion (AD) — backend/src/siem/events/sc02_events.json**
Current triggers: bloodhound, GetUserSPNs, secretsdump
Add:
- Kerberos events: 4756 (member added to group), 4729 (global group member added)
- LDAP queries: 5382 (LDAP search filter), 5383 (LDAP connection)
- Account modification: 4738 (user account changed), 4724 (password reset attempted)
- Privilege use: 4672 (special privileges assigned)
- Logon events: 4624 (successful logon), 4648 (logon with explicit creds)
- Lateral movement: 5156 (inbound TCP connection), 4688 (process creation + parent)
Total target: 30 unique event templates

**3. SC-03 Expansion (Phishing) — backend/src/siem/events/sc03_events.json**
Current triggers: phishing send, email open, macro execution
Add:
- Email gateway: Phishing URL detection, suspicious attachment flagged
- Macro execution: Office Open XML macro analysis, PowerShell child process
- C2 communication: DNS query patterns (DGA detection), HTTP beacons
- Persistence: Scheduled task created, Registry run key modified, WMI event subscription
- Defense evasion: Tamper Protection disabled, Real-time protection off
- Exfiltration: Unusual outbound connection, Data transfer anomaly
Total target: 25 unique event templates

CONSTRAINTS:
- Keep event templates aligned to SC-01, SC-02, SC-03 only
- Use deterministic trigger patterns to avoid noisy false positives
- Preserve existing JSON schema expected by SIEM engine

DELIVERABLES:
- ✅ sc01_events.json: 25 event templates
- ✅ sc02_events.json: 30 event templates
- ✅ sc03_events.json: 25 event templates
- ✅ Total: 80 unique event templates
- ✅ All events have: id, trigger_command, severity, message, mitre_technique, cwe
- ✅ CONTINUOUS_STATE.md updated with event coverage summary
```

---

# PROMPT 4: End-to-End Integration Testing & Bug Fixes (SC-01 to SC-03)

```
MISSION: Run comprehensive integration tests across SC-01 to SC-03 to verify platform stability, fix any blocking issues, and validate end-to-end user workflows.

CONTEXT:
- Platform: 80% complete with real terminals, real targets, hints, SIEM
- Current blockers: No integration tests run yet
- Goal: Verify all major workflows for SC-01 to SC-03

TESTING CHECKLIST:

**1. Terminal & Container Health**
- [ ] Kali container starts cleanly (`docker ps | grep kali`)
- [ ] Terminal I/O works (keystroke ↔ Docker exec ↔ browser)
- [ ] Command history persists on browser refresh
- [ ] Terminal timeout works (auto-cleanup after 60 min idle)

**2. Auth & Session Management**
- [ ] Login creates JWT token
- [ ] JWT token passed to WebSocket connection
- [ ] Session persists across page refresh
- [ ] Logout clears session + Docker container
- [ ] Admin/instructor login works
- [ ] Role-based access enforced

**3. Scenario Loading & Phase Tracking**
- [ ] GET /api/scenarios returns 3 scenarios
- [ ] POST /api/sessions/start/{sc01} creates new session
- [ ] Session initializes with phase=1
- [ ] Phase advances on task completion
- [ ] Phase gating prevents premature escalation (try to run sqlmap in phase 1 → blocked)

**4. Terminal Commands (SC-01 to SC-03)**
- [ ] SC-01: nmap scan returns output, gobuster finds directories
- [ ] SC-02: enum4linux enumerates users, GetUserSPNs finds Kerberoastable accounts
- [ ] SC-03: GoPhish campaign launch works, phishing callback detected

**5. SIEM Event Triggering**
- [ ] Run nmap in SC-01 → SIEM events appear within 2 seconds
- [ ] Run GetUserSPNs in SC-02 → Kerberos event appears
- [ ] Send phishing email in SC-03 → Email event appears
- [ ] Background noise events appear periodically, marked as gray/low-weight

EVENT TEMPLATE FORMAT (JSON):
```json
{
  "id": "sc01-waf-001",
  "trigger_command": "sqlmap -u http://172.20.1.20/search",
  "trigger_pattern": "sqlmap|--dbs|--tamper",
  "source": "modsecurity_waf",
  "severity": "HIGH",
  "message": "WAF detected SQL injection attempt in search parameter",
  "raw_log": "[ModSecurity: Malicious SQL detected in request]",
  "mitre_technique": "T1190",
  "cwe": "CWE-89",
  "source_ip": "{attacker_ip}",
  "timestamp": "{now_iso}"
}
```

DELIVERABLES:
- ✅ integration_test.py with 35+ comprehensive tests for SC-01 to SC-03
- ✅ All tests passing (or documented failures with reproduction steps)
- ✅ Performance benchmarks measured + documented
- ✅ Bug fixes applied to any blocking issues
- ✅ Test results summary in CONTINUOUS_STATE.md
```

---

# PROMPT 5: Performance Optimization & Load Testing

```
MISSION: Optimize platform for production stability under load and ensure sub-second UI responsiveness for SC-01 to SC-03.

FOCUS AREAS:
1. Terminal output buffering (handle large outputs)
2. SIEM event batching (reduce Redis writes)
3. WebSocket compression (reduce bandwidth)
4. Frontend code splitting (lazy load components)
5. Database connection pooling
6. Redis pipeline optimization

REQUIREMENTS:

**1. Backend Optimizations**
- Add connection pooling: asyncpg pool size 20, Redis connection pool 50
- Batch SIEM events: write 10 events at once instead of 1-by-1
- Terminal output chunking: max 4KB per frame (prevent OOM)
- Compression: gzip on HTTP responses, permessage-deflate on WebSocket

**2. Frontend Optimizations**
- Code splitting: separate bundles for Auth, Dashboard, Red/Blue workspaces
- Lazy loading: InstructorDashboard and Debrief components only load on route
- Terminal rendering: use requestAnimationFrame for smooth scrolling
- SIEM feed: virtual scrolling for large event lists (1000+ events)

**3. Database Optimization**
- Add indexes on: session_id, user_id, scenario_id, created_at
- Partition command_log and siem_events by date (monthly) if feasible
- Archive old sessions > 90 days to cold storage plan

**4. Load Testing**
Run concurrent user simulation:
```bash
locust -f tests/load_test.py --users 100 --spawn-rate 10 --run-time 5m
```

DELIVERABLES:
- ✅ Connection pooling configured
- ✅ Event batching implemented
- ✅ Code splitting bundle analysis
- ✅ Load test report (100 concurrent users, latency p50/p95/p99)
- ✅ Performance improvement measurements (before/after)
- ✅ CONTINUOUS_STATE.md updated with optimizations

ACCEPTANCE CRITERIA:
- Terminal latency: ≤100ms (p95)
- SIEM latency: ≤2s (p95)
- Page load: ≤3s (p95)
- Support 100 concurrent users without errors
```

---

# PROMPT 6: Blue Team Playbooks & IR Procedures (SC-01 to SC-03)

```
MISSION: Create comprehensive incident response playbooks for Blue Team to use during SC-01 to SC-03.

CONTEXT:
- Blue Team needs structured procedures to detect and respond to attacks
- Playbooks should reference NIST 800-61, include detection queries, containment steps

REQUIREMENTS:

**SC-01 Web App Playbook:**
- Detection: Query WAF logs for SQL injection patterns
- Analysis: Extract attack payload, identify vulnerable parameters
- Containment: Block attacker IP, patch vulnerability
- Eradication: Reset database, audit other tables
- Recovery: Restore from backup if data corrupted
- Post-incident: Review code for similar issues

**SC-02 AD Playbook:**
- Detection: Hunt for 4769 RC4, 4624 failed logins, 4648 explicit creds
- Analysis: Build timeline of attacker movements
- Containment: Reset compromised account password, disable DC
- Eradication: Remove persistence mechanisms (scheduled tasks, registry)
- Recovery: Restore DC from backup
- Post-incident: Review AD security practices, enable protections

**SC-03 Phishing Playbook:**
- Detection: Email gateway logs, user reported phishing, macro execution
- Analysis: Extract IOCs (sender domain, URLs, file hashes)
- Containment: Block sender domain, disable macro execution, isolate infected computer
- Eradication: Remove malware, reset credentials
- Recovery: Patch endpoint, re-enable macros with restrictions
- Post-incident: Security awareness training

DELIVERABLES:
- ✅ Playbook for each scenario (Markdown format)
- ✅ Each playbook includes detection queries + step-by-step IR procedures
- ✅ Stored in: backend/src/scenarios/playbooks/{sc01-03}_playbook.md
- ✅ Frontend displays playbook in BlueWorkspace as guided reference
- ✅ CONTINUOUS_STATE.md updated
```

---

# PROMPT 7: Deploy Elastic Stack (Real SIEM)

```
MISSION: Replace simulated regex SIEM with a real Elasticsearch single-node cluster integrated seamlessly into the single platform.

CONTEXT:
- Goal: Move CyberSim's Blue Team telemetry to a 100% real SIEM.
- We are replacing Python's `siem/engine.py` (which parses user text) with actual ELK log matching, but polling it via FastAPI rather than forcing students to use Kibana.

REQUIREMENTS:
1. Edit `docker-compose.yml`.
   - Add a tightly constrained single-node Elasticsearch container (`mem_limit: 2g`, `ES_JAVA_OPTS="-Xms1g -Xmx1g"`).
2. Delete the legacy mock JSON files:
   - `backend/src/siem/events/*.json`
3. Refactor `backend/src/siem/engine.py`:
   - It should now poll the Elasticsearch REST API (`GET /_search`) for alerts matching the active session's scenario.
   - Stream resulting events to the frontend via WebSocket so the custom React `SiemFeed.jsx` can natively display authentic logs.

DELIVERABLES:
- ✅ docker-compose.yml updated with elasticsearch.
- ✅ Mock JSONs deleted.
- ✅ `engine.py` refactored to poll Elastic and stream via WebSocket.
```

---

# PROMPT 8: Authentic Target Telemetry & Forwarding

```
MISSION: Configure target containers to generate real logs and forward them to Elastic via Filebeat.

REQUIREMENTS:
1. **SC-01**: `sc01/Dockerfile.waf` -> Install Filebeat. Configure Apache/ModSec logs to forward to Elastic.
2. **SC-02**: `sc02/Dockerfile.dc` -> Enable Samba Audit logging and forward Windows Event Log patterns (using Filebeat/Syslog) to Elastic.
3. **SC-03**: `sc03/Dockerfile.mailrelay` -> Forward Postfix logs to Elastic.

DELIVERABLES:
- ✅ Filebeat / syslog forwarders integrated into all 3 scenario Dockerfiles.
- ✅ Elastic pipeline or Filebeat modules configured to parse incoming logs.
```

---

# PROMPT 9: Strict Raw Mode for Kali Terminal

```
MISSION: Force the Kali terminal to act entirely as a real PTY without any fallback mocks.

REQUIREMENTS:
1. Edit `backend/src/sandbox/terminal.py`:
   - Completely remove `_mock_command_output()` and `_mock_listener`.
   - Ensure that if Docker is unreachable, the system elegantly fails rather than pretending.

DELIVERABLES:
- ✅ `terminal.py` stripped of mock code.
```

---

# PROMPT 10: Unified Architecture & Memory Optimization

```
MISSION: Ensure the entire unified architecture runs smoothly on a single laptop without resource exhaustion.

REQUIREMENTS:
1. Refactor `docker-compose.yml` resource limits:
   - Cap maximum memory utilization across all containers (Postgres, Redis, Backend, Frontend, Elastic) to strict limits.
2. Update backend `sandbox/manager.py` lifecycle:
   - Ensure targets are spinned down appropriately when sessions jump or terminate to prevent Zombie instances eating RAM.
3. Validate performance:
   - Confirm backend can successfully orchestrate and stream a Kali PTY while polling Elastic without introducing significant blocking delays.

DELIVERABLES:
- ✅ Main `docker-compose.yml` heavily optimized with strict memory boundaries.
- ✅ target lifecycle management hardened in `manager.py`.
```

---

## 📊 Progress Tracking

After each prompt completion, mark here:

- [ ] Prompt 1: SC-02 Complete Docker Targets
- [ ] Prompt 2: SC-03 Complete Docker Targets
- [ ] Prompt 3: SIEM Event Maps Enhancement (SC-01 to SC-03)
- [ ] Prompt 4: End-to-End Integration Testing (SC-01 to SC-03)
- [ ] Prompt 5: Performance Optimization
- [ ] Prompt 6: Blue Team Playbooks (SC-01 to SC-03)
- [x] Prompt 7: Deploy Elastic Stack (Real SIEM)
- [x] Prompt 8: Authentic Target Telemetry
- [x] Prompt 9: Kali Terminal Strict Raw Mode
- [x] Prompt 10: Unified Architecture & Memory Optimization

---

## 🔍 Quick Reference: Key Files to Understand

Before running prompts, Claude should read these:

1. **docs/architecture/MASTER_BLUEPRINT.md** — Architecture & constraints
2. **docs/scenarios/SC-01/02/03-*.yaml** — Scenario specifications (MVP scope)
3. **backend/src/siem/events/sc01_events.json** — Event template format
4. **backend/src/scenarios/hints/sc01_hints.json** — Hint structure
5. **CONTINUOUS_STATE.md** — Update this after every change
6. **.env.example** — All required environment variables

---

## 🚀 Recommended Timeline

- **Day 1-2**: Prompts 1-2 (Complete SC-02 and SC-03 targets)
- **Day 3**: Prompt 3 (SIEM enhancement for SC-01 to SC-03)
- **Day 4-5**: Prompt 4 (Integration testing + bugfixes)
- **Day 6**: Prompt 5 (Performance optimization)
- **Day 7**: Prompt 6 (Playbooks)

**Total est. effort**: 25-30 hours of autonomous Claude development

---

## ✅ Success Criteria

Platform considered **PRODUCTION READY** when:

- ✅ SC-01 to SC-03 have complete Docker targets
- ✅ SIEM event coverage ≥ 80 event templates across SC-01 to SC-03
- ✅ Integration tests: 35+ tests, 100% passing
- ✅ Load test: 100 concurrent users, <100ms latency
- ✅ Blue Team playbooks: 3 complete procedures
- ✅ Documentation: 95% complete
- ✅ Zero critical bugs in CONTINUOUS_STATE.md

---

**Good luck! Let's build an awesome cybersecurity training platform. 🎯**

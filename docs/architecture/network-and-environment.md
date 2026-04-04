# CyberSim — Network & Environment Architecture

## Overview

Every scenario runs in a fully isolated Docker bridge network.
The student's Kali container is the only container with a shell exposed to the browser.
Target containers have no internet access. No container can reach the host network.

---

## Host machine requirements (development)
- RAM: 16 GB minimum (8 GB for containers, 8 GB for host)
- CPU: 4 cores minimum
- Disk: 40 GB free (Docker images are large — Kali alone is ~4 GB)
- OS: Linux or macOS. Windows requires WSL2.
- Docker: 24.x + Docker Compose v2
- Ports used by docker-compose: 80 (nginx), 5432 (postgres), 6379 (redis)

---

## Network topology

```
Internet / Browser
       |
       | HTTPS (port 443 in prod, 80 in dev)
       |
  [nginx reverse proxy]
       |
  ┌────┴────────────────────┐
  │                         │
[frontend:3000]      [backend:8000]
  React/Vite              FastAPI
                           |
                    [postgres:5432]
                    [redis:6379]
                           |
                    [Docker SDK]
                           |
          ┌────────────────┼────────────────┐
          │                │                │
   [sc01-network]   [sc02-network]   [sc05-network]
   172.20.1.0/24   172.20.2.0/24   172.20.5.0/24
          │
    ┌─────┴──────────────────────┐
    │                            │
[kali-sc01]              [targets-sc01]
172.20.1.10              172.20.1.20 (web server)
                         172.20.1.21 (db server)
                         172.20.1.1  (gateway/firewall sim)
```

---

## Docker network definitions per scenario

### SC-01 — Web application pentest
```
Network name:    cybersim-sc01
Subnet:          172.20.1.0/24
Gateway:         172.20.1.1

Containers:
  kali-sc01        172.20.1.10   Kali Linux 2024.1 — student terminal
  webapp-sc01      172.20.1.20   Apache 2.4.49 + PHP 7.4 + MySQL 5.7 (NovaMed portal)
  db-sc01          172.20.1.21   MySQL 5.7 (internal, not directly reachable from kali)
  waf-sc01         172.20.1.1    ModSecurity WAF (simulated via nginx + modsec rules)

Internet access: NONE (--internal flag on Docker network)
DNS:             Internal only (webapp.novamed.local → 172.20.1.20)
```

### SC-02 — Active Directory compromise
```
Network name:    cybersim-sc02
Subnet:          172.20.2.0/24
Gateway:         172.20.2.1

Containers:
  kali-sc02        172.20.2.10   Kali Linux — student terminal
  dc-sc02          172.20.2.20   Samba4 AD DC (Windows AD-compatible, nexora.local)
  ws01-sc02        172.20.2.30   Windows 10 simulation (Ubuntu + Samba client)
  ws02-sc02        172.20.2.31   Windows 10 simulation
  fileserver-sc02  172.20.2.40   SMB file server (Samba)

Pre-seeded:
  Domain: nexora.local
  Users: jsmith (low-priv), svc_backup (Kerberoastable), Administrator
  Groups: Domain Users, IT-Admins, Backup-Operators
  GPOs: Password policy, Logon scripts
```

### SC-03 — Phishing & initial access
```
Network name:    cybersim-sc03
Subnet:          172.20.3.0/24
Gateway:         172.20.3.1

Containers:
  kali-sc03        172.20.3.10   Kali Linux — attacker
  mailserver-sc03  172.20.3.20   Postfix SMTP (simulated Orion Logistics mail)
  target-ws-sc03   172.20.3.30   Simulated Windows 10 endpoint (Python-based behavior sim)
  gophish-sc03     172.20.3.40   GoPhish campaign server (pre-configured)

Special: GoPhish dashboard exposed at http://localhost:3333 (mapped from container)
```

### SC-04 — Cloud misconfiguration
```
Network name:    cybersim-sc04
Subnet:          172.20.4.0/24
Gateway:         172.20.4.1

Containers:
  kali-sc04        172.20.4.10   Kali + awscli configured to point to localstack
  localstack-sc04  172.20.4.20   LocalStack (AWS simulation: S3, IAM, EC2 meta, Lambda)
  webapp-sc04      172.20.4.30   SSRF-vulnerable Flask app (StratoStack portal)

LocalStack services enabled: s3, iam, sts, ec2, lambda, cloudtrail, guardduty
Pre-seeded: 3 S3 buckets (one public), IAM roles with misconfigs, Lambda with env vars
AWS_ENDPOINT_URL in kali-sc04: http://172.20.4.20:4566
```

### SC-05 — Ransomware IR simulation
```
Network name:    cybersim-sc05
Subnet:          172.20.5.0/24
Gateway:         172.20.5.1

Containers:
  kali-sc05        172.20.5.10   Red team terminal (post-access simulation)
  c2-sc05          172.20.5.20   Simulated C2 server (netcat listener + beacon sim)
  victim-ws-sc05   172.20.5.30   Compromised Windows workstation sim
  fileserver-sc05  172.20.5.40   SMB file server (lateral movement target)
  dc-sc05          172.20.5.50   Domain controller (exfil target)

Blue team tools (separate containers, blue-side access only):
  splunk-sc05      172.20.5.100  Splunk Free (pre-indexed with scenario logs)
  velociraptor-sc05 172.20.5.101 Velociraptor DFIR server
```

---

## Kali base image specification

```dockerfile
# infrastructure/docker/kali/Dockerfile
FROM kalilinux/kali-rolling:latest

# Tools installed (education use against isolated containers only)
RUN apt-get update && apt-get install -y \
    nmap nikto gobuster ffuf wfuzz \
    sqlmap burpsuite \
    john hashcat \
    impacket-scripts \
    crackmapexec \
    bloodhound \
    hydra \
    netcat-openbsd \
    curl wget \
    python3 python3-pip \
    awscli \
    wireshark-common tshark \
    metasploit-framework \
    && apt-get clean

# Install Python tools
RUN pip3 install impacket trufflehog

# Create non-root user for student sessions
RUN useradd -m -s /bin/bash student
USER student
WORKDIR /home/student

# Pre-configure environment
COPY .bashrc /home/student/.bashrc
COPY .zshrc /home/student/.zshrc
```

---

## Backend environment variables

```bash
# .env.example — copy to .env and fill in

# AI Monitor
GEMINI_API_KEY=your_google_ai_studio_key_here
GEMINI_MODEL=gemini-1.5-flash-latest
GEMINI_MAX_TOKENS=150
GEMINI_CALLS_PER_MINUTE=15

# Database
POSTGRES_URL=postgresql://cybersim:cybersim@postgres:5432/cybersim
POSTGRES_USER=cybersim
POSTGRES_PASSWORD=change_in_production
POSTGRES_DB=cybersim

# Redis
REDIS_URL=redis://redis:6379/0

# Auth
JWT_SECRET=generate_with_openssl_rand_hex_32
JWT_EXPIRY_HOURS=8

# Docker
DOCKER_SOCKET=/var/run/docker.sock
SCENARIO_NETWORK_PREFIX=172.20
KALI_IMAGE=cybersim-kali:latest
MAX_CONCURRENT_SESSIONS=10

# App
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=INFO
```

---

## Postgres schema (summary)

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    scenario_id VARCHAR(10) NOT NULL,  -- 'SC-01' etc
    role VARCHAR(10) NOT NULL,          -- 'red' | 'blue'
    methodology VARCHAR(50),
    phase INTEGER DEFAULT 1,
    score INTEGER DEFAULT 100,
    hints_used JSONB DEFAULT '[]',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    container_id TEXT,
    network_name TEXT
);

-- Notes
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id),
    tag VARCHAR(20) NOT NULL,           -- 'finding' | 'evidence' | 'todo' | 'ioc'
    content TEXT NOT NULL,
    phase INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commands log (metadata only, not full output)
CREATE TABLE command_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id),
    command TEXT NOT NULL,              -- the command typed
    tool VARCHAR(50),                   -- parsed tool name
    phase INTEGER,
    triggered_siem_events JSONB,
    ai_hint_given BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SIEM events
CREATE TABLE siem_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id),
    severity VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    raw_log TEXT,
    mitre_technique VARCHAR(20),
    acknowledged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Redis key structure

```
session:{session_id}:state        → JSON session state (TTL 8h)
session:{session_id}:commands     → List of recent commands (last 10)
siem:{session_id}:feed            → Pub/Sub channel for live SIEM events
terminal:{session_id}:output      → Pub/Sub channel for terminal output
ai:{session_id}:last_call         → Timestamp (rate limiting, TTL 10s)
```

---

## Security boundaries

1. Scenario containers run with `--cap-drop ALL` except what's needed
2. Kali container runs as non-root `student` user
3. No scenario container has `--privileged` flag
4. All scenario networks use `--internal` (no internet)
5. Backend talks to Docker via socket mounted read-only where possible
6. Student terminal input is sanitized — no direct shell injection to host
7. File uploads (for SC-03 payload crafting) are scanned and size-limited
8. Container CPU limit: 1.0 core. Memory limit: 512MB per container.
9. Session cleanup: containers destroyed after scenario completion + 10 min grace
10. Logs retained 30 days; no PII in logs

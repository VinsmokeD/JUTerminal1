# CyberSim Platform Security Case

This document describes the security architecture, sandboxing isolation, and defense hardening controls implemented across the CyberSim dual-perspective training platform.

---

## 1. Sandbox Isolation & Virtualization

CyberSim runs all pentesting tools and target infrastructure within isolated Docker containers on local scenario subnets. To prevent compromise of the host machine or lateral movement to external networks, the following engineering controls are enforced:

### 1.1 Air-Gapped Scenario Networks
All scenario Docker Compose networks are defined with `internal: true`. The Docker daemon restricts these networks from routing any traffic to or from the internet (0.0.0.0/0). Target and Kali containers can only communicate with peer containers on their assigned subnet (e.g. `172.20.1.0/24` for SC-01).

### 1.2 Unprivileged User Execution
Dynamic Kali containers are configured to run as the unprivileged `student` user (UID 1000) rather than `root`.
- The user context is explicitly set in `infrastructure/docker/kali/Dockerfile` (`USER student`).
- The Python Docker SDK client explicitly provisions Kali instances using `user="student"`.

### 1.3 Privilege Escalation Mitigation
To prevent container escape via kernel exploits or misconfigurations, the dynamic Kali runner enforces:
- **Capabilities Dropping**: `cap_drop=["ALL"]` removes all Linux capabilities (including `CAP_SYS_ADMIN`, `CAP_NET_ADMIN`, etc.), preventing root-level system manipulations.
- **No New Privileges**: `security_opt=["no-new-privileges"]` prevents tasks from gaining privileges via `setuid` or `setgid` binaries.

---

## 2. Resource Constraints & Denial of Service Hardening

To prevent a student's script or infinite loops from consuming all host CPU and memory resources (which would degrade the training platform for other sessions), CyberSim applies strict limits at the virtualization layer:

- **CPU Quota**: Restricted to `0.5 cores` (`cpu_period=100000`, `cpu_quota=50000`) per Kali container.
- **Memory Limit**: Bounded to `512MB` (`mem_limit="512m"`) per container, causing memory-hogging processes to be terminated by the kernel out-of-memory (OOM) killer without impacting the host OS.
- **Eviction Reaper**: A background loop executes every 60 seconds to detect idle containers (no activity for 60+ minutes) and automatically terminates and removes them. Stale sessions with expired active markers are reaped instantly.

---

## 3. API & Websocket Rate Limiting

To mitigate automated brute-force attacks and abuse of external API tokens (such as OpenRouter keys), CyberSim implements rate limiting using Redis cache tracking:

### 3.1 Authentication Rate Limiting
- **Endpoint**: `/api/auth/register` is limited to `20 registrations per hour` per IP address.
- **Endpoint**: `/api/auth/login` is limited to `30 logins per 5 minutes` per IP address.

### 3.2 Flag Verification Rate Limiting
- **Endpoint**: `/api/sessions/{session_id}/flag` is limited to `10 attempts per minute` per training session to prevent flag brute-forcing.

### 3.3 Socratic AI Tutor Rate Limiting
- **Endpoint**: AI monitor queries are restricted to `1 request per 10 seconds` per session to prevent spamming the OpenRouter/DeepSeek endpoint and consuming API budgets.

---

## 4. Credentials & Exploit Safe Storage

- **Password Hashing**: User credentials are encrypted using SHA-256 combined with bcrypt (12 rounds) prefixing.
- **No Malware Storage**: The scenario blueprints and validation engines simulate vulnerability effects and check for command fingerprints (like `sqlmap` parameters). No active malware binaries or functional exploit code is hosted inside the source tree.

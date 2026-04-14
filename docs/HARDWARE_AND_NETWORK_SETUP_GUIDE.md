# CyberSim Hardware & Network Setup Guide (Two-Laptop Topology)

This document provides a highly detailed, step-by-step guide to configuring the physical hardware and Docker networking required to run CyberSim in its fully genuine, distributed mode.

## 🌟 The Goal
To increase realism and handle the intensive load of real Elasticsearch SIEM logging and multiple target virtual environments, the infrastructure will be split into two physical machines:

1. **Laptop 1 (Platform Node)**: Runs the "Heavy" infrastructure — React Frontend, Python FastAPI Backend, Postgres, Redis, and the Elastic SIEM (Elasticsearch).
2. **Laptop 2 (Sandbox Node)**: Runs the vulnerable "Targets" — Real Kali Linux, ModSecurity WAF, Samba Active Directory DC, GoPhish, etc.

---

## 💻 Hardware Requirements

### Laptop 1 (Platform Node)
- **Minimum RAM**: 8GB (16GB highly recommended due to Elastic Search).
- **Minimum CPU**: 4 Cores.
- **OS**: Windows (with WSL2), Linux, or macOS.
- **Software**: Docker Desktop, Python 3.11+, Node.js (for local dev).

### Laptop 2 (Sandbox Node)
- **Minimum RAM**: 8GB (Running 3+ isolated networks and 5+ containers).
- **Minimum CPU**: 4 Cores.
- **OS**: Linux (Ubuntu 22.04/24.04 recommended) or Windows with WSL2.
- **Software**: Docker Desktop or Docker Engine.

---

## 🔌 Step 1: Physical & Local Network Setup

Both laptops MUST be on the same Local Area Network (LAN) to communicate seamlessly.

1. **Connect both laptops** to the same Wi-Fi network or physically via an Ethernet switch.
2. **Find IP Addresses**:
   - On Laptop 1 (Platform): Open a terminal, run `ipconfig` (Windows) or `ifconfig`/`ip a` (Linux/Mac). Note the IPv4 Address (e.g., `192.168.1.100`).
   - On Laptop 2 (Sandbox): Run `ipconfig` or `ip a`. Note the IPv4 Address (e.g., `192.168.1.101`).
3. **Verify Connectivity**:
   - From Laptop 1 run: `ping 192.168.1.101`
   - From Laptop 2 run: `ping 192.168.1.100`

---

## 🐳 Step 2: Preparing Laptop 2 (Sandbox Node) for Remote Orchestration

Laptop 1's backend needs to automatically start and stop Kali containers on Laptop 2 via the Docker SDK. To do this, we must configure the Docker Daemon on Laptop 2 to accept remote HTTP/TCP requests.

> **⚠️ Security Warning**: Exposing the Docker daemon over TCP gives root access to the machine. Ensure this is only done on a trusted LAN, or use TLS/SSH.

### If Laptop 2 is Linux (Ubuntu/Debian)
1. Edit the Docker service file:
   ```bash
   sudo systemctl edit docker.service
   ```
2. Add the following lines to open the daemon on port 2375:
   ```ini
   [Service]
   ExecStart=
   ExecStart=/usr/bin/dockerd -H fd:// -H tcp://0.0.0.0:2375
   ```
3. Restart Docker:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart docker
   ```

### If Laptop 2 is Windows (Docker Desktop)
1. Open **Docker Desktop**.
2. Click the **Gear icon (Settings)** in the top right.
3. Go to **General**.
4. Check the box for: **"Expose daemon on tcp://localhost:2375 without TLS"**.
5. (Note: To access it externally from Laptop 1, Windows Firewall and Port Proxy rules might be required, or it is highly recommended to bridge through WSL2 directly).
   *Port proxy command (Run as Admin in PowerShell):*
   ```powershell
   netsh interface portproxy add v4tov4 listenport=2375 listenaddress=0.0.0.0 connectport=2375 connectaddress=127.0.0.1
   ```
   *Firewall rule:*
   ```powershell
   New-NetFirewallRule -DisplayName "Docker-TCP" -Direction Inbound -LocalPort 2375 -Protocol TCP -Action Allow
   ```

---

## 🛠️ Step 3: Deploying the Codebase

1. Clone the `JUTerminal1` repository onto **both** laptops.

### On Laptop 1 (Platform Node)
1. Navigate to the project root.
2. Edit `.env` and set the Remote Docker Host dynamically:
   ```env
   # Inside .env
   DOCKER_HOST=tcp://192.168.1.101:2375
   ELASTIC_URL=http://localhost:9200
   ```
3. Launch the Platform Compose:
   ```bash
   docker-compose -f docker-compose-platform.yml up -d
   ```
   This will start FastAPI, React, Postgres, Redis, and Elastic Search locally.

### On Laptop 2 (Sandbox Node)
1. Navigate to the project root.
2. Ensure you have the `.env` file present (can share the same database keys, though the sandbox doesn't need the database directly, it needs standard variables).
3. We need to deploy the Elastic shippers (Filebeat) and Target networks. Since Laptop 1 runs Elastic, Filebeat on Laptop 2 needs to point to Laptop 1.
4. Edit the Filebeat configurations (e.g., `infrastructure/docker/siem/filebeat.yml`) or `.env` variable to point to Laptop 1:
   ```env
   ELASTIC_HOST=192.168.1.100:9200
   ```
5. Launch the Sandbox Compose (with the desired scenario profile):
   ```bash
   docker-compose -f docker-compose-sandbox.yml --profile sc01 --profile sc02 up -d
   ```

---

## 🔍 Step 4: Verification Checklist

| Step | Action on Laptop 1 | Expected Result |
|------|---------------------|-----------------|
| 1. | Open Browser to `http://localhost:80` | Platform loads the Login/Dashboard page. |
| 2. | Verify Docker API | Run `docker -H tcp://192.168.1.101:2375 ps`. You should see Laptop 2's target containers. |
| 3. | Start a CyberSim Session | Connect to SC-01. The Backend on Laptop 1 should dynamically deploy a Kali container on Laptop 2 and tunnel the terminal via WebSocket. |
| 4. | Verify Elastic Ingestion | Run `curl http://localhost:9200/_cat/indices`. You should see `filebeat-*` indices populated by the targets on Laptop 2. |

---

## 🔧 Troubleshooting

- **Connection Refused on 2375**: Ensure Laptop 2's firewall allows incoming TCP 2375.
- **Filebeat cannot reach Elastic**: Ensure Laptop 1's firewall allows incoming TCP 9200.
- **Terminal is laggy**: Ensure both laptops are on a stable 5GHz Wi-Fi or Ethernet connection, as WebSocket streams the raw PTY over the LAN. 

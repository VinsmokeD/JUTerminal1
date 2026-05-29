# Deployment and Operations Manual

This manual provides instructions for deploying, operating, and maintaining the CyberSim platform. It covers single-node local development setup, production VPS deployment with Caddy, reverse proxy configuration, and sslip.io automation.

---

## 1. Platform Prerequisites

Before deploying CyberSim, ensure the host machine meets the following requirements:

### 1.1 Hardware Specifications
* **CPU**: Minimum 4 physical cores (recommended 8 cores for concurrent user sessions).
* **RAM**: Minimum 8 GB (16 GB recommended for Elasticsearch and concurrent Kali instances).
* **Disk Space**: Minimum 20 GB free space (recommended SSD for fast container provisioning and ES indexing).

### 1.2 Software Prerequisites
* **Operating System**: Linux (Ubuntu 22.04 LTS or 24.04 LTS recommended) or Windows 10/11 with WSL2.
* **Docker Engine**: Version 20.10.x or newer.
* **Docker Compose**: Version 2.20.x or newer.
* **Python**: Version 3.11.x (only if running backend tests or scripts outside Docker).
* **Node.js**: Version 18.x or newer (only if building the frontend outside Docker).

---

## 2. Configuration & Environment Variables

All services retrieve their configurations from the environment variables defined in `.env`.

### 2.1 Environmental Keys Reference

| Variable Name | Default Value | Purpose |
|---|---|---|
| `ENVIRONMENT` | `development` | Switches logging, docs access, and database init modes. Set to `production` in live setups. |
| `POSTGRES_URL` | `postgresql+asyncpg://...` | Connection URI for the PostgreSQL database. |
| `REDIS_URL` | `redis://redis:6379/0` | Connection URI for the Redis cache and WebSocket messaging. |
| `JWT_SECRET` | (None) | A 32-byte hex string used to sign auth tokens. *Must be generated on installation.* |
| `OPENROUTER_API_KEY` | (None) | OpenRouter API Key for AI Socratic hints. Fallback static hints are used if empty. |
| `OPENROUTER_MODEL` | `deepseek/deepseek-chat-v3-0324` | The active LLM target model on OpenRouter. |
| `MAX_CONCURRENT_SESSIONS` | `10` | Capping maximum concurrent training sandboxes. |
| `CONTAINER_CPU_LIMIT` | `0.5` | Capped CPU allocation for scenario containers. |
| `CONTAINER_MEMORY_LIMIT`| `512m` | Capped memory limits for sandbox containers. |

---

## 3. Local Development Deployment

### 3.1 Initial Setup
1. Clone the repository and navigate to the project root:
   ```bash
   git clone https://github.com/VinsmokeD/JUTerminal1.git
   cd JUTerminal1
   ```
2. Copy the example environment template:
   ```bash
   cp .env.example .env
   ```
3. Generate a secure `JWT_SECRET` key:
   ```bash
   openssl rand -hex 32
   ```
   Paste the generated value into `.env` under `JWT_SECRET`.
4. Add your OpenRouter API Key under `OPENROUTER_API_KEY`.

### 3.2 Booting Core Infrastructure
Start the core services (PostgreSQL, Redis, Elasticsearch, Filebeat, Backend, Frontend, and Nginx proxy) in detached mode:
```bash
docker compose up -d
```
Verify that all services are online and healthy:
```bash
docker compose ps
```

### 3.3 Starting Scenarios
To load scenarios for classroom exercises, activate the Docker Compose profiles:
```bash
docker compose --profile sc01 up -d   # Start NovaMed Web app scenario
docker compose --profile sc02 up -d   # Start Nexora Active Directory scenario
docker compose --profile sc03 up -d   # Start Orion Phishing scenario
```
Verify target container startup:
```bash
docker compose ps --filter label=com.cybersim.protect=true
```

---

## 4. Production HTTPS Deployment (VPS & Caddy)

For university demonstrations and public deployments, CyberSim provides a demo-day automation script using Caddy to coordinate reverse proxying and automated Let's Encrypt TLS certificates.

### 4.1 Deployment Topology
In production, Caddy binds to ports 80/443 and disables the default Nginx service.

```text
Student Browser ────── HTTPS (Port 443) ──────► Caddy (Reverse Proxy)
                                                 ├── /api/ ──► FastAPI (Port 8000)
                                                 ├── /ws/  ──► FastAPI WebSockets
                                                 └── /     ──► React SPA (Port 80)
```

### 4.2 Automated VPS Bootstrapping
1. Deploy a clean Ubuntu 22.04 / 24.04 VPS.
2. Run the bootstrap helper script as root:
   ```bash
   CYBERSIM_DOMAIN=cybersim.sslip.io bash scripts/demo-bootstrap.sh
   ```
   *Note: If a custom domain is not specified, sslip.io dynamically routes requests based on the server's public IP.*
3. Navigate to the installation directory:
   ```bash
   cd /opt/cybersim
   ```
4. Configure database passwords, OpenRouter API keys, and secret credentials:
   ```bash
   nano .env
   ```
5. Build and launch the production stack:
   ```bash
   bash scripts/demo-deploy.sh
   ```

### 4.3 Caddy Routing Definition
The Caddy configuration (`infrastructure/caddy/Caddyfile`) coordinates routing and preserves dynamic Docker DNS:
```caddy
{$CYBERSIM_DOMAIN} {
    # Compress traffic
    encode gzip

    # Route API requests to the backend service
    handle_path /api/* {
        reverse_proxy backend:8000
    }

    # Route WebSocket connections
    handle /ws/* {
        reverse_proxy backend:8000
    }

    # Route health checks
    handle_path /health {
        reverse_proxy backend:8000 {
            header_up Host {host}
        }
    }

    # Route everything else to the frontend container
    handle {
        reverse_proxy frontend:80
    }
}
```

---

## 5. Operations & Health Verification

### 5.1 Pre-Demo Verification Command
Run the verification check before any training session or presentation:
```bash
python scripts/demo_check.py --scenarios all
```
This utility tests:
* All compose services (Redis, PG, ES, Filebeat) health status.
* DB connection stability and active Redis session counters.
* Network and port routing integrity for SC-01, SC-02, and SC-03.

### 5.2 Cleanup and System Reset
To terminate active Kali sandboxes and purge student scenario logs:
```bash
docker compose down -v
```
This command removes all network interfaces, database records, and dynamic containers. To restart fresh:
```bash
docker compose up -d
docker compose --profile sc01 --profile sc02 --profile sc03 up -d
```
To run database schema updates:
```bash
docker compose exec backend alembic upgrade head
```

# CyberSim — Complete Setup Guide

## Prerequisites check

```bash
docker --version          # Need 24.x+
docker compose version    # Need v2+
free -h                   # Need 16GB RAM minimum
df -h /                   # Need 40GB free disk
python3 --version         # For local dev without Docker
node --version            # Need 20+
```

---

## Step 1 — Clone and configure

```bash
git clone https://github.com/YOUR_USERNAME/cybersim.git
cd cybersim
cp .env.example .env
```

Edit `.env` — minimum required:
```bash
# Get free key from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_key_here

# Generate with: openssl rand -hex 32
JWT_SECRET=your_64_char_hex_here

POSTGRES_PASSWORD=choose_a_strong_password
```

---

## Step 2 — Build the Kali image (one-time, ~10 min)

```bash
docker build -t cybersim-kali:latest ./infrastructure/docker/kali/
```

This installs all pentest tools. Only needed once. Subsequent rebuilds use cache.

---

## Step 3 — Start core services

```bash
# Start database, cache, backend, frontend, nginx
docker compose up -d postgres redis backend frontend nginx

# Wait ~30s then verify all healthy
docker compose ps

# Expected output: all services show "healthy" or "Up"
```

---

## Step 4 — Verify backend

```bash
curl http://localhost/health
# Expected: {"status":"ok","version":"0.1.0"}

curl http://localhost/api/docs
# Opens Swagger UI in browser (dev mode only)
```

---

## Step 5 — Start a scenario

Each scenario's target containers start on demand:

```bash
# SC-01: Web application pentest
docker compose --profile sc01 up -d

# SC-02: Active Directory
docker compose --profile sc02 up -d

# SC-04: AWS cloud misconfig (LocalStack)
docker compose --profile sc04 up -d

# SC-05: Ransomware IR (includes Splunk — takes ~2min to start)
docker compose --profile sc05 up -d
```

---

## Step 6 — Access the platform

Open `http://localhost` in your browser.

Register an account, select a scenario, choose red or blue team, pick your methodology, acknowledge the ROE, and enter the workspace.

---

## Development workflow (no Docker)

```bash
# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

You still need Docker for postgres, redis, and scenario containers:
```bash
docker compose up -d postgres redis
```

---

## Running Claude Code on this project

Always start a Claude Code session with:
```bash
cat CLAUDE.md              # Project context
git log --oneline -5       # Current state
cat docs/architecture/phases.md | grep -A8 "Phase [0-9]" | head -40
```

Then give Claude Code a single-phase task. Never ask it to do multiple phases in one session — token limits cause truncation.

Example prompt for Phase 1:
```
Read CLAUDE.md. We are on Phase 1.
Create docker-compose.yml with postgres, redis, backend, frontend, nginx.
All services must pass health checks. Acceptance: curl localhost/health returns 200.
```

---

## Antigravity continuity

If Claude Code runs out of tokens mid-phase:
1. Antigravity reads `git log --oneline -10`
2. Antigravity reads `docs/architecture/phases.md` for current phase
3. Antigravity resumes Claude Code from the next unchecked item
4. After completion: `git add -A && git commit -m "feat: phase N complete" && git push`

---

## Troubleshooting

**Backend fails to start:**
```bash
docker compose logs backend --tail=50
# Common: GEMINI_API_KEY not set, or postgres not ready yet
```

**Kali container not found:**
```bash
docker images | grep cybersim-kali
# If missing: docker build -t cybersim-kali:latest ./infrastructure/docker/kali/
```

**SC-01 webapp unreachable from Kali:**
```bash
docker compose --profile sc01 ps   # check targets are up
docker network ls | grep sc01      # check network exists
```

**Splunk slow to start (SC-05):**
```bash
docker compose --profile sc05 logs sc05-splunk --follow
# Wait for "Splunk is ready" message — takes ~90s
```

**Reset everything:**
```bash
docker compose down -v   # removes volumes (deletes all data)
docker compose up -d postgres redis backend frontend nginx
```

---

## Cost summary

All components are free for development and university demo:
- Docker: free
- Kali Linux: free
- LocalStack: free tier (5 services, no time limit)
- Splunk: free tier (500MB/day ingest — more than enough for training)
- Gemini 1.5 Flash: free tier (15 RPM, 1M tokens/day)
- Samba4 AD: free open source

**Total monthly cost for a student running this locally: $0**

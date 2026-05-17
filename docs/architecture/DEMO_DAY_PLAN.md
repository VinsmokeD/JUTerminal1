# Demo-Day Deployment Plan

**Goal:** A working public URL for your graduation defense. You + 1–2 jury members click around live for ~20 minutes. Then you tear it down.

**Not a goal:** Public users, real students, security audits, GDPR, monitoring, backups. We are deliberately skipping all of it.

**Lead time:** 1–3 weeks. Plenty.

---

## TL;DR

| Thing | Choice |
|-------|--------|
| Host | **Hetzner CCX13** — 2 dedicated vCPU, 8 GB RAM, €13/mo, kill it after defense |
| Domain | **`yourname.de.cool` or similar** from Porkbun (~$3/yr) — or skip and use `sslip.io` (free) |
| HTTPS | **Caddy** — auto Let's Encrypt, zero config beyond hostname |
| DNS | **Cloudflare DNS-only** (orange cloud OFF — WebSockets hate the proxy) |
| Deploy mechanism | `git pull && docker compose up -d` — manual is fine for one-shot demo |
| Time budget | **3–4 hours** total spread across 3 sessions |

Total cost: **~$15 for the month** (€13 VPS + $3 domain). Cancel both after defense.

---

## Implemented repo artifacts

The plan has been converted into checked-in files so the VPS setup is copy/pasteable:

```bash
# On the VPS as root
CYBERSIM_DOMAIN=demo.yourname.cool bash scripts/demo-bootstrap.sh
cd /opt/cybersim
nano .env
bash scripts/demo-deploy.sh
```

- `docker-compose.demo.yml` adds Caddy, exposes 80/443, and moves the local Nginx proxy behind the inactive `local-nginx` profile.
- `infrastructure/caddy/Caddyfile` routes `/ws`, `/api`, and `/health` to FastAPI and all other traffic to the React frontend.
- `.env.demo.example` is the demo-safe template for hostname, CORS, generated secrets, and concurrency limits.
- `scripts/demo-bootstrap.sh` installs system packages, enables the firewall, clones/updates the repo, creates a generated `.env`, and prints the exact deploy command.
- `scripts/demo-deploy.sh` validates Compose config, builds the full stack with all three scenario profiles, and runs the health check.
- `scripts/demo-healthcheck.sh` checks the public HTTPS health endpoint and scenario catalog.
- `scripts/demo-day-check.sh` is the defense-morning readiness check: Compose, public `/health`, scenario catalog, TLS snapshot, disk, memory, container health, and recent Caddy/backend logs.
- `scripts/demo-recover.sh` gives fast recovery actions: `soft`, `full`, `logs`, `free-memory`, `start-scenarios`, and guarded `wipe-data`.
- `scripts/demo-local-rehearsal.ps1` runs the all-profile local rehearsal from Windows PowerShell and confirms `http://localhost/health` plus the three-scenario catalog.

## Why this setup, in one paragraph

You need three things and nothing else: (1) a stable IP that doesn't change when your laptop sleeps, (2) HTTPS because Chrome blocks WebSockets over plain HTTP on a public hostname, (3) enough RAM to run all three scenario stacks at once during demo. A Hetzner dedicated-CPU box gives you predictable performance (no noisy neighbor mid-demo). Caddy gives you HTTPS in one config line. Cloudflare DNS-only gives you a clean URL without proxying WebSockets (Cloudflare's free WS proxy is unreliable for the message volume your terminal generates).

---

## Phase 1 — Local rehearsal first (do this before buying anything)

**Time: 30 min.** Make sure the full stack runs cleanly on your laptop end-to-end. If it breaks here it'll break on the VPS too.

```bash
# In the repo root
docker compose down -v             # nuke previous state
docker compose --profile sc01 --profile sc02 --profile sc03 up -d
docker compose ps                  # everything should be healthy after ~60s
```

Then in a browser:
1. Open http://localhost (frontend)
2. Register an account → log in → pick SC-01 → run one full attack flow → reach Debrief
3. Repeat for SC-02 and SC-03
4. While all three sessions are open, watch `docker stats` in another terminal. Note peak RAM.

If peak RAM is over ~6 GB, you'll need CCX23 (16 GB) instead of CCX13 (8 GB). Most likely it's 4–5 GB and CCX13 is fine.

---

## Phase 2 — Domain + VPS (day 1, ~1 hour)

### 2a. Buy a domain (10 min)
- Go to Porkbun.com → search a `.cool` / `.app` / `.dev` name → ~$3–10/yr first year
- After buying, in the dashboard set nameservers to Cloudflare's (`maya.ns.cloudflare.com` / `chad.ns.cloudflare.com` — Cloudflare will tell you the exact pair)
- Sign up at cloudflare.com → "Add a site" → free plan → it gives you those nameservers

**Alternative: skip the domain entirely.** Use `sslip.io` — a hostname like `1-2-3-4.sslip.io` resolves to IP `1.2.3.4` automatically, free, gives you valid TLS certs. Less memorable but $0.

### 2b. Order Hetzner box (15 min)
- Sign up at hetzner.cloud (needs ID verification, can take a few hours)
- Create project → "Add Server"
  - Location: closest to where the demo audience will be (Helsinki for EU, Ashburn for US-East, Hillsboro for US-West)
  - Image: **Ubuntu 24.04**
  - Type: **CCX13** (or CCX23 if your local rehearsal showed >6 GB peak)
  - SSH key: paste your public key (generate with `ssh-keygen -t ed25519` on Windows PowerShell if you don't have one)
  - Name: `cybersim-demo`
- Note the public IPv4. That's where everything lives.

### 2c. Point DNS at it (5 min)
In Cloudflare dashboard for your domain:
- `A` record: `demo` → `<your-hetzner-ip>` → **Proxy status: DNS only (grey cloud)**
- `A` record: `@` → same IP → DNS only (so the apex works too)
- Wait 1 min, verify: `nslookup demo.yourname.cool` returns the right IP

---

## Phase 3 — Server bootstrap (day 1, ~30 min)

SSH in:
```bash
ssh root@<hetzner-ip>
```

Run these once:
```bash
# Update + basic hardening
apt update && apt upgrade -y
apt install -y ufw fail2ban git docker.io docker-compose-v2

# Firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Create deploy dir
mkdir -p /opt/cybersim
cd /opt/cybersim
git clone https://github.com/VinsmokeD/JUTerminal1.git .
```

---

## Phase 4 — Swap Nginx for Caddy + production env (day 1, ~45 min)

The current `docker-compose.yml` uses Nginx on port 80. We swap to Caddy because Caddy gives you HTTPS automatically without you wrestling with certbot.

### 4a. Create the Caddyfile

```bash
mkdir -p /opt/cybersim/infrastructure/caddy
nano /opt/cybersim/infrastructure/caddy/Caddyfile
```

Paste (replace the hostname with yours):

```caddyfile
demo.yourname.cool {
    # WebSocket endpoint — must come first
    handle /ws/* {
        reverse_proxy backend:8000
    }

    # REST API
    handle /api/* {
        reverse_proxy backend:8000
    }

    # Everything else → frontend
    handle {
        reverse_proxy frontend:80
    }

    encode gzip
    log {
        output stdout
        format console
    }
}
```

### 4b. Add Caddy service to compose

Create an override file (don't touch the main `docker-compose.yml`):

```bash
nano /opt/cybersim/docker-compose.demo.yml
```

Paste:

```yaml
services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infrastructure/caddy/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - internal
    depends_on:
      - frontend
      - backend

  # Disable nginx — Caddy replaces it
  nginx:
    profiles: ["disabled"]

volumes:
  caddy_data:
  caddy_config:
```

### 4c. Create the demo `.env`

```bash
cp .env.example .env
nano .env
```

Edit these values:
```
GEMINI_API_KEY=<paste your real key from Google AI Studio>
JWT_SECRET=<run: openssl rand -hex 32 — paste output>
POSTGRES_PASSWORD=<run: openssl rand -hex 24 — paste output>
POSTGRES_URL=postgresql://cybersim:<that_password>@postgres:5432/cybersim
MAX_CONCURRENT_SESSIONS=5
```

Leave everything else default.

### 4d. Bring it up

```bash
cd /opt/cybersim
docker compose -f docker-compose.yml -f docker-compose.demo.yml \
    --profile sc01 --profile sc02 --profile sc03 \
    up -d --build

# Watch logs
docker compose logs -f caddy backend
```

After ~3 minutes, hit `https://demo.yourname.cool` in your browser. Caddy will have grabbed a Let's Encrypt cert automatically. Padlock should be solid.

If it doesn't work, the three usual suspects:
- DNS hasn't propagated yet (wait 5 min, try `dig demo.yourname.cool` from your laptop)
- Cloudflare is proxying (orange cloud) — turn it off
- Firewall blocks 80/443 — `ufw status` should show them open

---

## Phase 5 — Rehearsal (day 2 + 3, ~30 min each)

**Rehearsal 1 (a week before defense):**
1. From your laptop browser, do a full SC-01 run end-to-end on the public URL
2. From a second browser/profile, log in as a different user, run SC-02 simultaneously
3. From a third (phone hotspot is fine), run SC-03 at the same time
4. Watch `docker stats` on the VPS via SSH. Note peak RAM and CPU.

Pass criteria:
- All three sessions reach Debrief without backend crash
- Terminal latency feels < 200 ms (commands echo immediately)
- SIEM events appear within 2 seconds of attack command
- No "WebSocket disconnected" toasts during normal use

**Rehearsal 2 (2–3 days before defense):**
- Repeat the above with the exact demo script you'll perform live
- Time yourself — make sure your story fits the slot
- Take screenshots of every page in case something breaks mid-demo (you can fall back to slide-mode)

If anything fails in rehearsal: see "Common failures" below.

---

## Phase 6 — Day-of-defense protocol

**Morning of:**
1. SSH in 2 hours before: `docker compose ps` — everything healthy?
2. If anything is in restart loop: `docker compose restart <service>` once. If still bad, `docker compose down && up -d`.
3. Hit the URL from your phone (on cellular, not your laptop's wifi) → confirm the world can reach it
4. Open the demo flow once yourself end-to-end so it's primed (Docker image caches are warm, no first-time lag)

**During the demo:**
- Keep an SSH terminal open in a hidden window with `docker stats` — if RAM creeps past 7 GB, that's your warning signal
- Have a slide-deck backup of every screen — if the live demo blows up, you pivot to slides and finish the story
- Don't let jury members run wild — give them a guided suggestion: "try `nmap -sV 172.20.1.20` to fingerprint the target"

**After the demo (same day or next):**
- Hetzner: delete the server (~30 sec, billing stops immediately, you only pay prorated to the hour)
- Porkbun: keep the domain or let it expire
- Cloudflare: keep the zone — free anyway

---

## Common failures + 5-second fixes

| Symptom | Quickfix |
|---------|---------|
| Browser shows "Your connection is not private" | Caddy hasn't gotten the cert yet. Wait 60 seconds, refresh. `docker compose logs caddy` should show "certificate obtained successfully" |
| Caddy says "no such host" on cert | Cloudflare proxy is on (orange cloud). Turn it off |
| Backend exits immediately with `connection refused: postgres` | Postgres slower than backend startup. `docker compose restart backend` |
| WebSocket disconnects every few seconds | Cloudflare proxy is on. Turn it off |
| Out-of-memory during demo | `docker compose stop sc02-dc sc02-fileserver` if you're not demoing AD right then. Frees ~1.5 GB instantly |
| Frontend shows old version after redeploy | `docker compose build --no-cache frontend && docker compose up -d frontend` |
| Terminal is laggy | Switch to ethernet from wifi. If still laggy, restart the session (close + reopen workspace) |
| Scenario container won't start | `docker compose logs sc01-webapp` — usually a port collision; `docker compose down --remove-orphans` then up |

---

## The "what if my laptop dies during demo" backup plan

Cheap insurance, take 20 minutes to set up:

1. On your demo laptop, install `cloudflared`: `winget install cloudflare.cloudflared`
2. The night before: `cloudflared tunnel login` → creates a tunnel → `cloudflared tunnel --url http://localhost:80`
3. Run `docker compose up -d` locally on your laptop
4. If the public URL dies mid-demo, you flip to the tunnel URL on screen — same UI, served from your laptop, takes 10 seconds

You won't need it. But knowing it's there lets you breathe.

---

## What we are deliberately NOT doing (and why it's fine)

| Skipped | Why it's OK for one demo |
|---------|---------------------------|
| Database backups | Demo data is throwaway. Nuke and restart. |
| Rate limiting | Three jury members can't DoS you |
| Email verification | One demo account, you create it manually |
| Monitoring/alerting | You're the monitoring — you're watching the screen |
| Auto-deploy / CI | Manual `git pull && docker compose up` is fine for one shot |
| Container egress lock-down | Box is firewalled at the perimeter; doesn't matter |
| Production secrets manager | `.env` on a server you'll delete in 24 hours is fine |
| Multi-region failover | One demo, one room |
| Load testing | 3 users, you tested it in rehearsal |
| Legal/ToS | Not a public service |

If anyone in the jury asks "how would you scale this?", you point them at [DEPLOYMENT_PLAN.md](DEPLOYMENT_PLAN.md). That's exactly what it's for.

---

## Cost breakdown (real numbers)

| Item | Cost |
|------|------|
| Hetzner CCX13 prorated to ~3 weeks of use | ~€10 |
| Porkbun domain (1 year minimum) | $3–10 |
| Cloudflare | $0 |
| Let's Encrypt cert | $0 |
| Gemini API (demo-scale calls) | $0 (free tier) |
| **Total out-of-pocket** | **~$15–25** |

Cheaper than your defense ceremony coffee.

---

## Your action items, in order

- [ ] **This week:** Do Phase 1 (local rehearsal). Note peak RAM.
- [ ] **Next week, day 1:** Phase 2 (domain + VPS), Phase 3 (bootstrap), Phase 4 (Caddy + .env). ~2 hours total.
- [ ] **Following weekend:** Phase 5 rehearsal #1.
- [ ] **2–3 days before defense:** Phase 5 rehearsal #2 with full demo script.
- [ ] **Day of:** Phase 6 morning checks. Demo. Tear down after.

Done. Don't over-engineer it.

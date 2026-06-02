# Parallax — Complete Setup Guide (zero to running)

This is the **one guide** to take a brand-new machine to a fully working Parallax
lab — frontend, backend, SIEM, the Kali Red Team terminal, and all three
scenarios. It assumes **no prior knowledge** of the project. Follow it top to
bottom and you will end with the app running at `http://localhost`.

> **Read this first — about "Kali" and "WSL":**
> You do **not** install Kali Linux as a separate WSL distro, and you do not
> install Kali by hand. Parallax runs Kali as a **Docker image** that we build
> from `infrastructure/docker/kali/`. On Windows, Docker runs on the **WSL 2**
> backend, so "the WSL stuff" simply means *enabling WSL 2 and pointing Docker
> Desktop at it*. That's it. Every tool (nmap, sqlmap, metasploit, impacket,
> crackmapexec, evil-winrm, …) is baked into that image and is identical on
> every teammate's machine. There is nothing to install inside Kali manually.

---

## 0. What you are about to run

Parallax is a single-node **Docker Compose** lab. Everything runs in containers
on your machine:

| Layer | Containers |
| --- | --- |
| Web | `nginx` (front door, port 80), `frontend` (React/Vite) |
| App | `backend` (FastAPI), `postgres`, `redis` |
| SIEM | `elasticsearch`, `filebeat` |
| Red Team terminal | `parallax-kali:latest` image → per-session Kali containers |
| SC-01 NovaMed (Web) | `sc01-db`, `sc01-php`, `sc01-webapp`, `sc01-waf` |
| SC-02 Nexora (Active Directory) | `sc02-dc`, `sc02-fileserver` |
| SC-03 Orion (Phishing) | `sc03-mailrelay`, `sc03-phish`, `sc03-victim` |

All scenario networks are **internal-only** (no internet). This lab is for
isolated practice — never point it at real systems.

---

## 1. Hardware & OS requirements

| Resource | Minimum | Recommended |
| --- | --- | --- |
| RAM | 8 GB | **16 GB+** |
| Docker memory allocation | 6 GB | **8 GB+** |
| CPU | 4 cores | 6 cores+ |
| Free disk | 20 GB | **40 GB+** (the Kali image alone is ~9 GB) |

Supported hosts:

- **Windows 10/11** — Docker Desktop + WSL 2 backend *(primary path, covered in full below)*
- **macOS** — Docker Desktop
- **Linux** — Docker Engine 24+ with the Compose v2 plugin

---

## 2. Windows: install the prerequisites (one time)

> macOS/Linux users: skip to [Section 3](#3-get-the-code). Your only prerequisite
> is Docker (Desktop on macOS, Engine + compose plugin on Linux) plus Git.

### 2.1 Enable WSL 2

Open **PowerShell as Administrator** and run:

```powershell
wsl --install
```

This enables the WSL 2 feature and installs a default Ubuntu distro. **Reboot**
when it asks. After reboot, confirm WSL 2 is the default:

```powershell
wsl --set-default-version 2
wsl --status
```

> If `wsl --install` says it's already installed, you're good. If your machine
> has never had virtualization enabled, turn on **Virtualization** in the BIOS
> (often called *Intel VT-x* / *AMD-V* / *SVM*).

### 2.2 Install Docker Desktop

1. Download Docker Desktop: <https://www.docker.com/products/docker-desktop/>
2. Install it. On the setup screen, keep **"Use WSL 2 instead of Hyper-V"** checked.
3. Launch Docker Desktop. Wait until the whale icon in the system tray is steady.
4. In **Settings → General**, confirm **"Use the WSL 2 based engine"** is on.
5. In **Settings → Resources → Advanced**, set **Memory to at least 6 GB**
   (8 GB recommended — Elasticsearch alone needs ~2 GB or it will stay unhealthy).
6. In **Settings → Resources → WSL Integration**, make sure integration is
   enabled for your default distro.
7. Click **Apply & Restart**.

### 2.3 Install Git

Download and install Git for Windows: <https://git-scm.com/download/win>
(accept the defaults). Or, if you have winget:

```powershell
winget install --id Git.Git -e
```

### 2.4 (Optional) Install Node.js + Python — only for host-side dev/tests

You do **not** need these just to *run* the app (everything runs in Docker).
Install them only if you'll run frontend/backend tests directly on the host:

- Node.js LTS 18+ : <https://nodejs.org/>
- Python 3.11 : <https://www.python.org/downloads/> (tick "Add to PATH")

### 2.5 Verify the toolchain

Close and re-open PowerShell, then:

```powershell
git --version
docker --version
docker compose version
docker info        # should print engine info with no error
```

All four must succeed before continuing. If `docker info` errors, Docker Desktop
isn't running yet — start it and wait for the whale to settle.

---

## 3. Get the code

Pick a **short, local, non-synced** folder. Avoid OneDrive / Google Drive /
Dropbox paths — cloud-sync breaks Docker bind mounts. A good choice is `C:\dev`.

```powershell
mkdir C:\dev -Force
cd C:\dev
git clone https://github.com/VinsmokeD/JUTerminal1.git
cd JUTerminal1
git checkout master
git pull --ff-only origin master
```

macOS/Linux:

```bash
mkdir -p ~/dev && cd ~/dev
git clone https://github.com/VinsmokeD/JUTerminal1.git
cd JUTerminal1
git checkout master
git pull --ff-only origin master
```

---

## 4. The easy path — one command

From the repo root, run the bootstrap script for your OS. It creates `.env`,
generates a JWT secret, builds the Kali image, builds + starts the full stack,
and waits until the app is healthy.

**Windows (PowerShell):**

```powershell
.\scripts\setup-windows.ps1
```

If PowerShell blocks the script with an execution-policy error, run it once like this:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1
```

**macOS / Linux (bash):**

```bash
bash scripts/setup.sh
```

That's it. When it finishes you'll see:

```
  Web app .......... http://localhost
  API docs ......... http://localhost/api/docs
  Instructor login . admin / ParallaxAdmin!
```

Open **<http://localhost>** in your browser. **Done** — jump to
[Section 7: First-run smoke test](#7-first-run-smoke-test).

### Script options

| Goal | Windows | macOS/Linux |
| --- | --- | --- |
| Add a live AI key | `.\scripts\setup-windows.ps1 -OpenRouterKey "sk-or-..."` | `OPENROUTER_KEY=sk-or-... bash scripts/setup.sh` |
| Skip the big Kali build (mock terminal) | `.\scripts\setup-windows.ps1 -SkipKali` | `SKIP_KALI=1 bash scripts/setup.sh` |
| Core only, no scenarios | `.\scripts\setup-windows.ps1 -CoreOnly` | `CORE_ONLY=1 bash scripts/setup.sh` |

> The first run takes a while (the Kali image is ~9 GB and 6–15 min on a good
> connection). This is normal and only happens once.

If anything fails, prefer the **manual path** below so you can see each step, or
jump to [Section 9: Troubleshooting](#9-troubleshooting).

---

## 5. The manual path — step by step

Do this instead of (or after) Section 4 if you want to understand every step.

### 5.1 Create the environment file

```powershell
Copy-Item .env.example .env       # Windows
```
```bash
cp .env.example .env              # macOS/Linux
```

`.env` is git-ignored and never committed. Now set two values inside it.

**Generate a JWT secret** and paste it as `JWT_SECRET=...`:

```powershell
# Windows
$b = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
( -join ($b | ForEach-Object { $_.ToString('x2') }) )
```
```bash
# macOS/Linux
openssl rand -hex 32
```

Then open `.env` and set at minimum:

```env
JWT_SECRET=<the 64-char hex value you just generated>
OPENROUTER_API_KEY=<your OpenRouter key, or leave the placeholder>
OPENROUTER_MODEL=anthropic/claude-sonnet-4.6
ENVIRONMENT=development
```

> **About the OpenRouter key:** it powers the live AI tutor/hints. If you leave
> it blank, the app **still runs fine** and falls back to built-in Socratic
> hints. To get live AI, create a free key at <https://openrouter.ai/keys>, or
> ask your teammate to share one **privately** (never commit it to git). After
> changing the key, run `docker compose restart backend`.

### 5.2 Validate the compose file

```powershell
docker compose config --quiet
```

No output means it's valid.

### 5.3 Build the Kali Red Team image (important)

This is the step that gives you a **real** attacker shell in the browser
terminal. Without it, the terminal runs in *mock mode* (commands still drive the
SIEM, AI, and scoring, but don't execute in a real shell).

```powershell
docker build -t parallax-kali:latest infrastructure/docker/kali
```

This pulls Kali Rolling and installs the full toolset (nmap, nikto, gobuster,
ffuf, sqlmap, hydra, john, metasploit, impacket, smbclient, crackmapexec,
evil-winrm, responder, kerbrute, seclists/rockyou, swaks, and more). **6–15 min,
~9 GB.** It only needs to be done once per machine (rebuild only if the
Dockerfile changes).

### 5.4 Build and start the full stack

```powershell
docker compose --profile sc01 --profile sc02 --profile sc03 build
docker compose --profile sc01 --profile sc02 --profile sc03 up -d
```

This starts core services **and** all three scenario labs.

For a lighter daily run, start just the core and add scenarios on demand:

```powershell
docker compose up -d postgres redis elasticsearch filebeat backend frontend nginx
docker compose --profile sc01 up -d     # add NovaMed (Web)
docker compose --profile sc02 up -d     # add Nexora (Active Directory)
docker compose --profile sc03 up -d     # add Orion (Phishing)
```

---

## 6. Verify the machine

```powershell
docker compose ps
```

Every container should be `running` / `healthy` with no restart loops.

Health endpoints:

```powershell
Invoke-RestMethod http://localhost/health        # Windows
Invoke-RestMethod http://localhost/api/scenarios
```
```bash
curl http://localhost/health                     # macOS/Linux
curl http://localhost/api/scenarios
```

Expected:

- `/health` → `{"status":"ok","version":"0.1.0"}`
- `/api/scenarios` → lists exactly `SC-01`, `SC-02`, `SC-03`
- Web app loads at **<http://localhost>**
- API docs at **<http://localhost/api/docs>** (development mode only)
- Backend direct at **<http://localhost:8001>**

Optional one-shot readiness check:

```powershell
python scripts/demo_check.py --scenarios all
```

---

## 7. First-run smoke test

1. Open **<http://localhost>**.
2. Register a student account at **/auth** (or log in as the instructor below).
3. Start **SC-01** from the dashboard.
4. Open the **Red Team** workspace, click into the terminal, and run a harmless
   scoped command against the lab target, e.g. `nmap -sV 172.20.1.20`.
5. Confirm live terminal output appears.
6. Open the **Blue Team** workspace and confirm a matching **SIEM event** shows up.
7. Open **Debrief** and confirm the report/timeline loads.

**Default instructor account (local/dev only):**

```text
username: admin
password: ParallaxAdmin!
```

Students self-register at `/auth`. Do not expose this stack outside your machine.

---

## 8. Everyday commands (cheat sheet)

```powershell
# Start everything
docker compose --profile sc01 --profile sc02 --profile sc03 up -d

# Stop everything (keep data)
docker compose --profile sc01 --profile sc02 --profile sc03 down

# See status / logs
docker compose ps
docker compose logs backend --tail=120
docker compose logs -f backend          # live tail

# After pulling new code (no Docker file changes)
docker compose restart backend frontend nginx

# After pulling Dockerfile / compose changes
docker compose --profile sc01 --profile sc02 --profile sc03 build
docker compose --profile sc01 --profile sc02 --profile sc03 up -d

# Full reset of local data (DELETES Postgres/Redis/Elastic volumes)
docker compose --profile sc01 --profile sc02 --profile sc03 down --remove-orphans
docker compose down -v
```

> **Tip — protect the lab from accidental wipes.** The repo ships
> `docker-safe.ps1`, a wrapper that blocks destructive `docker` commands against
> Parallax-labelled containers/volumes. Optional install (PowerShell):
> ```powershell
> Copy-Item docker-safe.ps1 $HOME\docker-safe.ps1
> Add-Content $PROFILE "`nSet-Alias docker $HOME\docker-safe.ps1"
> ```

---

## 9. Troubleshooting

**Port 80 already in use.** Another web server is running. Find and stop it:
```powershell
netstat -ano | findstr ":80"
docker compose restart nginx
```

**Elasticsearch is unhealthy / keeps restarting.** It needs ≥ 2 GB RAM. Raise
Docker Desktop memory (Settings → Resources → Memory ≥ 6 GB), Apply & Restart, then:
```powershell
docker compose restart elasticsearch filebeat
```

**Backend not healthy.** Check the dependencies it relies on:
```powershell
docker compose logs backend --tail=150
docker compose logs postgres --tail=80
docker compose logs redis --tail=80
```

**Terminal opens but does nothing / "mock" responses.** The Kali image isn't
built. Build it, then restart the backend:
```powershell
docker build -t parallax-kali:latest infrastructure/docker/kali
docker compose restart backend
```

**Frontend shows an old page after a pull.**
```powershell
docker compose build frontend
docker compose up -d frontend nginx
```

**AI hints are generic.** `OPENROUTER_API_KEY` is empty or invalid. Set it in
`.env`, then `docker compose restart backend`.

**Scenario target can't be reached from Kali.** Confirm the right profile is up:
```powershell
docker compose --profile sc01 ps
docker network ls
```

**VPN / network subnet clash.** The lab uses `172.20.0.0/16` and `172.30.0.0/24`.
If your VPN/corporate network overlaps, disconnect the VPN for the demo, or
coordinate a deliberate subnet change in `docker-compose.yml` across the team
(don't change only `.env` — the subnets are defined in the compose networks).

**`docker info` fails / "cannot connect to the Docker daemon".** Docker Desktop
isn't running (Windows/macOS) — start it and wait for the whale icon. On Linux,
add your user to the `docker` group and re-login, and confirm
`/var/run/docker.sock` exists (the backend mounts it read-only to spawn Kali
session containers).

**PowerShell won't run the setup script.** Run it once with a bypass:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1
```

**Windows line-ending / "bad interpreter" errors in shell scripts.** The repo
pins line endings via `.gitattributes`. If you ever hit this, re-normalize:
```powershell
git rm --cached -r .
git reset --hard
```

---

## 10. Keeping your machine in sync with the team

Before each work session or demo:

```powershell
git checkout master
git pull --ff-only origin master
docker compose --profile sc01 --profile sc02 --profile sc03 build
docker compose --profile sc01 --profile sc02 --profile sc03 up -d
docker compose ps        # confirm no restart loops
```

Everyone should be on the **same commit of `master`** before a shared demo so
local behavior matches.

---

## 11. Where things live (for the curious)

| What | Where |
| --- | --- |
| Full stack definition | `docker-compose.yml` |
| Environment template | `.env.example` |
| Kali image (all tools) | `infrastructure/docker/kali/` |
| Scenario containers | `infrastructure/docker/scenarios/sc01..sc03/` |
| Nginx front door | `infrastructure/nginx/nginx.conf` |
| SIEM pipeline | `infrastructure/docker/siem/filebeat.yml` |
| DB bootstrap | `infrastructure/postgres/init.sql` |
| Backend (FastAPI) | `backend/` |
| Frontend (React/Vite) | `frontend/` |
| Scenario specs / hints | `docs/scenarios/`, `backend/src/scenarios/hints/` |
| AI tutor prompt | `ai-monitor/system_prompt.md` |

For daily team workflow and deeper reference, see
[`docs/TEAM_SETUP_GUIDE.md`](docs/TEAM_SETUP_GUIDE.md),
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), and
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## 12. Security ground rules

- Never test against real external systems — scenario networks are internal-only.
- Never commit `.env` or real API keys. Rotate any key that appears in logs.
- Keep the default `admin` account for **local/dev only**; it is rejected in
  `ENVIRONMENT=production`.
- The lab is for your machine. Don't expose `http://localhost` to the internet.

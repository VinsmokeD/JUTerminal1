#!/usr/bin/env bash
# ===========================================================================
#  Parallax one-command setup for Linux / macOS (Docker Engine or Desktop).
#
#  Takes a freshly cloned repo to a fully running Parallax stack:
#    1. Verifies Docker is installed and running.
#    2. Creates .env from .env.example with a freshly generated JWT secret.
#    3. Builds the Kali sandbox image (parallax-kali:latest) for a REAL shell.
#    4. Builds and starts the full stack including all three scenarios.
#    5. Waits for the app to become healthy and prints the access URLs.
#
#  Safe to re-run. It will not overwrite an existing .env.
#
#  Usage:
#    bash scripts/setup.sh                       # full setup
#    OPENROUTER_KEY=sk-or-... bash scripts/setup.sh
#    SKIP_KALI=1 bash scripts/setup.sh           # mock terminal, fast
#    CORE_ONLY=1 bash scripts/setup.sh           # no scenario containers
# ===========================================================================
set -euo pipefail

# --- pretty output --------------------------------------------------------
c_cyan='\033[36m'; c_green='\033[32m'; c_yellow='\033[33m'; c_red='\033[31m'; c_reset='\033[0m'
step() { printf "\n${c_cyan}==> %s${c_reset}\n" "$1"; }
ok()   { printf "    ${c_green}[OK]  %s${c_reset}\n" "$1"; }
warn() { printf "    ${c_yellow}[!]   %s${c_reset}\n" "$1"; }
fail() { printf "    ${c_red}[X]   %s${c_reset}\n" "$1"; }

# --- resolve repo root (this script lives in <repo>/scripts/) -------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

OPENROUTER_KEY="${OPENROUTER_KEY:-}"
SKIP_KALI="${SKIP_KALI:-0}"
CORE_ONLY="${CORE_ONLY:-0}"

echo "==========================================================="
echo "  Parallax - Linux/macOS one-command setup"
echo "  Repo: $REPO_ROOT"
echo "==========================================================="

# --- 1. prerequisites -----------------------------------------------------
step "Checking prerequisites"
if ! command -v docker >/dev/null 2>&1; then
    fail "Docker is not installed or not on PATH."
    echo "    Install Docker Engine (Linux) or Docker Desktop (macOS), then re-run."
    exit 1
fi
ok "docker found: $(docker --version)"

if ! docker info >/dev/null 2>&1; then
    fail "Docker is installed but the engine is not running (or needs sudo)."
    echo "    Start Docker, or add your user to the 'docker' group and re-login."
    exit 1
fi
ok "Docker engine is running"

if ! docker compose version >/dev/null 2>&1; then
    fail "'docker compose' (v2) is not available. Install the compose plugin."
    exit 1
fi
ok "docker compose found: $(docker compose version | head -n1)"

# --- 2. .env --------------------------------------------------------------
step "Preparing environment file (.env)"
if [ -f .env ]; then
    warn ".env already exists - leaving it untouched."
else
    [ -f .env.example ] || { fail ".env.example missing. Are you in the repo root?"; exit 1; }
    cp .env.example .env

    if command -v openssl >/dev/null 2>&1; then
        JWT="$(openssl rand -hex 32)"
    else
        JWT="$(head -c32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
    fi
    # portable in-place sed (GNU + BSD/macOS)
    sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=${JWT}|" .env && rm -f .env.bak

    if [ -n "$OPENROUTER_KEY" ]; then
        sed -i.bak "s|^OPENROUTER_API_KEY=.*|OPENROUTER_API_KEY=${OPENROUTER_KEY}|" .env && rm -f .env.bak
        ok "OpenRouter API key written to .env"
    else
        warn "No OpenRouter key provided - AI hints will use the local fallback."
        echo "    Add one later: edit .env, set OPENROUTER_API_KEY, then 'docker compose restart backend'."
    fi
    ok ".env created with a fresh JWT secret"
fi

# --- 3. validate compose --------------------------------------------------
step "Validating docker-compose.yml"
docker compose config --quiet
ok "Compose configuration is valid"

# --- 4. Kali image --------------------------------------------------------
if [ "$SKIP_KALI" = "1" ]; then
    step "Skipping Kali image build (SKIP_KALI=1). Terminal will run in mock mode."
else
    step "Building Kali sandbox image (parallax-kali:latest)"
    warn "First build is large (~9 GB) and can take 6-15 minutes."
    docker build -t parallax-kali:latest infrastructure/docker/kali
    ok "Kali image built"
fi

# --- 5. build + start -----------------------------------------------------
if [ "$CORE_ONLY" = "1" ]; then
    PROFILES=()
    step "Building core services (no scenarios, CORE_ONLY=1)"
else
    PROFILES=(--profile sc01 --profile sc02 --profile sc03)
    step "Building all services + scenarios (SC-01, SC-02, SC-03)"
fi

docker compose "${PROFILES[@]}" build
ok "Images built"

step "Starting the stack"
docker compose "${PROFILES[@]}" up -d
ok "Containers started"

# --- 6. wait for health ---------------------------------------------------
step "Waiting for the app to become healthy (up to ~2 minutes)"
healthy=0
for i in $(seq 1 40); do
    if curl -fsS http://localhost/health 2>/dev/null | grep -q '"status":"ok"'; then
        healthy=1; break
    fi
    sleep 3
    printf "    ...still starting (%ss)\n" "$((i*3))"
done

echo ""
if [ "$healthy" = "1" ]; then
    echo -e "${c_green}===========================================================${c_reset}"
    echo -e "${c_green}  Parallax is UP${c_reset}"
    echo -e "${c_green}===========================================================${c_reset}"
    echo "  Web app .......... http://localhost"
    echo "  API docs ......... http://localhost/api/docs"
    echo "  Backend direct ... http://localhost:8001"
    echo ""
    echo "  Instructor login . admin / ParallaxAdmin!"
    echo "  Students ......... self-register at /auth"
    echo ""
    echo "  Stop:    docker compose --profile sc01 --profile sc02 --profile sc03 down"
    echo "  Status:  docker compose ps"
    if [ "$SKIP_KALI" = "1" ]; then
        warn "Terminal is in MOCK mode. Build the real Kali shell with:"
        echo "    docker build -t parallax-kali:latest infrastructure/docker/kali"
    fi
else
    fail "App did not report healthy in time."
    echo "    Check logs:  docker compose logs backend --tail=120"
    echo "    Check state: docker compose ps"
    echo "    Elasticsearch needs >= 2 GB RAM - raise Docker memory if it is unhealthy."
    exit 1
fi

#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/cybersim}"
REPO_URL="${REPO_URL:-https://github.com/VinsmokeD/JUTerminal1.git}"
REPO_REF="${REPO_REF:-main}"
CYBERSIM_DOMAIN="${CYBERSIM_DOMAIN:-}"
OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-your_openrouter_api_key_here}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root on the VPS." >&2
  exit 1
fi

install_packages() {
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    fail2ban \
    git \
    openssl \
    ufw \
    docker.io
  if ! docker compose version >/dev/null 2>&1; then
    apt-get install -y --no-install-recommends docker-compose-v2 \
      || apt-get install -y --no-install-recommends docker-compose-plugin \
      || apt-get install -y --no-install-recommends docker-compose
  fi
  systemctl enable --now docker
}

configure_firewall() {
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
}

resolve_domain() {
  if [[ -n "${CYBERSIM_DOMAIN}" ]]; then
    printf '%s\n' "${CYBERSIM_DOMAIN}"
    return
  fi

  local public_ip
  public_ip="$(curl -fsSL https://api.ipify.org || true)"
  if [[ -z "${public_ip}" ]]; then
    public_ip="$(hostname -I | awk '{print $1}')"
  fi

  printf '%s.sslip.io\n' "${public_ip//./-}"
}

checkout_repo() {
  mkdir -p "${APP_DIR}"
  if [[ -d "${APP_DIR}/.git" ]]; then
    git -C "${APP_DIR}" fetch --all --prune
    git -C "${APP_DIR}" checkout "${REPO_REF}"
    git -C "${APP_DIR}" pull --ff-only
  else
    git clone --branch "${REPO_REF}" "${REPO_URL}" "${APP_DIR}"
  fi
}

write_env_file() {
  local domain="$1"
  local jwt_secret
  local postgres_password

  if [[ -f "${APP_DIR}/.env" ]]; then
    echo "Keeping existing ${APP_DIR}/.env"
    return
  fi

  jwt_secret="$(openssl rand -hex 32)"
  postgres_password="$(openssl rand -hex 24)"

  cat > "${APP_DIR}/.env" <<ENV
CYBERSIM_DOMAIN=${domain}

OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
OPENROUTER_MODEL=deepseek/deepseek-chat-v3-0324
OPENROUTER_MAX_TOKENS=150
AI_CALL_COOLDOWN_SECONDS=10

POSTGRES_USER=cybersim
POSTGRES_PASSWORD=${postgres_password}
POSTGRES_DB=cybersim
POSTGRES_URL=postgresql+asyncpg://cybersim:${postgres_password}@postgres:5432/cybersim

REDIS_URL=redis://redis:6379/0

JWT_SECRET=${jwt_secret}
JWT_EXPIRY_HOURS=8

DOCKER_SOCKET=/var/run/docker.sock
SCENARIO_NETWORK_PREFIX=172.20
KALI_IMAGE=cybersim-kali:latest
MAX_CONCURRENT_SESSIONS=5
CONTAINER_CPU_LIMIT=0.5
CONTAINER_MEMORY_LIMIT=512m

ENVIRONMENT=production
CORS_ORIGINS=https://${domain},http://${domain},http://localhost,http://localhost:3000
LOG_LEVEL=INFO

SC02_ADMIN_PASS=NexoraAdmin2024!

HINT_L1_PENALTY=5
HINT_L2_PENALTY=10
HINT_L3_PENALTY=20
TIME_BONUS_THRESHOLD_MINUTES=120

VITE_API_URL=/api
VITE_WS_URL=
ENV

  chmod 600 "${APP_DIR}/.env"
}

main() {
  install_packages
  configure_firewall
  checkout_repo

  local domain
  domain="$(resolve_domain)"
  write_env_file "${domain}"

  echo
  echo "CyberSim demo bootstrap complete."
  echo "App dir: ${APP_DIR}"
  echo "Domain: ${domain}"
  echo
  echo "If OPENROUTER_API_KEY is still a placeholder, edit ${APP_DIR}/.env before the demo."
  echo "Then run:"
  echo "  cd ${APP_DIR} && bash scripts/demo-deploy.sh"
}

main "$@"

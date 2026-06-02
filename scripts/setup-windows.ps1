<#
.SYNOPSIS
    Parallax one-command setup for Windows (Docker Desktop + WSL2 backend).

.DESCRIPTION
    Takes a freshly cloned repo to a fully running Parallax stack:
      1. Verifies Docker is installed and running.
      2. Creates .env from .env.example with a freshly generated JWT secret.
      3. Builds the Kali sandbox image (parallax-kali:latest) so the Red Team
         terminal runs a REAL shell (not mock mode).
      4. Builds and starts the full stack including all three scenarios.
      5. Waits for the app to become healthy and prints the access URLs.

    Safe to re-run. It will not overwrite an existing .env.

.PARAMETER OpenRouterKey
    Optional OpenRouter API key for live AI hints. If omitted, the app still
    runs and falls back to local Socratic hints.

.PARAMETER SkipKali
    Skip building the large Kali image (~9 GB, 6-15 min). The terminal then
    runs in mock mode: commands still drive SIEM/AI/scoring but do not execute
    in a real shell. Build it later with: docker build -t parallax-kali:latest infrastructure/docker/kali

.PARAMETER CoreOnly
    Start only the core platform (no scenario target containers). Lighter and
    faster; start scenarios later with: docker compose --profile sc01 up -d

.EXAMPLE
    .\scripts\setup-windows.ps1

.EXAMPLE
    .\scripts\setup-windows.ps1 -OpenRouterKey "sk-or-v1-xxxx"

.EXAMPLE
    .\scripts\setup-windows.ps1 -SkipKali -CoreOnly
#>
[CmdletBinding()]
param(
    [string]$OpenRouterKey = "",
    [switch]$SkipKali,
    [switch]$CoreOnly
)

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# Pretty output helpers
# ---------------------------------------------------------------------------
function Write-Step  ($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Write-Ok    ($m) { Write-Host "    [OK]  $m" -ForegroundColor Green }
function Write-Warn  ($m) { Write-Host "    [!]   $m" -ForegroundColor Yellow }
function Write-Fail  ($m) { Write-Host "    [X]   $m" -ForegroundColor Red }

# ---------------------------------------------------------------------------
# Resolve the repo root (this script lives in <repo>\scripts\)
# ---------------------------------------------------------------------------
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

Write-Host "===========================================================" -ForegroundColor Magenta
Write-Host "  Parallax - Windows one-command setup" -ForegroundColor Magenta
Write-Host "  Repo: $RepoRoot" -ForegroundColor Magenta
Write-Host "===========================================================" -ForegroundColor Magenta

# ---------------------------------------------------------------------------
# 1. Prerequisite checks
# ---------------------------------------------------------------------------
Write-Step "Checking prerequisites"

function Test-Tool ($name) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    return ($null -ne $cmd)
}

if (-not (Test-Tool "docker")) {
    Write-Fail "Docker is not installed or not on PATH."
    Write-Host "    Install Docker Desktop (with WSL2 backend) from:" -ForegroundColor Yellow
    Write-Host "    https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    Write-Host "    Then re-open PowerShell and run this script again." -ForegroundColor Yellow
    exit 1
}
Write-Ok "docker found: $((docker --version))"

# Confirm the Docker engine is actually running (Docker Desktop started).
try {
    docker info *> $null
    if ($LASTEXITCODE -ne 0) { throw "docker info failed" }
    Write-Ok "Docker engine is running"
} catch {
    Write-Fail "Docker is installed but the engine is not running."
    Write-Host "    Start Docker Desktop, wait for the whale icon to settle, then re-run." -ForegroundColor Yellow
    exit 1
}

# Confirm compose v2 is available.
docker compose version *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Fail "'docker compose' (v2) is not available. Update Docker Desktop."
    exit 1
}
Write-Ok "docker compose found: $((docker compose version) | Select-Object -First 1)"

# ---------------------------------------------------------------------------
# 2. Create .env
# ---------------------------------------------------------------------------
Write-Step "Preparing environment file (.env)"

$envPath     = Join-Path $RepoRoot ".env"
$envExample  = Join-Path $RepoRoot ".env.example"

if (Test-Path $envPath) {
    Write-Warn ".env already exists - leaving it untouched."
} else {
    if (-not (Test-Path $envExample)) {
        Write-Fail ".env.example is missing. Are you in the repo root?"
        exit 1
    }
    Copy-Item $envExample $envPath

    # Generate a 64-char hex JWT secret (PowerShell 5.1 compatible).
    $bytes = New-Object 'System.Byte[]' 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $rng.Dispose()
    $jwt = -join ($bytes | ForEach-Object { $_.ToString('x2') })

    $content = Get-Content $envPath -Raw
    $content = $content -replace 'JWT_SECRET=.*', "JWT_SECRET=$jwt"

    if ($OpenRouterKey -ne "") {
        $content = $content -replace 'OPENROUTER_API_KEY=.*', "OPENROUTER_API_KEY=$OpenRouterKey"
        Write-Ok "OpenRouter API key written to .env"
    } else {
        Write-Warn "No OpenRouter key provided - AI hints will use the local fallback."
        Write-Host "    Add one later: edit .env, set OPENROUTER_API_KEY, then 'docker compose restart backend'." -ForegroundColor Yellow
    }

    Set-Content -Path $envPath -Value $content -Encoding UTF8 -NoNewline
    Write-Ok ".env created with a fresh JWT secret"
}

# ---------------------------------------------------------------------------
# 3. Validate compose
# ---------------------------------------------------------------------------
Write-Step "Validating docker-compose.yml"
docker compose config --quiet
if ($LASTEXITCODE -ne 0) {
    Write-Fail "docker compose config failed. See the error above."
    exit 1
}
Write-Ok "Compose configuration is valid"

# ---------------------------------------------------------------------------
# 4. Build the Kali sandbox image
# ---------------------------------------------------------------------------
if ($SkipKali) {
    Write-Step "Skipping Kali image build (-SkipKali). Terminal will run in mock mode."
} else {
    Write-Step "Building Kali sandbox image (parallax-kali:latest)"
    Write-Warn "First build is large (~9 GB) and can take 6-15 minutes. Grab a coffee."
    docker build -t parallax-kali:latest (Join-Path $RepoRoot "infrastructure\docker\kali")
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Kali image build failed. Check your internet connection and retry."
        Write-Host "    You can continue without it using -SkipKali (mock terminal)." -ForegroundColor Yellow
        exit 1
    }
    Write-Ok "Kali image built"
}

# ---------------------------------------------------------------------------
# 5. Build + start the stack
# ---------------------------------------------------------------------------
if ($CoreOnly) {
    $profiles = @()
    Write-Step "Building core services (no scenarios, -CoreOnly)"
} else {
    $profiles = @("--profile","sc01","--profile","sc02","--profile","sc03")
    Write-Step "Building all services + scenarios (SC-01, SC-02, SC-03)"
}

docker compose @profiles build
if ($LASTEXITCODE -ne 0) { Write-Fail "Build failed. See the error above."; exit 1 }
Write-Ok "Images built"

Write-Step "Starting the stack"
docker compose @profiles up -d
if ($LASTEXITCODE -ne 0) { Write-Fail "Startup failed. See the error above."; exit 1 }
Write-Ok "Containers started"

# ---------------------------------------------------------------------------
# 6. Wait for health
# ---------------------------------------------------------------------------
Write-Step "Waiting for the app to become healthy (up to ~2 minutes)"
$healthy = $false
for ($i = 0; $i -lt 40; $i++) {
    try {
        $r = Invoke-RestMethod -Uri "http://localhost/health" -TimeoutSec 3 -ErrorAction Stop
        if ($r.status -eq "ok") { $healthy = $true; break }
    } catch {
        # not up yet
    }
    Start-Sleep -Seconds 3
    Write-Host "    ...still starting ($([int](($i+1)*3))s)" -ForegroundColor DarkGray
}

Write-Host ""
if ($healthy) {
    Write-Host "===========================================================" -ForegroundColor Green
    Write-Host "  Parallax is UP" -ForegroundColor Green
    Write-Host "===========================================================" -ForegroundColor Green
    Write-Host "  Web app .......... http://localhost"            -ForegroundColor White
    Write-Host "  API docs ......... http://localhost/api/docs"   -ForegroundColor White
    Write-Host "  Backend direct ... http://localhost:8001"       -ForegroundColor White
    Write-Host ""
    Write-Host "  Instructor login . admin / ParallaxAdmin!"      -ForegroundColor White
    Write-Host "  Students ......... self-register at /auth"      -ForegroundColor White
    Write-Host ""
    Write-Host "  Stop:    docker compose --profile sc01 --profile sc02 --profile sc03 down" -ForegroundColor DarkGray
    Write-Host "  Status:  docker compose ps" -ForegroundColor DarkGray
    if ($SkipKali) {
        Write-Warn "Terminal is in MOCK mode. Build the real Kali shell with:"
        Write-Host "    docker build -t parallax-kali:latest infrastructure\docker\kali" -ForegroundColor Yellow
    }
} else {
    Write-Fail "App did not report healthy in time."
    Write-Host "    Check logs:  docker compose logs backend --tail=120" -ForegroundColor Yellow
    Write-Host "    Check state: docker compose ps" -ForegroundColor Yellow
    Write-Host "    Elasticsearch needs >= 2 GB RAM - raise Docker Desktop memory if it is unhealthy." -ForegroundColor Yellow
    exit 1
}

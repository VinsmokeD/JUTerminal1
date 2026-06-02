# Generates a self-signed TLS certificate for the opt-in HTTPS overlay.
# Output: infrastructure/nginx/certs/parallax.{crt,key}
#
# Usage:  scripts/generate-tls-cert.ps1
# Then:   docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d nginx
#
# These certs are self-signed (a lab/demo, not a public CA), so browsers will
# show a one-time "not trusted" warning — that is expected and not a defect.

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$certDir  = Join-Path $repoRoot "infrastructure/nginx/certs"
$crt      = Join-Path $certDir "parallax.crt"
$key      = Join-Path $certDir "parallax.key"

New-Item -ItemType Directory -Force -Path $certDir | Out-Null

$openssl = (Get-Command openssl -ErrorAction SilentlyContinue)
if ($null -eq $openssl) {
    Write-Error "openssl not found on PATH. It ships with Git for Windows (e.g. C:\Program Files\Git\usr\bin). Install Git or add openssl to PATH, then re-run."
    exit 1
}

& openssl req -x509 -nodes -newkey rsa:2048 `
    -keyout $key -out $crt -days 365 `
    -subj "/C=JO/O=Parallax/CN=parallax.local" `
    -addext "subjectAltName=DNS:parallax.local,DNS:localhost,IP:127.0.0.1"

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Self-signed cert written to:" -ForegroundColor Green
    Write-Host "       $crt"
    Write-Host "       $key"
    Write-Host "Next:  docker compose -f docker-compose.yml -f docker-compose.tls.yml up -d nginx"
} else {
    Write-Error "openssl failed (exit $LASTEXITCODE)."
    exit $LASTEXITCODE
}

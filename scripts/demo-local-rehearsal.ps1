param(
    [switch]$Build,
    [switch]$SkipScenarios,
    [int]$HealthTimeoutSeconds = 180
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

$Compose = @("compose", "-f", "docker-compose.yml")
$Profiles = @()
if (-not $SkipScenarios) {
    $Profiles = @("--profile", "sc01", "--profile", "sc02", "--profile", "sc03")
}

function Invoke-Docker {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
    & docker @Args
    if ($LASTEXITCODE -ne 0) {
        throw "docker $($Args -join ' ') failed with exit code $LASTEXITCODE"
    }
}

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example. Edit GEMINI_API_KEY/JWT_SECRET before a real rehearsal." -ForegroundColor Yellow
}

Write-Host "Validating Compose config..." -ForegroundColor Cyan
Invoke-Docker @Compose @Profiles "config" "--quiet"

$UpArgs = @()
$UpArgs += $Compose
$UpArgs += $Profiles
$UpArgs += "up", "-d"
if ($Build) {
    $UpArgs += "--build"
}

Write-Host "Starting local rehearsal stack..." -ForegroundColor Cyan
Invoke-Docker @UpArgs

Write-Host "Waiting for http://localhost/health..." -ForegroundColor Cyan
$Deadline = (Get-Date).AddSeconds($HealthTimeoutSeconds)
do {
    try {
        $Health = Invoke-RestMethod -Uri "http://localhost/health" -TimeoutSec 5
        if ($Health.status -eq "ok") {
            Write-Host "Health OK: $($Health | ConvertTo-Json -Compress)" -ForegroundColor Green
            break
        }
    } catch {
        Start-Sleep -Seconds 5
    }
} while ((Get-Date) -lt $Deadline)

if ((Get-Date) -ge $Deadline) {
    Write-Host "Health check timed out. Recent backend/nginx logs:" -ForegroundColor Red
    & docker @Compose "logs" "--tail" "80" "backend" "nginx"
    exit 1
}

$Scenarios = Invoke-RestMethod -Uri "http://localhost/api/scenarios" -TimeoutSec 10
$ScenarioIds = @($Scenarios | ForEach-Object { $_.id })
if (@("SC-01", "SC-02", "SC-03") | Where-Object { $_ -notin $ScenarioIds }) {
    Write-Host "Scenario catalog is missing one of SC-01/SC-02/SC-03." -ForegroundColor Red
    exit 1
}

Write-Host "Scenario catalog OK: $($ScenarioIds -join ', ')" -ForegroundColor Green
Write-Host "Compose status:" -ForegroundColor Cyan
& docker @Compose @Profiles "ps"

Write-Host "Resource snapshot:" -ForegroundColor Cyan
& docker "stats" "--no-stream"

Write-Host ""
Write-Host "Open http://localhost and run one manual browser xterm check." -ForegroundColor Green

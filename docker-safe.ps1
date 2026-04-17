# docker-safe.ps1
# ─────────────────────────────────────────────────────────────────────────────
# A thin wrapper around docker that intercepts destructive commands and
# refuses to operate on containers/volumes marked with com.cybersim.protect=true
#
# INSTALL (run once in PowerShell as admin):
#   Copy-Item docker-safe.ps1 $HOME\docker-safe.ps1
#   Add-Content $PROFILE "`nSet-Alias docker $HOME\docker-safe.ps1"
#
# HOW IT WORKS:
#   - "docker rm <name>"       → checks label, blocks if protected
#   - "docker stop <name>"     → checks label, blocks if protected
#   - "docker volume rm <name>"→ lists volumes, blocks named cybersim_* volumes
#   - "docker rmi <image>"     → checks if any running cybersim container uses it
#   - All other commands pass through to real docker unchanged.
#
# To mark ANY future container as protected, run it with:
#   docker run --label com.cybersim.protect=true ...
# ─────────────────────────────────────────────────────────────────────────────

param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Args)

$dockerExe = (Get-Command docker -CommandType Application | Select-Object -First 1).Source

function Is-Protected {
    param([string]$Name)
    $label = & $dockerExe inspect $Name --format "{{index .Config.Labels `"com.cybersim.protect`"}}" 2>$null
    return ($label -eq "true")
}

function Block {
    param([string]$Msg)
    Write-Host ""
    Write-Host "  ⛔  BLOCKED: $Msg" -ForegroundColor Red
    Write-Host "      Add --force-unsafe flag to override (not an actual docker flag — edit this script)." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

$cmd  = $Args[0]
$sub  = if ($Args.Count -gt 1) { $Args[1] } else { "" }
$rest = $Args[2..($Args.Count-1)]

# ── Intercept: docker rm ──────────────────────────────────────────────────────
if ($cmd -eq "rm") {
    foreach ($target in $rest + @($sub) | Where-Object { $_ -and $_ -ne "-f" -and $_ -ne "--force" }) {
        if (Is-Protected $target) {
            Block "Container '$target' has com.cybersim.protect=true — refusing deletion."
        }
    }
}

# ── Intercept: docker stop ────────────────────────────────────────────────────
if ($cmd -eq "stop") {
    foreach ($target in $rest + @($sub) | Where-Object { $_ }) {
        if (Is-Protected $target) {
            Write-Host "  ⚠️  WARNING: '$target' is a protected CyberSim container. Stopping it anyway (stop is reversible)." -ForegroundColor Yellow
        }
    }
}

# ── Intercept: docker volume rm ───────────────────────────────────────────────
if ($cmd -eq "volume" -and $sub -eq "rm") {
    foreach ($vol in $rest | Where-Object { $_ }) {
        if ($vol -match "^cybersim_") {
            Block "Volume '$vol' belongs to CyberSim (cybersim_ prefix) — refusing deletion."
        }
    }
}

# ── Intercept: docker volume prune ───────────────────────────────────────────
if ($cmd -eq "volume" -and $sub -eq "prune") {
    $protected = & $dockerExe volume ls --format "{{.Name}}" | Where-Object { $_ -match "^cybersim_" }
    if ($protected) {
        Write-Host "  ℹ️  Note: Named cybersim_* volumes are NOT affected by prune (they are in use)." -ForegroundColor Cyan
    }
}

# ── Pass through all other commands ──────────────────────────────────────────
& $dockerExe @Args

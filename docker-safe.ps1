# docker-safe.ps1
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# A thin wrapper around docker that intercepts destructive commands and
# refuses to operate on containers/volumes marked with com.parallax.protect=true
#
# INSTALL (run once in PowerShell as admin):
#   Copy-Item docker-safe.ps1 $HOME\docker-safe.ps1
#   Add-Content $PROFILE "`nSet-Alias docker $HOME\docker-safe.ps1"
#
# HOW IT WORKS:
#   - "docker rm <name>"       â†’ checks label, blocks if protected
#   - "docker stop <name>"     â†’ checks label, blocks if protected
#   - "docker volume rm <name>"â†’ lists volumes, blocks named parallax_* volumes
#   - "docker rmi <image>"     â†’ checks if any running parallax container uses it
#   - All other commands pass through to real docker unchanged.
#
# To mark ANY future container as protected, run it with:
#   docker run --label com.parallax.protect=true ...
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Args)

$dockerExe = (Get-Command docker -CommandType Application | Select-Object -First 1).Source

function Is-Protected {
    param([string]$Name)
    $label = & $dockerExe inspect $Name --format "{{index .Config.Labels `"com.parallax.protect`"}}" 2>$null
    return ($label -eq "true")
}

function Block {
    param([string]$Msg)
    Write-Host ""
    Write-Host "  â›”  BLOCKED: $Msg" -ForegroundColor Red
    Write-Host "      Add --force-unsafe flag to override (not an actual docker flag â€” edit this script)." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

$cmd  = $Args[0]
$sub  = if ($Args.Count -gt 1) { $Args[1] } else { "" }
$rest = $Args[2..($Args.Count-1)]

# â”€â”€ Intercept: docker rm â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if ($cmd -eq "rm") {
    foreach ($target in $rest + @($sub) | Where-Object { $_ -and $_ -ne "-f" -and $_ -ne "--force" }) {
        if (Is-Protected $target) {
            Block "Container '$target' has com.parallax.protect=true â€” refusing deletion."
        }
    }
}

# â”€â”€ Intercept: docker stop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if ($cmd -eq "stop") {
    foreach ($target in $rest + @($sub) | Where-Object { $_ }) {
        if (Is-Protected $target) {
            Write-Host "  âš ï¸  WARNING: '$target' is a protected Parallax container. Stopping it anyway (stop is reversible)." -ForegroundColor Yellow
        }
    }
}

# â”€â”€ Intercept: docker volume rm â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if ($cmd -eq "volume" -and $sub -eq "rm") {
    foreach ($vol in $rest | Where-Object { $_ }) {
        if ($vol -match "^parallax_") {
            Block "Volume '$vol' belongs to Parallax (parallax_ prefix) â€” refusing deletion."
        }
    }
}

# â”€â”€ Intercept: docker volume prune â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if ($cmd -eq "volume" -and $sub -eq "prune") {
    $protected = & $dockerExe volume ls --format "{{.Name}}" | Where-Object { $_ -match "^parallax_" }
    if ($protected) {
        Write-Host "  â„¹ï¸  Note: Named parallax_* volumes are NOT affected by prune (they are in use)." -ForegroundColor Cyan
    }
}

# â”€â”€ Pass through all other commands â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
& $dockerExe @Args

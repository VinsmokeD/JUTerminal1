$ProbeHost = "1.1.1.1"
$ProbePort = 443
$Fail = 0
$Checked = 0

Write-Host "== Parallax scenario network isolation check (PowerShell) ==" -ForegroundColor Cyan

$Containers = docker ps --format '{{.Names}}' | Where-Object { $_ -match 'parallax[-_]sc0[1-3]' }

if ($Containers.Count -eq 0) {
    Write-Host "WARN: no scenario containers running." -ForegroundColor Yellow
    exit 0
}

foreach ($c in $Containers) {
    $Checked++
    
    # Try multiple probes to test egress connectivity
    $reachable = $false
    
    # Probe 1: /dev/tcp
    $res1 = docker exec $c sh -c "timeout 2 bash -c 'exec 3<>/dev/tcp/${ProbeHost}/${ProbePort} && echo REACHABLE' 2>/dev/null" 2>&1
    if ($res1 -match "REACHABLE") {
        $reachable = $true
    }
    
    # Probe 2: curl
    if (-not $reachable) {
        $res2 = docker exec $c curl -I -s --connect-timeout 2 "https://${ProbeHost}" 2>&1
        # If curl succeeded (exit code 0) and didn't print connection failure warnings
        if ($LASTEXITCODE -eq 0 -and $res2 -and $res2 -notmatch "Could not connect" -and $res2 -notmatch "Failed to connect" -and $res2 -notmatch "failed to connect") {
            $reachable = $true
        }
    }
    
    if ($reachable) {
        Write-Host "  [BREACH] $c CAN reach ${ProbeHost}:${ProbePort} - isolation FAILED" -ForegroundColor Red
        $Fail = 1
    } else {
        Write-Host "  [ok]     $c blocked from ${ProbeHost}:${ProbePort}" -ForegroundColor Green
    }
}

Write-Host "Checked $Checked scenario container(s)."
if ($Fail -ne 0) {
    Write-Host "RESULT: ISOLATION BREACH DETECTED!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "RESULT: all scenario containers are internet-isolated." -ForegroundColor Green
    exit 0
}

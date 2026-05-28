param(
    [string]$Only = "",
    [switch]$SkipSvg = $false,
    [int]$Width = 2400,
    [int]$Height = 1600,
    [decimal]$Scale = 2.5
)
$ErrorActionPreference = "Continue"

$ROOT   = Split-Path $PSScriptRoot -Parent
$SRC    = Join-Path $ROOT "docs\final-report\diagrams\source"
$PNG    = Join-Path $ROOT "docs\final-report\diagrams\export\png"
$SVG    = Join-Path $ROOT "docs\final-report\diagrams\export\svg"
$THEME  = Join-Path $ROOT "docs\final-report\diagrams\mermaid-theme.json"
$LOG    = Join-Path $ROOT "docs\final-report\diagrams\render.log"

New-Item -ItemType Directory -Force -Path $PNG | Out-Null
New-Item -ItemType Directory -Force -Path $SVG | Out-Null

$ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host ""
Write-Host "============================================================"
Write-Host " CyberSim Diagram Renderer -- $ts"
Write-Host "============================================================"
Write-Host ""

$npmGlobal = (npm root -g 2>$null).Trim()
$mmdcCmd = Join-Path (Split-Path $npmGlobal -Parent) "mmdc.cmd"
if (-not (Test-Path $mmdcCmd)) {
    $mmdcCmd = (Get-Command mmdc -ErrorAction SilentlyContinue).Source
}
if (-not $mmdcCmd) {
    Write-Host "[ERROR] mmdc not found. Run: npm install -g @mermaid-js/mermaid-cli"
    exit 1
}
Write-Host "[INFO] mmdc: $mmdcCmd"
Write-Host "[INFO] Source dir: $SRC"
Write-Host "[INFO] Theme: $THEME"
Write-Host ""

$files = Get-ChildItem -Path $SRC -Filter "*.mmd" | Sort-Object Name
if ($Only) { $files = $files | Where-Object { $_.BaseName -like "*$Only*" } }
Write-Host "[INFO] Found $($files.Count) diagram(s)"
Write-Host ""

$ok = 0
$fail = 0
$logLines = @()

foreach ($f in $files) {
    $bname   = $f.BaseName
    $src_p   = $f.FullName
    $png_p   = Join-Path $PNG ($bname + ".png")
    $svg_p   = Join-Path $SVG ($bname + ".svg")

    Write-Host "  [>>] $bname" -NoNewline

    $pngArgs = "-i `"$src_p`" -o `"$png_p`" -t default -c `"$THEME`" -w $Width -H $Height --scale $Scale -b white --quiet"
    $pngResult = cmd /c "`"$mmdcCmd`" $pngArgs 2>&1"
    if ((Test-Path $png_p)) {
        $sizeKB = [math]::Round((Get-Item $png_p).Length / 1KB, 1)
        Write-Host "  PNG:${sizeKB}KB" -NoNewline
        $logLines += "[OK]  $bname.png  (${sizeKB}KB)"
        $ok++
    } else {
        Write-Host "  PNG:FAIL" -NoNewline
        $logLines += "[FAIL] $bname.png  -- $pngResult"
        $fail++
    }

    if (-not $SkipSvg) {
        $svgArgs = "-i `"$src_p`" -o `"$svg_p`" -t default -c `"$THEME`" -b white --quiet"
        $svgResult = cmd /c "`"$mmdcCmd`" $svgArgs 2>&1"
        if ((Test-Path $svg_p)) {
            $sizeKB2 = [math]::Round((Get-Item $svg_p).Length / 1KB, 1)
            Write-Host "  SVG:${sizeKB2}KB"
            $logLines += "[OK]  $bname.svg  (${sizeKB2}KB)"
        } else {
            Write-Host "  SVG:FAIL"
            $logLines += "[FAIL] $bname.svg  -- $svgResult"
        }
    } else {
        Write-Host ""
    }
}

Write-Host ""
Write-Host "============================================================"
Write-Host " SUMMARY: $ok PNG rendered, $fail failed"
Write-Host "============================================================"
Write-Host "  PNG dir: $PNG"
Write-Host "  SVG dir: $SVG"
Write-Host ""

$logLines | Out-File -FilePath $LOG -Encoding utf8
Write-Host "[LOG] $LOG"

if ($fail -gt 0) { exit 1 } else { exit 0 }

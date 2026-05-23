Add-Type -AssemblyName System.Drawing
$pngDir = "docs/final-report/diagrams/export/png"
$files = Get-ChildItem -Path $pngDir -Filter "*.png"
foreach ($file in $files) {
    $img = [System.Drawing.Image]::FromFile($file.FullName)
    Write-Host "| `$($file.Name)` | $($img.Width) | $($img.Height) |"
    $img.Dispose()
}

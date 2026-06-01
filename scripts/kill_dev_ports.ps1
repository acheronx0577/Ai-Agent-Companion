# Free local dev ports (Flask 5000, Convex 3210) so npm run dev can bind them.
$ErrorActionPreference = "SilentlyContinue"
$ports = @(5000, 3210)

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if (-not $connections) {
        Write-Host "Port ${port}: free"
        continue
    }
    $procIds = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)
    foreach ($procId in $procIds) {
        if ($procId -le 0) { continue }
        try {
            $proc = Get-Process -Id $procId -ErrorAction Stop
            Write-Host "Stopping PID $procId ($($proc.ProcessName)) on port ${port}"
            Stop-Process -Id $procId -Force -ErrorAction Stop
        } catch {
            Write-Host "Could not stop PID $procId on port ${port}"
        }
    }
}

Write-Host "Done. Run: npm run dev"

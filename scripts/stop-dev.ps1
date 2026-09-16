# RakshaSafe — stop development servers (Windows PowerShell)
# Stops known RakshaSafe dev processes: uvicorn (AI), tsx/node (backend), vite (frontend).

$patterns = @(
    "uvicorn",
    "vite",
    "tsx watch",
    "rakshasafe"
)

Get-CimInstance Win32_Process | Where-Object {
    $cmd = $_.CommandLine
    if (-not $cmd) { return $false }
    foreach ($p in $patterns) {
        if ($cmd -like "*$p*") { return $true }
    }
    return $false
} | ForEach-Object {
    Write-Host ("[stop] Terminating PID {0} ({1})" -f $_.ProcessId, $_.Name)
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}

Write-Host "Done."
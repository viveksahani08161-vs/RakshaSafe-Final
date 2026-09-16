# RakshaSafe — all-in-one development launcher (Windows PowerShell)
# Starts the AI service, backend, and frontend concurrently.
# Usage: .\scripts\start-dev.ps1   (from the repository root)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

# 1. AI service (FastAPI)
$aiCmd = Join-Path $root "ai-service\venv\Scripts\uvicorn.exe"
if (Test-Path $aiCmd) {
    Start-Process -FilePath $aiCmd -ArgumentList @("app.main:app", "--host", "0.0.0.0", "--port", "8000") -WorkingDirectory (Join-Path $root "ai-service") -WindowStyle Minimized
} else {
    Write-Host "[start] AI venv not found. Run: cd ai-service; python -m venv venv; pip install -r requirements.txt" -ForegroundColor Yellow
}

# 2. Backend (Express)  — 3. Frontend (Vite)
Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", "npm run dev") -WorkingDirectory (Join-Path $root "backend") -WindowStyle Minimized
Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", "npm run dev") -WorkingDirectory (Join-Path $root "frontend") -WindowStyle Minimized

Write-Host ""
Write-Host "RakshaSafe development servers launching:" -ForegroundColor Green
Write-Host "  AI service   http://localhost:8000  (docs: /docs)" -ForegroundColor Green
Write-Host "  Backend      http://localhost:5000  (health: /api/health)" -ForegroundColor Green
Write-Host "  Frontend     http://localhost:5173" -ForegroundColor Green
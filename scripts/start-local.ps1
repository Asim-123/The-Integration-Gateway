$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "=== Starting Integration Gateway locally ===" -ForegroundColor Cyan

# Ensure Memurai/Redis service is running
$memurai = Get-Service -Name "Memurai" -ErrorAction SilentlyContinue
if ($memurai -and $memurai.Status -ne "Running") {
  Write-Host "Starting Memurai (Redis)..."
  Start-Service Memurai
}

$backendCmd = "cd `"$Root\backend`"; npm run start:dev"
$frontendCmd = "cd `"$Root\frontend`"; npm run dev"

Write-Host "Backend  -> http://localhost:3000" -ForegroundColor Green
Write-Host "Frontend -> http://localhost:5173" -ForegroundColor Green
Write-Host "API Key  -> igw_demo_local_dev_key_12345" -ForegroundColor Green
Write-Host ""
Write-Host "Opening two terminals..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host "Done. Check the new terminal windows for logs." -ForegroundColor Cyan

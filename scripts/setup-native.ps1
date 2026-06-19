$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "=== Integration Gateway: native setup (no Docker) ===" -ForegroundColor Cyan

function Ensure-WingetPackage($id, $name) {
  $installed = winget list --id $id 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing $name..."
    winget install $id --accept-package-agreements --accept-source-agreements --silent
  } else {
    Write-Host "$name already installed."
  }
}

Ensure-WingetPackage "Memurai.MemuraiDeveloper" "Memurai Developer (Redis)"
Ensure-WingetPackage "PostgreSQL.PostgreSQL.16" "PostgreSQL 16"

Write-Host ""
Write-Host "If PostgreSQL was just installed, set a superuser password during setup." -ForegroundColor Yellow
Write-Host "Then update backend/.env DATABASE_URL, for example:" -ForegroundColor Yellow
Write-Host "  DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/integration_gateway" -ForegroundColor Gray
Write-Host ""
Write-Host "Create the database (adjust user/password if needed):" -ForegroundColor Cyan
Write-Host '  psql -U postgres -c "CREATE DATABASE integration_gateway;"' -ForegroundColor Gray
Write-Host ""
Write-Host "Start services:" -ForegroundColor Cyan
Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/start-local.ps1" -ForegroundColor Gray

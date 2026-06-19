param(
  [Parameter(Mandatory = $true)]
  [string]$PostgresPassword
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe"

if (-not (Test-Path $Psql)) {
  Write-Error "PostgreSQL not found at $Psql"
}

Write-Host "Creating database and gateway user..." -ForegroundColor Cyan
$env:PGPASSWORD = $PostgresPassword
& $Psql -U postgres -f "$Root\scripts\init-postgres.sql"
if ($LASTEXITCODE -ne 0) {
  Write-Error "Database setup failed. Check your postgres password."
}

Write-Host "Starting backend + frontend..." -ForegroundColor Cyan
Set-Location $Root
npm run dev

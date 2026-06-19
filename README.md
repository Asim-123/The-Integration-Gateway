# Integration Gateway — run 100% locally (no Docker, no Redis, no cloud)

## Requirements
- Node.js 20+
- PostgreSQL 17 (already installed on this machine)

## One-time database setup

Run once in PowerShell (replace `YOUR_POSTGRES_PASSWORD`):

```powershell
$env:PGPASSWORD = "YOUR_POSTGRES_PASSWORD"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -f scripts/init-postgres.sql
```

Or use the helper script:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-local.ps1 -PostgresPassword "YOUR_POSTGRES_PASSWORD"
```

## Run the project

```powershell
npm install
npm run dev
```

| Service | URL |
|---------|-----|
| Developer Console | http://localhost:5173 |
| API | http://localhost:3000 |
| API key | `igw_demo_local_dev_key_12345` |

`LOCAL_QUEUE=true` in `backend/.env` runs the job pipeline in-process — no Redis needed.

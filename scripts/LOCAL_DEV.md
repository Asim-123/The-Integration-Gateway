# Run without Docker (no virtualization required)
#
# Option A - Native Windows services (this script)
#   powershell -ExecutionPolicy Bypass -File scripts/setup-native.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/start-local.ps1
#
# Option B - Free cloud DB/queue (no local install)
#   1. Create Postgres at https://neon.tech  -> paste DATABASE_URL into backend/.env
#   2. Create Redis at https://upstash.com   -> paste REDIS_URL into backend/.env
#   3. Run: powershell -ExecutionPolicy Bypass -File scripts/start-local.ps1

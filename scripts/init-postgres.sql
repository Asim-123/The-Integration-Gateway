-- Run once with your postgres superuser:
--   $env:PGPASSWORD = "YOUR_POSTGRES_PASSWORD"
--   psql -U postgres -f scripts/init-postgres.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'gateway') THEN
    CREATE USER gateway WITH PASSWORD 'gateway';
  END IF;
END
$$;

SELECT 'CREATE DATABASE integration_gateway OWNER gateway'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'integration_gateway')\gexec

GRANT ALL PRIVILEGES ON DATABASE integration_gateway TO gateway;

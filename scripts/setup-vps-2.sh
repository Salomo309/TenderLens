#!/usr/bin/env bash
set -euo pipefail

echo "=== PostgreSQL Setup ==="
systemctl enable postgresql
systemctl start postgresql

su - postgres -c "psql -c \"CREATE DATABASE sinyaltender_staging;\"" 2>/dev/null || true
su - postgres -c "psql -c \"CREATE USER sinyaltender WITH ENCRYPTED PASSWORD 'Staging2024!';\"" 2>/dev/null || true
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE sinyaltender_staging TO sinyaltender;\"" 2>/dev/null || true
su - postgres -c "psql -d sinyaltender_staging -c \"GRANT ALL ON SCHEMA public TO sinyaltender;\"" 2>/dev/null || true

echo "=== PostgreSQL done ==="
node -v
pnpm -v
pm2 -v

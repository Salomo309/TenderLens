#!/usr/bin/env bash
set -euo pipefail

echo "=== PostgreSQL Setup ==="
systemctl enable postgresql
systemctl start postgresql

su - postgres -c "psql -c \"CREATE DATABASE tenderlens_staging;\"" 2>/dev/null || true
su - postgres -c "psql -c \"CREATE USER tenderlens WITH ENCRYPTED PASSWORD 'Staging2024!';\"" 2>/dev/null || true
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE tenderlens_staging TO tenderlens;\"" 2>/dev/null || true
su - postgres -c "psql -d tenderlens_staging -c \"GRANT ALL ON SCHEMA public TO tenderlens;\"" 2>/dev/null || true

echo "=== PostgreSQL done ==="
node -v
pnpm -v
pm2 -v

#!/usr/bin/env bash
set -euo pipefail

echo "=== 1. System Update ==="
apt update -qq
apt upgrade -y -qq
apt install -y -qq curl gnupg ca-certificates git build-essential nginx

echo "=== 2. Install Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y -qq nodejs
corepack enable
npm install -g pnpm pm2

echo "=== 3. Install PostgreSQL ==="
apt install -y -qq postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

echo "=== 4. Create Database ==="
su - postgres -c "psql -c \"CREATE DATABASE sinyaltender_staging;\""
su - postgres -c "psql -c \"CREATE USER sinyaltender WITH ENCRYPTED PASSWORD 'Staging2024!';\""
su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE sinyaltender_staging TO sinyaltender;\""
su - postgres -c "psql -d sinyaltender_staging -c \"GRANT ALL ON SCHEMA public TO sinyaltender;\""

echo "=== Versions ==="
node -v
pnpm -v
pm2 -v
echo "=== VPS Setup Complete ==="

#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# SinyalTender Staging Deployment Script (Debian)
# Jalankan sebagai root atau user dengan sudo.
# ============================================================

APP_DIR="/opt/sinyaltender"
APP_USER="sinyaltender"
NODE_VERSION="20"

echo "=== 1. System Update & Dependencies ==="
apt update && apt upgrade -y
apt install -y curl gnupg ca-certificates git build-essential nginx

echo "=== 2. Install Node.js $NODE_VERSION ==="
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt install -y nodejs
corepack enable
npm install -g pnpm pm2

echo "=== 3. Install PostgreSQL ==="
apt install -y postgresql postgresql-contrib
systemctl enable --now postgresql

# Create database & user
sudo -u postgres psql <<SQL
CREATE DATABASE sinyaltender_staging;
CREATE USER sinyaltender WITH ENCRYPTED PASSWORD 'CHANGE_ME_PLEASE';
GRANT ALL PRIVILEGES ON DATABASE sinyaltender_staging TO sinyaltender;
ALTER DATABASE sinyaltender_staging OWNER TO sinyaltender;
\c sinyaltender_staging
GRANT ALL ON SCHEMA public TO sinyaltender;
SQL

echo "=== 4. Clone Repository ==="
mkdir -p "$APP_DIR"
cd "$APP_DIR"
if [ -d ".git" ]; then
  git pull origin main
else
  git clone <YOUR_REPO_URL> .
fi

echo "=== 5. Create Environment File ==="
cat > apps/backend/.env <<ENVEOF
DATABASE_URL=postgresql://sinyaltender:CHANGE_ME_PLEASE@localhost:5432/sinyaltender_staging
JWT_SECRET=$(openssl rand -hex 32)

MIDTRANS_MERCHANT_ID=
MIDTRANS_CLIENT_KEY=
MIDTRANS_SERVER_KEY=
MIDTRANS_IS_PRODUCTION=false

GEMINI_API_KEY=
TELEGRAM_BOT_TOKEN=
RESEND_API_KEY=

FRONTEND_URL=http://<VPS_IP>:3001

PORT=3000
ENVEOF

cat > apps/frontend/.env <<ENVEOF
NEXT_PUBLIC_API_URL=http://<VPS_IP>:3000/api
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=
ENVEOF

echo "=== 6. Install Dependencies ==="
pnpm install --frozen-lockfile

echo "=== 7. Build Backend ==="
cd apps/backend
npx prisma db push
npm run build
cd "$APP_DIR"

echo "=== 8. Build Frontend ==="
cd apps/frontend
npm run build
cd "$APP_DIR"

echo "=== 9. Start with PM2 ==="
pm2 start apps/backend/dist/main.js --name sinyaltender-backend
pm2 start apps/frontend/node_modules/.bin/next --name sinyaltender-frontend -- start -p 3001
pm2 save
pm2 startup

echo "=== 10. Configure Nginx (Proxy) ==="
cat > /etc/nginx/sites-available/sinyaltender <<NGINX
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/sinyaltender /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo ""
echo "=== DEPLOYMENT COMPLETE ==="
echo "Frontend: http://<VPS_IP>"
echo "Backend:  http://<VPS_IP>/api"
echo ""
echo "⚠️  JANGAN LUPA:"
echo "   1. Edit apps/backend/.env — isi MIDTRANS, GEMINI, TELEGRAM, RESEND key"
echo "   2. Edit apps/frontend/.env — isi NEXT_PUBLIC_MIDTRANS_CLIENT_KEY"
echo "   3. Ganti password PostgreSQL 'CHANGE_ME_PLEASE'"
echo "   4. Ganti <VPS_IP> di .env dengan IP asli VPS"
echo "   5. Setup firewall: ufw allow 22,80,443"

# TenderLens

Multi-tenant procurement intelligence platform for Indonesian government tenders (LPSE).

## Architecture

```
tenderlens-workspace/
├── apps/
│   ├── backend/          # NestJS API (REST + WebSocket)
│   └── frontend/         # Next.js 15 (React 19, Tailwind v4)
├── packages/
│   └── database/         # Prisma schema & client
├── scripts/              # Deployment scripts
└── .github/workflows/    # CI/CD pipelines
```

## Tech Stack

| Layer        | Stack |
|-------------|-------|
| Backend      | NestJS 10, Prisma 5, PostgreSQL, Redis (BullMQ), JWT Auth |
| Frontend     | Next.js 15, React 19, Tailwind CSS v4, TanStack Query |
| AI           | Google Gemini Pro (tender HTML → structured summary) |
| Payments     | Midtrans Snap (BNI, Mandiri, CIMB, GoPay, QRIS) |
| Notifications| Telegram Bot API, Resend (email), Socket.IO (in-app) |
| Auth         | JWT (email/password), Google OAuth 2.0 |

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis 7+ (optional — queue features only; falls back gracefully)
- Midtrans account (sandbox for development)
- Gemini API key (for AI summaries)
- Telegram Bot Token (for notifications)
- Resend API Key (for email notifications)

## Getting Started

### 1. Clone & Install

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `apps/backend/.env` and `apps/frontend/.env.local`:

```bash
cp .env.example apps/backend/.env
cp .env.example apps/frontend/.env.local
```

Minimum required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Random 32+ char secret
- `FRONTEND_URL` — `http://localhost:3001`

### 3. Database Setup

```bash
npm run db:push    # Push schema to PostgreSQL
npm run db:generate  # Generate Prisma client
```

### 4. Run Development

```bash
# Terminal 1: Backend API
npm run dev:backend

# Terminal 2: Frontend
npm run dev:frontend
```

- API: http://localhost:3000/api
- Swagger: http://localhost:3000/api/docs
- Frontend: http://localhost:3001

## API Endpoints

| Prefix | Description |
|--------|-------------|
| `POST /api/auth/register` | Register tenant company |
| `POST /api/auth/login` | Login with email/password |
| `GET /api/auth/google` | Google OAuth login |
| `GET /api/health` | Platform health check |
| `GET /api/tenders` | Search/filter tenders |
| `GET /api/dashboard/stats` | Dashboard statistics |
| `GET /api/alerts` | Keyword alerts CRUD |
| `POST /api/billing/upgrade` | Upgrade subscription with Midtrans |
| `GET /api/competitor` | Competitor win history (Pro+) |
| `GET /api/scraper-monitor/health` | Crawler health & uptime |
| `WS /notifications` | Real-time WebSocket notifications |

## Plan Tiers

| Tier     | Price     | Keywords | AI Summary | Notifications |
|----------|-----------|----------|------------|---------------|
| Free     | Rp 0      | 1        | 2/month    | Dashboard     |
| Starter  | Rp 59k/mo | 3        | 3/month    | Telegram (30m delay) |
| Pro      | Rp 109k/mo| 10       | 20/month   | Real-time + group |
| Enterprise| Rp 300k/mo| ∞       | ∞          | Multi-group + priority |

## License

Private — PT. TenderLens Teknologi Indonesia

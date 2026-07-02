# Commit & Deploy Plan

## Step 1 — Commit semua perubahan
Jalankan di terminal `C:\Projects\TenderLens`:

```powershell
git add .
git commit -m "feat: light theme, logo update, pagu decimal fix"
```

## Step 2 — Deploy ke staging
```powershell
.\scripts\deploy.ps1
```

Script akan:
1. `git archive` → tar.gz
2. SCP ke `72.62.78.190`
3. Extract + backup/restore `.env`
4. `pnpm install`
5. Prisma generate + db push (hardcoded `DATABASE_URL`)
6. Build backend + frontend
7. PM2 restart sinyaltender-backend + sinyaltender-frontend

## Files yang akan ter-commit (14 files)
```
 M apps/backend/src/modules/scraper-monitor/services/scraper.service.ts
 M apps/frontend/src/app/dashboard/layout.tsx
 M apps/frontend/src/app/dashboard/page.tsx
 M apps/frontend/src/app/error.tsx
 M apps/frontend/src/app/globals.css
 M apps/frontend/src/app/loading.tsx
 M apps/frontend/src/app/login/page.tsx
 M apps/frontend/src/app/not-found.tsx
 M apps/frontend/src/app/page.tsx
 M apps/frontend/src/app/register/page.tsx
 M apps/frontend/src/components/ui/button.tsx
 M apps/frontend/src/components/ui/pagination.tsx
 M apps/frontend/src/components/ui/table.tsx
 M packages/database/prisma/schema.prisma
```

## Catatan
- Script deploy butuh **SSH key** atau **password** ke root@72.62.78.190
- Pastikan sudah bisa `ssh root@72.62.78.190` tanpa prompt password

# TenderLens — Test Case Scenarios

## Persiapan
- Backend: `http://localhost:3000`
- Frontend: `http://localhost:3001`
- Akun test: `admin@test.com` / `password123`

---

## 1. AUTH & REGISTRASI

### TC-01: Register akun baru
| Langkah | Hasil |
|---------|-------|
| Buka `/register`, isi company name, admin name, email, password | ✅ 201, dapat `access_token`, redirect ke `/dashboard` |
| Register dengan email sama | ❌ 409 "Email sudah terdaftar" |

### TC-02: Login
| Langkah | Hasil |
|---------|-------|
| Isi email + password benar, klik "Masuk Sekarang" | ✅ 200, dapat `access_token`, redirect ke `/dashboard` |
| Email tidak terdaftar | ❌ 401 "Email atau kata sandi salah" |
| Password salah | ❌ 401 "Email atau kata sandi salah" |
| Email kosong | ❌ Validasi: "Email wajib diisi" |
| Password < 6 karakter | ❌ Validasi: "Kata sandi minimal 6 karakter" |
| Format email invalid | ❌ Validasi: "Format email tidak valid" |
| Centang "Ingat saya" | ✅ Token disimpan, tidak hilang setelah tab ditutup |

### TC-03: Google OAuth
| Langkah | Hasil |
|---------|-------|
| Klik "Masuk dengan Akun Google" | ✅ Redirect ke Google login page |
| Login dengan akun Google | ✅ Redirect ke `/auth/callback?token=...` |
| Token tersimpan di localStorage + cookie | ✅ |
| Redirect ke `/dashboard` | ✅ |
| Google OAuth user pertama (belum ada tenant) | ✅ Tenant + user dibuat otomatis, role SUPERADMIN |

### TC-04: Logout
| Langkah | Hasil |
|---------|-------|
| Klik "Keluar (Logout)" di sidebar | ✅ Token dihapus, redirect ke `/login` |
| Akses `/dashboard` setelah logout | ✅ Redirect ke `/login` |

### TC-05: Middleware (route protection)
| Langkah | Hasil |
|---------|-------|
| Akses `/dashboard` tanpa token | ✅ Redirect ke `/login?redirect=/dashboard` |
| Akses `/login` dengan token masih aktif | ✅ Redirect ke `/dashboard` |
| Akses `/register` dengan token masih aktif | ✅ Redirect ke `/dashboard` |

### TC-06: Profile settings
| Langkah | Hasil |
|---------|-------|
| `/settings`, ubah nama | ✅ Tersimpan |
| Change email: submit new email | ✅ Dapat verification code (mock) |
| Verify email dengan code | ✅ Email berubah |
| Change password: current + new + confirm | ✅ Password berubah |
| Change password: current password salah | ❌ 401 "Password lama tidak sesuai" |

---

## 2. TENDERS

### TC-07: List tenders
| Langkah | Hasil |
|---------|-------|
| Buka `/dashboard/tenders` | ✅ Menampilkan list tenders dari seed data |
| Pagination: klik halaman 2 | ✅ Data berubah, URL berubah `?page=2` |
| Ubah limit per halaman | ✅ Data sesuai limit |

### TC-08: Search & Filter
| Langkah | Hasil |
|---------|-------|
| Search "jalan" | ✅ Hanya tender dengan kata "jalan" |
| Filter kategori "Construction" | ✅ Hanya tender dengan kategori CONSTRUCTION |
| Filter stage "PENGUMUMAN" | ✅ Hanya tender tahap pengumuman |
| Filter min pagu 50jt | ✅ Hanya tender dengan pagu >= 50jt |
| Filter max pagu 100jt | ✅ Hanya tender dengan pagu <= 100jt |
| Kombinasi search + category + stage | ✅ Semua filter bekerja bersamaan |

### TC-09: Tender detail
| Langkah | Hasil |
|---------|-------|
| Klik salah satu tender | ✅ Detail tender muncul (title, agency, pagu, hps, stage, location, dll) |
| Tender tidak ditemukan | ❌ 404 "Tender record with ID ... not found" |

### TC-10: Save/Unsave tender
| Langkah | Hasil |
|---------|-------|
| Klik save pada tender | ✅ Tender tersimpan, icon berubah |
| Buka tab "Saved" | ✅ Tender muncul di daftar saved |
| Klik unsave | ✅ Tender dihapus dari saved |
| Coba save melebihi batas plan (Free Trial max 10) | ❌ 403/error limit exceeded |

### TC-11: AI Summary
| Langkah | Hasil |
|---------|-------|
| Klik "Generate AI Summary" pada tender | ✅ Summary tergenerate (atau mock summary) |
| Coba generate melebihi batas plan | ❌ 403 limit exceeded |

---

## 3. DASHBOARD

### TC-12: Dashboard overview
| Langkah | Hasil |
|---------|-------|
| Buka `/dashboard` | ✅ Menampilkan 4 stat card (Total Tender, Alert, Scraper Uptime, Status) |
| Recent tenders section | ✅ 4 tender terbaru muncul |
| Keyword activity section | ✅ Activity per keyword (jika ada) |
| Platform status | ✅ "OPERATIONAL" atau "DEGRADED" |
| Last sync timestamp | ✅ Tampil di top navbar |
| Real-time WebSocket alert | ✅ Alert muncul tanpa refresh (via Socket.IO) |

---

## 4. ALERTS & NOTIFICATIONS

### TC-13: Buat keyword alert
| Langkah | Hasil |
|---------|-------|
| Buka `/dashboard/alerts` | ✅ List alert (kosong jika belum ada) |
| Klik "Buat Alert" | ✅ Form muncul |
| Isi keyword "pembangunan", centang Telegram + Dashboard | ✅ Alert tersimpan |
| Buat alert tanpa channel | ❌ Validasi error |
| Buat alert dengan keyword yang sama | ✅ Duplicate diperbolehkan |
| Buat alert melebihi batas plan (Free Trial max 1) | ❌ 403 limit exceeded |

### TC-14: Hapus alert
| Langkah | Hasil |
|---------|-------|
| Klik hapus pada alert | ✅ Alert terhapus, list terupdate |

### TC-15: Notifikasi (matching)
| Langkah | Hasil |
|---------|-------|
| Buat alert keyword "pembangunan" | ✅ |
| Seed tender baru (POST `/scraper-monitor/seed`) atau cron 5 menit | ✅ Alert match dengan tender yang cocok |
| Cek `/alerts/logs` | ✅ NotificationLog terisi SENT |
| Cek `/notifications` WebSocket | ✅ Event `alert` terkirim real-time |

### TC-16: Notification channels
| Langkah | Hasil |
|---------|-------|
| `GET /alerts/channels` | ✅ Return ["EMAIL", "TELEGRAM", "WEB_DASHBOARD"] |
| Alert dengan channel TELEGRAM + EMAIL | ✅ Kedua channel terkirim |
| Telegram tidak terkoneksi | ✅ Fallback ke EMAIL (log "Telegram not connected — falling back to EMAIL") |

---

## 5. TELEGRAM INTEGRATION

### TC-17: Bot status
| Langkah | Hasil |
|---------|-------|
| `GET /telegram/bot-status` (with auth) | ✅ `{ botUsername, polling: true, botTokenSet: true }` |
| Tanpa auth | ❌ 401 |

### TC-18: Connect Telegram
| Langkah | Hasil |
|---------|-------|
| Buka `/dashboard/telegram` | ✅ Tampil status koneksi + form Chat ID |
| Chat bot di Telegram, kirim `/start` | ✅ Bot balas dengan Chat ID |
| Copy Chat ID, paste di form, klik "Connect" | ✅ Test message terkirim, status berubah "connected" |
| Connect dengan Chat ID kosong | ❌ "Telegram Chat ID tidak boleh kosong" |

### TC-19: Disconnect Telegram
| Langkah | Hasil |
|---------|-------|
| Klik "Disconnect" | ✅ Chat ID dihapus, status "not connected" |

---

## 6. BILLING & PEMBAYARAN

### TC-20: Subscription overview
| Langkah | Hasil |
|---------|-------|
| Buka `/dashboard/billing` | ✅ Tampil paket saat ini (Free Trial), fitur, invoice history |
| Bandingkan paket section | ✅ 4 plan: Free Trial, Starter, Pro, Enterprise |
| Invoice history (jika ada) | ✅ Tabel invoice |

### TC-21: Upgrade — semua payment method
| Langkah | Hasil |
|---------|-------|
| Klik "Tingkatkan Lisensi" | ✅ Modal upgrade muncul |
| Pilih metode: **BNI** | ✅ Midtrans Snap popup dengan BNI VA |
| Pilih **Mandiri** | ✅ Snap popup dengan Mandiri Bill Payment |
| Pilih **CIMB** | ✅ Snap popup dengan CIMB VA |
| Pilih **GoPay** | ✅ Snap popup GoPay QR |
| Pilih **QRIS** | ✅ Snap popup QRIS |
| Pilih **Semua Metode** | ✅ Snap popup dengan 5 metode |

### TC-22: Bayar + auto-update
| Langkah | Hasil |
|---------|-------|
| Pilih Pro + GoPay, klik Lanjutkan | ✅ Snap popup terbuka |
| Bayar (sandbox: klik Yes / simulator) | ✅ Webhook terpanggil → invoice PAID → subscription ACTIVE |
| Halaman billing auto-refresh | ✅ Status berubah tanpa refresh manual |
| Cek subscription lagi | ✅ Tier jadi PRO, status ACTIVE |

### TC-23: Invoice PENDING handling
| Langkah | Hasil |
|---------|-------|
| Buka upgrade, close popup | ✅ Invoice PENDING, notice amber muncul |
| Buka upgrade lagi | ✅ Invoice PENDING sebelumnya otomatis EXPIRED |
| Cek invoice history | ✅ Invoice lama status EXPIRED |

### TC-24: Webhook signature
| Langkah | Hasil |
|---------|-------|
| Kirim webhook dengan signature valid | ✅ 200, invoice terproses |
| Kirim webhook dengan signature invalid (production) | ❌ 400 "Invalid signature" |
| Sandbox mode (MIDTRANS_IS_PRODUCTION=false) | ✅ Signature bypass, semua webhook diterima |

---

## 7. ADMIN PANEL

### TC-25: Akses admin
| Langkah | Hasil |
|---------|-------|
| Login sebagai SUPERADMIN | ✅ Sidebar ada menu "🛡️ Admin Panel" |
| Login sebagai user biasa | ❌ Sidebar tidak ada menu "🛡️ Admin Panel" |
| User biasa akses `/dashboard/admin` langsung | ❌ Redirect ke `/dashboard` |

### TC-26: Admin features
| Langkah | Hasil |
|---------|-------|
| Tab "Stats" | ✅ Total tenants, users, tenders, dsb |
| Tab "Tenants" | ✅ Daftar semua tenant dengan member count |
| Tab "Users" | ✅ Daftar semua user dengan email & role |

---

## 8. SCRAPER MONITOR

### TC-27: Scraper health
| Langkah | Hasil |
|---------|-------|
| `GET /scraper-monitor/health` | ✅ `{ status: "OPERATIONAL", crawlers: [...] }` |
| Masing-masing crawler punya uptime, totalRuns, successRuns, dll | ✅ |
| Seed data belum pernah dijalankan | ✅ uptime = null, totalRuns = 0 |

### TC-28: Seed data
| Langkah | Hasil |
|---------|-------|
| `POST /scraper-monitor/seed` | ✅ "Seeded 25 sample tenders successfully" |
| Cek `/tenders` | ✅ 25 tender muncul |

### TC-29: Scraper logs
| Langkah | Hasil |
|---------|-------|
| `GET /scraper-monitor/logs?limit=5` | ✅ 5 log terbaru |
| Filter by status | ✅ Hanya log dengan status tertentu |
| Filter by crawler name | ✅ Hanya log dari crawler tertentu |

### TC-30: Trigger scrape
| Langkah | Hasil |
|---------|-------|
| `POST /scraper-monitor/scrape` | ✅ Scrape cycle berjalan (0 tenders karena LPSE unreachable) |

---

## 9. COMPETITOR ANALYSIS

### TC-31: Competitor history
| Langkah | Hasil |
|---------|-------|
| `GET /competitor` (Free Trial) | ❌ 403 "Fitur...hanya untuk paket Pro ke atas" |
| `GET /competitor` (setelah upgrade ke Pro) | ✅ Return competitors by agency |
| `GET /competitor/:agency` (Pro) | ✅ Detail agency: totalWon, totalPagu, categoryBreakdown, tenders |

---

## 10. SYSTEM HEALTH

### TC-32: Health check
| Langkah | Hasil |
|---------|-------|
| `GET /api/health` (tanpa auth) | ✅ `{ status: "ok", database: "healthy", uptime, memory, responseTimeMs }` |
| Database mati | ❌ `database: "unhealthy"` + dbError |

### TC-33: Rate limiting
| Langkah | Hasil |
|---------|-------|
| Kirim >60 request/menit | ❌ 429 Too Many Requests |
| Health endpoint (`/health`) | ✅ Skip throttle |

### TC-34: Swagger docs
| Langkah | Hasil |
|---------|-------|
| Buka `http://localhost:3000/api/docs` | ✅ Swagger UI muncul dengan 10 tags |
| Coba "Try it out" pada salah satu endpoint | ✅ Request terkirim, response tampil |

---

## 11. QUEUE / REDIS

### TC-35: Queue graceful degradation
| Langkah | Hasil |
|---------|-------|
| Redis 3.0 (terinstall) | ✅ App jalan, Bull queues pake `@nestjs/bull` kompatibel Redis 3 |
| REDIS_HOST kosong | ✅ Queue feature disabled, app tetap jalan |

---

## 12. FRONTEND UI/UX

### TC-36: Loading states
| Langkah | Hasil |
|---------|-------|
| Buka `/dashboard` (loading) | ✅ Spinner muncul |
| Buka `/dashboard/tenders` (loading) | ✅ Spinner muncul |
| Setiap page punya loading state | ✅ |

### TC-37: Error states
| Langkah | Hasil |
|---------|-------|
| Matikan backend, buka `/dashboard` | ✅ Error boundary muncul |
| Klik "Coba Lagi" | ✅ Retry fetch |
| 404 page | ✅ Halaman not-found kustom |

### TC-38: Sidebar navigation
| Langkah | Hasil |
|---------|-------|
| Klik setiap menu di sidebar | ✅ Navigasi ke halaman sesuai |
| Menu aktif di-highlight | ✅ Background white |
| Nama tenant + email user muncul | ✅ Di bagian bawah sidebar |

### TC-39: Responsive layout
| Langkah | Hasil |
|---------|-------|
| Resize window ke mobile | ✅ Layout menyesuaikan |

---

## 13. EDGE CASES & SECURITY

### TC-40: Endpoint tanpa auth
| Langkah | Hasil |
|---------|-------|
| `GET /api/tenders` tanpa token | ❌ 401 |
| `POST /api/billing/upgrade` tanpa token | ❌ 401 |
| `GET /api/telegram/bot-info` tanpa token | ❌ 401 |
| Semua endpoint (kecuali /health, /auth) | ❌ 401 |

### TC-41: Invalid token
| Langkah | Hasil |
|---------|-------|
| Kirim token palsu "abc123" | ❌ 401 |
| Kirim token expired | ❌ 401 |

### TC-42: SQL Injection attempt
| Langkah | Hasil |
|---------|-------|
| Search dengan `' OR 1=1 --` | ✅ Tidak crash, hasil normal (Prisma parameterized query) |

### TC-43: XSS attempt
| Langkah | Hasil |
|---------|-------|
| Input `<script>alert(1)</script>` di search | ✅ Escaped, tidak execute |

---

## Cara Test

### Backend (manual via PowerShell)
```powershell
# Health
Invoke-RestMethod -Uri "http://localhost:3000/api/health"

# Login
$token = (Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@test.com","password":"password123"}').access_token
$headers = @{Authorization = "Bearer $token"}

# Tenders
Invoke-RestMethod -Uri "http://localhost:3000/api/tenders?limit=3" -Headers $headers

# Dashboard
Invoke-RestMethod -Uri "http://localhost:3000/api/dashboard/stats" -Headers $headers

# Seed data
Invoke-RestMethod -Uri "http://localhost:3000/api/scraper-monitor/seed" -Method POST -Headers $headers

# Billing upgrade
Invoke-RestMethod -Uri "http://localhost:3000/api/billing/upgrade" -Method POST -ContentType "application/json" -Headers $headers -Body '{"tier":"PRO","paymentMethod":"gopay"}'
```

### Frontend (manual via browser)
- Buka `http://localhost:3001`
- Test login/register
- Test Google OAuth
- Test semua halaman dashboard
- Test payment flow
- Test Telegram connect

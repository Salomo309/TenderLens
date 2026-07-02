'use client';

import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-orange-200 selection:text-orange-900">
      {/* Decorative background blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-orange-200/40 to-orange-300/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-sky-200/40 to-blue-300/10 blur-3xl" />
      </div>

      {/* Header bar */}
      <header className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-border bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src="/logo-title-transparent.png" alt="SinyalTender" className="h-28 w-auto" />
        </div>
        <nav className="flex items-center gap-8">
          <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Fitur
          </Link>
          <Link href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Harga
          </Link>
          <Link href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            FAQ
          </Link>
          <Link href="#contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Kontak
          </Link>
          <Link
            href="/login"
            className="px-5 py-2 text-xs font-semibold rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 transition-colors"
          >
            Masuk Platform
          </Link>
        </nav>
      </header>

      {/* Hero section */}
      <section className="relative max-w-6xl mx-auto px-6 pt-28 pb-20 text-center space-y-8">
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-50" />
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-50 to-sky-50 border border-orange-200/50 text-[11px] font-semibold text-orange-600 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
          B2B Procurement Intelligence Platform
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground leading-tight">
          Menangkan Tender LPSE{' '}
          <span className="bg-gradient-to-r from-orange-500 via-orange-400 to-sky-500 bg-clip-text text-transparent">
            Lebih Cepat dengan AI
          </span>
        </h1>
        <p className="max-w-2xl mx-auto text-muted-foreground text-base md:text-lg leading-relaxed">
          SinyalTender menyaring, meringkas syarat kualifikasi menggunakan Gemini Pro AI, dan mengirimkan alert instan ke Telegram Anda saat ada peluang tender baru.
        </p>
        <div className="flex items-center justify-center gap-4 pt-2">
          <Link
            href="/register"
            className="px-8 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-300 hover:-translate-y-0.5 active:translate-y-0"
          >
            Mulai Uji Coba Gratis
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 text-sm font-semibold rounded-xl bg-white hover:bg-orange-50 border border-border text-foreground transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
          >
            Masuk Dasbor
          </Link>
        </div>
        {/* Trust indicator */}
        <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5 pt-2">
          <span className="flex -space-x-1">
            {['👨‍💼', '👩‍💼', '🧑‍💼', '👨‍💼'].map((e, i) => (
              <span key={i} className="inline-block h-5 w-5 rounded-full bg-muted border border-white text-[10px] leading-5 text-center">{e}</span>
            ))}
          </span>
          Dipercaya oleh 50+ tim pengadaan di Indonesia
        </p>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 space-y-14">
        <div className="text-center space-y-3">
          <span className="inline-block px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-[10px] font-semibold text-sky-600 uppercase tracking-wider">Fitur Unggulan</span>
          <h2 className="text-3xl font-bold text-foreground">Dirancang untuk Tim Tender B2B Modern</h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">Mekanisme pemantauan LPSE tercanggih tanpa ribet.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: '🤖', title: 'Gemini AI Summarization', desc: 'Dapatkan ringkasan spesifikasi teknis, sertifikasi industri wajib, kelayakan modal, dan tanggal krusial tanpa harus membaca ratusan halaman dokumen.', color: 'from-orange-50 to-orange-100/50', iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
            { icon: '⚡', title: 'Alert Instan Realtime', desc: 'Jalankan alarm monitor berbasis keyword. Dapatkan pesan instan secara otomatis ke grup koordinasi tim di Telegram dan kotak masuk email kantor.', color: 'from-sky-50 to-sky-100/50', iconBg: 'bg-sky-100', iconColor: 'text-sky-600' },
            { icon: '📊', title: 'Scraper Diagnostics', desc: 'Uptime tracker yang transparan. Admin kami memantau crawler LPSE nasional setiap menit untuk menjamin tidak ada peluang pengadaan yang terlewat.', color: 'from-orange-50 to-sky-50', iconBg: 'bg-gradient-to-br from-orange-100 to-sky-100', iconColor: 'text-orange-600' },
          ].map((feat, i) => (
            <div
              key={i}
              className="group p-8 rounded-2xl border border-border bg-white hover:shadow-xl hover:shadow-orange-100/20 hover:border-orange-200 transition-all duration-300 hover:-translate-y-1 space-y-5"
            >
              <div className={`inline-flex h-12 w-12 rounded-xl ${feat.iconBg} items-center justify-center text-xl ${feat.iconColor} shadow-sm`}>
                {feat.icon}
              </div>
              <h3 className="text-base font-bold text-foreground">{feat.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing section */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-24 space-y-14">
        <div className="text-center space-y-3">
          <span className="inline-block px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-[10px] font-semibold text-orange-600 uppercase tracking-wider">Harga</span>
          <h2 className="text-3xl font-bold text-foreground">Investasi yang Mempercepat Growth Anda</h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">Pilih paket lisensi terbaik sesuai dengan skala perusahaan Anda.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Free Trial */}
          <div className="p-7 rounded-2xl border border-border bg-white shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest block">Free Trial</span>
              <div className="text-4xl font-extrabold text-foreground">Rp 0</div>
              <p className="text-sm text-muted-foreground">Cocok untuk eksplorasi platform awal.</p>
              <ul className="space-y-2.5 text-sm text-muted-foreground pt-2">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  Pantau hingga 10 tender aktif
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  1 Kata kunci alarm
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  Notifikasi via Dashboard
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  2 AI Ringkasan per bulan
                </li>
              </ul>
            </div>
            <Link href="/register" className="block text-center w-full bg-muted hover:bg-border border border-border py-2.5 rounded-xl text-sm font-semibold text-foreground transition-all">
              Mulai Uji Coba
            </Link>
          </div>

          {/* Starter */}
          <div className="p-7 rounded-2xl border border-border bg-white shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest block">Starter</span>
              <div className="text-4xl font-extrabold text-foreground">Rp 59.000 <span className="text-sm font-normal text-muted-foreground">/ bln</span></div>
              <p className="text-sm text-muted-foreground">Untuk kontraktor perorangan & freelancer.</p>
              <ul className="space-y-2.5 text-sm text-muted-foreground pt-2">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  3 kata kunci dipantau
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  Notifikasi 1 Telegram personal
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  Delay notifikasi 30 menit
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  3 AI Summary dokumen per bulan
                </li>
              </ul>
            </div>
            <Link href="/register" className="block text-center w-full bg-muted hover:bg-border border border-border py-2.5 rounded-xl text-sm font-semibold text-foreground transition-all">
              Mulai Starter
            </Link>
          </div>

          {/* Pro (Best Seller) */}
          <div className="p-7 rounded-2xl border-2 border-orange-400 bg-gradient-to-b from-orange-50 to-white shadow-lg shadow-orange-100 flex flex-col justify-between space-y-5 relative overflow-hidden hover:shadow-xl hover:shadow-orange-200 hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-[9px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-bl-xl shadow-sm">
              Best Seller
            </div>
            <div className="space-y-4">
              <span className="text-[11px] font-semibold text-orange-600 uppercase tracking-widest block">Pro License</span>
              <div className="text-4xl font-extrabold text-foreground">Rp 109.000 <span className="text-sm font-normal text-muted-foreground">/ bln</span></div>
              <p className="text-sm text-muted-foreground">Terlaris untuk software house & vendor menengah.</p>
              <ul className="space-y-2.5 text-sm pt-2">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span className="text-foreground">10 kata kunci pemantau</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span className="text-foreground">Notifikasi real-time ({'<'} 5 menit)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span className="text-foreground">Bisa masuk 1 grup Telegram Tim</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span className="text-foreground">20 AI Summary / bulan</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span className="text-foreground">Dashboard analitik pemenang</span>
                </li>
              </ul>
            </div>
            <Link href="/register" className="block text-center w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-md shadow-orange-200">
              Daftar Pro
            </Link>
          </div>

          {/* Enterprise */}
          <div className="p-7 rounded-2xl border border-border bg-white shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest block">Enterprise</span>
              <div className="text-4xl font-extrabold text-foreground">Rp 300.000 <span className="text-sm font-normal text-muted-foreground">/ bln</span></div>
              <p className="text-sm text-muted-foreground">Untuk kontraktor kakap & perusahaan aktif.</p>
              <ul className="space-y-2.5 text-sm text-muted-foreground pt-2">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  Unlimited kata kunci
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  Multi-grup Telegram
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  Unlimited AI Summary
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  Prioritas server bot paling cepat
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  Histori kompetitor
                </li>
              </ul>
            </div>
            <Link href="/register" className="block text-center w-full bg-muted hover:bg-border border border-border py-2.5 rounded-xl text-sm font-semibold text-foreground transition-all">
              Hubungi Tim
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="max-w-5xl mx-auto px-6 pb-8">
        <div className="grid grid-cols-3 rounded-2xl bg-gradient-to-r from-orange-500 to-sky-500 p-8 shadow-xl shadow-orange-200/30 text-white">
          {[
            { value: '10K+', label: 'Tender Dipantau' },
            { value: '500+', label: 'Pengguna Aktif' },
            { value: '98%', label: 'Uptime Crawler' },
          ].map((stat, i) => (
            <div key={i} className={`text-center ${i < 2 ? 'border-r border-white/20' : ''}`}>
              <div className="text-3xl font-extrabold">{stat.value}</div>
              <div className="text-sm text-white/80 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="max-w-4xl mx-auto px-6 py-24 space-y-14">
        <div className="text-center space-y-3">
          <span className="inline-block px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-[10px] font-semibold text-sky-600 uppercase tracking-wider">FAQ</span>
          <h2 className="text-3xl font-bold text-foreground">Pertanyaan Umum</h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">Informasi yang sering ditanyakan seputar platform SinyalTender.</p>
        </div>

        <div className="space-y-3">
          {[
            { q: 'Apa itu SinyalTender?', a: 'SinyalTender adalah platform kecerdasan pengadaan LPSE yang memonitor, meringkas, dan mengirimkan notifikasi tender terbaru yang sesuai dengan bisnis Anda secara otomatis.' },
            { q: 'Apakah data tender diperbarui secara real-time?', a: 'Ya. Crawler kami berjalan setiap beberapa menit untuk memeriksa portal LPSE nasional dan daerah. Data biasanya muncul dalam 1-5 menit setelah publikasi resmi.' },
            { q: 'Berapa lama uji coba gratisnya?', a: 'Paket Free Trial berlaku selama 30 hari tanpa batasan akses awal. Anda bisa menikmati 10 tender aktif, 1 kata kunci alarm, dan 2 AI Summary per bulan.' },
            { q: 'Apa perbedaan paket Starter, Pro, dan Enterprise?', a: 'Starter (Rp 59rb/bln) untuk perorangan dengan 3 keyword & delay 30 menit. Pro (Rp 109rb/bln) untuk tim kecil dengan 10 keyword real-time & dashboard analitik. Enterprise (Rp 300rb/bln) untuk perusahaan besar dengan unlimited keyword, multi-grup Telegram, prioritas server, dan fitur histori kompetitor.' },
            { q: 'Bisakah saya mengubah paket langganan kapan saja?', a: 'Tentu. Anda dapat meningkatkan atau menurunkan paket kapan saja melalui portal billing. Perubahan akan berlaku di siklus penagihan berikutnya.' },
            { q: 'Apakah data tender aman?', a: 'Kami mengenkripsi seluruh data dalam transit (TLS 1.3) dan saat istirahat (AES-256). Data tenant terisolasi secara ketat dan tidak dibagikan antar pengguna.' },
          ].map((faq, i) => (
            <details key={i} className="group rounded-xl border border-border bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <summary className="flex items-center justify-between cursor-pointer text-sm font-semibold text-foreground marker:hidden">
                {faq.q}
                <span className="text-muted-foreground group-open:rotate-180 transition-transform text-xs">▼</span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-3xl mx-auto px-6 pb-24 text-center space-y-8">
        <div className="rounded-3xl bg-gradient-to-br from-orange-500 via-orange-600 to-sky-600 p-12 shadow-2xl shadow-orange-200/40 text-white space-y-6">
          <h2 className="text-4xl font-extrabold">Siap Memenangkan Tender LPSE?</h2>
          <p className="text-white/80 text-base max-w-lg mx-auto">
            Bergabung dengan tim pengadaan terdepan di Indonesia. Mulai pantau, analisis, dan menangkan tender lebih cepat.
          </p>
          <Link
            href="/register"
            className="inline-block px-10 py-3.5 text-sm font-bold rounded-xl bg-white text-orange-600 hover:bg-orange-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          >
            Mulai Uji Coba Gratis Sekarang
          </Link>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="max-w-4xl mx-auto px-6 py-16 border-t border-border">
        <div className="text-center space-y-5">
          <h2 className="text-2xl font-bold text-foreground">Hubungi Tim Kami</h2>
          <p className="text-sm text-muted-foreground">
            Punya pertanyaan atau butuh bantuan? Tim kami siap membantu Anda.
          </p>
          <div className="flex items-center justify-center gap-8 pt-2 flex-wrap">
            <a href="mailto:hello@sinyaltender.id" className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-orange-600 transition-colors">
              <span className="text-base">✉️</span>
              hello@sinyaltender.id
            </a>
            <a href="#" className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-orange-600 transition-colors">
              <span className="text-base">📞</span>
              +62 21 1234 5678
            </a>
            <a href="#" className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-orange-600 transition-colors">
              <span className="text-base">💬</span>
              Telegram Support
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src="/logo.png" alt="SinyalTender" className="h-8 w-auto opacity-50" />
          </div>
          <p>© 2026 SinyalTender Platform — PT. SinyalTender Teknologi Indonesia. All rights reserved. LPSE Crawler Engine.</p>
        </div>
      </footer>
    </div>
  );
}

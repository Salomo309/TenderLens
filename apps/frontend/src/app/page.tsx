'use client';

import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-maroon-darker selection:text-white">
      {/* Header bar */}
      <header className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src="/sinyal-tender-logo.png" alt="SinyalTender" className="h-8 w-auto" />
        </div>
        <nav className="flex items-center gap-6">
          <Link href="#features" className="text-sm text-muted-foreground hover:text-white transition-colors">
            Fitur
          </Link>
          <Link href="#pricing" className="text-sm text-muted-foreground hover:text-white transition-colors">
            Harga
          </Link>
          <Link href="#faq" className="text-sm text-muted-foreground hover:text-white transition-colors">
            FAQ
          </Link>
          <Link href="#contact" className="text-sm text-muted-foreground hover:text-white transition-colors">
            Kontak
          </Link>
          <Link
            href="/login"
            className="px-4 py-1.5 text-xs font-semibold rounded bg-maroon-darker hover:bg-maroon-dark text-white border border-border transition-colors"
          >
            Masuk Platform
          </Link>
        </nav>
      </header>

      {/* Hero section */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-16 text-center space-y-6">
        <span className="px-3 py-1 rounded-full bg-background border border-border text-[11px] font-semibold text-muted-foreground">
          ✨ B2B Procurement Intelligence Platform
        </span>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Menangkan Tender LPSE <br />
          <span className="bg-gradient-to-r from-maroon via-[#e86578] to-white bg-clip-text text-transparent">
            Lebih Cepat dengan AI
          </span>
        </h1>
        <p className="max-w-2xl mx-auto text-muted-foreground text-sm md:text-base leading-relaxed">
          SinyalTender menyaring, meringkas syarat kualifikasi menggunakan Gemini Pro AI, dan mengirimkan alert instan ke Telegram Anda saat ada peluang tender baru.
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <Link
            href="/register"
            className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-maroon text-white hover:bg-maroon-dark transition-all shadow-md shadow-white/5"
          >
            Mulai Uji Coba Gratis
          </Link>
          <Link
            href="/login"
            className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-background hover:bg-maroon-darker border border-border text-white transition-colors"
          >
            Masuk Dasbor
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20 border-t border-border space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">Dirancang untuk Tim Tender B2B Modern</h2>
          <p className="text-muted-foreground text-xs">Mekanisme pemantauan LPSE tercanggih tanpa ribet.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl border border-border bg-card/50 space-y-3">
            <div className="text-2xl">✨</div>
            <h3 className="text-sm font-bold text-white">Gemini AI Summarization</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Dapatkan ringkasan spesifikasi teknis, sertifikasi industri wajib, kelayakan modal, dan tanggal krusial tanpa harus membaca ratusan halaman dokumen.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card/50 space-y-3">
            <div className="text-2xl">⚡</div>
            <h3 className="text-sm font-bold text-white">Alert Instan Realtime</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Jalankan alarm monitor berbasis keyword. Dapatkan pesan instan secara otomatis ke grup koordinasi tim di Telegram dan kotak masuk email kantor.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-card/50 space-y-3">
            <div className="text-2xl">📊</div>
            <h3 className="text-sm font-bold text-white">Scraper Diagnostics</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Uptime tracker yang transparan. Admin kami memantau crawler LPSE nasional setiap menit untuk menjamin tidak ada peluang pengadaan yang terlewat.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing section */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-20 border-t border-border space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">Investasi yang Mempercepat Growth Anda</h2>
          <p className="text-muted-foreground text-xs">Pilih paket lisensi terbaik sesuai dengan skala perusahaan Anda.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Free Trial */}
          <div className="p-6 rounded-xl border border-border bg-card/50 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest block">Free Trial</span>
              <div className="text-3xl font-extrabold text-white">Rp 0</div>
              <p className="text-xs text-muted-foreground">Cocok untuk eksplorasi platform awal.</p>
              <ul className="space-y-1.5 text-xs text-muted-foreground pt-2">
                <li>✓ Pantau hingga 10 tender aktif</li>
                <li>✓ 1 Kata kunci alarm</li>
                <li>✓ Notifikasi via Dashboard</li>
                <li>✓ 2 AI Ringkasan per bulan</li>
              </ul>
            </div>
            <Link href="/register" className="block text-center w-full bg-maroon-darker hover:bg-maroon-dark border border-border py-2 rounded text-xs font-semibold text-white transition-colors">
              Mulai Uji Coba
            </Link>
          </div>

          {/* Starter */}
          <div className="p-6 rounded-xl border border-border bg-card/50 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest block">Starter</span>
              <div className="text-3xl font-extrabold text-white">Rp 59.000 <span className="text-xs font-normal text-muted-foreground">/ bln</span></div>
              <p className="text-xs text-muted-foreground">Untuk kontraktor perorangan & freelancer.</p>
              <ul className="space-y-1.5 text-xs text-foreground pt-2">
                <li>✓ 3 kata kunci dipantau</li>
                <li>✓ Notifikasi 1 Telegram personal</li>
                <li>✓ Delay notifikasi 30 menit</li>
                <li>✓ 3 AI Summary dokumen per bulan</li>
              </ul>
            </div>
            <Link href="/register" className="block text-center w-full bg-maroon-darker hover:bg-maroon-dark border border-border py-2 rounded text-xs font-semibold text-white transition-colors">
              Mulai Starter
            </Link>
          </div>

          {/* Pro (Best Seller) */}
          <div className="p-6 rounded-xl border border-white/20 bg-[#0e0e11] flex flex-col justify-between space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-maroon text-white text-[8px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-lg">
              Best Seller
            </div>
            <div className="space-y-3">
              <span className="text-[10px] font-semibold text-white uppercase tracking-widest block">Pro License</span>
              <div className="text-3xl font-extrabold text-white">Rp 109.000 <span className="text-xs font-normal text-muted-foreground">/ bln</span></div>
              <p className="text-xs text-muted-foreground">Terlaris untuk software house & vendor menengah.</p>
              <ul className="space-y-1.5 text-xs text-foreground pt-2">
                <li>✓ 10 kata kunci pemantau</li>
                <li>✓ Notifikasi real-time ({'<'} 5 menit)</li>
                <li>✓ Bisa masuk 1 grup Telegram Tim</li>
                <li>✓ 20 AI Summary / bulan</li>
                <li>✓ Dashboard analitik pemenang</li>
              </ul>
            </div>
            <Link href="/register" className="block text-center w-full bg-maroon hover:bg-maroon-dark py-2 rounded text-xs font-semibold text-white transition-all">
              Daftar Pro
            </Link>
          </div>

          {/* Enterprise */}
          <div className="p-6 rounded-xl border border-border bg-card/50 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest block">Enterprise</span>
              <div className="text-3xl font-extrabold text-white">Rp 300.000 <span className="text-xs font-normal text-muted-foreground">/ bln</span></div>
              <p className="text-xs text-muted-foreground">Untuk kontraktor kakap & perusahaan aktif.</p>
              <ul className="space-y-1.5 text-xs text-foreground pt-2">
                <li>✓ Unlimited kata kunci</li>
                <li>✓ Multi-grup Telegram</li>
                <li>✓ Unlimited AI Summary</li>
                <li>✓ Prioritas server bot paling cepat</li>
                <li>✓ Histori kompetitor (PT mana menang apa)</li>
              </ul>
            </div>
            <Link href="/register" className="block text-center w-full bg-maroon-darker hover:bg-maroon-dark border border-border py-2 rounded text-xs font-semibold text-white transition-colors">
              Hubungi Tim
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="max-w-4xl mx-auto px-6 py-20 border-t border-border space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">Pertanyaan Umum</h2>
          <p className="text-muted-foreground text-xs">Informasi yang sering ditanyakan seputar platform SinyalTender.</p>
        </div>

        <div className="space-y-4">
          {[
            { q: 'Apa itu SinyalTender?', a: 'SinyalTender adalah platform kecerdasan pengadaan LPSE yang memonitor, meringkas, dan mengirimkan notifikasi tender terbaru yang sesuai dengan bisnis Anda secara otomatis.' },
            { q: 'Apakah data tender diperbarui secara real-time?', a: 'Ya. Crawler kami berjalan setiap beberapa menit untuk memeriksa portal LPSE nasional dan daerah. Data biasanya muncul dalam 1-5 menit setelah publikasi resmi.' },
            { q: 'Berapa lama uji coba gratisnya?', a: 'Paket Free Trial berlaku selama 30 hari tanpa batasan akses awal. Anda bisa menikmati 10 tender aktif, 1 kata kunci alarm, dan 2 AI Summary per bulan.' },
            { q: 'Apa perbedaan paket Starter, Pro, dan Enterprise?', a: 'Starter (Rp 59rb/bln) untuk perorangan dengan 3 keyword & delay 30 menit. Pro (Rp 109rb/bln) untuk tim kecil dengan 10 keyword real-time & dashboard analitik. Enterprise (Rp 300rb/bln) untuk perusahaan besar dengan unlimited keyword, multi-grup Telegram, prioritas server, dan fitur histori kompetitor.' },
            { q: 'Bisakah saya mengubah paket langganan kapan saja?', a: 'Tentu. Anda dapat meningkatkan atau menurunkan paket kapan saja melalui portal billing. Perubahan akan berlaku di siklus penagihan berikutnya.' },
            { q: 'Apakah data tender aman?', a: 'Kami mengenkripsi seluruh data dalam transit (TLS 1.3) dan saat istirahat (AES-256). Data tenant terisolasi secara ketat dan tidak dibagikan antar pengguna.' },
          ].map((faq, i) => (
            <details key={i} className="group rounded-xl border border-border bg-card/50 p-5">
              <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-white marker:hidden">
                {faq.q}
                <span className="text-muted-foreground group-open:rotate-180 transition-transform text-xs">▼</span>
              </summary>
              <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center space-y-6">
        <h2 className="text-3xl font-extrabold text-white">Siap Memenangkan Tender LPSE?</h2>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Bergabung dengan tim pengadaan terdepan di Indonesia. Mulai pantau, analisis, dan menangkan tender lebih cepat.
        </p>
        <Link
          href="/register"
          className="inline-block px-8 py-3 text-sm font-semibold rounded-lg bg-maroon text-white hover:bg-maroon-dark transition-all shadow-md shadow-white/5"
        >
          Mulai Uji Coba Gratis Sekarang
        </Link>
      </section>

      {/* Contact Section */}
      <section id="contact" className="max-w-4xl mx-auto px-6 py-16 border-t border-border">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-white">Hubungi Tim Kami</h2>
          <p className="text-xs text-muted-foreground">
            Punya pertanyaan atau butuh bantuan? Tim kami siap membantu Anda.
          </p>
          <div className="flex items-center justify-center gap-6 pt-2">
            <a href="mailto:hello@sinyaltender.id" className="text-xs text-muted-foreground hover:text-white transition-colors">
              ✉️ hello@sinyaltender.id
            </a>
            <span className="text-muted-foreground">|</span>
            <a href="#" className="text-xs text-muted-foreground hover:text-white transition-colors">
              📞 +62 21 1234 5678
            </a>
            <span className="text-muted-foreground">|</span>
            <a href="#" className="text-xs text-muted-foreground hover:text-white transition-colors">
              💬 Telegram Support
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-[10px] text-muted-foreground">
        © 2026 SinyalTender Platform — PT. SinyalTender Teknologi Indonesia. All rights reserved. LPSE Crawler Engine.
      </footer>
    </div>
  );
}

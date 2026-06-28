'use client';

import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-neutral-100 antialiased selection:bg-neutral-800 selection:text-white">
      {/* Header bar */}
      <header className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-neutral-900 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center font-bold text-[#09090b]">
            TL
          </div>
          <span className="text-lg font-bold tracking-tight text-white">TenderLens</span>
        </div>
        <nav className="flex items-center gap-6">
          <Link href="#features" className="text-sm text-neutral-400 hover:text-white transition-colors">
            Fitur
          </Link>
          <Link href="#pricing" className="text-sm text-neutral-400 hover:text-white transition-colors">
            Harga
          </Link>
          <Link href="#faq" className="text-sm text-neutral-400 hover:text-white transition-colors">
            FAQ
          </Link>
          <Link href="#contact" className="text-sm text-neutral-400 hover:text-white transition-colors">
            Kontak
          </Link>
          <Link
            href="/login"
            className="px-4 py-1.5 text-xs font-semibold rounded bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800 transition-colors"
          >
            Masuk Platform
          </Link>
        </nav>
      </header>

      {/* Hero section */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-16 text-center space-y-6">
        <span className="px-3 py-1 rounded-full bg-neutral-950 border border-neutral-800 text-[11px] font-semibold text-neutral-400">
          ✨ B2B Procurement Intelligence Platform
        </span>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Menangkan Tender LPSE <br />
          <span className="bg-gradient-to-r from-neutral-200 via-neutral-400 to-white bg-clip-text text-transparent">
            Lebih Cepat dengan AI
          </span>
        </h1>
        <p className="max-w-2xl mx-auto text-neutral-400 text-sm md:text-base leading-relaxed">
          TenderLens menyaring, meringkas syarat kualifikasi menggunakan Gemini Pro AI, dan mengirimkan alert instan ke Telegram Anda saat ada peluang tender baru.
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <Link
            href="/register"
            className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-white text-neutral-900 hover:bg-neutral-200 transition-all shadow-md shadow-white/5"
          >
            Mulai Uji Coba Gratis
          </Link>
          <Link
            href="/login"
            className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-white transition-colors"
          >
            Masuk Dasbor
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20 border-t border-neutral-900 space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">Dirancang untuk Tim Tender B2B Modern</h2>
          <p className="text-neutral-500 text-xs">Mekanisme pemantauan LPSE tercanggih tanpa ribet.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl border border-neutral-800 bg-[#0c0c0e]/50 space-y-3">
            <div className="text-2xl">✨</div>
            <h3 className="text-sm font-bold text-white">Gemini AI Summarization</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Dapatkan ringkasan spesifikasi teknis, sertifikasi industri wajib, kelayakan modal, dan tanggal krusial tanpa harus membaca ratusan halaman dokumen.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-neutral-800 bg-[#0c0c0e]/50 space-y-3">
            <div className="text-2xl">⚡</div>
            <h3 className="text-sm font-bold text-white">Alert Instan Realtime</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Jalankan alarm monitor berbasis keyword. Dapatkan pesan instan secara otomatis ke grup koordinasi tim di Telegram dan kotak masuk email kantor.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-neutral-800 bg-[#0c0c0e]/50 space-y-3">
            <div className="text-2xl">📊</div>
            <h3 className="text-sm font-bold text-white">Scraper Diagnostics</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Uptime tracker yang transparan. Admin kami memantau crawler LPSE nasional setiap menit untuk menjamin tidak ada peluang pengadaan yang terlewat.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing section */}
      <section id="pricing" className="max-w-5xl mx-auto px-6 py-20 border-t border-neutral-900 space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">Investasi yang Mempercepat Growth Anda</h2>
          <p className="text-neutral-500 text-xs">Pilih paket lisensi terbaik sesuai dengan skala perusahaan Anda.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free plan */}
          <div className="p-8 rounded-xl border border-neutral-800 bg-[#0c0c0e]/50 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest block">
                Free Trial
              </span>
              <div className="text-3xl font-extrabold text-white">Rp 0</div>
              <p className="text-xs text-neutral-400">Cocok untuk eksplorasi platform awal.</p>
              <ul className="space-y-2 text-xs text-neutral-400 pt-4">
                <li>✓ Pantau hingga 10 tender aktif</li>
                <li>✓ 1 Kata kunci alarm</li>
                <li>✓ Notifikasi via Dashboard saja</li>
              </ul>
            </div>
            <Link
              href="/register"
              className="block text-center w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 py-2 rounded text-xs font-semibold text-white transition-colors"
            >
              Mulai Uji Coba
            </Link>
          </div>

          {/* Pro plan */}
          <div className="p-8 rounded-xl border border-white/20 bg-[#0e0e11] flex flex-col justify-between space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-white text-[#09090b] text-[8px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-lg">
              Populer
            </div>
            <div className="space-y-4">
              <span className="text-[10px] font-semibold text-white uppercase tracking-widest block">
                PRO LICENSE
              </span>
              <div className="text-3xl font-extrabold text-white">
                Rp 799.000 <span className="text-xs font-normal text-neutral-500">/ bln</span>
              </div>
              <p className="text-xs text-neutral-400">Cocok untuk tim kontraktor/IT tender aktif.</p>
              <ul className="space-y-2 text-xs text-neutral-300 pt-4">
                <li>✓ Akses Tender LPSE Unlimited</li>
                <li>✓ Unlimited Kata Kunci Pemantau</li>
                <li>✓ Alert Instan Telegram & Email</li>
                <li>✓ Prioritas AI Ringkasan Dokumen</li>
              </ul>
            </div>
            <Link
              href="/register"
              className="block text-center w-full bg-white hover:bg-neutral-200 py-2 rounded text-xs font-semibold text-[#09090b] transition-all"
            >
              Daftar Pro Sekarang
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="max-w-4xl mx-auto px-6 py-20 border-t border-neutral-900 space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">Pertanyaan Umum</h2>
          <p className="text-neutral-500 text-xs">Informasi yang sering ditanyakan seputar platform TenderLens.</p>
        </div>

        <div className="space-y-4">
          {[
            { q: 'Apa itu TenderLens?', a: 'TenderLens adalah platform kecerdasan pengadaan LPSE yang memonitor, meringkas, dan mengirimkan notifikasi tender terbaru yang sesuai dengan bisnis Anda secara otomatis.' },
            { q: 'Apakah data tender diperbarui secara real-time?', a: 'Ya. Crawler kami berjalan setiap beberapa menit untuk memeriksa portal LPSE nasional dan daerah. Data biasanya muncul dalam 1-5 menit setelah publikasi resmi.' },
            { q: 'Berapa lama uji coba gratisnya?', a: 'Paket Free Trial berlaku selama 30 hari tanpa batasan akses awal. Anda bisa menikmati 10 tender aktif dan 1 kata kunci alarm selama masa uji coba.' },
            { q: 'Bisakah saya mengubah paket langganan kapan saja?', a: 'Tentu. Anda dapat meningkatkan atau menurunkan paket kapan saja melalui portal billing. Perubahan akan berlaku di siklus penagihan berikutnya.' },
            { q: 'Apakah data tender aman?', a: 'Kami mengenkripsi seluruh data dalam transit (TLS 1.3) dan saat istirahat (AES-256). Data tenant terisolasi secara ketat dan tidak dibagikan antar pengguna.' },
          ].map((faq, i) => (
            <details key={i} className="group rounded-xl border border-neutral-800 bg-[#0c0c0e]/50 p-5">
              <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-white marker:hidden">
                {faq.q}
                <span className="text-neutral-500 group-open:rotate-180 transition-transform text-xs">▼</span>
              </summary>
              <p className="mt-3 text-xs text-neutral-400 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center space-y-6">
        <h2 className="text-3xl font-extrabold text-white">Siap Memenangkan Tender LPSE?</h2>
        <p className="text-neutral-400 text-sm max-w-lg mx-auto">
          Bergabung dengan tim pengadaan terdepan di Indonesia. Mulai pantau, analisis, dan menangkan tender lebih cepat.
        </p>
        <Link
          href="/register"
          className="inline-block px-8 py-3 text-sm font-semibold rounded-lg bg-white text-neutral-900 hover:bg-neutral-200 transition-all shadow-md shadow-white/5"
        >
          Mulai Uji Coba Gratis Sekarang
        </Link>
      </section>

      {/* Contact Section */}
      <section id="contact" className="max-w-4xl mx-auto px-6 py-16 border-t border-neutral-900">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-white">Hubungi Tim Kami</h2>
          <p className="text-xs text-neutral-500">
            Punya pertanyaan atau butuh bantuan? Tim kami siap membantu Anda.
          </p>
          <div className="flex items-center justify-center gap-6 pt-2">
            <a href="mailto:hello@tenderlens.id" className="text-xs text-neutral-400 hover:text-white transition-colors">
              ✉️ hello@tenderlens.id
            </a>
            <span className="text-neutral-800">|</span>
            <a href="#" className="text-xs text-neutral-400 hover:text-white transition-colors">
              📞 +62 21 1234 5678
            </a>
            <span className="text-neutral-800">|</span>
            <a href="#" className="text-xs text-neutral-400 hover:text-white transition-colors">
              💬 Telegram Support
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-8 text-center text-[10px] text-neutral-600">
        © 2026 TenderLens Platform — PT. TenderLens Teknologi Indonesia. All rights reserved. LPSE Crawler Engine.
      </footer>
    </div>
  );
}

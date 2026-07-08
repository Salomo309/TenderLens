'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

function useInView(threshold = 0.15): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: `${delay}ms`, transitionProperty: 'opacity, transform' }}
    >
      <div className={className}>{children}</div>
    </div>
  );
}

function Counter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [ref, inView] = useInView();
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1500;
    const increment = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end]);
  return <span ref={ref}>{count}{suffix}</span>;
}

const NAV_LINKS = [
  { href: '#features', label: 'Fitur' },
  { href: '#pricing', label: 'Harga' },
  { href: '#faq', label: 'FAQ' },
  { href: '#contact', label: 'Kontak' },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-teal-200 selection:text-teal-900 overflow-x-hidden">
      {/* ─── Animated background orbs ─────────────────────── */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-teal-200/30 to-teal-300/5 blur-3xl animate-float" style={{ animationDelay: '0s' }} />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-sky-200/30 to-blue-300/5 blur-3xl animate-float-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-gradient-to-br from-cyan-200/20 to-teal-200/5 blur-3xl animate-float-slower" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/4 right-1/3 w-[250px] h-[250px] rounded-full bg-gradient-to-tr from-emerald-200/20 to-sky-200/5 blur-3xl animate-float-slow" style={{ animationDelay: '3s' }} />
      </div>

      {/* ─── Floating decorative particles ────────────────── */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-teal-400/10 animate-float-slower"
            style={{
              width: `${4 + Math.random() * 8}px`,
              height: `${4 + Math.random() * 8}px`,
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
              animationDelay: `${i * 1.5}s`,
              animationDuration: `${8 + Math.random() * 8}s`,
            }}
          />
        ))}
      </div>

      {/* ─── Header ──────────────────────────────────────── */}
      <header className={`max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between border-b border-border bg-white/70 backdrop-blur-xl sticky top-0 z-50 transition-shadow duration-300 ${scrolled ? 'shadow-md' : 'shadow-none'}`}>
        <div className="flex items-center gap-3 shrink-0">
          <img src="/logo-title-transparent.png" alt="SinyalTender" className="h-16 sm:h-20 md:h-28 w-auto" />
        </div>
        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-teal-500 after:transition-all after:duration-300 hover:after:w-full">
              {l.label}
            </Link>
          ))}
          <Link href="/login" className="px-5 py-2 text-xs font-semibold rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-200 transition-all hover:shadow-md hover:shadow-teal-100">
            Masuk Platform
          </Link>
        </nav>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-muted-foreground hover:text-foreground text-xl p-1 relative z-50" aria-label="Toggle menu">
          <span className={`block transition-transform duration-300 ${mobileMenuOpen ? 'rotate-90' : ''}`}>
            {mobileMenuOpen ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            )}
          </span>
        </button>
      </header>

      {/* Mobile nav */}
      <div className={`fixed inset-0 z-40 md:hidden transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
        <nav className={`fixed top-16 right-0 w-64 bg-white/95 backdrop-blur-xl border-l border-b border-border shadow-2xl rounded-bl-2xl p-6 flex flex-col gap-4 transition-all duration-300 ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </Link>
          ))}
          <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="mt-2 text-center px-5 py-2 text-xs font-semibold rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-200 transition-colors">
            Masuk Platform
          </Link>
        </nav>
      </div>

      {/* ─── Hero ────────────────────────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-6 pt-28 pb-20 text-center space-y-8">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200/50 text-[11px] font-semibold text-teal-600 shadow-sm hover:shadow-md hover:shadow-teal-100/50 transition-all duration-300 hover:scale-105">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
          B2B Procurement Intelligence Platform
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground leading-tight">
          Menangkan Tender LPSE{' '}
          <span className="bg-gradient-to-r from-teal-500 via-teal-400 to-cyan-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-shimmer">
            Lebih Cepat dengan AI
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-muted-foreground text-base md:text-lg leading-relaxed">
          SinyalTender menyaring, meringkas syarat kualifikasi menggunakan Gemini Pro AI, dan mengirimkan alert instan ke Telegram Anda saat ada peluang tender baru.
        </p>

        <div className="flex items-center justify-center gap-4 pt-2 flex-wrap">
          <Link
            href="/register"
            className="group relative px-8 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white overflow-hidden transition-all shadow-lg shadow-teal-200 hover:shadow-xl hover:shadow-teal-300 hover:-translate-y-0.5 active:translate-y-0"
          >
            <span className="relative z-10">Mulai Uji Coba Gratis</span>
            <span className="absolute inset-0 bg-gradient-to-r from-teal-400 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <span className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] bg-[length:200%_100%] animate-shimmer" />
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 text-sm font-semibold rounded-xl bg-white hover:bg-teal-50 border border-border text-foreground transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
          >
            Masuk Dasbor
          </Link>
        </div>

        <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5 pt-2 animate-fade-in-up">
          <span className="flex -space-x-1">
            {['👨‍💼', '👩‍💼', '🧑‍💼', '👨‍💼'].map((e, i) => (
              <span key={i} className="inline-block h-5 w-5 rounded-full bg-muted border border-white text-[10px] leading-5 text-center transition-transform hover:scale-110 hover:z-10">{e}</span>
            ))}
          </span>
          Dipercaya oleh 50+ tim pengadaan di Indonesia
        </p>
      </section>

      {/* ─── Features ────────────────────────────────────── */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 space-y-14">
        <AnimatedSection className="text-center space-y-3">
          <span className="inline-block px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-[10px] font-semibold text-sky-600 uppercase tracking-wider">Fitur Unggulan</span>
          <h2 className="text-3xl font-bold text-foreground">Dirancang untuk Tim Tender B2B Modern</h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">Mekanisme pemantauan LPSE tercanggih tanpa ribet.</p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: '🤖', title: 'Gemini AI Summarization', desc: 'Dapatkan ringkasan spesifikasi teknis, sertifikasi industri wajib, kelayakan modal, dan tanggal krusial tanpa harus membaca ratusan halaman dokumen.', iconBg: 'bg-teal-100', iconColor: 'text-teal-600' },
            { icon: '⚡', title: 'Alert Instan Realtime', desc: 'Jalankan alarm monitor berbasis keyword. Dapatkan pesan instan secara otomatis ke grup koordinasi tim di Telegram dan kotak masuk email kantor.', iconBg: 'bg-sky-100', iconColor: 'text-sky-600' },
            { icon: '📊', title: 'Scraper Diagnostics', desc: 'Uptime tracker yang transparan. Admin kami memantau crawler LPSE nasional setiap menit untuk menjamin tidak ada peluang pengadaan yang terlewat.', iconBg: 'bg-gradient-to-br from-teal-100 to-cyan-100', iconColor: 'text-teal-600' },
          ].map((feat, i) => (
            <div
              key={i}
              className="group p-8 rounded-2xl border border-border bg-white hover:shadow-xl hover:shadow-teal-100/20 hover:border-teal-200 transition-all duration-500 hover:-translate-y-2 space-y-5 relative overflow-hidden"
              style={{ animation: `fadeInUp 0.7s ease-out ${i * 0.15}s forwards`, opacity: 0 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-teal-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className={`relative inline-flex h-12 w-12 rounded-xl ${feat.iconBg} items-center justify-center text-xl ${feat.iconColor} shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-300`}>
                {feat.icon}
              </div>
              <h3 className="relative text-base font-bold text-foreground">{feat.title}</h3>
              <p className="relative text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────────────────── */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-24 space-y-14">
        <AnimatedSection className="text-center space-y-3">
          <span className="inline-block px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[10px] font-semibold text-teal-600 uppercase tracking-wider">Harga</span>
          <h2 className="text-3xl font-bold text-foreground">Investasi yang Mempercepat Growth Anda</h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">Pilih paket lisensi terbaik sesuai dengan skala perusahaan Anda.</p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { tier: 'Free Trial', price: 'Rp 0', period: '', desc: 'Cocok untuk eksplorasi platform awal.', features: ['Pantau hingga 10 tender aktif', '1 Kata kunci alarm', 'Notifikasi via Dashboard', '2 AI Ringkasan per bulan'], cta: 'Mulai Uji Coba', highlighted: false },
            { tier: 'Starter', price: 'Rp 59.000', period: '/ bln', desc: 'Untuk kontraktor perorangan & freelancer.', features: ['3 kata kunci dipantau', 'Notifikasi 1 Telegram personal', 'Delay notifikasi 30 menit', '3 AI Summary dokumen per bulan'], cta: 'Mulai Starter', highlighted: false },
            { tier: 'Pro License', price: 'Rp 109.000', period: '/ bln', desc: 'Terlaris untuk software house & vendor menengah.', features: ['10 kata kunci pemantau', 'Notifikasi real-time (< 5 menit)', 'Bisa masuk 1 grup Telegram Tim', '20 AI Summary / bulan', 'Dashboard analitik pemenang'], cta: 'Daftar Pro', highlighted: true },
            { tier: 'Enterprise', price: 'Rp 300.000', period: '/ bln', desc: 'Untuk kontraktor kakap & perusahaan aktif.', features: ['Unlimited kata kunci', 'Multi-grup Telegram', 'Unlimited AI Summary', 'Prioritas server bot paling cepat', 'Histori kompetitor'], cta: 'Hubungi Tim', highlighted: false },
          ].map((plan, i) => (
            <div
              key={i}
              className={`p-7 rounded-2xl border bg-white shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 flex flex-col justify-between space-y-5 relative overflow-hidden group ${
                plan.highlighted ? 'border-2 border-teal-400 shadow-lg shadow-teal-100 animate-glow' : 'border-border'
              }`}
              style={{ animation: `fadeInScale 0.5s ease-out ${i * 0.1}s forwards`, opacity: 0 }}
            >
              {plan.highlighted && (
                <>
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-teal-500 to-teal-600 text-white text-[9px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-bl-xl shadow-sm z-10">Best Seller</div>
                  <div className="absolute inset-0 bg-gradient-to-b from-teal-50/50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </>
              )}

              <div className="relative space-y-4 z-10">
                <span className={`text-[11px] font-semibold uppercase tracking-widest block ${plan.highlighted ? 'text-teal-600' : 'text-muted-foreground'}`}>
                  {plan.tier}
                </span>
                <div className="text-4xl font-extrabold text-foreground">
                  {plan.price}
                  {plan.period && <span className="text-sm font-normal text-muted-foreground"> {plan.period}</span>}
                </div>
                <p className="text-sm text-muted-foreground">{plan.desc}</p>
                <ul className="space-y-2.5 text-sm pt-2">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                      <span className={plan.highlighted ? 'text-foreground' : 'text-muted-foreground'}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href="/register"
                className={`relative block text-center w-full py-2.5 rounded-xl text-sm font-semibold transition-all z-10 ${
                  plan.highlighted
                    ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700 shadow-md shadow-teal-200'
                    : 'bg-muted hover:bg-border border border-border text-foreground'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Stats ───────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-8">
        <AnimatedSection>
          <div className="grid grid-cols-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 p-8 shadow-xl shadow-teal-200/30 text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%)] bg-[length:250%_250%] animate-shimmer" />
            {[
              { end: 10000, suffix: '+', label: 'Tender Dipantau' },
              { end: 500, suffix: '+', label: 'Pengguna Aktif' },
              { end: 98, suffix: '%', label: 'Uptime Crawler' },
            ].map((stat, i) => (
              <div key={i} className={`relative text-center ${i < 2 ? 'border-r border-white/20' : ''}`}>
                <div className="text-3xl md:text-4xl font-extrabold">
                  <Counter end={stat.end} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-white/80 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* ─── FAQ ─────────────────────────────────────────── */}
      <section id="faq" className="max-w-4xl mx-auto px-6 py-24 space-y-14">
        <AnimatedSection className="text-center space-y-3">
          <span className="inline-block px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-[10px] font-semibold text-sky-600 uppercase tracking-wider">FAQ</span>
          <h2 className="text-3xl font-bold text-foreground">Pertanyaan Umum</h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">Informasi yang sering ditanyakan seputar platform SinyalTender.</p>
        </AnimatedSection>

        <div className="space-y-3">
          {[
            { q: 'Apa itu SinyalTender?', a: 'SinyalTender adalah platform kecerdasan pengadaan LPSE yang memonitor, meringkas, dan mengirimkan notifikasi tender terbaru yang sesuai dengan bisnis Anda secara otomatis.' },
            { q: 'Apakah data tender diperbarui secara real-time?', a: 'Ya. Crawler kami berjalan setiap beberapa menit untuk memeriksa portal LPSE nasional dan daerah. Data biasanya muncul dalam 1-5 menit setelah publikasi resmi.' },
            { q: 'Berapa lama uji coba gratisnya?', a: 'Paket Free Trial berlaku selama 30 hari tanpa batasan akses awal. Anda bisa menikmati 10 tender aktif, 1 kata kunci alarm, dan 2 AI Summary per bulan.' },
            { q: 'Apa perbedaan paket Starter, Pro, dan Enterprise?', a: 'Starter (Rp 59rb/bln) untuk perorangan dengan 3 keyword & delay 30 menit. Pro (Rp 109rb/bln) untuk tim kecil dengan 10 keyword real-time & dashboard analitik. Enterprise (Rp 300rb/bln) untuk perusahaan besar dengan unlimited keyword, multi-grup Telegram, prioritas server, dan fitur histori kompetitor.' },
            { q: 'Bisakah saya mengubah paket langganan kapan saja?', a: 'Tentu. Anda dapat meningkatkan atau menurunkan paket kapan saja melalui portal billing. Perubahan akan berlaku di siklus penagihan berikutnya.' },
            { q: 'Apakah data tender aman?', a: 'Kami mengenkripsi seluruh data dalam transit (TLS 1.3) dan saat istirahat (AES-256). Data tenant terisolasi secara ketat dan tidak dibagikan antar pengguna.' },
          ].map((faq, i) => (
            <details key={i} className="group rounded-xl border border-border bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300 open:shadow-lg open:border-teal-200">
              <summary className="flex items-center justify-between cursor-pointer text-sm font-semibold text-foreground marker:hidden">
                <span>{faq.q}</span>
                <span className="text-muted-foreground group-open:rotate-180 transition-transform duration-300 text-xs shrink-0 ml-4">▼</span>
              </summary>
              <div className="mt-3 text-sm text-muted-foreground leading-relaxed overflow-hidden transition-all duration-300">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pb-24 text-center space-y-8">
        <AnimatedSection>
          <div className="rounded-3xl bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-600 p-12 shadow-2xl shadow-teal-200/40 text-white space-y-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.08)_50%,transparent_75%)] bg-[length:200%_200%] animate-shimmer" />
            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-white/5 blur-2xl animate-float-slow" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-white/5 blur-2xl animate-float" style={{ animationDelay: '2s' }} />
            <h2 className="relative text-4xl font-extrabold">Siap Memenangkan Tender LPSE?</h2>
            <p className="relative text-white/80 text-base max-w-lg mx-auto">
              Bergabung dengan tim pengadaan terdepan di Indonesia. Mulai pantau, analisis, dan menangkan tender lebih cepat.
            </p>
            <Link
              href="/register"
              className="group relative inline-block px-10 py-3.5 text-sm font-bold rounded-xl bg-white text-teal-600 overflow-hidden transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
            >
              <span className="relative z-10">Mulai Uji Coba Gratis Sekarang</span>
              <span className="absolute inset-0 bg-gradient-to-r from-teal-50 to-cyan-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </Link>
          </div>
        </AnimatedSection>
      </section>

      {/* ─── Contact ─────────────────────────────────────── */}
      <section id="contact" className="max-w-4xl mx-auto px-6 py-16 border-t border-border">
        <AnimatedSection className="text-center space-y-5">
          <h2 className="text-2xl font-bold text-foreground">Hubungi Tim Kami</h2>
          <p className="text-sm text-muted-foreground">Punya pertanyaan atau butuh bantuan? Tim kami siap membantu Anda.</p>
          <div className="flex items-center justify-center gap-8 pt-2 flex-wrap">
            {[
              { icon: '✉️', label: 'hello@sinyaltender.id', href: 'mailto:hello@sinyaltender.id' },
              { icon: '📞', label: '+62 21 1234 5678', href: '#' },
              { icon: '💬', label: 'Telegram Support', href: '#' },
            ].map((c, i) => (
              <a key={i} href={c.href} className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-teal-600 transition-all duration-300 hover:scale-105">
                <span className="text-base group-hover:animate-wiggle">{c.icon}</span>
                {c.label}
              </a>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* ─── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-border py-10 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src="/logo.png" alt="SinyalTender" className="h-8 w-auto opacity-50 hover:opacity-100 transition-opacity duration-300" />
          </div>
          <p>© 2026 SinyalTender Platform — PT. SinyalTender Teknologi Indonesia. All rights reserved. LPSE Crawler Engine.</p>
        </div>
      </footer>
    </div>
  );
}

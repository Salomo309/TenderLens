'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function RegisterPage() {
  const [form, setForm] = useState({ companyName: '', adminName: '', email: '', password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const router = useRouter();
  const { register } = useAuth();

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateForm = () => {
    if (!form.companyName.trim()) return 'Nama perusahaan wajib diisi.';
    if (!form.adminName.trim()) return 'Nama administrator wajib diisi.';
    if (!form.email.trim()) return 'Email wajib diisi.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Format email tidak valid.';
    if (!form.password) return 'Kata sandi wajib diisi.';
    if (form.password.length < 8) return 'Kata sandi minimal 8 karakter.';
    if (form.password !== form.confirmPassword) return 'Konfirmasi kata sandi tidak cocok.';
    if (!agreeTerms) return 'Anda harus menyetujui syarat dan ketentuan.';
    return '';
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }
    setIsLoading(true);
    try {
      await register({
        companyName: form.companyName,
        adminName: form.adminName,
        email: form.email,
        password: form.password,
      });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registrasi gagal. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 antialiased">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 space-y-6">
        {/* Brand header */}
        <div className="flex flex-col items-center space-y-1">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo-title-transparent.png" alt="SinyalTender" className="h-48 w-auto" />
          </Link>
          <h2 className="text-xl font-bold text-foreground pt-1">Daftar Akun Perusahaan</h2>
          <p className="text-xs text-muted-foreground text-center">
            Mulai uji coba gratis untuk monitoring dan notifikasi LPSE otomatis.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-destructive text-xs text-red-600 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nama Perusahaan (Tenant)</label>
            <input
              type="text"
              placeholder="PT Solusi Teknologi Nusantara"
              value={form.companyName}
              onChange={(e) => updateField('companyName', e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring transition-colors"
              required
              autoComplete="organization"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nama Administrator Utama</label>
            <input
              type="text"
              placeholder="Nama Lengkap Anda"
              value={form.adminName}
              onChange={(e) => updateField('adminName', e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring transition-colors"
              required
              autoComplete="name"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Alamat Email Bisnis</label>
            <input
              type="email"
              placeholder="nama@perusahaan.co.id"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring transition-colors"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Kata Sandi Baru</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimal 8 karakter"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 pr-8 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring transition-colors"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <div className="mt-1 flex gap-1">
              {[4, 6, 8].map((len) => (
                <div
                  key={len}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    form.password.length >= len ? 'bg-emerald-500' : 'bg-border'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Konfirmasi Kata Sandi</label>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Ulangi kata sandi"
              value={form.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring transition-colors"
              required
              autoComplete="new-password"
            />
          </div>

          <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="rounded accent-orange-500 mt-0.5"
            />
            <span>Saya menyetujui <a href="#" className="text-orange-600 hover:underline">Syarat &amp; Ketentuan</a> dan <a href="#" className="text-orange-600 hover:underline">Kebijakan Privasi</a> SinyalTender.</span>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-maroon hover:bg-maroon-dark text-white font-semibold py-2.5 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Buat Akun Sekarang'
            )}
          </button>
        </form>

        <div className="text-center text-xs text-muted-foreground">
          Sudah punya akun?{' '}
          <Link href="/login" className="text-orange-600 hover:underline font-semibold">
            Masuk ke dasbor
          </Link>
        </div>
      </div>
    </div>
  );
}

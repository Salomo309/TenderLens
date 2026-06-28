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
    <div className="min-h-screen bg-[#09090b] text-neutral-100 flex items-center justify-center p-6 antialiased">
      <div className="w-full max-w-md bg-[#0c0c0e] border border-neutral-800 rounded-2xl p-8 space-y-6">
        {/* Brand header */}
        <div className="flex flex-col items-center space-y-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center font-bold text-[#09090b]">
              TL
            </div>
            <span className="text-lg font-bold tracking-tight text-white">TenderLens</span>
          </Link>
          <h2 className="text-xl font-bold text-white pt-2">Daftar Akun Perusahaan</h2>
          <p className="text-xs text-neutral-500 text-center">
            Mulai uji coba gratis untuk monitoring dan notifikasi LPSE otomatis.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-950 border border-red-800 text-xs text-red-300 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Nama Perusahaan (Tenant)</label>
            <input
              type="text"
              placeholder="PT Solusi Teknologi Nusantara"
              value={form.companyName}
              onChange={(e) => updateField('companyName', e.target.value)}
              className="w-full bg-[#121214] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-700 transition-colors"
              required
              autoComplete="organization"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Nama Administrator Utama</label>
            <input
              type="text"
              placeholder="Nama Lengkap Anda"
              value={form.adminName}
              onChange={(e) => updateField('adminName', e.target.value)}
              className="w-full bg-[#121214] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-700 transition-colors"
              required
              autoComplete="name"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Alamat Email Bisnis</label>
            <input
              type="email"
              placeholder="nama@perusahaan.co.id"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              className="w-full bg-[#121214] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-700 transition-colors"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Kata Sandi Baru</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimal 8 karakter"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                className="w-full bg-[#121214] border border-neutral-800 rounded-lg px-3 py-2 pr-8 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-700 transition-colors"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <div className="mt-1 flex gap-1">
              {[4, 6, 8].map((len) => (
                <div
                  key={len}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    form.password.length >= len ? 'bg-emerald-500' : 'bg-neutral-800'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Konfirmasi Kata Sandi</label>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Ulangi kata sandi"
              value={form.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
              className="w-full bg-[#121214] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-700 transition-colors"
              required
              autoComplete="new-password"
            />
          </div>

          <label className="flex items-start gap-2 text-xs text-neutral-400 cursor-pointer">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="rounded accent-white mt-0.5"
            />
            <span>Saya menyetujui <a href="#" className="text-white hover:underline">Syarat &amp; Ketentuan</a> dan <a href="#" className="text-white hover:underline">Kebijakan Privasi</a> TenderLens.</span>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white hover:bg-neutral-200 text-neutral-900 font-semibold py-2.5 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="h-4 w-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Buat Akun Sekarang'
            )}
          </button>
        </form>

        <div className="text-center text-xs text-neutral-500">
          Sudah punya akun?{' '}
          <Link href="/login" className="text-white hover:underline font-semibold">
            Masuk ke dasbor
          </Link>
        </div>
      </div>
    </div>
  );
}

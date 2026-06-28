'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const validateForm = () => {
    if (!email.trim()) return 'Email wajib diisi.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Format email tidak valid.';
    if (!password) return 'Kata sandi wajib diisi.';
    if (password.length < 6) return 'Kata sandi minimal 6 karakter.';
    return '';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login gagal. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsLoading(false);
    router.push('/dashboard');
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
          <h2 className="text-xl font-bold text-white pt-2">Masuk ke Akun Anda</h2>
          <p className="text-xs text-neutral-500 text-center">
            Gunakan credentials perusahaan Anda untuk mengakses data monitoring LPSE.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-950 border border-red-800 text-xs text-red-300 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Alamat Email</label>
            <input
              type="email"
              placeholder="nama@perusahaan.co.id"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              className="w-full bg-[#121214] border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-700 transition-colors"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-medium text-neutral-400">Kata Sandi</label>
              <a href="#" className="text-[10px] text-neutral-500 hover:text-white transition-colors">
                Lupa Sandi?
              </a>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full bg-[#121214] border border-neutral-800 rounded-lg px-3 py-2 pr-8 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-700 transition-colors"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded accent-white"
            />
            Ingat saya
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white hover:bg-neutral-200 text-neutral-900 font-semibold py-2.5 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="h-4 w-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Masuk Sekarang'
            )}
          </button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-neutral-900"></div>
          <span className="flex-shrink mx-4 text-[10px] text-neutral-600 uppercase">Atau</span>
          <div className="flex-grow border-t border-neutral-900"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full bg-[#0c0c0e] hover:bg-neutral-900 border border-neutral-800 py-2.5 rounded-lg text-sm text-neutral-200 font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔑 Masuk dengan Akun Google
        </button>

        <div className="text-center text-xs text-neutral-500 pt-2">
          Belum terdaftar?{' '}
          <Link href="/register" className="text-white hover:underline font-semibold">
            Buat akun perusahaan gratis
          </Link>
        </div>
      </div>
    </div>
  );
}

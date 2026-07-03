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
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    window.location.href = `${apiBase}/auth/google`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 antialiased">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 space-y-6">
        {/* Brand header */}
        <div className="flex flex-col items-center space-y-2">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo-title-transparent.png" alt="SinyalTender" className="h-20 sm:h-28 w-auto" />
          </Link>
          <h2 className="text-xl font-bold text-foreground pt-2">Masuk ke Akun Anda</h2>
          <p className="text-xs text-muted-foreground text-center">
            Gunakan credentials perusahaan Anda untuk mengakses data monitoring LPSE.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-destructive text-xs text-red-600 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Alamat Email</label>
            <input
              type="email"
              placeholder="nama@perusahaan.co.id"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring transition-colors"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-medium text-muted-foreground">Kata Sandi</label>
              <a href="#" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                Lupa Sandi?
              </a>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 pr-8 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring transition-colors"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded accent-orange-500"
            />
            Ingat saya
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-maroon hover:bg-maroon-dark text-white font-semibold py-2.5 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Masuk Sekarang'
            )}
          </button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink mx-4 text-[10px] text-muted-foreground uppercase">Atau</span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full bg-card hover:bg-orange-50 border border-border py-2.5 rounded-lg text-sm text-foreground font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔑 Masuk dengan Akun Google
        </button>

        <div className="text-center text-xs text-muted-foreground pt-2">
          Belum terdaftar?{' '}
          <Link href="/register" className="text-orange-600 hover:underline font-semibold">
            Buat akun perusahaan gratis
          </Link>
        </div>
      </div>
    </div>
  );
}

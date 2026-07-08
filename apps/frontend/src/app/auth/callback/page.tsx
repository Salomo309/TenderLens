'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';

function parseHashParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const hash = window.location.hash.replace(/^#/, '');
  const params: Record<string, string> = {};
  for (const part of hash.split('&')) {
    const [key, val] = part.split('=');
    if (key && val) params[decodeURIComponent(key)] = decodeURIComponent(val);
  }
  return params;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    // Google OAuth uses hash fragment; direct login uses query params
    const hashParams = parseHashParams();
    const urlParams = new URLSearchParams(window.location.search.replace(/^\?/, ''));
    const token = hashParams.token || urlParams.get('token') || urlParams.get('access_token');
    const userId = hashParams.userId || urlParams.get('userId');

    if (token) {
      localStorage.setItem('token', token);
      document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      // Clean URL — remove token from hash/query for security
      window.history.replaceState({}, document.title, window.location.pathname);
      router.push('/dashboard');
    } else {
      setError('Token otentikasi tidak ditemukan. Silakan coba login kembali.');
    }
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-xl font-bold text-foreground">Gagal Otentikasi</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-5 py-2 bg-maroon hover:bg-maroon-dark text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Spinner />
        <p className="text-sm text-muted-foreground">Memproses login...</p>
      </div>
    </div>
  );
}

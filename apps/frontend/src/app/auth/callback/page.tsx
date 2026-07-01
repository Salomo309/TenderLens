'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token') || searchParams.get('access_token');
    const userId = searchParams.get('userId');

    if (token) {
      localStorage.setItem('token', token);
      document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      router.push('/dashboard');
    } else {
      setError('Token otentikasi tidak ditemukan. Silakan coba login kembali.');
    }
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-xl font-bold text-white">Gagal Otentikasi</h1>
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

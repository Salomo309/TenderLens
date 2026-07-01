'use client';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-4xl">⚠️</div>
        <h1 className="text-xl font-bold text-white">Terjadi Kesalahan</h1>
        <p className="text-sm text-muted-foreground">
          {error.message || 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi.'}
        </p>
        <button
          onClick={reset}
          className="px-5 py-2 bg-maroon hover:bg-maroon-dark text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}

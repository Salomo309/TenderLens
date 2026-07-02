import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <div className="text-5xl">404</div>
        <h1 className="text-xl font-bold text-foreground">Halaman Tidak Ditemukan</h1>
        <p className="text-sm text-muted-foreground">Halaman yang Anda cari tidak ada atau telah dipindahkan.</p>
        <Link
          href="/dashboard"
          className="inline-block px-5 py-2 bg-maroon hover:bg-maroon-dark text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}

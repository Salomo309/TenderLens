import { Spinner } from '@/components/ui/spinner';

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-maroon flex items-center justify-center font-bold text-white text-sm">TL</div>
          <span className="text-lg font-bold tracking-tight text-white">TenderLens</span>
        </div>
        <Spinner />
        <p className="text-xs text-muted-foreground">Memuat platform...</p>
      </div>
    </div>
  );
}

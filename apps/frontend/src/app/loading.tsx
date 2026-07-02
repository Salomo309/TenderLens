import { Spinner } from '@/components/ui/spinner';

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <img src="/logo-transparent.png" alt="SinyalTender" className="h-28 w-auto" />
        </div>
        <Spinner />
        <p className="text-xs text-muted-foreground">Memuat platform...</p>
      </div>
    </div>
  );
}

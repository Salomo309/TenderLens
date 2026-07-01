import { Spinner } from '@/components/ui/spinner';

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center space-y-3">
        <Spinner />
        <p className="text-xs text-muted-foreground">Memuat dashboard...</p>
      </div>
    </div>
  );
}

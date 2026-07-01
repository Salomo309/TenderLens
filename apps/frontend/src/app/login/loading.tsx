import { Spinner } from '@/components/ui/spinner';

export default function LoginLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Spinner />
    </div>
  );
}

import { Spinner } from '@/components/ui/spinner';

export default function RegisterLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Spinner />
    </div>
  );
}

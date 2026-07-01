import Image from 'next/image';
import { Spinner } from '@/components/ui/spinner';
import logo from '@/assets/sinyal-tender-logo.png';

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Image src={logo} alt="SinyalTender" className="h-8 w-auto" />
        </div>
        <Spinner />
        <p className="text-xs text-muted-foreground">Memuat platform...</p>
      </div>
    </div>
  );
}

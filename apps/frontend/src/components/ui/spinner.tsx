export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-20 ${className}`}>
      <span className="h-6 w-6 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

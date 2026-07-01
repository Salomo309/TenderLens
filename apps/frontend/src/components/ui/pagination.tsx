import React from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function getPageRange(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [];

  pages.push(1);

  if (current > 3) {
    pages.push('ellipsis');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push('ellipsis');
  }

  pages.push(total);

  return pages;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageRange(page, totalPages);

  return (
    <div className="flex items-center justify-center gap-1 p-4 border-t border-border">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-maroon-darker hover:bg-maroon-dark text-foreground border border-border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ‹ Prev
      </button>

      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e-${i}`} className="px-2 text-muted-foreground text-xs">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`min-w-[32px] px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              p === page
                ? 'bg-maroon text-white border-maroon'
                : 'bg-maroon-darker hover:bg-maroon-dark text-foreground border-border'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-maroon-darker hover:bg-maroon-dark text-foreground border border-border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next ›
      </button>
    </div>
  );
}

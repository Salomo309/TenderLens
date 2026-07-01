import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export function Card({ children, className = '', title, subtitle }: CardProps) {
  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden ${className}`}>
      {(title || subtitle) && (
        <div className="p-4 border-b border-border bg-maroon-darker/30">
          {title && <h3 className="text-xs font-semibold text-white uppercase tracking-wider">{title}</h3>}
          {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

export function CardGrid({ children, cols = 4 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${cols} gap-4`}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  green,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: string;
  green?: boolean;
}) {
  return (
    <div className="p-5 rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className={`text-2xl font-bold font-mono ${green ? 'text-emerald-400 flex items-center gap-2' : 'text-white'}`}>
        {green && <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />}
        {value}
      </div>
      {sub && <div className={`text-[11px] mt-1 ${green ? 'text-muted-foreground' : 'text-emerald-400'}`}>{sub}</div>}
    </div>
  );
}

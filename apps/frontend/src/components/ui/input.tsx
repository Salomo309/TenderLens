import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className = '', id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-muted-foreground">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full bg-input border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-ring transition-colors ${
          error ? 'border-destructive' : 'border-border'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-[10px] text-red-400">{error}</p>}
      {hint && !error && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

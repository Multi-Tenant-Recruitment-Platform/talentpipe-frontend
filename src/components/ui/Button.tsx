import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

/**
 * The gradient primary button was copy-pasted across five dashboard surfaces
 * with drifting padding and hover states. Centralised here so the brand
 * gradient, focus ring and disabled treatment stay identical everywhere.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-600/20 ' +
    'hover:from-indigo-500 hover:to-violet-500 hover:shadow-md hover:shadow-indigo-600/25 ' +
    'focus-visible:ring-indigo-500/40',
  secondary:
    'border border-slate-300 bg-white text-slate-700 shadow-sm ' +
    'hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-indigo-500/25',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-indigo-500/25',
  danger:
    'text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:ring-red-500/25',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'gap-1.5 rounded-lg px-3 py-1.5 text-xs',
  md: 'gap-2 rounded-lg px-4 py-2.5 text-sm',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center font-semibold transition-all focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-sm ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

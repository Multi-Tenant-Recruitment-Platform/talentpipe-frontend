import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

const TONES = {
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  slate: 'bg-slate-100 text-slate-500',
} as const;

/**
 * Centred icon + headline + explanation, with an optional call to action.
 *
 * <p>Extracted because this markup was hand-rolled twice inside TeamPage with
 * slightly different spacing, and an empty state without a next step is a dead
 * end — the `action` slot exists to make that hard to forget.</p>
 */
export function EmptyState({
  icon,
  tone = 'indigo',
  title,
  description,
  action,
  className = '',
}: Readonly<{
  icon: IconName;
  tone?: keyof typeof TONES;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}>) {
  return (
    <div className={`px-6 py-12 text-center ${className}`}>
      <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${TONES[tone]}`}>
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <p className="mt-3 text-sm font-semibold text-slate-900">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

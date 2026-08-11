import type { ReactNode } from 'react';

/**
 * Section card shell shared by every dashboard surface: optional header row
 * (title + subtitle + right-aligned action slot) above a padded body.
 *
 * <p>Shape and elevation deliberately mirror the auth pages' card — same
 * radius, same hairline ring — so signing in and landing on the dashboard
 * reads as one product rather than two.</p>
 */
export function Card({
  title,
  subtitle,
  action,
  children,
  className = '',
  bodyClassName = '',
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/5 ring-1 ring-slate-900/5 ${className}`}
    >
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold tracking-tight text-slate-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={bodyClassName || 'p-6'}>{children}</div>
    </section>
  );
}

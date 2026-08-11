import type { ReactNode } from 'react';

/**
 * Consistent page heading row: title + subtitle on the left, actions right.
 *
 * <p>The optional eyebrow repeats the auth pages' heading pattern (small
 * uppercase brand-tone label above a large title), so page identity is
 * scannable before the eye reaches the title itself.</p>
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">{eyebrow}</span>
        )}
        <h1 className={`text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem] ${eyebrow ? 'mt-1.5' : ''}`}>
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}

import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/**
 * One labelled fact in a profile section: icon, label, value.
 *
 * <p>Shared by the contact and location blocks so a change to how "not set"
 * reads lands in both. An empty value is stated rather than left blank — a gap
 * where a phone number should be is indistinguishable from a rendering bug.</p>
 */
export function DetailItem({
  icon,
  label,
  value,
  href,
  external = false,
  testId,
}: Readonly<{
  icon: IconName;
  label: string;
  /** Display text. Empty string means "not set". */
  value: string;
  /** When given and the value is non-empty, the value renders as a link. */
  href?: string;
  external?: boolean;
  testId?: string;
}>) {
  let content: ReactNode;
  if (value === '') {
    content = <span className="text-sm text-slate-400">Not set</span>;
  } else if (href) {
    content = (
      <a
        href={href}
        {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
        className="block truncate rounded text-sm font-medium text-indigo-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        {value}
      </a>
    );
  } else {
    content = <span className="text-sm text-slate-800">{value}</span>;
  }

  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
        <dd className="mt-0.5 min-w-0" data-testid={testId}>
          {content}
        </dd>
      </div>
    </div>
  );
}

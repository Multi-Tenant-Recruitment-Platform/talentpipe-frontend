import { useState } from 'react';
import { formatRelativeTime } from '../../utils/format';

const MARK_SIZES = {
  sm: 'size-10 text-lead',
  md: 'size-12 text-title',
  lg: 'size-16 text-heading',
} as const;

const MARK_RADII = { sm: 'rounded-md', md: 'rounded-lg', lg: 'rounded-xl' } as const;

/**
 * Company logo, or its initial when there is no logo or it fails to load. Decorative: the name is always shown beside it.
 * `round` is the board card's circular mark.
 */
export function CompanyMark({
  name,
  logoUrl,
  size = 'md',
  round = false,
}: Readonly<{ name: string; logoUrl?: string | null; size?: 'sm' | 'md' | 'lg'; round?: boolean }>) {
  const [broken, setBroken] = useState(false);
  const box = `${MARK_SIZES[size]} ${round ? 'rounded-full' : MARK_RADII[size]}`;

  if (logoUrl && !broken) {
    return <img src={logoUrl} alt="" onError={() => setBroken(true)} className={`tp-job-logo ${box}`} />;
  }
  return (
    <span aria-hidden="true" className={`tp-brand-mark shrink-0 font-bold ${box}`}>
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

/** "Posted 3 days ago". Renders nothing when the publish date is unknown. */
export function PostedAt({ iso, className = 'tp-job-posted' }: Readonly<{ iso?: string | null; className?: string }>) {
  if (!iso) return null;
  const when = formatRelativeTime(iso);
  if (when === '—') return null;
  return <p className={className}>Posted {when}</p>;
}

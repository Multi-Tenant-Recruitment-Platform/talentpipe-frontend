import type { CSSProperties } from 'react';
import { companyInitials } from '../../dashboard/companyProfile';

/**
 * The company's logo, or a monogram when there isn't one.
 *
 * <p>The fallback is initials on the brand gradient rather than a generic
 * building glyph: every company without a logo would otherwise look like the
 * same company. Used by both profile surfaces and sized by prop, so the logo
 * never drifts between them.</p>
 */

const SIZES = {
  sm: 'size-12 rounded-sm text-[14px]',
  md: 'size-16 rounded-lg text-[18px]',
  lg: 'size-24 rounded-xl text-[24px]',
} as const;

type CompanyLogoSize = keyof typeof SIZES;

export function CompanyLogo({
  src,
  name,
  size = 'md',
  className = '',
  style,
}: Readonly<{
  src: string | null;
  name: string;
  size?: CompanyLogoSize;
  className?: string;
  style?: CSSProperties;
}>) {
  const shape = `shrink-0 overflow-hidden ${SIZES[size]} ${className}`;

  if (src) {
    return (
      <img
        src={src}
        // The name, not "logo": a screen reader announcing "ABC Technologies
        // logo, image" says the word twice.
        alt={name || 'Company logo'}
        className={`border border-slate-200 bg-surface object-contain ${shape}`}
        style={style}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`flex items-center justify-center bg-(image:--tp-brand-gradient) font-semibold tracking-display text-white ${shape}`}
      style={style}
    >
      {companyInitials(name)}
    </span>
  );
}

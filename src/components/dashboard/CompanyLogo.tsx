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
  sm: 'h-12 w-12 rounded-lg text-sm',
  md: 'h-16 w-16 rounded-xl text-lg',
  lg: 'h-24 w-24 rounded-2xl text-2xl',
} as const;

export type CompanyLogoSize = keyof typeof SIZES;

export function CompanyLogo({
  src,
  name,
  size = 'md',
  className = '',
}: {
  src: string | null;
  name: string;
  size?: CompanyLogoSize;
  className?: string;
}) {
  const shape = `${SIZES[size]} shrink-0 overflow-hidden ${className}`;

  if (src) {
    return (
      <img
        src={src}
        // The name, not "logo": a screen reader announcing "ABC Technologies
        // logo, image" says the word twice.
        alt={name || 'Company logo'}
        className={`${shape} border border-slate-200 bg-white object-contain`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${shape} flex items-center justify-center bg-gradient-to-br from-indigo-600 to-violet-600 font-semibold tracking-tight text-white`}
    >
      {companyInitials(name)}
    </span>
  );
}

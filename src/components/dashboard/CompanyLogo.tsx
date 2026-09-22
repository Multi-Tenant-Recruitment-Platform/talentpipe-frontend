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
  sm: { box: 48, radius: 8, font: 14 },
  md: { box: 64, radius: 12, font: 18 },
  lg: { box: 96, radius: 16, font: 24 },
} as const;

export type CompanyLogoSize = keyof typeof SIZES;

export function CompanyLogo({
  src,
  name,
  size = 'md',
  style,
}: Readonly<{
  src: string | null;
  name: string;
  size?: CompanyLogoSize;
  style?: CSSProperties;
}>) {
  const { box, radius, font } = SIZES[size];
  const shape: CSSProperties = {
    width: box,
    height: box,
    borderRadius: radius,
    flexShrink: 0,
    overflow: 'hidden',
    ...style,
  };

  if (src) {
    return (
      <img
        src={src}
        // The name, not "logo": a screen reader announcing "ABC Technologies
        // logo, image" says the word twice.
        alt={name || 'Company logo'}
        style={{
          ...shape,
          border: '1px solid #e2e8f0',
          background: '#fff',
          objectFit: 'contain',
        }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{
        ...shape,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--tp-brand-gradient)',
        color: '#fff',
        fontSize: font,
        fontWeight: 600,
        letterSpacing: '-0.02em',
      }}
    >
      {companyInitials(name)}
    </span>
  );
}

import type { ReactNode } from 'react';
import { pageContainer } from '../ui/classes';

/**
 * The light-lavender hero surface used on public job pages.
 * Matches the wireframe: pale purple gradient background, no dark slate.
 */
export function HeroBackdrop() {
  return (
    <>
      {/* Light lavender gradient — matches wireframe */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 45%, #ddd6fe 100%)',
        }}
      />
      {/* Subtle dot grid texture */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-30"
        style={{
          backgroundImage: 'radial-gradient(#7c3aed 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent)',
        }}
      />
    </>
  );
}

/** The class a {@link HeroBackdrop} host needs: a positioning context that clips decorations. */
export const heroSurface = 'relative isolate overflow-hidden bg-violet-50';

/**
 * The full-width hero strip on the job board. Light lavender background
 * matching the wireframe design.
 */
export function HeroBand({
  children,
  className = '',
}: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <div className={heroSurface}>
      <HeroBackdrop />
      <div className={`${pageContainer} ${className}`}>{children}</div>
    </div>
  );
}

/** A small pill on the hero strip. */
export const heroChip =
  'inline-flex max-w-full items-center gap-1.5 rounded-pill border border-violet-200 bg-white/70 px-3 py-1 text-small font-medium text-violet-700';

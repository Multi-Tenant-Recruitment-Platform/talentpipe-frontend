import type { ReactNode } from 'react';
import { pageContainer } from '../ui/classes';

/**
 * TalentPipe's signature surface: slate deepening into the brand blue, two
 * soft glows and a fading dot grid. Absolutely positioned — drop it as the
 * first child of a `relative isolate overflow-hidden bg-slate-900` element and
 * it fills that element behind the content.
 *
 * <p>Every hero in the product draws from this one component — the job
 * board's strip, a job's details and application, each dashboard page header
 * and the candidate's profile — so they are one surface, not five lookalikes.
 * Decoration only; text on it is white, slate-300 or slate-400, all of which
 * clear 4.5:1 from the slate top to the primary-900 bottom.</p>
 */
export function HeroBackdrop() {
  return (
    <>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-b from-slate-900 via-slate-900 to-primary-900" />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(var(--tp-slate-700)_1px,transparent_1px)] bg-size-[22px_22px] opacity-40 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
      />
      {/* The brand mark, background removed (public/hero-mark.png). Anchored
          right so it sits clear of the left-aligned hero copy, and kept at
          low opacity so it reads as a watermark — text contrast is unchanged. */}
      <img
        src="/hero-mark.png"
        alt=""
        aria-hidden="true"
        decoding="async"
        draggable={false}
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full select-none object-cover object-right opacity-40"
      />
      <div aria-hidden="true" className="absolute -right-32 -bottom-40 -z-10 size-[28rem] rounded-full bg-primary-500/25 blur-3xl" />
    </>
  );
}

/** The class a {@link HeroBackdrop} host needs: a positioning context that clips the glows. */
export const heroSurface = 'relative isolate overflow-hidden bg-slate-900';

/**
 * The full-width strip the public job pages open with — the board, a job's
 * details and its application form — so the three read as one product. The
 * header above it is the same slate, so the two read as one surface.
 */
export function HeroBand({ children, className = '' }: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <div className={heroSurface}>
      <HeroBackdrop />
      <div className={`${pageContainer} ${className}`}>{children}</div>
    </div>
  );
}

/** A small pill on the dark strip: where, how and how many, at a glance. */
export const heroChip =
  'inline-flex max-w-full items-center gap-1.5 rounded-pill border border-slate-600 bg-slate-800/60 px-3 py-1 text-small font-medium text-slate-100';

import { useId } from 'react';

/**
 * The TalentPipe mark's two strokes, vectorised from the supplied logo artwork
 * (`viewBox="0 0 128 100"`). The second stroke carries its own slot, cut out
 * with the even-odd rule.
 */
const MARK_PATHS = [
  'M14.5 0.2L62.9 0.2L53.1 7.2L46.9 14.1L25.2 14.1L24 15L19.9 27.3L20.3 28.5L40 28.5L35 42.8L0.2 42.8Z',
  'M80.9 0.2L127.7 0.2L113.3 42.8L84.2 43.2L65.4 99.8L22.3 99.8L45.7 28.9L49 21.9L53.1 15.8L60 8.8L68.2 3.9Z' +
    'M90 14.5L107.6 15L103.5 27.7L84.2 28.1L79.7 29.3L76.4 31.4L73.2 34.6L70.3 40L55.5 85L42 85L59.6 32.6L63.3 26L67.8 21.1L73.6 17.4L81.4 15Z',
];

/**
 * The TalentPipe mark: a slanted "T" of two interlocking strokes, cyan at the
 * foot running to violet at the top right.
 *
 * <p>An inline SVG rather than the supplied JPG: it stays sharp at every size
 * and density, has no baked-in background to show as a box on light or dark
 * surfaces, and takes its colours from the `--tp-logo-*` tokens. Decorative —
 * wherever it appears the name is written beside it or the link around it is
 * labelled — so it is hidden from assistive technology.</p>
 */
export function BrandMark({ className = 'h-8 w-auto' }: Readonly<{ className?: string }>) {
  // One gradient per instance: the header, the sidebar and the login popup can
  // all be on screen at once, and a shared id would tie them to whichever
  // instance happened to render first.
  const gradientId = `tp-logo-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 128 100" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id={gradientId} x1="0.1" y1="1" x2="0.95" y2="0">
          <stop offset="0.2" style={{ stopColor: 'var(--tp-logo-cyan)' }} />
          <stop offset="1" style={{ stopColor: 'var(--tp-logo-violet)' }} />
        </linearGradient>
      </defs>
      {MARK_PATHS.map((d) => (
        <path key={d.slice(0, 16)} d={d} fill={`url(#${gradientId})`} fillRule="evenodd" />
      ))}
    </svg>
  );
}

/**
 * The mark with the name beside it, as the logo is set.
 *
 * <p>`tone` is the surface it sits on. On a dark surface the name takes the
 * mark's own gradient, as in the artwork; on a light one it is slate-900 — the
 * gradient's cyan end would wash out on white. The name stays live text, so it
 * is read, translated and selected like any other, and is the logo's
 * accessible name wherever it is not otherwise labelled.</p>
 */
export function BrandLogo({
  tone,
  showName = true,
  markClassName = 'h-8 w-auto',
  nameClassName = 'text-title',
}: Readonly<{
  tone: 'dark' | 'light';
  /** Off on the narrowest screens, where the mark alone carries the brand. */
  showName?: boolean;
  markClassName?: string;
  /** The name's size; colour and weight come from `tone`. */
  nameClassName?: string;
}>) {
  const nameTone =
    tone === 'dark'
      ? 'bg-linear-to-r from-(--tp-logo-cyan) to-(--tp-logo-violet) bg-clip-text text-transparent'
      : 'text-slate-900';
  return (
    <span className="inline-flex items-center gap-2.5">
      <BrandMark className={markClassName} />
      {showName && (
        <span className={`font-bold tracking-heading whitespace-nowrap ${nameClassName} ${nameTone}`}>
          TalentPipe
        </span>
      )}
    </span>
  );
}

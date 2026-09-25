/**
 * TalentPipe design tokens — the single source of truth for the visual system.
 *
 * <p>Every colour, size, space and radius in the app resolves to a value in
 * this file. `src/styles/tokens.css` mirrors it as CSS custom properties for
 * the rules that cannot be expressed as antd tokens, and `tokens.test.ts`
 * fails the build if the two ever drift apart. Nothing else may introduce a
 * raw hex.</p>
 *
 * <h3>Colour policy</h3>
 *
 * <p>Slate carries the interface. Brand blue means exactly one thing: <em>this
 * is actionable, or this is where you are</em>. Green, amber and red appear
 * only where they carry status meaning — success, warning, error — and never
 * as decoration. There is no fourth family: a chart, an avatar or a badge that
 * wants its own hue is asking for colour to do a job that a label, a position
 * or a weight already does better.</p>
 *
 * <p>Contrast is a property of the pair, not the colour. Every value used for
 * text is verified against the surfaces it actually sits on — white, the
 * canvas, and the slate-100 tint — at the 4.5:1 floor for normal text. The
 * `*Text` variants exist because the base status colours are legible as fills
 * but fail as small text.</p>
 */

/* --- Slate neutrals ------------------------------------------------------ */

export const slate = {
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  /** Borders and disabled marks only — 2.56:1 on white, never legible as text. */
  400: '#94a3b8',
  /** Secondary text on white (4.76:1) and canvas (4.51:1). Not on slate-100. */
  500: '#64748b',
  /** Secondary text anywhere, including on tints (6.92:1 worst case). */
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
} as const;

/* --- Brand blue ---------------------------------------------------------- */

export const primary = {
  /** Active navigation tint and the ground for primary-700 text (6.36:1). */
  50: '#eef3ff',
  100: '#dce6ff',
  200: '#c7d6ff',
  /** Hover: brightened, deliberately short of neon. */
  500: '#3b6bf6',
  /** The accent itself — 5.04:1 on white, so it is legible as text. */
  600: '#2f5eff',
  /** Pressed, and text sitting on the 50 tint. */
  700: '#2348d6',
  /** The photographic scrim behind the auth panel. */
  900: '#16307f',
  /** The deepest step, reserved for scrims that must hold white text over a
      photograph. Never a surface colour. */
  950: '#0d1f52',
} as const;

/**
 * The one sanctioned multi-step ramp, for ordered data that must be read as
 * adjacent segments — the stacked pipeline bar and its legend.
 *
 * <p>One hue, five lightness steps, because the hiring stages are a *sequence*
 * (Applied through Hired), not five unrelated categories. Adjacent steps sit
 * 1.5–1.7:1 apart, which is what makes the boundary between two segments
 * visible. The palest step is only 1.85:1 against white, so every mark drawn
 * with this ramp also takes {@link dataMarkRing} — the hairline is what keeps
 * the light end from disappearing on a white card.</p>
 *
 * <p>This is not a general-purpose palette. Anything that is not ordered data
 * uses a single colour.</p>
 */
export const dataSequence = ['#a8bdfd', '#6f8ffa', '#3b6bf6', '#2348d6', '#16307f'] as const;

/** Hairline on any filled data mark, so a pale segment still has an edge. */
export const dataMarkRing = 'inset 0 0 0 1px rgb(15 23 42 / 12%)';

/* --- Status ------------------------------------------------------------- */

/**
 * Base values read as fills, marks and borders. Their `*Text` counterparts are
 * the only ones allowed to carry small text: the bases measure 3.19–4.83:1 on
 * white and would fail the body-text floor.
 */
export const status = {
  success: '#059669',
  successBg: '#d1fae5',
  /** 5.01:1 worst case, 4.84:1 on its own tint. */
  successText: '#047857',

  warning: '#d97706',
  warningBg: '#fef3c7',
  /** 4.58:1 worst case, 4.51:1 on its own tint. */
  warningText: '#b45309',

  error: '#dc2626',
  errorBg: '#fee2e2',
  /** 5.91:1 worst case, 5.30:1 on its own tint. */
  errorText: '#b91c1c',
} as const;

/* --- Surfaces ------------------------------------------------------------ */

export const surface = {
  /** Cards, menus, popovers — everything that sits above the canvas. */
  base: '#ffffff',
  /** The canvas behind every card; a touch cooler than plain grey. */
  canvas: '#f7f9fc',
  /** Inset wells: table headers, search fields, segmented tracks. */
  sunken: '#f1f5f9',
} as const;

/* --- Spacing ------------------------------------------------------------- */

/**
 * An 8px baseline with 4px half-steps for the inside of tight groups. Named by
 * step rather than by pixel so a value can be retuned without a rename.
 */
export const space = {
  '0.5': 4,
  /**
   * The tight-pairing step: a label to its help text, an icon to its word.
   * Off the 8px baseline on purpose — at 8 the help text reads as a separate
   * block rather than as part of the field above it. Used in ~30 places, which
   * is what makes it a system value rather than a local exception.
   */
  '0.75': 6,
  1: 8,
  1.5: 12,
  2: 16,
  2.5: 20,
  3: 24,
  4: 32,
  5: 40,
  6: 48,
  8: 64,
} as const;

/* --- Type ---------------------------------------------------------------- */

/**
 * Named by role, not by size, so a caption stays a caption when the scale is
 * retuned. Steps are wide enough to read as deliberate hierarchy: consecutive
 * levels never differ by less than 2px.
 */
export const fontSize = {
  /** Keycaps, table meta, the smallest legible label. */
  caption: 12,
  /** Field help, badge text, card subtitles. */
  small: 13,
  /** Body default. */
  body: 14,
  /** Lead paragraphs and card values. */
  lead: 16,
  /** Card and section titles. */
  title: 18,
  /** Section headings inside a page. */
  section: 20,
  /** Page titles — every dashboard and auth page h1. */
  heading: 26,
  /** Public page titles, which carry more air around them. */
  display: 30,
  /** The landing hero, and nothing else. */
  hero: 48,
} as const;

export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const lineHeight = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.55,
} as const;

/**
 * Optical tracking. Large type needs negative tracking to hold together; small
 * uppercase needs positive tracking to stay readable.
 */
export const letterSpacing = {
  display: '-0.02em',
  heading: '-0.01em',
  normal: '0',
  caps: '0.06em',
} as const;

/**
 * IBM Plex Sans, loaded by the @import in index.css.
 *
 * <p>Chosen over Inter deliberately. Plex was drawn for engineered, serious
 * software and carries a little more character in its letterforms while
 * staying entirely credible for a product that mediates people's careers.
 * It keeps what a dense dashboard actually needs: true tabular figures, a
 * full weight range, and legibility at 12px.</p>
 *
 * <p>The fallback stack is real, not decorative — every face named here is
 * present on some platform, so a failed webfont degrades to a comparable
 * grotesque rather than to Times.</p>
 */
export const fontFamily =
  "'IBM Plex Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/**
 * Digits that line up in a column. Anything comparable down a table or a KPI
 * row uses this, so the eye can compare magnitude by width.
 */
export const fontNumeric = 'tabular-nums';

/* --- Radius -------------------------------------------------------------- */

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  '2xl': 24,
  pill: 999,
} as const;

/* --- Elevation ----------------------------------------------------------- */

/**
 * Every shadow carries an offset and a soft blur — a close contact shadow plus
 * a wide diffuse one reads as depth, where a single heavy drop reads as a
 * border. No zero-offset halos.
 */
export const shadow = {
  xs: '0 1px 2px rgb(15 23 42 / 4%)',
  sm: '0 1px 2px rgb(15 23 42 / 6%), 0 1px 3px rgb(15 23 42 / 8%)',
  md: '0 4px 12px -2px rgb(15 23 42 / 8%), 0 2px 4px -2px rgb(15 23 42 / 6%)',
  lg: '0 12px 32px -8px rgb(15 23 42 / 18%), 0 4px 8px -4px rgb(15 23 42 / 8%)',
  xl: '0 24px 48px -12px rgb(15 23 42 / 25%)',
  /** The accent's own contact shadow, tinted so it belongs to the button. */
  primary: '0 1px 2px rgb(47 94 255 / 24%)',
} as const;

/** The focus ring's colour, for APIs that want a colour rather than a shadow. */
export const focusRingColor = 'rgb(47 94 255 / 12%)';

/** The focus ring. One definition, so every focusable thing rings identically. */
export const focusRing = `0 0 0 3px ${focusRingColor}`;

/* --- Breakpoints --------------------------------------------------------- */

/** Aligned to antd's own grid, so CSS and Col props never disagree. */
export const breakpoint = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

/* --- Layout -------------------------------------------------------------- */

export const layout = {
  headerHeight: 64,
  sidebarWidth: 256,
  contentMaxWidth: 1280,
  controlHeight: 40,
} as const;

/* --- Motion -------------------------------------------------------------- */

/**
 * One duration for state changes, one easing. Motion here acknowledges input;
 * it does not perform. Anything longer than `slow` is animation for its own
 * sake and does not belong in an operate-mode surface.
 */
export const motion = {
  fast: '120ms',
  base: '200ms',
  slow: '320ms',
  /** Exponential ease-out: fast departure, settled arrival. */
  ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

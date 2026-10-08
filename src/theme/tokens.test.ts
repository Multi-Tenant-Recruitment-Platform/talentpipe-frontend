import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Read from disk rather than imported: vitest runs with `css: false`, which
// stubs every stylesheet import — including `?raw` — to an empty string. The
// path is relative, so it resolves against the working directory without
// needing the `process` global that this tsconfig deliberately does not expose.
const css = readFileSync('src/styles/tokens.css', 'utf8');
import {
  dataMarkRing,
  dataSequence,
  fontSize,
  fontWeight,
  layout,
  letterSpacing,
  lineHeight,
  motion,
  primary,
  radius,
  shadow,
  slate,
  space,
  status,
  surface,
  focusRing,
} from './tokens';

/**
 * The design system has two readers: antd reads the TypeScript, hand-written
 * CSS reads the custom properties. Two copies of a value is two chances to
 * drift, and a drifted token is the kind of defect nobody notices until a blue
 * somewhere is subtly the wrong blue.
 *
 * <p>This parses the real CSS file and asserts every mirrored value matches.
 * It is why `tokens.css` can be trusted as a mirror rather than a second
 * source of truth.</p>
 */

/** Every `--tp-*: value;` declaration in the file, normalised for comparison. */
const declared = new Map<string, string>(
  [...css.matchAll(/(--tp-[a-z0-9-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [
    name,
    value.trim().replace(/\s+/g, ' '),
  ]),
);

function cssVar(name: string): string {
  const value = declared.get(name);
  if (value === undefined) {
    throw new Error(`tokens.css is missing ${name}`);
  }
  return value;
}

describe('tokens.css mirrors tokens.ts', () => {
  it.each(Object.entries(slate))('slate-%s', (step, hex) => {
    expect(cssVar(`--tp-slate-${step}`)).toBe(hex);
  });

  it.each(Object.entries(primary))('primary-%s', (step, hex) => {
    expect(cssVar(`--tp-primary-${step}`)).toBe(hex);
  });

  it('status colours', () => {
    expect(cssVar('--tp-success')).toBe(status.success);
    expect(cssVar('--tp-success-bg')).toBe(status.successBg);
    expect(cssVar('--tp-success-text')).toBe(status.successText);
    expect(cssVar('--tp-warning')).toBe(status.warning);
    expect(cssVar('--tp-warning-bg')).toBe(status.warningBg);
    expect(cssVar('--tp-warning-text')).toBe(status.warningText);
    expect(cssVar('--tp-error')).toBe(status.error);
    expect(cssVar('--tp-error-bg')).toBe(status.errorBg);
    expect(cssVar('--tp-error-text')).toBe(status.errorText);
  });

  it('surfaces', () => {
    expect(cssVar('--tp-surface')).toBe(surface.base);
    expect(cssVar('--tp-canvas')).toBe(surface.canvas);
    expect(cssVar('--tp-sunken')).toBe(surface.sunken);
  });

  it.each(Object.entries(space))('space-%s', (step, px) => {
    // `1.5` is not a legal custom-property name, so the scale uses a dash.
    expect(cssVar(`--tp-space-${String(step).replace('.', '-')}`)).toBe(`${px}px`);
  });

  it.each(Object.entries(fontSize))('font-%s', (role, px) => {
    expect(cssVar(`--tp-font-${role}`)).toBe(`${px}px`);
  });

  it.each(Object.entries(fontWeight))('weight-%s', (name, weight) => {
    expect(cssVar(`--tp-weight-${name}`)).toBe(String(weight));
  });

  it.each(Object.entries(lineHeight))('leading-%s', (name, value) => {
    expect(cssVar(`--tp-leading-${name}`)).toBe(String(value));
  });

  it('tracking', () => {
    expect(cssVar('--tp-tracking-display')).toBe(letterSpacing.display);
    expect(cssVar('--tp-tracking-heading')).toBe(letterSpacing.heading);
    expect(cssVar('--tp-tracking-caps')).toBe(letterSpacing.caps);
  });

  it.each(Object.entries(radius))('radius-%s', (name, px) => {
    expect(cssVar(`--tp-radius-${name}`)).toBe(`${px}px`);
  });

  it.each(Object.entries(shadow))('shadow-%s', (name, value) => {
    expect(cssVar(`--tp-shadow-${name}`)).toBe(value);
  });

  it('data ramp', () => {
    dataSequence.forEach((hex, i) => {
      expect(cssVar(`--tp-data-${i + 1}`)).toBe(hex);
    });
    expect(cssVar('--tp-data-ring')).toBe(dataMarkRing);
  });

  it('focus ring', () => {
    expect(cssVar('--tp-focus-ring')).toBe(focusRing);
  });

  it('layout', () => {
    expect(cssVar('--tp-header-height')).toBe(`${layout.headerHeight}px`);
    expect(cssVar('--tp-sidebar-width')).toBe(`${layout.sidebarWidth}px`);
    expect(cssVar('--tp-content-max-width')).toBe(`${layout.contentMaxWidth}px`);
  });

  it.each(['fast', 'base', 'slow'] as const)('motion-%s', (name) => {
    expect(cssVar(`--tp-motion-${name}`)).toBe(motion[name]);
  });

  it('motion easing', () => {
    expect(cssVar('--tp-motion-ease')).toBe(motion.ease);
  });
});

/**
 * Contrast is the one visual property that is objectively checkable, so it is
 * checked here rather than left to a reviewer's eye. These ratios are the
 * reason the `*Text` status variants exist at all.
 */
describe('contrast', () => {
  const luminance = (hex: string): number => {
    const channels = (hex.replace('#', '').match(/../g) ?? []).map((pair) => {
      const srgb = parseInt(pair, 16) / 255;
      return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };

  const ratio = (a: string, b: string): number => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  /** Every ground that text is allowed to sit on. */
  const GROUNDS = [surface.base, surface.canvas, surface.sunken];

  const BODY_TEXT_FLOOR = 4.5;

  it.each([
    ['slate-600', slate[600]],
    ['slate-700', slate[700]],
    ['slate-900', slate[900]],
    ['primary-600', primary[600]],
    ['primary-700', primary[700]],
  ])('%s is legible as body text on every surface', (_name, hex) => {
    for (const ground of GROUNDS) {
      expect(ratio(hex, ground)).toBeGreaterThanOrEqual(BODY_TEXT_FLOOR);
    }
  });

  // slate-500 is the secondary-text token. It clears the floor on white and on
  // the canvas but NOT on the sunken tint (4.34:1) — which is exactly why
  // slate-600 exists and why secondary text on a tinted chip must use it.
  it('slate-500 is legible on white and canvas, but not on the sunken tint', () => {
    expect(ratio(slate[500], surface.base)).toBeGreaterThanOrEqual(BODY_TEXT_FLOOR);
    expect(ratio(slate[500], surface.canvas)).toBeGreaterThanOrEqual(BODY_TEXT_FLOOR);
    expect(ratio(slate[500], surface.sunken)).toBeLessThan(BODY_TEXT_FLOOR);
  });

  it.each([
    ['success', status.successText, status.successBg],
    ['warning', status.warningText, status.warningBg],
    ['error', status.errorText, status.errorBg],
  ])('%s text is legible on every surface and on its own tint', (_name, text, tint) => {
    for (const ground of [...GROUNDS, tint]) {
      expect(ratio(text, ground)).toBeGreaterThanOrEqual(BODY_TEXT_FLOOR);
    }
  });

  it('primary-700 is legible on the primary-50 navigation tint', () => {
    expect(ratio(primary[700], primary[50])).toBeGreaterThanOrEqual(BODY_TEXT_FLOOR);
  });

  // Guards the rule rather than the value: if someone promotes slate-400 to a
  // text token, this fails and explains why.
  it('slate-400 is not legible as text and must stay a border/mark colour', () => {
    expect(ratio(slate[400], surface.base)).toBeLessThan(3);
  });

  // The stacked bar is read by where one segment ends and the next begins, so
  // what matters is neighbour-to-neighbour separation, not contrast with the
  // page. 1.4 is the floor at which that boundary stays visible.
  it('adjacent steps of the data ramp are distinguishable from each other', () => {
    for (let i = 1; i < dataSequence.length; i += 1) {
      expect(ratio(dataSequence[i], dataSequence[i - 1])).toBeGreaterThanOrEqual(1.4);
    }
  });

  it('the data ramp runs monotonically dark, so order is readable as depth', () => {
    for (let i = 1; i < dataSequence.length; i += 1) {
      expect(ratio(dataSequence[i], surface.base)).toBeGreaterThan(
        ratio(dataSequence[i - 1], surface.base),
      );
    }
  });
});

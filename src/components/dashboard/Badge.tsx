import { Tag } from 'antd';
import type { ReactNode } from 'react';

/**
 * The tone vocabulary for status pills.
 *
 * <p>Semantic, not decorative. `success`, `warning` and `danger` mean the
 * state they name; `accent` marks elevated privilege or the current thing;
 * `neutral` is everything else, which is most things. There is deliberately no
 * per-category hue — a pill's meaning comes from its label, and inventing a
 * violet for "HR Manager" spends colour on a distinction the word already
 * makes.</p>
 */
export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

/**
 * Tokens rather than antd's preset colour names: the presets (`geekblue`,
 * `gold`, `purple`) resolve to Ant Design's own palette, which is not this
 * product's palette, so a preset pill would sit a few degrees off every other
 * blue on the page.
 *
 * <p>Each pair is contrast-checked in src/theme/tokens.test.ts — the `*Text`
 * values exist precisely because the base status colours fail as small text.</p>
 */
const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: 'border-slate-200 bg-slate-100 text-slate-700',
  accent: 'border-primary-100 bg-primary-50 text-primary-700',
  success: 'border-success-bg bg-success-bg text-success-text',
  warning: 'border-warning-bg bg-warning-bg text-warning-text',
  danger: 'border-error-bg bg-error-bg text-error-text',
};

/** Small status/role pill. */
export function Badge({
  tone = 'neutral',
  children,
}: Readonly<{ tone?: BadgeTone; children: ReactNode }>) {
  // Never `closable`: these are read-only status markers, and a close
  // affordance would put a button in every table row that asserts it has none.
  return (
    <Tag className={`me-0 rounded-pill font-medium ${TONE_CLASS[tone]}`}>
      {children}
    </Tag>
  );
}

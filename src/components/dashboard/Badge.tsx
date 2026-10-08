import { Tag } from 'antd';
import type { ReactNode } from 'react';
import { primary, radius, slate, status } from '../../theme/tokens';

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
const TONE_STYLE: Record<BadgeTone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: slate[100], fg: slate[700], border: slate[200] },
  accent: { bg: primary[50], fg: primary[700], border: primary[100] },
  success: { bg: status.successBg, fg: status.successText, border: status.successBg },
  warning: { bg: status.warningBg, fg: status.warningText, border: status.warningBg },
  danger: { bg: status.errorBg, fg: status.errorText, border: status.errorBg },
};

/** Small status/role pill. */
export function Badge({
  tone = 'neutral',
  children,
}: Readonly<{ tone?: BadgeTone; children: ReactNode }>) {
  const style = TONE_STYLE[tone];

  // Never `closable`: these are read-only status markers, and a close
  // affordance would put a button in every table row that asserts it has none.
  return (
    <Tag
      style={{
        marginInlineEnd: 0,
        borderRadius: radius.pill,
        background: style.bg,
        borderColor: style.border,
        color: style.fg,
        fontWeight: 500,
      }}
    >
      {children}
    </Tag>
  );
}

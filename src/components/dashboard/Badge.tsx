import { Tag } from 'antd';
import type { ReactNode } from 'react';

export type BadgeTone = 'indigo' | 'violet' | 'emerald' | 'amber' | 'slate' | 'red' | 'sky';

/**
 * The app's tone vocabulary mapped onto antd's preset tag colours, so every
 * pill picks up the theme instead of carrying its own tint.
 */
const TONE_COLORS: Record<BadgeTone, string> = {
  indigo: 'geekblue',
  violet: 'purple',
  emerald: 'green',
  amber: 'gold',
  slate: 'default',
  red: 'red',
  sky: 'blue',
};

/** Small status/role pill. */
export function Badge({
  tone = 'slate',
  children,
}: Readonly<{ tone?: BadgeTone; children: ReactNode }>) {
  // Never `closable`: these are read-only status markers, and a close affordance
  // would put a button in every table row that asserts it has none.
  return (
    <Tag color={TONE_COLORS[tone]} style={{ marginInlineEnd: 0, borderRadius: 999 }}>
      {children}
    </Tag>
  );
}

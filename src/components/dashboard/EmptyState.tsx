import { Empty, Typography } from 'antd';
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

const TONES = {
  indigo: { bg: '#eef2ff', fg: '#4f46e5' },
  emerald: { bg: '#d1fae5', fg: '#059669' },
  slate: { bg: '#f1f5f9', fg: '#64748b' },
} as const;

/**
 * Centred icon + headline + explanation, with an optional call to action.
 *
 * <p>Extracted because this markup was hand-rolled twice inside TeamPage with
 * slightly different spacing, and an empty state without a next step is a dead
 * end — the `action` slot exists to make that hard to forget.</p>
 */
export function EmptyState({
  icon,
  tone = 'indigo',
  title,
  description,
  action,
  className = '',
}: Readonly<{
  icon: IconName;
  tone?: keyof typeof TONES;
  title: string;
  description: string;
  action?: ReactNode;
  /** Transitional: callers still passing Tailwind spacing. Removed with Tailwind. */
  className?: string;
}>) {
  const tones = TONES[tone];

  return (
    <Empty
      className={className}
      style={{ paddingBlock: 40 }}
      image={
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: tones.bg,
            color: tones.fg,
          }}
        >
          <Icon name={icon} size={24} />
        </span>
      }
      imageStyle={{ height: 48, display: 'flex', justifyContent: 'center' }}
      description={
        <>
          <Typography.Paragraph strong style={{ marginBottom: 4 }}>
            {title}
          </Typography.Paragraph>
          <Typography.Text type="secondary" style={{ display: 'block', maxWidth: 384, margin: '0 auto' }}>
            {description}
          </Typography.Text>
        </>
      }
    >
      {action}
    </Empty>
  );
}

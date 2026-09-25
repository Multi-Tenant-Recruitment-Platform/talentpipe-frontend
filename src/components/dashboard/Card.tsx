import { Card as AntCard, Typography } from 'antd';
import type { ReactNode } from 'react';
import { fontSize } from '../../theme/tokens';

/**
 * Section card shell shared by every dashboard surface: optional header row
 * (title + subtitle + right-aligned action slot) above a padded body.
 *
 * <p>Kept as a wrapper rather than using antd's `Card` directly so the subtitle
 * stays part of the header contract — antd has no subtitle slot, and without
 * this every caller would rebuild the same two-line title by hand.</p>
 */
export function Card({
  title,
  subtitle,
  action,
  children,
  bodyClassName = '',
}: Readonly<{
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  /**
   * For bodies that must break the card's own padding — a table that bleeds to
   * the edges, a list with its own inner rhythm. Layout only; a caller reaching
   * for it to restyle the card is working around the system rather than in it.
   */
  bodyClassName?: string;
}>) {
  const header =
    title || subtitle ? (
      <div style={{ minWidth: 0, paddingBlock: 4 }}>
        {title && (
          <Typography.Title level={2} style={{ fontSize: fontSize.lead, margin: 0 }}>
            {title}
          </Typography.Title>
        )}
        {subtitle && (
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: fontSize.caption, marginTop: 2 }}>
            {subtitle}
          </Typography.Text>
        )}
      </div>
    ) : undefined;

  return (
    <AntCard
      title={header}
      extra={action}
      classNames={{ body: bodyClassName }}
      styles={{ header: { border: 0 } }}
    >
      {children}
    </AntCard>
  );
}

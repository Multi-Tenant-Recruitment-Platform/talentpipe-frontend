import { Card as AntCard, Typography } from 'antd';
import type { ReactNode } from 'react';

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
  className = '',
  bodyClassName = '',
}: Readonly<{
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  /** Transitional: callers still passing Tailwind spacing. Removed with Tailwind. */
  className?: string;
  bodyClassName?: string;
}>) {
  const header =
    title || subtitle ? (
      <div style={{ minWidth: 0, paddingBlock: 4 }}>
        {title && (
          <Typography.Title level={2} style={{ fontSize: 16, margin: 0 }}>
            {title}
          </Typography.Title>
        )}
        {subtitle && (
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
            {subtitle}
          </Typography.Text>
        )}
      </div>
    ) : undefined;

  return (
    <AntCard
      className={className}
      title={header}
      extra={action}
      classNames={{ body: bodyClassName }}
      styles={{ header: { border: 0 } }}
    >
      {children}
    </AntCard>
  );
}

import { Card as AntCard, Flex, Typography } from 'antd';
import type { ReactNode } from 'react';
import { SampleDataTag } from './SampleDataTag';

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
  sample = false,
}: Readonly<{
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  /** The body shows fixture data, not API data — labels it as such. */
  sample?: boolean;
  /**
   * For bodies that must break the card's own padding — a table that bleeds to
   * the edges, a list with its own inner rhythm. Layout only; a caller reaching
   * for it to restyle the card is working around the system rather than in it.
   */
  bodyClassName?: string;
}>) {
  const header =
    title || subtitle ? (
      <div className="min-w-0 py-1">
        {title && (
          <Flex align="center" gap={8} wrap>
            <Typography.Title level={2} className="m-0 text-title tracking-heading">
              {title}
            </Typography.Title>
            {sample && <SampleDataTag />}
          </Flex>
        )}
        {subtitle && (
          <Typography.Text type="secondary" className="mt-0.5 block text-caption">
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

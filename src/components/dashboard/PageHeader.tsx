import { Flex, Space, Typography } from 'antd';
import type { ReactNode } from 'react';
import { fontSize } from '../../theme/tokens';

/**
 * Consistent page heading row: title + subtitle on the left, actions right.
 *
 * <p>No kicker above the title. The sidebar's active item already says which
 * section you are in, so a small "Workspace" over the heading restated the
 * navigation and pushed the real title down a row.</p>
 */
export function PageHeader({
  title,
  subtitle,
  children,
}: Readonly<{
  title: string;
  subtitle?: string;
  children?: ReactNode;
}>) {

  return (
    <Flex wrap align="flex-end" justify="space-between" gap={16} style={{ marginBottom: 32 }}>
      <div style={{ minWidth: 0 }}>
        <Typography.Title level={1} style={{ fontSize: fontSize.heading, margin: 0 }}>
          {title}
        </Typography.Title>
        {subtitle && (
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 6 }}>
            {subtitle}
          </Typography.Text>
        )}
      </div>
      {/* Space with an explicit centre alignment, not ad-hoc margins: every
          action lands on one baseline and inherits the same control height
          from the theme, so a secondary and a primary button can never end up
          a pixel out of step. Order is conventional — secondary first, primary
          last and closest to the edge, where the eye finishes. */}
      {children && (
        <Space size={8} align="center" wrap>
          {children}
        </Space>
      )}
    </Flex>
  );
}

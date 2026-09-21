import { Flex, Typography, theme } from 'antd';
import type { ReactNode } from 'react';

/**
 * Consistent page heading row: title + subtitle on the left, actions right.
 *
 * <p>The optional eyebrow repeats the auth pages' heading pattern (small
 * uppercase brand-tone label above a large title), so page identity is
 * scannable before the eye reaches the title itself.</p>
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  children,
}: Readonly<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}>) {
  const { token } = theme.useToken();

  return (
    <Flex wrap align="flex-end" justify="space-between" gap={16} style={{ marginBottom: 32 }}>
      <div style={{ minWidth: 0 }}>
        {eyebrow && (
          <Typography.Text
            style={{
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: token.colorPrimary,
            }}
          >
            {eyebrow}
          </Typography.Text>
        )}
        <Typography.Title level={1} style={{ fontSize: 26, margin: 0, marginTop: eyebrow ? 6 : 0 }}>
          {title}
        </Typography.Title>
        {subtitle && (
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 6 }}>
            {subtitle}
          </Typography.Text>
        )}
      </div>
      {children && (
        <Flex wrap align="center" gap={12}>
          {children}
        </Flex>
      )}
    </Flex>
  );
}

import { Typography } from 'antd';
import type { ReactNode } from 'react';

/** The h1 + secondary lede that opens every auth page. */
export function AuthHeading({
  title,
  children,
  className = '',
}: Readonly<{ title: ReactNode; children?: ReactNode; className?: string }>) {
  return (
    <>
      <Typography.Title level={1} className={`m-0 text-heading ${className}`}>
        {title}
      </Typography.Title>
      {children && (
        <Typography.Paragraph type="secondary" className="m-0 mt-2">
          {children}
        </Typography.Paragraph>
      )}
    </>
  );
}

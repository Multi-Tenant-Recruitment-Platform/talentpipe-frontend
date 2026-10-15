import { WarningOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import type { ReactNode } from 'react';

/** The validation message under a form field, announced as it appears. */
export function FieldError({ id, children }: Readonly<{ id?: string; children: ReactNode }>) {
  return (
    <Typography.Paragraph id={id} role="alert" type="danger" className="m-0 mt-1.5 flex items-start gap-1 text-caption">
      <WarningOutlined aria-hidden className="mt-px text-[14px]" />
      {children}
    </Typography.Paragraph>
  );
}

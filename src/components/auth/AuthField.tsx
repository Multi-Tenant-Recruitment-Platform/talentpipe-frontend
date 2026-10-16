import { Typography } from 'antd';
import type { ReactNode } from 'react';

/** A labelled field, with optional helper text beneath. */
export function AuthField({
  id,
  label,
  hint,
  children,
}: Readonly<{ id: string; label: string; hint?: string; children: ReactNode }>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-medium">
        {label}
      </label>
      {children}
      {hint && (
        <Typography.Text type="secondary" className="mt-1 block text-caption">
          {hint}
        </Typography.Text>
      )}
    </div>
  );
}

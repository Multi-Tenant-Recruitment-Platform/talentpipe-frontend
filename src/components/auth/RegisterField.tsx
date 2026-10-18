import { Typography } from 'antd';
import type { ReactNode } from 'react';

/** A labelled field in the registration popup, styled to match the login form. */
export function RegisterField({
  id,
  label,
  hint,
  children,
}: Readonly<{ id: string; label: string; hint?: string; children: ReactNode }>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-small font-semibold text-slate-800">
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

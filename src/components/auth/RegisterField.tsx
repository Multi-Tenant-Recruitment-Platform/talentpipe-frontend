import { Typography } from 'antd';
import type { ReactNode } from 'react';
import { FieldError } from '../ui/FieldError';

/**
 * A labelled field in the registration popup, styled to match the login form.
 * An error takes the hint's place while it stands; the input points at it
 * with `fieldErrorProps`.
 */
export function RegisterField({
  id,
  label,
  hint,
  error,
  children,
}: Readonly<{ id: string; label: string; hint?: string; error?: string; children: ReactNode }>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-small font-semibold text-slate-800">
        {label}
      </label>
      {children}
      {error ? (
        <FieldError id={`${id}-error`}>{error}</FieldError>
      ) : (
        hint && (
          <Typography.Text type="secondary" className="mt-1 block text-caption">
            {hint}
          </Typography.Text>
        )
      )}
    </div>
  );
}

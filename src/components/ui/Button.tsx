import { Button as AntButton } from 'antd';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerSolid';
export type ButtonSize = 'sm' | 'md';

type AntLook = { type: 'primary' | 'default' | 'text'; danger?: boolean };

/**
 * The five variants this app speaks, expressed in antd's vocabulary.
 *
 * <p>`danger` stays de-emphasised (a text button — the inline Revoke in a table
 * row) while `dangerSolid` is filled: the confirming action in a destructive
 * dialog needs more weight than the Cancel sitting beside it.</p>
 */
const VARIANTS: Record<ButtonVariant, AntLook> = {
  primary: { type: 'primary' },
  secondary: { type: 'default' },
  ghost: { type: 'text' },
  danger: { type: 'text', danger: true },
  dangerSolid: { type: 'primary', danger: true },
};

const SIZES: Record<ButtonSize, 'small' | 'middle'> = {
  sm: 'small',
  md: 'middle',
};

/**
 * A thin adapter over antd's Button.
 *
 * <p>It exists so the ~30 call sites keep their `variant`/`size` vocabulary and
 * their ref forwarding (dialogs place initial focus on a specific button)
 * instead of each one learning antd's `type`/`danger`/`htmlType` triple.</p>
 */
export const Button = forwardRef<
  HTMLButtonElement,
  {
    variant?: ButtonVariant;
    size?: ButtonSize;
    /** Shows a spinner and blocks further presses. */
    loading?: boolean;
    children: ReactNode;
  } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'color'> & {
      type?: 'button' | 'submit' | 'reset';
    }
>(function Button({ variant = 'secondary', size = 'md', type = 'button', children, ...rest }, ref) {
  const look = VARIANTS[variant];
  return (
    // `htmlType`, not `type`: antd spends `type` on the visual variant, so the
    // DOM attribute every caller means by `type="submit"` moves here. Defaulting
    // to 'button' matches the old behaviour — a bare <button> in a form submits
    // it, and only callers that want that pass type="submit".
    <AntButton
      ref={ref}
      htmlType={type}
      type={look.type}
      danger={look.danger}
      size={SIZES[size]}
      {...rest}
    >
      {children}
    </AntButton>
  );
});

import { theme } from 'antd';
import type { CSSProperties, ReactNode } from 'react';
import { Icon, type IconName } from '../dashboard/Icon';

export type AlertTone = 'info' | 'success' | 'warning' | 'error';

/**
 * Shared inline banner for status/notice/error messages — one visual language
 * instead of the coloured divs each page used to hand-roll.
 *
 * <p>Deliberately not antd's `Alert`. That component always renders
 * `role="alert"`, which is assertive: it interrupts a screen-reader user
 * mid-sentence. That is right for an error and wrong for "Invitation sent".
 * A "status" alert here renders as a native {@code <output>}, which carries
 * `role="status"` implicitly and is the element assistive tech and browsers
 * agree on most consistently. There is no native equivalent for "alert" — that
 * one stays a div with an explicit role.</p>
 *
 * <p>Colours come from antd's tone tokens, so it tracks the theme.</p>
 */
export function Alert({
  tone,
  role = tone === 'error' || tone === 'warning' ? 'alert' : 'status',
  onDismiss,
  style,
  className,
  children,
}: Readonly<{
  tone: AlertTone;
  role?: 'alert' | 'status';
  /** When given, renders a dismiss affordance on the right. */
  onDismiss?: () => void;
  style?: CSSProperties;
  /** Transitional: callers still passing Tailwind spacing. Removed with Tailwind. */
  className?: string;
  children: ReactNode;
}>) {
  const { token } = theme.useToken();

  const TONES: Record<AlertTone, { bg: string; border: string; text: string; icon: IconName }> = {
    info: {
      bg: token.colorInfoBg,
      border: token.colorInfoBorder,
      text: token.colorInfoText,
      icon: 'info',
    },
    success: {
      bg: token.colorSuccessBg,
      border: token.colorSuccessBorder,
      text: token.colorSuccessText,
      icon: 'check',
    },
    warning: {
      bg: token.colorWarningBg,
      border: token.colorWarningBorder,
      text: token.colorWarningText,
      icon: 'warning',
    },
    error: {
      bg: token.colorErrorBg,
      border: token.colorErrorBorder,
      text: token.colorErrorText,
      icon: 'warning',
    },
  };

  const t = TONES[tone];
  const wrapStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '12px 14px',
    borderRadius: token.borderRadiusLG,
    border: `1px solid ${t.border}`,
    background: t.bg,
    color: t.text,
    fontSize: token.fontSize,
    lineHeight: 1.45,
    ...style,
  };

  const content = (
    <>
      <Icon name={t.icon} size={16} style={{ marginTop: 2 }} />
      <div style={{ minWidth: 0, flex: 1 }}>{children}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            flexShrink: 0,
            marginTop: -2,
            marginRight: -4,
            padding: 4,
            border: 0,
            background: 'transparent',
            color: 'inherit',
            cursor: 'pointer',
            opacity: 0.65,
            borderRadius: token.borderRadius,
            lineHeight: 0,
          }}
        >
          <Icon name="x-mark" size={16} />
        </button>
      )}
    </>
  );

  return role === 'status' ? (
    <output className={className} style={wrapStyle}>
      {content}
    </output>
  ) : (
    <div role="alert" className={className} style={wrapStyle}>
      {content}
    </div>
  );
}

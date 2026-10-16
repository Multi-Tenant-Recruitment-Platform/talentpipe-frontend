import {
  CheckCircleOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { IconComponent } from './icon';
import { theme } from 'antd';
import type { CSSProperties, ReactNode } from 'react';

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
  className = '',
  style,
  children,
}: Readonly<{
  tone: AlertTone;
  role?: 'alert' | 'status';
  /** When given, renders a dismiss affordance on the right. */
  onDismiss?: () => void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}>) {
  const { token } = theme.useToken();

  const TONES: Record<AlertTone, { bg: string; border: string; text: string; icon: IconComponent }> = {
    info: {
      bg: token.colorInfoBg,
      border: token.colorInfoBorder,
      text: token.colorInfoText,
      icon: InfoCircleOutlined,
    },
    success: {
      bg: token.colorSuccessBg,
      border: token.colorSuccessBorder,
      text: token.colorSuccessText,
      icon: CheckCircleOutlined,
    },
    warning: {
      bg: token.colorWarningBg,
      border: token.colorWarningBorder,
      text: token.colorWarningText,
      icon: WarningOutlined,
    },
    error: {
      bg: token.colorErrorBg,
      border: token.colorErrorBorder,
      text: token.colorErrorText,
      icon: WarningOutlined,
    },
  };

  const t = TONES[tone];
  const wrapClass = `flex items-start gap-2.5 border px-3.5 py-3 leading-[1.45] ${className}`;
  const wrapStyle: CSSProperties = {
    borderRadius: token.borderRadiusLG,
    borderColor: t.border,
    background: t.bg,
    color: t.text,
    fontSize: token.fontSize,
    ...style,
  };

  const content = (
    <>
      <t.icon aria-hidden className="mt-0.5 text-[16px]" />
      <div className="min-w-0 flex-1">{children}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mt-0.5 -mr-1 shrink-0 cursor-pointer border-0 bg-transparent p-1 leading-0 text-inherit opacity-65"
          style={{ borderRadius: token.borderRadius }}
        >
          <CloseOutlined aria-hidden className="text-[16px]" />
        </button>
      )}
    </>
  );

  return role === 'status' ? (
    <output className={wrapClass} style={wrapStyle}>
      {content}
    </output>
  ) : (
    <div role="alert" className={wrapClass} style={wrapStyle}>
      {content}
    </div>
  );
}

import type { ReactNode } from 'react';
import { Icon, type IconName } from '../dashboard/Icon';

export type AlertTone = 'info' | 'success' | 'warning' | 'error';

const TONE_STYLES: Record<AlertTone, { wrap: string; icon: string; iconName: IconName }> = {
  info: {
    wrap: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    icon: 'text-indigo-500',
    iconName: 'info',
  },
  success: {
    wrap: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: 'text-emerald-500',
    iconName: 'check',
  },
  warning: {
    wrap: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: 'text-amber-500',
    iconName: 'warning',
  },
  error: {
    wrap: 'border-red-200 bg-red-50 text-red-700',
    icon: 'text-red-500',
    iconName: 'warning',
  },
};

/**
 * Shared inline banner for the auth pages' status/notice/error messages —
 * one visual language instead of five hand-rolled colored divs. `role`
 * mirrors what each caller previously set by hand (alerts vs. status
 * announcements) so assistive tech behavior is unchanged.
 */
export function Alert({
  tone,
  role = tone === 'error' || tone === 'warning' ? 'alert' : 'status',
  onDismiss,
  className = '',
  children,
}: {
  tone: AlertTone;
  role?: 'alert' | 'status';
  /** When given, renders a dismiss affordance on the right. */
  onDismiss?: () => void;
  className?: string;
  children: ReactNode;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <div
      role={role}
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm leading-5 ${styles.wrap} ${className}`}
    >
      <Icon name={styles.iconName} className={`mt-0.5 h-4 w-4 shrink-0 ${styles.icon}`} />
      <div className="min-w-0 flex-1">{children}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className={`-mr-1 -mt-0.5 shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus-visible:opacity-100 ${styles.icon}`}
        >
          <Icon name="x-mark" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

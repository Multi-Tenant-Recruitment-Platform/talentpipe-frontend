import type { SessionEndReason } from '../../auth/AuthContext';
import { Alert, type AlertTone } from '../ui/Alert';

const REGISTERED_MESSAGE = {
  candidate:
    'Account created. Check your email for the verification link — you can sign in once it is confirmed.',
  company:
    'Company registered. Check your email for the verification link — you can sign in once it is confirmed.',
} as const;

export interface LoginNoticesProps {
  /** Why the previous session ended, so the redirect here isn't a mystery. */
  sessionEndReason: SessionEndReason | null;
  /** Set by the registration pages after a successful sign-up. */
  registered?: boolean | 'company' | 'candidate';
  /** Set by the reset-password page after a successful reset. */
  passwordReset?: boolean;
  /** Set by the accept-invite page after activation. */
  inviteAccepted?: boolean;
}

/**
 * The "how you got here" banners above the login form. Every one of them is
 * driven by state another page handed us, so they are a single declarative
 * table rather than a run of hand-written conditional blocks in the page.
 */
export function LoginNotices({
  sessionEndReason,
  registered,
  passwordReset,
  inviteAccepted,
}: Readonly<LoginNoticesProps>) {
  // `role` is stated per notice rather than left to Alert's default: the
  // expired-session banner is a warning that must not interrupt (status),
  // while the tenant-mismatch one is worth announcing immediately.
  const notices: {
    key: string;
    when: boolean;
    tone: AlertTone;
    role: 'alert' | 'status';
    text: string;
  }[] = [
    {
      key: 'expired',
      when: sessionEndReason === 'expired',
      tone: 'warning',
      role: 'status',
      text: 'Your session expired. Sign in again to pick up where you left off.',
    },
    {
      key: 'tenant-mismatch',
      when: sessionEndReason === 'tenant-mismatch',
      tone: 'error',
      role: 'alert',
      text:
        'We signed you out: a response arrived for a different workspace. Nothing was shown to' +
        ' you — please sign in again.',
    },
    {
      key: 'registered',
      when: Boolean(registered),
      tone: 'success',
      role: 'status',
      text: REGISTERED_MESSAGE[registered === 'candidate' ? 'candidate' : 'company'],
    },
    {
      key: 'password-reset',
      when: Boolean(passwordReset),
      tone: 'success',
      role: 'status',
      text: 'Password updated. Sign in with your new password.',
    },
    {
      key: 'invite-accepted',
      when: Boolean(inviteAccepted),
      tone: 'success',
      role: 'status',
      text: 'Invitation accepted. Sign in with your email to reach the workspace.',
    },
  ];

  return (
    <>
      {notices
        .filter((notice) => notice.when)
        .map((notice) => (
          <div key={notice.key} className="mt-6">
            <Alert tone={notice.tone} role={notice.role}>
              {notice.text}
            </Alert>
          </div>
        ))}
    </>
  );
}

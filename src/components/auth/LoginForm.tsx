import { ArrowRightOutlined } from '@ant-design/icons';
import { Flex, Input, type InputRef } from 'antd';
import axios from 'axios';
import { useId, useState, type FormEvent, type Ref } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, apiErrorMessage } from '../../api/client';
import type { UserResponse } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import type { LoginIntent } from '../../auth/loginIntent';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { LoginErrorAlert } from './LoginErrorAlert';
import { LoginNotices } from './LoginNotices';
import { PasswordField } from './PasswordField';

/**
 * What a failed login should say, and whether to offer a resend.
 *
 * <p>The backend deliberately returns the same 401 "Invalid credentials"
 * whether the account doesn't exist or the password is wrong — it never
 * distinguishes them, so an address can't be confirmed by enumerating
 * accounts via the error code. Blaming a field here would require a signal the
 * API intentionally withholds, so this is a single generic error like any
 * other login failure. Only a 403 naming an unverified account is different,
 * because there the resend is both useful and safe — the caller has already
 * proven they know the password.</p>
 */
function loginFailure(err: unknown): { message: string; needsVerification: boolean } {
  const status = axios.isAxiosError(err) ? err.response?.status : undefined;
  const message = apiErrorMessage(err, 'Login failed. Please try again.');
  return {
    message,
    needsVerification: status === 403 && message.toLowerCase().includes('not verified'),
  };
}

/**
 * Asks for a fresh verification email and never reports what happened: the
 * confirmation the caller sees must look identical whether or not the address
 * is registered, so a failure here has to be indistinguishable from a success.
 */
async function requestVerificationEmail(email: string): Promise<void> {
  try {
    await api.post('/auth/resend-verification', { email });
  } catch {
    // Deliberately ignored — see above.
  }
}

/**
 * Login (PB-007): the form behind the login popup — one form for everyone.
 *
 * <p>Candidates and company users sign in identically, with email and
 * password alone: the backend finds which account the credentials belong to
 * and returns its role, and the popup routes on that. So there is no
 * "candidate or company?" choice to make first — it would only have relabelled
 * the same request, and would have made someone stop to classify themselves
 * before doing the one thing they came to do.</p>
 *
 * <p>The form owns the credentials and the submit; the presentation of each
 * region (notices, password) lives in components/auth so this stays a
 * readable description of the flow. Where to go afterwards is the caller's
 * decision, handed back through `onSuccess`.</p>
 */
export function LoginForm({
  intent,
  emailRef,
  onBusyChange,
  onSuccess,
}: Readonly<{
  intent: LoginIntent;
  /** Lets the popup put focus in the email field once it has opened. */
  emailRef?: Ref<InputRef>;
  /** Reports an in-flight sign-in, so the popup can refuse to close mid-request. */
  onBusyChange?: (busy: boolean) => void;
  onSuccess: (user: UserResponse) => void;
}>) {
  const { login, sessionEndReason } = useAuth();
  const { pathname, search, hash } = useLocation();
  const here = { pathname, search, hash };
  // Generated, not fixed: the popup can open over the registration page, which
  // has its own `email` and `password` fields.
  const fieldId = useId();
  const emailId = `${fieldId}-email`;
  const passwordId = `${fieldId}-password`;

  const [email, setEmail] = useState(intent.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Set when the backend reports the account exists but is unverified (403),
  // which is the only case where offering a resend is useful — and safe,
  // because the caller has already proven they know the password.
  const [needsVerification, setNeedsVerification] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setNeedsVerification(false);

    setSubmitting(true);
    onBusyChange?.(true);
    try {
      const loggedIn = await login(email, password);
      onSuccess(loggedIn);
    } catch (err: unknown) {
      const failure = loginFailure(err);
      setError(failure.message);
      setNeedsVerification(failure.needsVerification);
    } finally {
      setSubmitting(false);
      onBusyChange?.(false);
    }
  }

  /** Requests a fresh verification email; always reports the same neutral result. */
  async function handleResendVerification() {
    setError(null);
    await requestVerificationEmail(email);
    setNeedsVerification(false);
    setNotice(`If ${email} needs verifying, a new link is on its way.`);
  }

  // Offered only for an unverified account; `undefined` hides the affordance.
  const onResend = needsVerification ? () => void handleResendVerification() : undefined;

  return (
    <>
      <LoginNotices
        sessionEndReason={sessionEndReason}
        registered={intent.registered}
        passwordReset={intent.passwordReset}
        inviteAccepted={intent.inviteAccepted}
      />

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6">
        <Flex vertical gap={20}>
          {error && <LoginErrorAlert message={error} onResend={onResend} />}
          {notice && <Alert tone="info">{notice}</Alert>}

          <div>
            <label htmlFor={emailId} className="mb-1.5 block text-small font-semibold text-slate-800">
              Email address
            </label>
            <Input
              ref={emailRef}
              id={emailId}
              size="large"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>

          <PasswordField id={passwordId} value={password} onChange={setPassword} />

          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            className="mt-1 h-12 w-full rounded-pill text-lead shadow-primary"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
            {!submitting && <ArrowRightOutlined aria-hidden className="text-[14px]" />}
          </Button>
        </Flex>
      </form>

      {/* Divider + auxiliary links matching wireframe */}
      <div className="mt-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-100" aria-hidden="true" />
        <span className="text-caption text-slate-400">or</span>
        <span className="h-px flex-1 bg-slate-100" aria-hidden="true" />
      </div>
      <div className="mt-4 space-y-2 text-center">
        <p className="m-0">
          <Link to="/forgot-password" className="text-sm font-semibold">
            Forgot password?
          </Link>
        </p>
        <p className="m-0 text-slate-600">
          {/* Swaps this popup for the registration one, over the same page. */}
          <Link to={here} replace state={{ register: { step: 'choose' } }} className="text-sm font-semibold">
            Create an account
          </Link>
        </p>
      </div>
    </>
  );
}

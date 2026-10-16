import { Divider, Flex, Input, Typography, type InputRef } from 'antd';
import axios from 'axios';
import { useId, useState, type FormEvent, type Ref } from 'react';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../../api/client';
import type { UserResponse } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import type { LoginIntent } from '../../auth/loginIntent';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { AuthField } from './AuthField';
import { GoogleSignInButton } from './GoogleSignInButton';
import { LoginErrorAlert } from './LoginErrorAlert';
import { LoginModeTabs, type LoginMode } from './LoginModeTabs';
import { LoginNotices } from './LoginNotices';
import { PasswordField } from './PasswordField';

/**
 * Everything the two personas word differently. A lookup keeps the page free
 * of per-mode branching in the markup.
 */
const COPY: Record<LoginMode, { subtitle: string; submit: string; registerPath: string }> = {
  company: {
    subtitle: 'Sign in to your company workspace.',
    submit: 'Sign in as company',
    registerPath: '/register',
  },
  candidate: {
    subtitle: 'Sign in to track your applications.',
    submit: 'Sign in as candidate',
    registerPath: '/register-candidate',
  },
};

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
 * Login (PB-007): the form behind the login popup. It serves both personas;
 * both sign in with email and password alone — the backend finds the company
 * account from those, so no workspace address is asked for.
 *
 * <p>The form owns the credentials and the submit; the presentation of each
 * region (notices, persona tabs, password) lives in components/auth so this
 * stays a readable description of the flow. Where to go afterwards is the
 * caller's decision, handed back through `onSuccess`.</p>
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
  // Generated, not fixed: the popup can open over the registration page, which
  // has its own `email` and `password` fields.
  const fieldId = useId();
  const emailId = `${fieldId}-email`;
  const passwordId = `${fieldId}-password`;

  const [mode, setMode] = useState<LoginMode>(intent.mode ?? 'company');

  const [email, setEmail] = useState(intent.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Set when the backend reports the account exists but is unverified (403),
  // which is the only case where offering a resend is useful — and safe,
  // because the caller has already proven they know the password.
  const [needsVerification, setNeedsVerification] = useState(false);

  const copy = COPY[mode];

  function clearMessages() {
    setError(null);
    setNotice(null);
    setNeedsVerification(false);
  }

  function switchMode(next: LoginMode) {
    setMode(next);
    clearMessages();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    clearMessages();

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
      <Typography.Paragraph type="secondary" className="m-0">
        {copy.subtitle}
      </Typography.Paragraph>

      <LoginNotices
        sessionEndReason={sessionEndReason}
        registered={intent.registered}
        passwordReset={intent.passwordReset}
        inviteAccepted={intent.inviteAccepted}
      />

      <LoginModeTabs mode={mode} onSelect={switchMode} />

      <form onSubmit={(e) => void handleSubmit(e)}>
        <Flex vertical gap={20}>
          {error && <LoginErrorAlert message={error} onResend={onResend} />}
          {notice && <Alert tone="info">{notice}</Alert>}

          <AuthField id={emailId} label="Email">
            <Input
              ref={emailRef}
              id={emailId}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </AuthField>

          <PasswordField id={passwordId} value={password} onChange={setPassword} />

          <Button type="submit" variant="primary" loading={submitting} className="w-full">
            {submitting ? 'Signing in…' : copy.submit}
          </Button>
        </Flex>
      </form>

      <Divider plain className="my-6">
        {/* The small uppercase label inside a Divider — "or continue with". Not a
            kicker above a heading: those were removed, because the heading carries its
            own weight and the sidebar already names the section. */}
        <Typography.Text className="text-caption font-semibold uppercase tracking-caps" type="secondary">
          or continue with
        </Typography.Text>
      </Divider>

      <GoogleSignInButton
        onClick={() => {
          setError(null);
          setNotice('Google sign-in is coming soon.');
        }}
      />

      {/* Registration is persona-specific, mirroring the active login tab. */}
      <Typography.Paragraph type="secondary" className="mt-6 mb-0 text-center">
        New to TalentPipe? <Link to={copy.registerPath}>Create an account</Link>
      </Typography.Paragraph>
    </>
  );
}

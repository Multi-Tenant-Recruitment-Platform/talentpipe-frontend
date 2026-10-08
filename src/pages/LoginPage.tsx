import { Divider, Flex, Input, Typography } from 'antd';
import axios from 'axios';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AuthShell } from '../components/AuthShell';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { LoginErrorAlert } from '../components/auth/LoginErrorAlert';
import { LoginModeTabs, type LoginMode } from '../components/auth/LoginModeTabs';
import { LoginNotices } from '../components/auth/LoginNotices';
import { PasswordField } from '../components/auth/PasswordField';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { fontSize } from '../theme/tokens';

interface LoginLocationState {
  /** Set by the registration pages after a successful sign-up. */
  registered?: boolean | 'company' | 'candidate';
  /** Pre-selects the login tab (e.g. after candidate registration). */
  mode?: LoginMode;
  /** Prefills the email field (e.g. after candidate registration). */
  email?: string;
  /** Set by the reset-password page after a successful reset. */
  passwordReset?: boolean;
  /** Set by the accept-invite page after activation. */
  inviteAccepted?: boolean;
  from?: string;
}

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
 * The company dashboard is for company roles only — candidates have no tenant
 * and would hit 403s there, so send them to the job board.
 */
function homeFor(role: string): string {
  return role === 'CANDIDATE' ? '/jobs' : '/dashboard';
}

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
 * Login (PB-007), split-screen edition: the brand panel showcases the
 * platform's highlights while the form serves both personas. Both sign in
 * with email and password alone — the backend finds the company account from
 * those, so no workspace address is asked for.
 *
 * <p>The page owns the credentials and the submit; the presentation of each
 * region (notices, persona tabs, password) lives in components/auth so this
 * stays a readable description of the flow.</p>
 */
export function LoginPage() {
  const { login, sessionEndReason } = useAuth();
  const navigate = useNavigate();
  const state = (useLocation().state ?? {}) as LoginLocationState;

  const [mode, setMode] = useState<LoginMode>(state.mode ?? 'company');

  const [email, setEmail] = useState(state.email ?? '');
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
    try {
      const loggedIn = await login(email, password);
      navigate(state.from ?? homeFor(loggedIn.role), { replace: true });
    } catch (err: unknown) {
      const failure = loginFailure(err);
      setError(failure.message);
      setNeedsVerification(failure.needsVerification);
    } finally {
      setSubmitting(false);
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
    <AuthShell>
      <Typography.Title level={1} style={{ fontSize: fontSize.heading, margin: 0 }}>
        Welcome back
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
        {copy.subtitle}
      </Typography.Paragraph>

      <LoginNotices
        sessionEndReason={sessionEndReason}
        registered={state.registered}
        passwordReset={state.passwordReset}
        inviteAccepted={state.inviteAccepted}
      />

      <LoginModeTabs mode={mode} onSelect={switchMode} />

      <form onSubmit={(e) => void handleSubmit(e)}>
        <Flex vertical gap={20}>
          {error && <LoginErrorAlert message={error} onResend={onResend} />}
          {notice && <Alert tone="info">{notice}</Alert>}

          <div>
            <label htmlFor="email" style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>
              Email
            </label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <PasswordField value={password} onChange={setPassword} />

          <Button type="submit" variant="primary" loading={submitting} style={{ width: '100%' }}>
            {submitting ? 'Signing in…' : copy.submit}
          </Button>
        </Flex>
      </form>

      <Divider plain style={{ marginBlock: 24 }}>
        <Typography.Text className="tp-divider-label" type="secondary">
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
      <Typography.Paragraph type="secondary" style={{ marginTop: 24, textAlign: 'center' }}>
        New to TalentPipe? <Link to={copy.registerPath}>Create an account</Link>
      </Typography.Paragraph>
    </AuthShell>
  );
}

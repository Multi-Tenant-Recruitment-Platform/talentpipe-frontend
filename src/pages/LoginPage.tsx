import axios from 'axios';
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AuthShell } from '../components/AuthShell';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { LoginErrorAlert } from '../components/auth/LoginErrorAlert';
import { LoginModeTabs, type LoginMode } from '../components/auth/LoginModeTabs';
import { LoginNotices } from '../components/auth/LoginNotices';
import { PasswordField } from '../components/auth/PasswordField';
import { WorkspaceField } from '../components/auth/WorkspaceField';
import { Alert } from '../components/ui/Alert';
import { inputClass } from '../components/ui/inputClass';
import { recallSubdomain, rememberSubdomain, resolveTenantHost } from '../tenant/subdomain';

interface LoginLocationState {
  subdomain?: string;
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

/** Company logins are scoped to a workspace; candidates authenticate globally. */
function tenantFor(mode: LoginMode, subdomain: string): string {
  return mode === 'company' ? subdomain.trim() : '';
}

/**
 * What a failed login should say, and whether to offer a resend.
 *
 * <p>The backend deliberately returns the same 401 "Invalid credentials"
 * whether the workspace doesn't exist or the password is wrong — it never
 * distinguishes them, so a workspace typo can't be confirmed by enumerating
 * tenants via the error code. Blaming a field here would require a signal the
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
 * platform's highlights while the form serves both personas. Company users
 * log in with their subdomain, which travels as the X-Tenant-Subdomain
 * header (ADR-1); candidates authenticate globally, without a tenant.
 *
 * <p>The page owns the credentials and the submit; the presentation of each
 * region (notices, persona tabs, workspace, password) lives in
 * components/auth so this stays a readable description of the flow.</p>
 */
export function LoginPage() {
  const { login, sessionEndReason } = useAuth();
  const navigate = useNavigate();
  const state = (useLocation().state ?? {}) as LoginLocationState;

  const [mode, setMode] = useState<LoginMode>(state.mode ?? 'company');

  // Where the workspace comes from, in order of authority: the address bar,
  // then whoever routed us here (registration), then this device's last login.
  const tenantHost = useMemo(() => resolveTenantHost(), []);
  const [subdomain, setSubdomain] = useState(
    tenantHost.subdomain ?? state.subdomain ?? recallSubdomain(),
  );
  const [subdomainError, setSubdomainError] = useState<string | null>(null);

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
    setSubdomainError(null);
  }

  function switchMode(next: LoginMode) {
    setMode(next);
    clearMessages();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    clearMessages();

    const tenant = tenantFor(mode, subdomain);
    if (mode === 'company' && !tenant) {
      setSubdomainError('Enter your workspace to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const loggedIn = await login(tenant, email, password);
      rememberSubdomain(tenant);
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
      <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Sign in</span>
      <h1 className="mt-1.5 text-[1.75rem] font-bold tracking-tight text-slate-900">Welcome back</h1>
      <p className="mt-2 text-sm text-slate-500">{copy.subtitle}</p>

      <LoginNotices
        sessionEndReason={sessionEndReason}
        registered={state.registered}
        passwordReset={state.passwordReset}
        inviteAccepted={state.inviteAccepted}
      />

      <LoginModeTabs mode={mode} onSelect={switchMode} />

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-5">
        {error && <LoginErrorAlert message={error} onResend={onResend} />}
        {notice && <Alert tone="info">{notice}</Alert>}

        {mode === 'company' && (
          <WorkspaceField
            host={tenantHost}
            value={subdomain}
            error={subdomainError}
            onChange={(next) => {
              setSubdomain(next);
              setSubdomainError(null);
            }}
          />
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            autoComplete="email"
          />
        </div>

        <PasswordField value={password} onChange={setPassword} />

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition-all hover:from-indigo-500 hover:to-violet-500 hover:shadow-md hover:shadow-indigo-600/25 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-sm"
        >
          {submitting && (
            <svg
              className="h-4 w-4 animate-spin text-white/80"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
              />
            </svg>
          )}
          {submitting ? 'Signing in…' : copy.submit}
        </button>
      </form>

      <div className="mt-6 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          or continue with
        </span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <GoogleSignInButton
        onClick={() => {
          setError(null);
          setNotice('Google sign-in is coming soon.');
        }}
      />

      {/* Registration is persona-specific, mirroring the active login tab. */}
      <p className="mt-6 text-center text-sm text-slate-500">
        New to TalentPipe?{' '}
        <Link to={copy.registerPath} className="font-semibold text-indigo-600 hover:text-indigo-500">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

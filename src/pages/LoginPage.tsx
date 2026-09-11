import axios from 'axios';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { AuthShell } from '../components/AuthShell';
import { Badge } from '../components/dashboard/Badge';
import { Icon } from '../components/dashboard/Icon';
import { Alert } from '../components/ui/Alert';
import { inputClass } from '../components/ui/inputClass';
import {
  normalizeSubdomainInput,
  recallSubdomain,
  rememberSubdomain,
  resolveTenantHost,
  ROOT_DOMAIN,
} from '../tenant/subdomain';

type LoginMode = 'candidate' | 'company';

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

const iconProps = {
  className: 'h-4 w-4',
  fill: 'none',
  viewBox: '0 0 24 24',
  strokeWidth: 1.5,
  stroke: 'currentColor',
} as const;

const MODES: { id: LoginMode; label: string; icon: ReactNode }[] = [
  {
    id: 'candidate',
    label: 'Candidate',
    icon: (
      <svg {...iconProps}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
        />
      </svg>
    ),
  },
  {
    id: 'company',
    label: 'Company',
    icon: (
      <svg {...iconProps}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
        />
      </svg>
    ),
  },
];

/**
 * Login (PB-007), split-screen edition: the brand panel showcases the
 * platform's highlights while the form serves both personas. Company users
 * log in with their subdomain, which travels as the X-Tenant-Subdomain
 * header (ADR-1); candidates authenticate globally, without a tenant.
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Set when the backend reports the account exists but is unverified (403),
  // which is the only case where offering a resend is useful — and safe,
  // because the caller has already proven they know the password.
  const [needsVerification, setNeedsVerification] = useState(false);

  function switchMode(next: LoginMode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setNeedsVerification(false);
    setSubdomainError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setNeedsVerification(false);
    setSubdomainError(null);

    // Candidates authenticate globally; only a company login carries a tenant.
    const tenant = mode === 'company' ? subdomain.trim() : '';
    if (mode === 'company' && !tenant) {
      setSubdomainError('Enter your workspace to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const loggedIn = await login(tenant, email, password);
      rememberSubdomain(tenant);
      // The company dashboard is for company roles only — candidates have no
      // tenant and would hit 403s there, so send them to the job board.
      const home = loggedIn.role === 'CANDIDATE' ? '/jobs' : '/dashboard';
      navigate(state.from ?? home, { replace: true });
    } catch (err: unknown) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const message = apiErrorMessage(err, 'Login failed. Please try again.');
      // The backend deliberately returns the same 401 "Invalid credentials"
      // whether the workspace doesn't exist or the password is wrong — it
      // never distinguishes them, so a workspace typo can't be confirmed by
      // enumerating tenants via the error code. Blaming the field here would
      // require a signal the API intentionally withholds, so this is a single
      // generic error like any other login failure.
      setError(message);
      setNeedsVerification(status === 403 && message.toLowerCase().includes('not verified'));
    } finally {
      setSubmitting(false);
    }
  }

  /** Requests a fresh verification email; always reports the same neutral result. */
  async function handleResendVerification() {
    setError(null);
    try {
      await api.post(
        '/auth/resend-verification',
        { email },
      );
    } catch {
      // Deliberately ignored: the confirmation below must look identical
      // whether or not the address is registered.
    } finally {
      setNeedsVerification(false);
      setNotice(`If ${email} needs verifying, a new link is on its way.`);
    }
  }

  const submitLabel = submitting
    ? 'Signing in…'
    : mode === 'company'
      ? 'Sign in as company'
      : 'Sign in as candidate';

  return (
    <AuthShell>
      <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Sign in</span>
      <h1 className="mt-1.5 text-[1.75rem] font-bold tracking-tight text-slate-900">Welcome back</h1>
      <p className="mt-2 text-sm text-slate-500">
        {mode === 'company'
          ? 'Sign in to your company workspace.'
          : 'Sign in to track your applications.'}
      </p>

      {/* Why the previous session ended, so the redirect here isn't a mystery. */}
      {sessionEndReason === 'expired' && (
        <div className="mt-6">
          <Alert tone="warning" role="status">
            Your session expired. Sign in again to pick up where you left off.
          </Alert>
        </div>
      )}

      {sessionEndReason === 'tenant-mismatch' && (
        <div className="mt-6">
          <Alert tone="error" role="alert">
            We signed you out: a response arrived for a different workspace. Nothing was shown to
            you — please sign in again.
          </Alert>
        </div>
      )}

      {state.registered && (
        <div className="mt-6">
          <Alert tone="success" role="status">
            {state.registered === 'candidate'
              ? 'Account created. Check your email for the verification link — you can sign in once it is confirmed.'
              : 'Company registered. Check your email for the verification link — you can sign in once it is confirmed.'}
          </Alert>
        </div>
      )}

      {state.passwordReset && (
        <div className="mt-6">
          <Alert tone="success" role="status">
            Password updated. Sign in with your new password.
          </Alert>
        </div>
      )}

      {state.inviteAccepted && (
        <div className="mt-6">
          <Alert tone="success" role="status">
            Invitation accepted. Sign in with your email to reach the workspace.
          </Alert>
        </div>
      )}

      {/* Persona switch: candidate vs. company login. */}
      <div
        role="tablist"
        aria-label="Login type"
        className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1"
      >
        {MODES.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => switchMode(id)}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
              mode === id
                ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-900/5'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-5">
        {error && (
          <Alert tone="error">
            <p>{error}</p>
            {needsVerification && (
              <button
                type="button"
                onClick={() => void handleResendVerification()}
                className="mt-1.5 font-semibold text-red-800 underline decoration-red-300 underline-offset-2 hover:text-red-900"
              >
                Send me a new verification link
              </button>
            )}
          </Alert>
        )}
        {notice && <Alert tone="info">{notice}</Alert>}

        {/* Which company workspace to sign in to — travels as the
            X-Tenant-Subdomain header (ADR-1). Candidates have no tenant. */}
        {mode === 'company' &&
          (tenantHost.locked ? (
            <div>
              <span className="block text-sm font-medium text-slate-700">Workspace</span>
              <div className="mt-1.5 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm">
                  <Icon name="building" className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  <span className="font-semibold text-slate-900">{tenantHost.subdomain}</span>
                  <span className="text-slate-400">.{ROOT_DOMAIN}</span>
                </span>
                <Badge tone="indigo">Detected</Badge>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                You’re signing in from this workspace’s address.
              </p>
            </div>
          ) : (
            <div>
              <label htmlFor="subdomain" className="block text-sm font-medium text-slate-700">
                Workspace
              </label>
              <div
                className={`mt-1.5 flex items-center overflow-hidden rounded-lg border bg-white shadow-sm transition-colors focus-within:ring-4 ${
                  subdomainError
                    ? 'border-red-300 focus-within:border-red-500 focus-within:ring-red-500/15'
                    : 'border-slate-300 hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-indigo-500/15'
                }`}
              >
                <span className="flex h-full items-center pl-3.5 text-slate-400" aria-hidden="true">
                  <Icon name="building" className="h-4 w-4" />
                </span>
                <input
                  id="subdomain"
                  // Not `required`: the browser's generic bubble would preempt
                  // the field-level message handleSubmit produces, which can
                  // also name a workspace the backend rejected.
                  value={subdomain}
                  onChange={(e) => {
                    setSubdomain(normalizeSubdomainInput(e.target.value));
                    setSubdomainError(null);
                  }}
                  className="min-w-0 flex-1 border-0 bg-transparent px-2.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                  placeholder="acme"
                  autoComplete="organization"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-invalid={subdomainError ? true : undefined}
                  aria-describedby="subdomain-hint"
                />
                <span className="shrink-0 self-stretch border-l border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                  .{ROOT_DOMAIN}
                </span>
              </div>
              <p
                id="subdomain-hint"
                className={`mt-1.5 text-xs ${subdomainError ? 'text-red-600' : 'text-slate-500'}`}
              >
                {subdomainError ??
                  'Your company’s TalentPipe address — it’s in your invitation email.'}
              </p>
            </div>
          ))}

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

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus-visible:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pr-10`}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 mt-1.5 flex items-center px-3 text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:text-indigo-600"
            >
              {/* Plain text content (not aria-label) so this button's accessible
                  name doesn't collide with getByLabelText(/password/i) queries
                  that target the field itself. */}
              <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
              <Icon name={showPassword ? 'eye-slash' : 'eye'} className="h-4 w-4" />
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition-all hover:from-indigo-500 hover:to-violet-500 hover:shadow-md hover:shadow-indigo-600/25 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-sm"
        >
          {submitting && (
            <svg className="h-4 w-4 animate-spin text-white/80" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
            </svg>
          )}
          {submitLabel}
        </button>
      </form>

      <div className="mt-6 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">or continue with</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        type="button"
        onClick={() => {
          setError(null);
          setNotice('Google sign-in is coming soon.');
        }}
        className="mt-4 flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/15"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
          />
          <path
            fill="#FBBC05"
            d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.98 11.98 0 0 0 12 0a11.99 11.99 0 0 0-10.71 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
          />
        </svg>
        Continue with Google
      </button>

      {/* Registration is persona-specific, mirroring the active login tab. */}
      <p className="mt-6 text-center text-sm text-slate-500">
        New to TalentPipe?{' '}
        <Link
          to={mode === 'company' ? '/register' : '/register-candidate'}
          className="font-semibold text-indigo-600 hover:text-indigo-500"
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

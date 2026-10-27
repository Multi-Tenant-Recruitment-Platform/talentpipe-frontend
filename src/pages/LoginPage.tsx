import {
  BarChartOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Flex, Input, Typography, type InputRef } from 'antd';
import axios from 'axios';
import { useId, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../api/client';
import type { UserResponse } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import type { LoginIntent } from '../auth/loginIntent';
import { homeRouteFor } from '../auth/permissions';
import { BrandLogo } from '../components/BrandLogo';
import { LoginErrorAlert } from '../components/auth/LoginErrorAlert';
import { LoginNotices } from '../components/auth/LoginNotices';
import { PasswordField } from '../components/auth/PasswordField';
import { PageLoader } from '../components/PageLoader';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import loginHero from '../assets/login_hero.jpg';

function loginFailure(err: unknown): { message: string; needsVerification: boolean } {
  const status = axios.isAxiosError(err) ? err.response?.status : undefined;
  const message = apiErrorMessage(err, 'Login failed. Please try again.');
  return { message, needsVerification: status === 403 && message.toLowerCase().includes('not verified') };
}

async function requestVerificationEmail(email: string): Promise<void> {
  try { await api.post('/auth/resend-verification', { email }); } catch { /* ignored */ }
}

const FEATURES = [
  { icon: TeamOutlined,        label: 'Attract top talent',    sub: 'Reach qualified candidates where they are' },
  { icon: ThunderboltOutlined, label: 'Streamline hiring',     sub: 'Automate and simplify your workflow' },
  { icon: BarChartOutlined,    label: 'Build stronger teams',  sub: 'Make data-informed hiring decisions' },
];

/**
 * Full-screen login page. Same logic as the former LoginModal / LoginForm but
 * rendered as a standalone split-screen page with a realistic photo panel.
 */
export function LoginPage() {
  const { user, initializing, login, sessionEndReason, clearSessionEndReason } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const intent = (location.state ?? {}) as LoginIntent;

  const uid = useId();
  const emailId = `${uid}-email`;
  const passwordId = `${uid}-password`;
  const emailRef = useRef<InputRef>(null);

  const [email, setEmail] = useState(intent.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  // Already signed in → skip the page.
  if (initializing) return <PageLoader />;
  if (user) return <Navigate to={intent.from ?? homeRouteFor(user.role)} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null); setNotice(null); setNeedsVerification(false);
    setSubmitting(true);
    try {
      const loggedIn: UserResponse = await login(email, password);
      clearSessionEndReason();
      navigate(intent.from ?? homeRouteFor(loggedIn.role), { replace: true });
    } catch (err) {
      const f = loginFailure(err);
      setError(f.message);
      setNeedsVerification(f.needsVerification);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    await requestVerificationEmail(email);
    setNeedsVerification(false);
    setNotice(`If ${email} needs verifying, a new link is on its way.`);
  }

  return (
    <div className="tp-auth-page flex min-h-screen w-full">
      {/* ── Left brand panel ── */}
      <div className="tp-auth-brand-panel relative hidden w-[46%] flex-none overflow-hidden bg-slate-900 lg:flex lg:flex-col">
        {/* Realistic photo */}
        <img
          src={loginHero}
          alt="A recruiter reviewing a resume in a bright modern office"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        {/* Colour & scrim overlays */}
        <div aria-hidden="true" className="absolute inset-0 bg-primary-900/50 mix-blend-multiply" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-slate-900/20" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-slate-900/30 via-transparent to-transparent" />

        {/* Content */}
        <div className="relative flex flex-1 flex-col justify-between p-10 xl:p-12">
          {/* Logo */}
          <BrandLogo tone="dark" markClassName="h-9 w-auto" />

          {/* Headline + features */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/90">
              A brighter way to hire
            </p>
            <Typography.Title
              level={2}
              className="!m-0 !text-[2.1rem] !font-extrabold !leading-tight !text-white"
            >
              Great people<br />build great teams
            </Typography.Title>
            <p className="mt-3 mb-0 text-sm leading-relaxed text-slate-300">
              TalentPipe helps companies find, engage, and hire top talent faster
              with a modern, human approach to recruitment.
            </p>

            <ul className="m-0 mt-8 list-none space-y-5 p-0">
              {FEATURES.map(({ icon: Icon, label, sub }) => (
                <li key={label} className="flex items-start gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-primary-300 ring-1 ring-white/15">
                    <Icon className="text-[18px]" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-white">{label}</span>
                    <span className="block text-[12px] leading-relaxed text-slate-300">{sub}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="tp-auth-form-panel flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 sm:px-10">
        <div className="w-full max-w-[420px]">
          {/* Logo — mobile only */}
          <div className="mb-8 flex justify-center lg:hidden" aria-hidden="true">
            <BrandLogo tone="light" markClassName="h-9 w-auto" />
          </div>

          <h1 className="m-0 text-[1.75rem] font-bold leading-tight text-slate-900">
            Welcome back
          </h1>
          <p className="mb-0 mt-1.5 text-sm text-slate-500">
            Sign in to your TalentPipe account
          </p>

          {/* Pre-login notices (session expired, registered, etc.) */}
          <LoginNotices
            sessionEndReason={sessionEndReason}
            registered={intent.registered}
            passwordReset={intent.passwordReset}
            inviteAccepted={intent.inviteAccepted}
          />

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-7">
            <Flex vertical gap={20}>
              {error && <LoginErrorAlert message={error} onResend={needsVerification ? () => void handleResend() : undefined} />}
              {notice && <Alert tone="info">{notice}</Alert>}

              {/* Email */}
              <div>
                <label htmlFor={emailId} className="mb-1.5 block text-sm font-semibold text-slate-800">
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
                  prefix={<span className="text-slate-400 mr-1">✉</span>}
                />
              </div>

              {/* Password */}
              <PasswordField id={passwordId} value={password} onChange={setPassword} />

              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                className="mt-1 h-12 w-full rounded-xl text-base font-semibold shadow-sm"
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </Flex>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
            <span className="text-xs text-slate-400">or</span>
            <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
          </div>

          {/* Secondary links */}
          <div className="space-y-3 text-center">
            <p className="m-0">
              <Link to="/forgot-password" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                Forgot password?
              </Link>
            </p>
            <p className="m-0 text-sm text-slate-500">
              New to TalentPipe?{' '}
              <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

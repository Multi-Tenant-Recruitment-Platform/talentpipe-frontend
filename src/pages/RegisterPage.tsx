import {
  ArrowLeftOutlined,
  BankOutlined,
  RocketOutlined,
  SearchOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Typography } from 'antd';
import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { homeRouteFor } from '../auth/permissions';
import type { RegisterStep } from '../auth/registerIntent';
import { BrandLogo } from '../components/BrandLogo';
import { CandidateRegisterForm } from '../components/auth/CandidateRegisterForm';
import { CompanyRegisterForm } from '../components/auth/CompanyRegisterForm';
import { PageLoader } from '../components/PageLoader';
import registerHero from '../assets/register_hero.jpg';

const STEP_COPY: Record<RegisterStep, { title: string; subtitle: string }> = {
  choose: {
    title: 'Create your TalentPipe account',
    subtitle: 'Join a growing community of candidates and employers.',
  },
  candidate: {
    title: 'Create your candidate account',
    subtitle: 'One account for every company hiring on TalentPipe — apply once, get discovered again.',
  },
  company: {
    title: 'Register your company',
    subtitle: 'Set up your company workspace and invite your hiring team.',
  },
};

const BRAND_FEATURES = [
  { icon: SearchOutlined,  label: 'Find the right talent',  sub: 'Smarter matching, faster hiring' },
  { icon: RocketOutlined,  label: 'Grow your career',       sub: 'Opportunities that fit your goals' },
  { icon: TrophyOutlined,  label: 'Built for the future',   sub: 'A recruitment platform that works for everyone' },
];

/**
 * Full-screen standalone registration page. Replaces the former popup-based
 * RegisterRedirect flow with a proper split-screen page.
 */
export function RegisterPage() {
  const { user, initializing } = useAuth();
  const location = useLocation();

  // Seed the step from the URL state (kept for back-compat with deep links).
  const [step, setStep] = useState<RegisterStep>(
    (location.state as { register?: { step: RegisterStep } })?.register?.step ?? 'choose',
  );

  if (initializing) return <PageLoader />;
  if (user) return <Navigate to={homeRouteFor(user.role)} replace />;

  const copy = STEP_COPY[step];

  return (
    <div className="flex min-h-screen w-full">
      {/* ── Left brand panel ── */}
      <div className="relative hidden w-[44%] flex-none overflow-hidden bg-slate-900 lg:flex lg:flex-col">
        <img
          src={registerHero}
          alt="A diverse team collaborating in a modern co-working space"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        {/* Overlays */}
        <div aria-hidden="true" className="absolute inset-0 bg-primary-900/50 mix-blend-multiply" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-slate-900/20" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-slate-900/30 via-transparent to-transparent" />

        <div className="relative flex flex-1 flex-col justify-between p-10 xl:p-12">
          <BrandLogo tone="dark" markClassName="h-9 w-auto" />

          <div>
            <Typography.Title
              level={2}
              className="!m-0 !text-[2.1rem] !font-extrabold !leading-tight !text-white"
            >
              People<br />drive progress.<br />
              <span className="text-primary-300">We make hiring<br />happen.</span>
            </Typography.Title>
            <p className="mt-3 mb-0 text-sm leading-relaxed text-slate-300">
              TalentPipe connects great people with great opportunities. A modern
              recruitment platform built for what's next.
            </p>

            <ul className="m-0 mt-8 list-none space-y-5 p-0">
              {BRAND_FEATURES.map(({ icon: Icon, label, sub }) => (
                <li key={label} className="flex items-start gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-primary-300 ring-1 ring-white/15">
                    <Icon className="text-[18px]" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-white">{label}</span>
                    <span className="block text-[12px] leading-relaxed text-slate-400">{sub}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-start overflow-y-auto bg-white px-6 py-12 sm:px-10">
        <div className="w-full max-w-[480px]">
          {/* Logo — mobile only */}
          <div className="mb-8 flex justify-center lg:hidden" aria-hidden="true">
            <BrandLogo tone="light" markClassName="h-9 w-auto" />
          </div>

          {/* Back button (form steps only) */}
          {step !== 'choose' && (
            <button
              type="button"
              onClick={() => setStep('choose')}
              className="mb-5 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-transparent p-0 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeftOutlined aria-hidden className="text-[13px]" />
              Back
            </button>
          )}

          <h1 className="m-0 text-[1.6rem] font-bold leading-tight text-slate-900">
            {copy.title}
          </h1>
          <p className="mb-0 mt-1.5 text-sm text-slate-500">{copy.subtitle}</p>

          {/* ── Choose step ── */}
          {step === 'choose' && (
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {/* Candidate card */}
              <button
                type="button"
                onClick={() => setStep('candidate')}
                className="group flex cursor-pointer flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-primary-300 hover:bg-primary-50/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <span className="flex size-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100">
                  <UserOutlined className="text-[22px]" aria-hidden />
                </span>
                <span>
                  <span className="block text-base font-semibold text-slate-900">Candidate</span>
                  <span className="mt-0.5 block text-sm text-slate-500">Find a job and grow your career</span>
                </span>
              </button>

              {/* Employer card */}
              <button
                type="button"
                onClick={() => setStep('company')}
                className="group flex cursor-pointer flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-primary-300 hover:bg-primary-50/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <span className="flex size-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100">
                  <BankOutlined className="text-[22px]" aria-hidden />
                </span>
                <span>
                  <span className="block text-base font-semibold text-slate-900">Employer</span>
                  <span className="mt-0.5 block text-sm text-slate-500">Hire talent and build your team</span>
                </span>
              </button>
            </div>
          )}

          {/* ── Candidate form step ── */}
          {step === 'candidate' && (
            <div className="mt-6">
              <CandidateRegisterForm />
            </div>
          )}

          {/* ── Company form step ── */}
          {step === 'company' && (
            <div className="mt-6">
              <CompanyRegisterForm />
            </div>
          )}

          {/* Sign-in link */}
          <p className="mt-8 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link
              to="/login"
              state={location.state}
              className="font-semibold text-primary-600 hover:text-primary-700"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

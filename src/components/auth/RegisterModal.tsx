import { ArrowLeftOutlined, BankOutlined, CloseOutlined, RightOutlined, UserOutlined } from '@ant-design/icons';
import { Modal, Typography, type InputRef } from 'antd';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { readRegisterIntent, type RegisterStep } from '../../auth/registerIntent';
import { BrandLogo } from '../BrandLogo';
import interviewImage from '../../assets/interview.jpg';
import type { IconComponent } from '../ui/icon';
import { CandidateRegisterForm } from './CandidateRegisterForm';
import { CompanyRegisterForm } from './CompanyRegisterForm';

/** Each step's heading, lede and width — the candidate form needs room for its paired rows. */
const STEPS: Record<RegisterStep, { title: string; subtitle: string; width: number }> = {
  choose: { title: 'Create your TalentPipe account', subtitle: 'Join a growing community of candidates and employers.', width: 960 },
  candidate: {
    title: 'Create your candidate account',
    subtitle: 'One account for every company hiring on TalentPipe — apply once, get discovered again.',
    width: 960,
  },
  company: {
    title: 'Register your company',
    subtitle: 'Creates your company workspace and its first administrator account.',
    width: 960,
  },
};

const CHOICES: { step: Exclude<RegisterStep, 'choose'>; icon: IconComponent; title: string; text: string }[] = [
  {
    step: 'candidate',
    icon: UserOutlined,
    title: 'Candidate',
    text: 'Find a job and grow your career',
  },
  {
    step: 'company',
    icon: BankOutlined,
    title: 'Employer',
    text: 'Hire talent and build your team',
  },
];


/** Enters from a few pixels to the right as each step appears; still under reduced motion. */
const stepMotion =
  'transition-[opacity,translate] duration-(--tp-motion-base) ease-standard starting:translate-x-2 starting:opacity-0';

/**
 * The step's content. Destroyed with the popup, so every open starts clean —
 * but a form stays mounted (only hidden) once visited, so going Back to the
 * choice and returning keeps whatever was already typed.
 */
function RegisterSteps({
  step,
  onChoose,
  candidateRef,
  companyRef,
  onBusyChange,
}: Readonly<{
  step: RegisterStep;
  onChoose: (step: RegisterStep) => void;
  candidateRef: RefObject<InputRef>;
  companyRef: RefObject<InputRef>;
  onBusyChange: (busy: boolean) => void;
}>) {
  const [visited, setVisited] = useState<ReadonlySet<RegisterStep>>(() => new Set([step]));
  if (!visited.has(step)) {
    setVisited(new Set([...visited, step]));
  }

  return (
    <>
      <div hidden={step !== 'choose'} className={stepMotion}>
        {/* One decision, one click: each card goes straight to its form. */}
        <div className="grid gap-3 sm:grid-cols-2">
          {CHOICES.map((choice) => (
            <button
              key={choice.step}
              type="button"
              onClick={() => onChoose(choice.step)}
              className="group flex w-full cursor-pointer flex-col gap-3 rounded-xl border border-slate-200 bg-surface p-5 text-left text-inherit transition-[border-color,background-color,box-shadow,scale] duration-(--tp-motion-base) ease-standard hover:border-primary-200 hover:bg-primary-50/40 hover:shadow-sm focus-visible:shadow-focus focus-visible:outline-none active:scale-[0.98]"
            >
              <span className="flex items-center justify-between">
                <span
                  aria-hidden="true"
                  className="flex size-11 items-center justify-center rounded-lg bg-primary-50 text-primary-600"
                >
                  <choice.icon className="text-[20px]" />
                </span>
                <RightOutlined
                  aria-hidden
                  className="text-[14px] text-slate-400 transition-[translate,color] duration-(--tp-motion-base) ease-standard group-hover:translate-x-0.5 group-hover:text-primary-600"
                />
              </span>
              <span className="block text-title font-semibold text-slate-900">{choice.title}</span>
              <span className="block text-small text-slate-600">{choice.text}</span>
            </button>
          ))}
        </div>
      </div>

      {visited.has('candidate') && (
        <div hidden={step !== 'candidate'} className={stepMotion}>
          <CandidateRegisterForm firstFieldRef={candidateRef} onBusyChange={onBusyChange} />
        </div>
      )}
      {visited.has('company') && (
        <div hidden={step !== 'company'} className={stepMotion}>
          <CompanyRegisterForm firstFieldRef={companyRef} onBusyChange={onBusyChange} />
        </div>
      )}
    </>
  );
}

/**
 * The registration popup, rendered once by the public layout next to the
 * login popup and built to match it.
 *
 * <p>Wide split-panel design matching the wireframe: brand panel on the left,
 * form steps on the right. Opens on the account-type choice.</p>
 */
export function RegisterModal() {
  const { user, initializing } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const intent = readRegisterIntent(location.state);
  const [busy, setBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const candidateRef = useRef<InputRef>(null);
  const companyRef = useRef<InputRef>(null);

  const open = intent !== null && !initializing && user === null;

  // Held while the popup animates closed, so its content does not flip back
  // to a default step on the way out.
  const [step, setStep] = useState<RegisterStep>(intent?.step ?? 'choose');
  if (intent && intent.step !== step) {
    setStep(intent.step);
  }
  const copy = STEPS[step];

  const { pathname, search, hash } = location;
  const here = { pathname, search, hash };

  function focusStep() {
    const target = step === 'candidate' ? candidateRef.current : step === 'company' ? companyRef.current : headingRef.current;
    target?.focus();
  }

  useEffect(() => {
    if (!open) {
      return;
    }
    const target = step === 'candidate' ? candidateRef.current : step === 'company' ? companyRef.current : headingRef.current;
    target?.focus();
  }, [open, step]);

  function goTo(next: RegisterStep) {
    navigate(here, { replace: true, state: { register: { step: next } } });
  }

  function close() {
    navigate(here, { replace: true, state: null });
  }

  return (
    <Modal
      open={open}
      onCancel={close}
      width={960}
      footer={null}
      destroyOnHidden
      keyboard={!busy}
      mask={{ closable: !busy }}
      styles={{
        mask: {
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
        },
      }}
      closable={{
        disabled: busy,
        'aria-label': 'Close',
        closeIcon: <CloseOutlined aria-hidden className="text-[16px] text-slate-400" />,
      }}
      classNames={{
        container: 'overflow-hidden !p-0',
        header: '!hidden',
        body: '!p-0',
      }}
      afterOpenChange={(opened) => opened && focusStep()}
      title={copy.title}
    >
      {intent && (
        <div className="flex min-h-[560px]">
          {/* ── Left brand panel ── */}
          <div className="relative hidden overflow-hidden bg-primary-900 lg:flex lg:w-[42%] lg:shrink-0 lg:flex-col">
            <img
              src={interviewImage}
              alt="People collaborating in a modern recruitment setting"
              className="absolute inset-0 size-full object-cover object-center"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-primary-600/32 mix-blend-multiply" />
            <div aria-hidden="true" className="tp-brand-scrim" />
            <div aria-hidden="true" className="tp-brand-scrim-top" />
            <div aria-hidden="true" className="tp-brand-dots" />

            <div className="relative flex flex-1 flex-col justify-between p-8 xl:p-10">
              <BrandLogo tone="dark" markClassName="h-8 w-auto" />

              <div>
                <Typography.Title
                  level={2}
                  className="!m-0 !text-[2rem] !font-extrabold !leading-tight !text-white"
                >
                  People<br />drive progress.<br />
                  <span className="text-primary-300">We make hiring<br />happen.</span>
                </Typography.Title>
                <Typography.Paragraph className="!mb-0 !mt-3 !text-sm !leading-relaxed text-primary-100">
                  TalentPipe connects great people with great opportunities. A modern recruitment
                  platform built for what's next.
                </Typography.Paragraph>

                <ul className="m-0 mt-6 list-none space-y-3.5 p-0">
                  {[
                    { icon: '🔍', label: 'Find the right talent', sub: 'Smarter matching, faster hiring' },
                    { icon: '🚀', label: 'Grow your career', sub: 'Opportunities that fit your goals' },
                    { icon: '📈', label: 'Built for the future', sub: 'A recruitment platform that works for everyone' },
                  ].map((f) => (
                    <li key={f.label} className="flex items-start gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-base leading-none">
                        {f.icon}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-white">{f.label}</span>
                        <span className="block text-[12px] text-primary-200">{f.sub}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* ── Right form panel ── */}
          <div className="relative flex flex-1 flex-col">
            {/* Back button — outside the heading so it isn't part of the dialog's name */}
            {step !== 'choose' && (
              <button
                type="button"
                onClick={() => goTo('choose')}
                disabled={busy}
                className="absolute top-5 left-5 inline-flex cursor-pointer items-center gap-1.5 rounded-md border-0 bg-transparent px-2 py-1 text-small font-medium text-slate-600 transition-colors duration-(--tp-motion-base) hover:bg-slate-100 hover:text-slate-900 focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowLeftOutlined aria-hidden className="text-[13px]" />
                Back
              </button>
            )}

            {/* Scrollable form area */}
            <div className="flex flex-1 flex-col justify-center overflow-y-auto px-8 py-10 sm:px-10">
              <div className="mx-auto w-full max-w-[460px]">
                {/* Brand mark — mobile only */}
                <div className="mb-5 flex justify-center lg:hidden" aria-hidden="true">
                  <BrandLogo tone="light" markClassName="h-8 w-auto" />
                </div>

                <Typography.Title
                  ref={headingRef}
                  tabIndex={-1}
                  level={2}
                  className="!m-0 !text-[1.4rem] !font-bold text-slate-900 focus:outline-none"
                >
                  {copy.title}
                </Typography.Title>
                <p className="mb-6 mt-1 text-sm text-slate-500">{copy.subtitle}</p>

                <RegisterSteps
                  step={step}
                  onChoose={goTo}
                  candidateRef={candidateRef}
                  companyRef={companyRef}
                  onBusyChange={setBusy}
                />

                {/* Swap to login popup */}
                <p className="mb-0 mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-600">
                  Already have an account?{' '}
                  <Link to={here} replace state={{ login: {} }} className="font-semibold">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

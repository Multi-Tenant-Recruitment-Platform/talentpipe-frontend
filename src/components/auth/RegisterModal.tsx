import { ArrowLeftOutlined, BankOutlined, CloseOutlined, RightOutlined, UserOutlined } from '@ant-design/icons';
import { Modal, Typography, type InputRef } from 'antd';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { readRegisterIntent, type RegisterStep } from '../../auth/registerIntent';
import { BrandLogo } from '../BrandLogo';
import type { IconComponent } from '../ui/icon';
import { CandidateRegisterForm } from './CandidateRegisterForm';
import { CompanyRegisterForm } from './CompanyRegisterForm';

/** Each step's heading, lede and width — the candidate form needs room for its paired rows. */
const STEPS: Record<RegisterStep, { title: string; subtitle: string; width: number }> = {
  choose: { title: 'Create your account', subtitle: 'How will you use TalentPipe?', width: 560 },
  candidate: {
    title: 'Create your candidate account',
    subtitle: 'One account for every company hiring on TalentPipe — apply once, get discovered again.',
    width: 600,
  },
  company: {
    title: 'Register your company',
    subtitle: 'Creates your company workspace and its first administrator account.',
    width: 520,
  },
};

const CHOICES: { step: Exclude<RegisterStep, 'choose'>; icon: IconComponent; title: string; text: string }[] = [
  {
    step: 'candidate',
    icon: UserOutlined,
    title: "I'm looking for a job",
    text: 'Apply once, get discovered by every company on TalentPipe.',
  },
  {
    step: 'company',
    icon: BankOutlined,
    title: "I'm hiring",
    text: 'Set up your company workspace and invite your hiring team.',
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
 * <p>It opens on a choice — job seeker or company — because the two sign-ups
 * ask for different things; picking one moves straight to its form. Open
 * while the current history entry carries a register intent (see
 * `auth/registerIntent.ts`) and nobody is signed in.</p>
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

  // A new step moves focus with it — to the heading on the choice, to the
  // first field on a form — so keyboard and screen-reader users land in it.
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
      width={copy.width}
      footer={null}
      // Mounted fresh on every open, so each one starts from a clean form.
      destroyOnHidden
      // Ignored mid-flight — the account may already have been created.
      keyboard={!busy}
      mask={{ closable: !busy }}
      closable={{
        disabled: busy,
        'aria-label': 'Close',
        closeIcon: <CloseOutlined aria-hidden className="text-[16px] text-slate-500" />,
      }}
      // The same centred header as the login popup; the body scrolls on its
      // own so a long form never pushes the heading or the close button away.
      classNames={{
        container: 'relative overflow-hidden p-0',
        header: 'm-0 px-8 pt-8 pb-1 text-center',
        body: 'max-h-[calc(100dvh-16rem)] overflow-y-auto px-8 pt-2 pb-7',
      }}
      afterOpenChange={(opened) => opened && focusStep()}
      title={
        <>
          <div aria-hidden="true" className="mb-4 flex justify-center">
            <BrandLogo tone="light" markClassName="h-9 w-auto" />
          </div>
          <Typography.Title
            ref={headingRef}
            tabIndex={-1}
            level={2}
            className="m-0 text-heading tracking-heading text-slate-900 focus:outline-none"
          >
            {copy.title}
          </Typography.Title>
        </>
      }
    >
      {/* Outside the header on purpose: inside it, "Back" would become part
          of the dialog's name. Positioned against the panel, so it sits in
          the top-left corner and does not scroll away with the form. */}
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

      <Typography.Paragraph className="m-0 mb-6 text-center text-slate-600">{copy.subtitle}</Typography.Paragraph>

      {intent && (
        <RegisterSteps
          step={step}
          onChoose={goTo}
          candidateRef={candidateRef}
          companyRef={companyRef}
          onBusyChange={setBusy}
        />
      )}

      {/* Swaps this popup for the login one, over the same page. */}
      <Typography.Paragraph className="mt-6 mb-0 border-t border-slate-100 pt-5 text-center text-slate-600">
        Already have an account?{' '}
        <Link to={here} replace state={{ login: {} }} className="font-semibold">
          Log in
        </Link>
      </Typography.Paragraph>
    </Modal>
  );
}

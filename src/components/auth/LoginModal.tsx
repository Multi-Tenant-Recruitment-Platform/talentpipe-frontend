import { CloseOutlined } from '@ant-design/icons';
import { Modal, Typography, type InputRef } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { UserResponse } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { readLoginIntent } from '../../auth/loginIntent';
import { homeRouteFor } from '../../auth/permissions';
import { LoginForm } from './LoginForm';
import { BrandLogo } from '../BrandLogo';
import interviewImage from '../../assets/interview.jpg';

/**
 * The login popup, rendered once by the public layout.
 *
 * <p>Wide split-panel design matching the wireframe: brand/image panel on the
 * left, form on the right. Open while the current history entry carries a
 * login intent and nobody is signed in.</p>
 */
export function LoginModal() {
  const { user, initializing, clearSessionEndReason } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const intent = readLoginIntent(location.state);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<InputRef>(null);
  // Set the moment someone signs in through this popup, so the clean-up below
  // can tell that apart from a session restored on load.
  const signedInHere = useRef(false);

  // Hidden while the session restores, so a reload with a valid session never
  // flashes a login form at someone who is already signed in.
  const open = intent !== null && !initializing && user === null;

  const { pathname, search, hash } = location;
  const here = { pathname, search, hash };
  const hasIntent = intent !== null;

  // A restored session makes a leftover intent meaningless; drop it.
  useEffect(() => {
    if (hasIntent && user && !initializing && !signedInHere.current) {
      navigate({ pathname, search, hash }, { replace: true, state: null });
    }
  }, [hasIntent, user, initializing, navigate, pathname, search, hash]);

  function close() {
    clearSessionEndReason();
    navigate(here, { replace: true, state: null });
  }

  function handleSuccess(signedIn: UserResponse) {
    signedInHere.current = true;
    const home = homeRouteFor(signedIn.role);
    if (intent?.from) {
      navigate(intent.from, { replace: true });
    } else if (home === '/') {
      navigate(here, { replace: true, state: null });
    } else {
      navigate(home, { replace: true });
    }
  }

  return (
    <Modal
      open={open}
      onCancel={close}
      width={900}
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
      afterOpenChange={(opened) => opened && emailRef.current?.focus()}
      title="Welcome back"
    >
      {intent && (
        <div className="flex min-h-[560px]">
          {/* ── Left brand panel ── */}
          <div className="relative hidden overflow-hidden bg-primary-900 lg:flex lg:w-[44%] lg:shrink-0 lg:flex-col">
            <img
              src={interviewImage}
              alt="A recruiter reviewing a CV during a video interview"
              className="absolute inset-0 size-full object-cover object-center"
            />
            {/* Layered colour / scrim treatments */}
            <div aria-hidden="true" className="absolute inset-0 bg-primary-600/32 mix-blend-multiply" />
            <div aria-hidden="true" className="tp-brand-scrim" />
            <div aria-hidden="true" className="tp-brand-scrim-top" />
            <div aria-hidden="true" className="tp-brand-dots" />

            <div className="relative flex flex-1 flex-col justify-between p-8 xl:p-10">
              <BrandLogo tone="dark" markClassName="h-8 w-auto" />

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/90">
                  A brighter way to hire
                </p>
                <Typography.Title
                  level={2}
                  className="!m-0 !text-[1.65rem] !font-extrabold !leading-snug !text-white"
                >
                  Great people<br />build great teams
                </Typography.Title>
                <Typography.Paragraph className="!mb-0 !mt-3 !text-sm !leading-relaxed text-primary-100">
                  TalentPipe helps companies find, engage, and hire top talent faster
                  with a modern, human approach to recruitment.
                </Typography.Paragraph>

                <ul className="m-0 mt-6 list-none space-y-3.5 p-0">
                  {[
                    { icon: '👥', label: 'Attract top talent', sub: 'Reach qualified candidates where they are' },
                    { icon: '⚡', label: 'Streamline hiring', sub: 'Automate and simplify your workflow' },
                    { icon: '📊', label: 'Build stronger teams', sub: 'Make data-informed hiring decisions' },
                  ].map((f) => (
                    <li key={f.label} className="flex items-start gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-base leading-none">
                        {f.icon}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-white">{f.label}</span>
                        <span className="block text-[12px] text-slate-300">{f.sub}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* ── Right form panel ── */}
          <div className="flex flex-1 flex-col justify-center px-8 py-10 sm:px-10 lg:py-12">
            <div className="mx-auto w-full max-w-[400px]">
              {/* Brand mark — visible only on mobile where the left panel is hidden */}
              <div className="mb-6 flex justify-center lg:hidden" aria-hidden="true">
                <BrandLogo tone="light" markClassName="h-8 w-auto" />
              </div>

              <Typography.Title level={2} className="!m-0 !text-[1.5rem] !font-bold text-slate-900">
                Welcome back
              </Typography.Title>
              <p className="mb-0 mt-1 text-sm text-slate-500">
                Sign in to your TalentPipe account
              </p>

              <div className="mt-7">
                <LoginForm
                  intent={intent}
                  emailRef={emailRef}
                  onBusyChange={setBusy}
                  onSuccess={handleSuccess}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

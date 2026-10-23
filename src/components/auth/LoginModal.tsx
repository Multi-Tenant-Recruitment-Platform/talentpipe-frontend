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

/**
 * The login popup, rendered once by the public layout.
 *
 * <p>It is open while the current history entry carries a login intent (see
 * `auth/loginIntent.ts`) and nobody is signed in. Closing it replaces that
 * entry without the intent, so the page underneath is left exactly as it was.</p>
 *
 * <p>A light, centred header — the brand mark over the greeting — above the
 * form. The dialog's name is exactly its heading: the brand row above it is
 * decoration, hidden from the name.</p>
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
  //
  // Not after a sign-in here: handleSuccess has already sent the person on.
  // The session update renders first — React Router 7 runs that navigation as
  // a transition — so this effect would otherwise see a signed-in user with
  // the intent still set, "close" the popup by replacing the entry with the
  // page underneath, and pull a company admin back off the dashboard.
  useEffect(() => {
    if (hasIntent && user && !initializing && !signedInHere.current) {
      navigate({ pathname, search, hash }, { replace: true, state: null });
    }
  }, [hasIntent, user, initializing, navigate, pathname, search, hash]);

  function close() {
    // Shown once: the next time the popup opens it should not still explain
    // a session that ended long ago.
    clearSessionEndReason();
    navigate(here, { replace: true, state: null });
  }

  function handleSuccess(signedIn: UserResponse) {
    signedInHere.current = true;
    const home = homeRouteFor(signedIn);
    if (intent?.from) {
      // Back to the protected page that sent them here.
      navigate(intent.from, { replace: true });
    } else if (home === '/') {
      // A candidate who signed in from a job page stays on it, to apply.
      navigate(here, { replace: true, state: null });
    } else {
      navigate(home, { replace: true });
    }
  }

  return (
    <Modal
      open={open}
      onCancel={close}
      width={460}
      footer={null}
      // Mounted fresh on every open, so each one starts from a clean form.
      destroyOnHidden
      // Ignored mid-flight — the sign-in may already have succeeded.
      keyboard={!busy}
      mask={{ closable: !busy }}
      closable={{
        disabled: busy,
        'aria-label': 'Close',
        closeIcon: <CloseOutlined aria-hidden className="text-[16px] text-slate-500" />,
      }}
      // A centred header — brand over greeting — flowing straight into the form.
      classNames={{
        container: 'overflow-hidden p-0',
        header: 'm-0 px-8 pt-8 pb-1 text-center',
        body: 'px-8 pt-2 pb-7',
      }}
      afterOpenChange={(opened) => opened && emailRef.current?.focus()}
      title={
        <>
          <div aria-hidden="true" className="mb-4 flex justify-center">
            <BrandLogo tone="light" markClassName="h-9 w-auto" />
          </div>
          <Typography.Title level={2} className="m-0 text-heading tracking-heading text-slate-900">
            Welcome back
          </Typography.Title>
        </>
      }
    >
      {intent && (
        <LoginForm intent={intent} emailRef={emailRef} onBusyChange={setBusy} onSuccess={handleSuccess} />
      )}
    </Modal>
  );
}

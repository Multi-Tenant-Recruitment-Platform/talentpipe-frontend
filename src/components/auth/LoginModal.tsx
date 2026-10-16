import { Modal, Typography, type InputRef } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { UserResponse } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { readLoginIntent } from '../../auth/loginIntent';
import { homeRouteFor } from '../../auth/permissions';
import { LoginForm } from './LoginForm';

/**
 * The login popup, rendered once by the public layout.
 *
 * <p>It is open while the current history entry carries a login intent (see
 * `auth/loginIntent.ts`) and nobody is signed in. Closing it replaces that
 * entry without the intent, so the page underneath is left exactly as it was.</p>
 */
export function LoginModal() {
  const { user, initializing, clearSessionEndReason } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const intent = readLoginIntent(location.state);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<InputRef>(null);

  // Hidden while the session restores, so a reload with a valid session never
  // flashes a login form at someone who is already signed in.
  const open = intent !== null && !initializing && user === null;

  const { pathname, search, hash } = location;
  const here = { pathname, search, hash };
  const hasIntent = intent !== null;

  // A restored session makes a leftover intent meaningless; drop it.
  useEffect(() => {
    if (hasIntent && user && !initializing) {
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
    const home = homeRouteFor(signedIn.role);
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
      width={480}
      footer={null}
      // Mounted fresh on every open, so each one starts from a clean form.
      destroyOnHidden
      // Ignored mid-flight — the sign-in may already have succeeded.
      keyboard={!busy}
      mask={{ closable: !busy }}
      closable={{ disabled: busy, 'aria-label': 'Close' }}
      afterOpenChange={(opened) => opened && emailRef.current?.focus()}
      title={
        <Typography.Title level={2} className="m-0 text-heading">
          Welcome back
        </Typography.Title>
      }
    >
      {intent && (
        <LoginForm intent={intent} emailRef={emailRef} onBusyChange={setBusy} onSuccess={handleSuccess} />
      )}
    </Modal>
  );
}

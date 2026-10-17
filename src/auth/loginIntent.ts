import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Why the login popup is open, and what it should say and do.
 *
 * <p>It travels in router history state (`location.state.login`) rather than in
 * a React context: navigating anywhere else drops the state, so a link inside
 * the popup closes it by itself, and `/login` can open it with a plain
 * redirect. The fields are the ones the old login page read from its route
 * state, so every page that sends people to `/login` keeps working as is.</p>
 */
export interface LoginIntent {
  /** Set by the registration pages after a successful sign-up. */
  registered?: boolean | 'company' | 'candidate';
  /** Prefills the email field (e.g. after candidate registration). */
  email?: string;
  /** Set by the reset-password page after a successful reset. */
  passwordReset?: boolean;
  /** Set by the accept-invite page after activation. */
  inviteAccepted?: boolean;
  /** Where to go after signing in — the protected page that sent the user here. */
  from?: string;
}

/** The popup's intent from a location's state, or null when it is closed. */
export function readLoginIntent(state: unknown): LoginIntent | null {
  const login = (state as { login?: unknown } | null)?.login;
  return login && typeof login === 'object' ? (login as LoginIntent) : null;
}

/** Opens the login popup over the current page, without leaving it. */
export function useOpenLogin() {
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();
  // `replace`, so Back never reopens a login the user already dismissed.
  return useCallback(
    (intent: LoginIntent = {}) => navigate({ pathname, search, hash }, { replace: true, state: { login: intent } }),
    [navigate, pathname, search, hash],
  );
}

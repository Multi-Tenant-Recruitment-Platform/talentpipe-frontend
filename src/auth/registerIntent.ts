import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/** Which screen of the registration popup is showing. */
export type RegisterStep = 'choose' | 'candidate' | 'company';

/**
 * Why the registration popup is open — the same history-state pattern as the
 * login popup (see `loginIntent.ts`): navigating anywhere else drops it, and
 * replacing it with `state.login` swaps one popup for the other.
 */
export interface RegisterIntent {
  step: RegisterStep;
}

/** The popup's intent from a location's state, or null when it is closed. */
export function readRegisterIntent(state: unknown): RegisterIntent | null {
  const register = (state as { register?: unknown } | null)?.register;
  return register && typeof register === 'object' ? (register as RegisterIntent) : null;
}

/** Opens the registration popup over the current page, at the given step. */
export function useOpenRegister() {
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();
  // `replace`, so Back never reopens a popup the user already dismissed.
  return useCallback(
    (step: RegisterStep = 'choose') =>
      navigate({ pathname, search, hash }, { replace: true, state: { register: { step } } }),
    [navigate, pathname, search, hash],
  );
}

import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import type { UserResponse } from '../api/types';

/** A minimal signed-in user; override whatever the test cares about. */
export function makeUser(overrides: Partial<UserResponse> = {}): UserResponse {
  return {
    id: 'u-1',
    tenantId: 't-1',
    tenantName: 'Acme',
    role: 'COMPANY_ADMIN',
    email: 'admin@acme.test',
    firstName: 'Ada',
    lastName: 'Lovelace',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Shared mock for the auth context. Tests call {@link setAuth} to drive it.
 * Pair with `vi.mock('../auth/AuthContext', () => authContextMock)`.
 */
export const authState: {
  user: UserResponse | null;
  initializing: boolean;
} = { user: null, initializing: false };

export function setAuth(next: Partial<typeof authState>): void {
  Object.assign(authState, next);
}

export const authContextMock = {
  useAuth: () => ({
    ...authState,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    sessionEndReason: null,
    clearSessionEndReason: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
};

/** Renders the current pathname so a test can assert on navigation. */
export function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

/**
 * Router with sentinel destinations, so a redirect is observable as rendered
 * text rather than as a spy on the router internals.
 */
export function RouterHarness({
  initialEntry = '/dashboard',
  children,
}: {
  initialEntry?: string;
  children: ReactNode;
}) {
  return (
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationProbe />
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/jobs" element={<p>jobs page</p>} />
        <Route path="/dashboard/*" element={children} />
      </Routes>
    </MemoryRouter>
  );
}

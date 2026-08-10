import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authContextMock, makeUser, RouterHarness, setAuth } from '../test/authHarness';

vi.mock('../auth/AuthContext', () => authContextMock);

const { ProtectedRoute } = await import('./ProtectedRoute');

function renderGuard(initialEntry = '/dashboard') {
  return render(
    <RouterHarness initialEntry={initialEntry}>
      <ProtectedRoute requires="dashboard.view" redirectTo="/jobs">
        <p>workspace</p>
      </ProtectedRoute>
    </RouterHarness>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => setAuth({ user: null, initializing: false }));

  it('waits for the session restore instead of bouncing a valid session', () => {
    setAuth({ user: null, initializing: true });
    renderGuard();
    expect(screen.getByText(/loading session/i)).toBeInTheDocument();
    expect(screen.queryByText('login page')).not.toBeInTheDocument();
  });

  it('sends a signed-out visitor to /login, remembering where they were going', () => {
    renderGuard('/dashboard/pipeline');
    expect(screen.getByText('login page')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('redirects a candidate away rather than showing an unusable 403', () => {
    setAuth({ user: makeUser({ role: 'CANDIDATE', tenantId: null, tenantName: null }) });
    renderGuard();
    expect(screen.getByText('jobs page')).toBeInTheDocument();
    expect(screen.queryByText('workspace')).not.toBeInTheDocument();
  });

  it('locks out a role the frontend has never heard of', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    setAuth({ user: makeUser({ role: 'RECRUITER' }) });
    renderGuard();
    expect(screen.getByText('jobs page')).toBeInTheDocument();
    warn.mockRestore();
  });

  it.each(['COMPANY_ADMIN', 'HR_MANAGER', 'INTERVIEWER'])('admits %s', (role) => {
    setAuth({ user: makeUser({ role }) });
    renderGuard();
    expect(screen.getByText('workspace')).toBeInTheDocument();
  });
});

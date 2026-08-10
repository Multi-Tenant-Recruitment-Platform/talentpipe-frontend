import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authContextMock, makeUser, RouterHarness, setAuth } from '../test/authHarness';

vi.mock('../auth/AuthContext', () => authContextMock);

const { RequirePermission } = await import('./RequirePermission');

function renderGate() {
  return render(
    <RouterHarness initialEntry="/dashboard/team">
      <RequirePermission permission="team.view">
        <p>team roster</p>
      </RequirePermission>
    </RouterHarness>,
  );
}

describe('RequirePermission', () => {
  beforeEach(() => setAuth({ user: null, initializing: false }));

  it('renders the page for a role that holds the permission', () => {
    setAuth({ user: makeUser({ role: 'COMPANY_ADMIN' }) });
    renderGate();
    expect(screen.getByText('team roster')).toBeInTheDocument();
  });

  it.each(['HR_MANAGER', 'INTERVIEWER'])('shows a 403 to %s instead of the page', (role) => {
    setAuth({ user: makeUser({ role }) });
    renderGate();
    expect(screen.queryByText('team roster')).not.toBeInTheDocument();
    expect(screen.getByText(/error 403/i)).toBeInTheDocument();
  });

  it('names the role that does hold the permission', () => {
    setAuth({ user: makeUser({ role: 'INTERVIEWER' }) });
    renderGate();
    expect(screen.getByText(/only a company admin can manage teammates/i)).toBeInTheDocument();
  });

  it('keeps the URL so the deep link survives', () => {
    setAuth({ user: makeUser({ role: 'INTERVIEWER' }) });
    renderGate();
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard/team');
  });

  it('offers a way out that suits the role', () => {
    setAuth({ user: makeUser({ role: 'INTERVIEWER' }) });
    renderGate();
    expect(screen.getByRole('link', { name: /back to overview/i })).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });
});

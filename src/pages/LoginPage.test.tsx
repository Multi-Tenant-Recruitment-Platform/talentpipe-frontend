import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeUser } from '../test/authHarness';

const login = vi.fn();

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    initializing: false,
    sessionEndReason: null,
    login,
    register: vi.fn(),
    logout: vi.fn(),
  }),
}));

const { LoginPage } = await import('./LoginPage');

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<p>dashboard</p>} />
        <Route path="/jobs" element={<p>jobs</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  login.mockReset();
  login.mockResolvedValue(makeUser());
});

describe('company login', () => {
  it('signs in with email and password alone', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'admin@acme.test');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in as company/i }));

    expect(login).toHaveBeenCalledWith('admin@acme.test', 'secret123');
    expect(await screen.findByText('dashboard')).toBeInTheDocument();
  });

  it('never asks for a workspace or shows a workspace address', () => {
    renderLogin();

    expect(screen.queryByLabelText(/workspace/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/talentpipe\.io/i)).not.toBeInTheDocument();
    // Email and password are the only fields.
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
  });

  it('shows the backend’s generic error, not a field-specific guess', async () => {
    // The backend deliberately returns the same 401 for an unknown account as
    // for a wrong password, so the frontend cannot claim to know which it was.
    login.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: { message: 'Invalid credentials' } },
    });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'admin@acme.test');
    await user.type(screen.getByLabelText(/password/i), 'wrong-pass');
    await user.click(screen.getByRole('button', { name: /sign in as company/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
  });
});

describe('candidate login', () => {
  it('signs in the same way, and lands on the job board', async () => {
    login.mockResolvedValue(makeUser({ role: 'CANDIDATE', tenantId: null }));
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('tab', { name: /candidate/i }));
    await user.type(screen.getByLabelText(/email/i), 'jo@example.test');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in as candidate/i }));

    expect(login).toHaveBeenCalledWith('jo@example.test', 'secret123');
    expect(await screen.findByText('jobs')).toBeInTheDocument();
  });
});

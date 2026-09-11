import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeUser } from '../test/authHarness';

const login = vi.fn();
const tenantHost = { subdomain: null as string | null, locked: false };

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

vi.mock('../tenant/subdomain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../tenant/subdomain')>();
  return { ...actual, resolveTenantHost: () => tenantHost };
});

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
  localStorage.clear();
  login.mockReset();
  login.mockResolvedValue(makeUser());
  tenantHost.subdomain = null;
  tenantHost.locked = false;
});

describe('company login carries the workspace', () => {
  it('sends the typed workspace as the tenant', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/workspace/i), 'acme');
    await user.type(screen.getByLabelText(/email/i), 'admin@acme.test');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in as company/i }));

    expect(login).toHaveBeenCalledWith('acme', 'admin@acme.test', 'secret123');
  });

  it('refuses to sign in without a workspace', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/email/i), 'admin@acme.test');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in as company/i }));

    expect(login).not.toHaveBeenCalled();
    expect(screen.getByText(/enter your workspace to continue/i)).toBeInTheDocument();
  });

  it('remembers the workspace for the next visit', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/workspace/i), 'acme');
    await user.type(screen.getByLabelText(/email/i), 'admin@acme.test');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in as company/i }));

    expect(localStorage.getItem('talentpipe.lastSubdomain')).toBe('acme');
  });

  it('shows the backend’s generic error on a wrong workspace, not a field-specific guess', async () => {
    // The backend deliberately returns the same 401 for an unknown workspace
    // as for a wrong password (no tenant-enumeration via error codes) — so the
    // frontend cannot and must not claim to know which one was wrong.
    login.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: { message: 'Invalid credentials' } },
    });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText(/workspace/i), 'nope');
    await user.type(screen.getByLabelText(/email/i), 'admin@acme.test');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in as company/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(screen.queryByText(/couldn’t find a workspace/i)).not.toBeInTheDocument();
  });
});

describe('workspace detected from the host', () => {
  it('locks the field and still sends the tenant', async () => {
    tenantHost.subdomain = 'acme';
    tenantHost.locked = true;
    const user = userEvent.setup();
    renderLogin();

    expect(screen.getByText('Detected')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /workspace/i })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/email/i), 'admin@acme.test');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in as company/i }));

    expect(login).toHaveBeenCalledWith('acme', 'admin@acme.test', 'secret123');
  });
});

describe('candidate login is tenant-less', () => {
  it('hides the workspace field and sends no tenant', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('tab', { name: /candidate/i }));
    expect(screen.queryByLabelText(/workspace/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/email/i), 'jo@example.test');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in as candidate/i }));

    expect(login).toHaveBeenCalledWith('', 'jo@example.test', 'secret123');
  });
});

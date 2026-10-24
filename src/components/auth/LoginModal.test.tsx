import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, type InitialEntry } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserResponse } from '../../api/types';
import { LocationProbe, makeUser } from '../../test/authHarness';

const login = vi.fn();
const selectWorkspace = vi.fn();
const clearSessionEndReason = vi.fn();
const auth: { user: UserResponse | null; sessionEndReason: 'expired' | null } = {
  user: null,
  sessionEndReason: null,
};

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    ...auth,
    initializing: false,
    clearSessionEndReason,
    login,
    selectWorkspace,
    register: vi.fn(),
    logout: vi.fn(),
  }),
}));

const { LoginModal } = await import('./LoginModal');
const { LoginRedirect } = await import('./LoginRedirect');
const { useOpenLogin } = await import('../../auth/loginIntent');

/** The board with the header's "Log in" trigger, as the public layout renders it. */
function Board() {
  const openLogin = useOpenLogin();
  return (
    <>
      <p>board</p>
      <button type="button" onClick={() => openLogin()}>
        Log in
      </button>
      <LoginModal />
    </>
  );
}

function renderAt(entry: InitialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/" element={<Board />} />
        <Route path="/login" element={<LoginRedirect />} />
        <Route path="/dashboard" element={<p>dashboard</p>} />
        <Route path="/dashboard/team" element={<p>team page</p>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

async function openFromHeader(user: ReturnType<typeof userEvent.setup>) {
  renderAt();
  await user.click(screen.getByRole('button', { name: 'Log in' }));
  return screen.findByRole('dialog', { name: 'Welcome back' });
}

async function signIn(user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement, button: RegExp) {
  await user.type(within(dialog).getByLabelText(/email/i), 'admin@acme.test');
  await user.type(within(dialog).getByLabelText(/password/i), 'secret123');
  await user.click(within(dialog).getByRole('button', { name: button }));
}

beforeEach(() => {
  login.mockReset();
  login.mockResolvedValue(makeUser());
  selectWorkspace.mockReset();
  clearSessionEndReason.mockReset();
  auth.user = null;
  auth.sessionEndReason = null;
});

afterEach(cleanup);

describe('opening the popup', () => {
  it('stays closed until something asks for it', () => {
    renderAt();

    expect(screen.getByText('board')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens over the current page from the header, without leaving it', async () => {
    const user = userEvent.setup();
    const dialog = await openFromHeader(user);

    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('board')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
  });

  it('opens over the job board when something links to /login', async () => {
    renderAt('/login');

    expect(await screen.findByRole('dialog', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByText('board')).toBeInTheDocument();
  });

  it('sends someone already signed in straight on instead', async () => {
    auth.user = makeUser();
    renderAt('/login');

    expect(await screen.findByText('dashboard')).toBeInTheDocument();
  });
});

describe('company login', () => {
  it('signs in with email and password alone', async () => {
    const user = userEvent.setup();
    const dialog = await openFromHeader(user);

    await signIn(user, dialog, /^sign in$/i);

    expect(login).toHaveBeenCalledWith('admin@acme.test', 'secret123');
    expect(await screen.findByText('dashboard')).toBeInTheDocument();
  });

  it('never asks for a workspace or shows a workspace address', async () => {
    const user = userEvent.setup();
    const dialog = await openFromHeader(user);

    expect(within(dialog).queryByLabelText(/workspace/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/talentpipe\.io/i)).not.toBeInTheDocument();
    // Email and password are the only fields.
    expect(within(dialog).getAllByRole('textbox')).toHaveLength(1);
  });

  it('shows the backend’s generic error, not a field-specific guess', async () => {
    // The backend deliberately returns the same 401 for an unknown account as
    // for a wrong password, so the frontend cannot claim to know which it was.
    login.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401, data: { message: 'Invalid credentials' } },
    });
    const user = userEvent.setup();
    const dialog = await openFromHeader(user);

    await signIn(user, dialog, /^sign in$/i);

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Invalid credentials');
  });

  it('returns to the protected page that sent the user to log in', async () => {
    const user = userEvent.setup();
    renderAt({ pathname: '/login', state: { from: '/dashboard/team' } });
    const dialog = await screen.findByRole('dialog', { name: 'Welcome back' });

    await signIn(user, dialog, /^sign in$/i);

    expect(await screen.findByText('team page')).toBeInTheDocument();
  });
});

describe('candidate login', () => {
  it('signs in with the same form, and stays on the page they were reading', async () => {
    login.mockResolvedValue(makeUser({ role: 'CANDIDATE', tenantId: null }));
    const user = userEvent.setup();
    const dialog = await openFromHeader(user);

    await signIn(user, dialog, /^sign in$/i);

    expect(login).toHaveBeenCalledWith('admin@acme.test', 'secret123');
    expect(screen.getByText('board')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
  });
});

/** The backend's answer when one email and password fit several accounts. */
const severalAccounts = {
  isAxiosError: true,
  response: {
    status: 409,
    data: {
      code: 'WORKSPACE_SELECTION_REQUIRED',
      message: 'This email and password match more than one account.',
      details: {
        selectionToken: 'choice-token',
        expiresInSeconds: 120,
        accounts: [
          { accountId: 'u-acme', type: 'COMPANY', workspaceName: 'Acme', subdomain: 'acme', roleName: 'Recruiter' },
          { accountId: 'u-globex', type: 'COMPANY', workspaceName: 'Globex', subdomain: 'globex', roleName: 'Interviewer' },
          { accountId: 'c-1', type: 'CANDIDATE', roleName: 'Candidate' },
        ],
      },
    },
  },
};

const failure = (status: number, code: string, message: string) => ({
  isAxiosError: true,
  response: { status, data: { code, message } },
});

describe('an email with several accounts', () => {
  it('asks which account to open, then signs in to it without the password again', async () => {
    login.mockRejectedValue(severalAccounts);
    selectWorkspace.mockResolvedValue(makeUser({ tenantName: 'Globex' }));
    const user = userEvent.setup();
    await signIn(user, await openFromHeader(user), /^sign in$/i);

    const dialog = await screen.findByRole('dialog', { name: 'Choose an account' });
    const accounts = within(within(dialog).getByRole('list', { name: 'Your accounts' })).getAllByRole('button');
    expect(accounts.map((button) => button.textContent)).toEqual([
      expect.stringContaining('Acme'),
      expect.stringContaining('Globex'),
      expect.stringContaining('Job seeker profile'),
    ]);

    await user.click(within(dialog).getByRole('button', { name: /globex/i }));

    expect(selectWorkspace).toHaveBeenCalledWith('choice-token', 'u-globex');
    expect(await screen.findByText('dashboard')).toBeInTheDocument();
  });

  it('keeps the list when the chosen account cannot open yet, so another can be picked', async () => {
    login.mockRejectedValue(severalAccounts);
    selectWorkspace.mockRejectedValue(
      failure(403, 'ACCOUNT_NOT_VERIFIED', 'Your email address is not verified yet.'),
    );
    const user = userEvent.setup();
    await signIn(user, await openFromHeader(user), /^sign in$/i);
    const dialog = await screen.findByRole('dialog', { name: 'Choose an account' });

    await user.click(within(dialog).getByRole('button', { name: /acme/i }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('not verified');
    expect(within(dialog).getByRole('button', { name: /new verification link/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /globex/i })).toBeEnabled();
  });

  it('goes back to the form when the choice has expired, keeping the email', async () => {
    login.mockRejectedValue(severalAccounts);
    selectWorkspace.mockRejectedValue(failure(401, 'INVALID_TOKEN', 'Invalid or expired token'));
    const user = userEvent.setup();
    await signIn(user, await openFromHeader(user), /^sign in$/i);
    const picker = await screen.findByRole('dialog', { name: 'Choose an account' });

    await user.click(within(picker).getByRole('button', { name: /acme/i }));

    const dialog = await screen.findByRole('dialog', { name: 'Welcome back' });
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/sign in again/i);
    expect(within(dialog).getByLabelText(/email/i)).toHaveValue('admin@acme.test');
    expect(within(dialog).getByLabelText(/password/i)).toHaveValue('');
  });

  it('lets the person go back and use a different email', async () => {
    login.mockRejectedValue(severalAccounts);
    const user = userEvent.setup();
    await signIn(user, await openFromHeader(user), /^sign in$/i);
    const picker = await screen.findByRole('dialog', { name: 'Choose an account' });

    await user.click(within(picker).getByRole('button', { name: /use a different email/i }));

    expect(await screen.findByRole('dialog', { name: 'Welcome back' })).toBeInTheDocument();
    expect(selectWorkspace).not.toHaveBeenCalled();
  });
});

describe('accounts that are not ready yet', () => {
  it('offers a new verification link for an unverified account', async () => {
    login.mockRejectedValue(failure(403, 'ACCOUNT_NOT_VERIFIED', 'Your email address is not verified yet.'));
    const user = userEvent.setup();
    const dialog = await openFromHeader(user);
    await signIn(user, dialog, /^sign in$/i);

    expect(await within(dialog).findByRole('button', { name: /new verification link/i })).toBeInTheDocument();
  });

  it('does not offer one for an invitation that was never accepted, which a link cannot fix', async () => {
    login.mockRejectedValue(
      failure(403, 'INVITATION_NOT_ACCEPTED', 'This invitation has not been accepted yet.'),
    );
    const user = userEvent.setup();
    const dialog = await openFromHeader(user);
    await signIn(user, dialog, /^sign in$/i);

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/open the link in your invitation email/i);
    expect(within(dialog).queryByRole('button', { name: /new verification link/i })).not.toBeInTheDocument();
  });
});

describe('what the popup says', () => {
  it('carries the registration page’s notice and email across', async () => {
    renderAt({
      pathname: '/login',
      state: { registered: 'candidate', email: 'jo@example.test' },
    });
    const dialog = await screen.findByRole('dialog', { name: 'Welcome back' });

    expect(within(dialog).getByText(/account created/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/email/i)).toHaveValue('jo@example.test');
  });

  it('is one form for everyone: no candidate/company choice and no Google sign-in', async () => {
    const user = userEvent.setup();
    const dialog = await openFromHeader(user);

    // The backend resolves the account from the credentials alone.
    expect(within(dialog).queryByRole('tab')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('tablist')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /google/i })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/');
  });

  it('forgets why the last session ended once the popup is closed', async () => {
    auth.sessionEndReason = 'expired';
    const user = userEvent.setup();
    const dialog = await openFromHeader(user);
    expect(within(dialog).getByText(/your session expired/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Close' }));

    expect(clearSessionEndReason).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

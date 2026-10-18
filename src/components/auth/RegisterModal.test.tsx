import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, type InitialEntry } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserResponse } from '../../api/types';
import { makeUser } from '../../test/authHarness';
import { axiosError } from '../../test/http';

const register = vi.fn();
const post = vi.fn();
const auth: { user: UserResponse | null } = { user: null };

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    ...auth,
    initializing: false,
    sessionEndReason: null,
    clearSessionEndReason: vi.fn(),
    login: vi.fn(),
    register,
    logout: vi.fn(),
  }),
}));

vi.mock('../../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/client')>()),
  api: { post },
}));

const { RegisterModal } = await import('./RegisterModal');
const { RegisterRedirect } = await import('./RegisterRedirect');
const { LoginModal } = await import('./LoginModal');
const { LoginRedirect } = await import('./LoginRedirect');
const { useOpenRegister } = await import('../../auth/registerIntent');

/** The board with the header's "Get started" trigger and both popups, as the public layout renders them. */
function Board() {
  const openRegister = useOpenRegister();
  return (
    <>
      <p>board</p>
      <button type="button" onClick={() => openRegister('choose')}>
        Get started
      </button>
      <LoginModal />
      <RegisterModal />
    </>
  );
}

function renderAt(entry: InitialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/" element={<Board />} />
        <Route path="/login" element={<LoginRedirect />} />
        <Route path="/register" element={<RegisterRedirect step="company" />} />
        <Route path="/register-candidate" element={<RegisterRedirect step="candidate" />} />
        <Route path="/dashboard" element={<p>dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

type User = ReturnType<typeof userEvent.setup>;

async function openChooser(user: User) {
  renderAt();
  await user.click(screen.getByRole('button', { name: 'Get started' }));
  return screen.findByRole('dialog', { name: 'Create your account' });
}

const fill = (dialog: HTMLElement, label: RegExp, value: string) =>
  fireEvent.change(within(dialog).getByLabelText(label), { target: { value } });

function fillCompany(dialog: HTMLElement) {
  fill(dialog, /^company name$/i, 'Acme Ltd');
  fill(dialog, /^first name$/i, 'Ada');
  fill(dialog, /^last name$/i, 'Lovelace');
  fill(dialog, /^work email$/i, 'ada@acme.test');
  fill(dialog, /^password$/i, 'secret123');
}

function fillCandidate(dialog: HTMLElement, confirm = 'secret123') {
  fill(dialog, /^full name$/i, 'Jo Perera');
  fill(dialog, /^id card number$/i, '991234567V');
  fill(dialog, /^address$/i, '1 Galle Road, Colombo');
  fill(dialog, /^contact number$/i, '+94 77 123 4567');
  fill(dialog, /^email$/i, 'jo@example.test');
  fill(dialog, /^password$/i, 'secret123');
  fill(dialog, /^confirm password$/i, confirm);
}

beforeEach(() => {
  register.mockReset();
  register.mockResolvedValue({});
  post.mockReset();
  post.mockResolvedValue({ data: {} });
  auth.user = null;
});

afterEach(cleanup);

describe('the choice', () => {
  it('offers job seeker and company, before any form', async () => {
    const user = userEvent.setup();
    const dialog = await openChooser(user);

    expect(within(dialog).getByRole('button', { name: /looking for a job/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /i'm hiring/i })).toBeInTheDocument();
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('board')).toBeInTheDocument();
  });

  it('can be made from the keyboard', async () => {
    const user = userEvent.setup();
    const dialog = await openChooser(user);

    within(dialog).getByRole('button', { name: /looking for a job/i }).focus();
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('dialog', { name: 'Create your candidate account' })).toBeInTheDocument();
  });

  it('goes straight to the matching form', async () => {
    const user = userEvent.setup();
    const dialog = await openChooser(user);

    await user.click(within(dialog).getByRole('button', { name: /i'm hiring/i }));

    const form = await screen.findByRole('dialog', { name: 'Register your company' });
    expect(within(form).getByRole('button', { name: /create company account/i })).toBeInTheDocument();
  });

  it('goes Back to the choice, keeping what was already typed', async () => {
    const user = userEvent.setup();
    const dialog = await openChooser(user);
    await user.click(within(dialog).getByRole('button', { name: /i'm hiring/i }));
    const form = await screen.findByRole('dialog', { name: 'Register your company' });
    fill(form, /^company name$/i, 'Acme Ltd');

    await user.click(within(form).getByRole('button', { name: 'Back' }));
    const chooser = await screen.findByRole('dialog', { name: 'Create your account' });
    await user.click(within(chooser).getByRole('button', { name: /i'm hiring/i }));

    const again = await screen.findByRole('dialog', { name: 'Register your company' });
    expect(within(again).getByLabelText(/^company name$/i)).toHaveValue('Acme Ltd');
  });
});

describe('company registration', () => {
  it('sends the same payload as before, then opens login with the notice and the email', async () => {
    const user = userEvent.setup();
    renderAt('/register');
    const form = await screen.findByRole('dialog', { name: 'Register your company' });

    fillCompany(form);
    await user.click(within(form).getByRole('button', { name: /create company account/i }));

    expect(register).toHaveBeenCalledWith({
      companyName: 'Acme Ltd',
      admin: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@acme.test', password: 'secret123' },
    });
    const login = await screen.findByRole('dialog', { name: 'Welcome back' });
    expect(within(login).getByText(/company registered/i)).toBeInTheDocument();
    expect(within(login).getByLabelText(/^email$/i)).toHaveValue('ada@acme.test');
    expect(screen.queryByRole('dialog', { name: 'Register your company' })).not.toBeInTheDocument();
  });

  it('shows a failure inside the popup', async () => {
    register.mockRejectedValue(axiosError(409, 'An account with this email already exists.'));
    const user = userEvent.setup();
    renderAt('/register');
    const form = await screen.findByRole('dialog', { name: 'Register your company' });

    fillCompany(form);
    await user.click(within(form).getByRole('button', { name: /create company account/i }));

    expect(await within(form).findByRole('alert')).toHaveTextContent('An account with this email already exists.');
  });
});

describe('candidate registration', () => {
  it('posts the same payload as before, then opens login with the candidate notice', async () => {
    const user = userEvent.setup();
    renderAt('/register-candidate');
    const form = await screen.findByRole('dialog', { name: 'Create your candidate account' });

    fillCandidate(form);
    await user.click(within(form).getByRole('button', { name: /create candidate account/i }));

    expect(post).toHaveBeenCalledWith('/public/candidates/register', {
      fullName: 'Jo Perera',
      identityCardNumber: '991234567V',
      address: '1 Galle Road, Colombo',
      contactNumber: '+94 77 123 4567',
      email: 'jo@example.test',
      password: 'secret123',
    });
    const login = await screen.findByRole('dialog', { name: 'Welcome back' });
    expect(within(login).getByText(/account created/i)).toBeInTheDocument();
    expect(within(login).getByLabelText(/^email$/i)).toHaveValue('jo@example.test');
  });

  it('refuses mismatched passwords without sending anything', async () => {
    const user = userEvent.setup();
    renderAt('/register-candidate');
    const form = await screen.findByRole('dialog', { name: 'Create your candidate account' });

    fillCandidate(form, 'different1');
    await user.click(within(form).getByRole('button', { name: /create candidate account/i }));

    expect(await within(form).findByRole('alert')).toHaveTextContent('Passwords do not match.');
    expect(post).not.toHaveBeenCalled();
  });
});

describe('getting here and away', () => {
  it('sends someone already signed in straight on', async () => {
    auth.user = makeUser();
    renderAt('/register');

    expect(await screen.findByText('dashboard')).toBeInTheDocument();
  });

  it('swaps to the login popup from "Log in"', async () => {
    const user = userEvent.setup();
    const dialog = await openChooser(user);

    await user.click(within(dialog).getByRole('link', { name: 'Log in' }));

    expect(await screen.findByRole('dialog', { name: 'Welcome back' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Create your account' })).not.toBeInTheDocument());
  });

  it('swaps back to the choice from the login popup’s "Create an account"', async () => {
    const user = userEvent.setup();
    renderAt('/login');
    const login = await screen.findByRole('dialog', { name: 'Welcome back' });

    await user.click(within(login).getByRole('link', { name: 'Create an account' }));

    expect(await screen.findByRole('dialog', { name: 'Create your account' })).toBeInTheDocument();
  });
});

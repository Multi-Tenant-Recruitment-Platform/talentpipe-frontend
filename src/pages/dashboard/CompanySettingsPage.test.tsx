import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompanyProfileResponse, UpdateCompanyProfileRequest } from '../../api/types';
import { authContextMock, makeUser, setAuth } from '../../test/authHarness';

/**
 * Notes for anyone extending this file:
 *
 * 1. The profile is fetched in an effect, so the FIRST assertion of every test
 *    must be an `await screen.findBy…` — a bare `getBy` races the promise.
 * 2. `companyApi` is mocked wholesale. The page is not supposed to know whether
 *    it is talking to the draft store or to a real `/tenant`, and the tests
 *    hold it to that.
 * 3. Rejections use the plain `{ isAxiosError: true, response: … }` shape,
 *    which is what `axios.isAxiosError` checks.
 */

vi.mock('../../auth/AuthContext', () => authContextMock);

const get = vi.fn<() => Promise<CompanyProfileResponse>>();
const update = vi.fn();
vi.mock('../../api/company', () => ({ companyApi: { get, update } }));

const list = vi.fn();
vi.mock('../../api/team', () => ({ teamApi: { list, invite: vi.fn(), resend: vi.fn(), revoke: vi.fn() } }));

const { CompanySettingsPage } = await import('./CompanySettingsPage');
const { TeamSummaryProvider } = await import('../../dashboard/TeamSummaryContext');

const PROFILE: CompanyProfileResponse = {
  id: 't-1',
  name: 'ABC Technologies',
  subdomain: 'abc',
  industry: 'Information Technology',
  size: '51–200 employees',
  email: 'hr@abc.com',
  phone: '011 234 5678',
  website: 'https://abc.com',
  address: 'Colombo, Sri Lanka',
  description: 'We build recruitment software.',
  planTier: 'STANDARD',
  status: 'ACTIVE',
  updatedAt: '2026-08-11T09:00:00Z',
};

const axiosError = (status: number, message = 'boom') => ({
  isAxiosError: true,
  response: { status, data: { message } },
});

function renderPage() {
  return render(
    <TeamSummaryProvider>
      <CompanySettingsPage />
    </TeamSummaryProvider>,
  );
}

/** Renders, waits for the load, then opens the editor. */
async function openEditor(user: ReturnType<typeof userEvent.setup>) {
  renderPage();
  await user.click(await screen.findByRole('button', { name: /edit profile/i }));
  return screen.getByLabelText(/company name/i);
}

const lastRequest = (): UpdateCompanyProfileRequest =>
  update.mock.calls[update.mock.calls.length - 1][0];

beforeEach(() => {
  vi.clearAllMocks();
  setAuth({ user: makeUser(), initializing: false });
  get.mockResolvedValue(PROFILE);
  // The saved profile is what comes back — the same contract the endpoint has.
  update.mockImplementation(async (request: UpdateCompanyProfileRequest) => ({
    ...PROFILE,
    ...request,
    updatedAt: new Date().toISOString(),
  }));
  list.mockResolvedValue([makeUser()]);
});

describe('reading the profile', () => {
  it('shows every detail, with contactable values as links', async () => {
    renderPage();
    expect(await screen.findByText('ABC Technologies')).toBeInTheDocument();

    expect(within(screen.getByTestId('company-email')).getByRole('link')).toHaveAttribute(
      'href',
      'mailto:hr@abc.com',
    );
    // The separators are stripped for dialling but kept for reading.
    const phone = within(screen.getByTestId('company-phone')).getByRole('link');
    expect(phone).toHaveAttribute('href', 'tel:0112345678');
    expect(phone).toHaveTextContent('011 234 5678');
    // The scheme is what the browser needs, not what a person wants to read.
    const website = within(screen.getByTestId('company-website')).getByRole('link');
    expect(website).toHaveAttribute('href', 'https://abc.com');
    expect(website).toHaveTextContent('abc.com');

    expect(screen.getByTestId('company-address')).toHaveTextContent('Colombo, Sri Lanka');
    expect(screen.getByText('We build recruitment software.')).toBeInTheDocument();
  });

  it('says "Not set" instead of leaving a blank where a value belongs', async () => {
    get.mockResolvedValue({ ...PROFILE, phone: null, address: null });
    renderPage();
    await screen.findByText('ABC Technologies');

    expect(screen.getByTestId('company-phone')).toHaveTextContent('Not set');
    expect(screen.getByTestId('company-address')).toHaveTextContent('Not set');
    // A partial profile is prompted, once, without blocking anything.
    expect(screen.getByText(/profile 6 of 8 complete/i)).toBeInTheDocument();
  });

  it('says the workspace address is unknown rather than half-rendering it', async () => {
    // The backend's UserResponse does not carry tenantSubdomain, and localhost
    // has none to read — so this is the ordinary case in development, not an
    // edge one. It used to render a stray '.talentpipe.io' and a dead link.
    get.mockResolvedValue({ ...PROFILE, subdomain: '' });
    renderPage();
    await screen.findByText('ABC Technologies');

    expect(screen.queryByText(/\.talentpipe\.io/)).toBeNull();
    expect(screen.queryByRole('button', { name: /^copy$/i })).toBeNull();
    expect(screen.getByText(/not available on this address/i)).toBeInTheDocument();
  });

  it('shows the careers link when the workspace address is known', async () => {
    renderPage();
    await screen.findByText('ABC Technologies');

    expect(screen.getByText('abc.talentpipe.io/jobs')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^copy$/i })).toBeInTheDocument();
  });

  it('does not open the editor by itself', async () => {
    renderPage();
    await screen.findByText('ABC Technologies');
    expect(screen.queryByLabelText(/company name/i)).toBeNull();
  });
});

describe('editing', () => {
  it('opens with the saved values and saves only the editable fields', async () => {
    const user = userEvent.setup();
    const nameInput = await openEditor(user);
    expect(nameInput).toHaveValue('ABC Technologies');
    expect(screen.getByLabelText(/^email$/i)).toHaveValue('hr@abc.com');

    await user.clear(nameInput);
    await user.type(nameInput, 'ABC Technologies (Pvt) Ltd');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    // Exact object: subdomain, plan and status are not this screen's to send.
    expect(lastRequest()).toEqual({
      name: 'ABC Technologies (Pvt) Ltd',
      industry: 'Information Technology',
      size: '51–200 employees',
      email: 'hr@abc.com',
      phone: '011 234 5678',
      website: 'https://abc.com',
      address: 'Colombo, Sri Lanka',
      description: 'We build recruitment software.',
    });
    expect(await screen.findByText(/company profile updated/i)).toBeInTheDocument();
    // Back to the read view, showing what was actually stored.
    expect(screen.getByText('ABC Technologies (Pvt) Ltd')).toBeInTheDocument();
    expect(screen.queryByLabelText(/company name/i)).toBeNull();
  });

  it('saves a bare domain as a working URL', async () => {
    const user = userEvent.setup();
    await openEditor(user);

    const website = screen.getByLabelText(/website/i);
    await user.clear(website);
    await user.type(website, 'newsite.lk');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(lastRequest().website).toBe('https://newsite.lk');
    const link = within(await screen.findByTestId('company-website')).getByRole('link');
    expect(link).toHaveAttribute('href', 'https://newsite.lk');
  });

  it('clears an optional field to null rather than to an empty string', async () => {
    const user = userEvent.setup();
    await openEditor(user);

    await user.clear(screen.getByLabelText(/phone/i));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(lastRequest().phone).toBeNull();
    expect(await screen.findByTestId('company-phone')).toHaveTextContent('Not set');
  });

  it('offers nothing to save until something changes', async () => {
    const user = userEvent.setup();
    const nameInput = await openEditor(user);
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();

    // Whitespace is not a change, so it must not enable Save either.
    await user.type(nameInput, '  ');
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();

    await user.type(nameInput, 'Ltd');
    expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled();
  });
});

describe('validation', () => {
  it('refuses to save without a contact email, and puts the caret on it', async () => {
    const user = userEvent.setup();
    await openEditor(user);

    const email = screen.getByLabelText(/^email$/i);
    await user.clear(email);
    // Dirty via another field, so Save is reachable at all.
    await user.type(screen.getByLabelText(/address/i), ' 00700');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(update).not.toHaveBeenCalled();
    expect(screen.getByText(/a contact email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/some details need fixing/i)).toBeInTheDocument();
    expect(document.activeElement).toBe(email);
    expect(email).toHaveAttribute('aria-invalid', 'true');
  });

  it('clears a field error as soon as the field is corrected', async () => {
    const user = userEvent.setup();
    await openEditor(user);

    const email = screen.getByLabelText(/^email$/i);
    await user.clear(email);
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(screen.getByText(/a contact email is required/i)).toBeInTheDocument();

    await user.type(email, 'careers@abc.com');
    expect(screen.queryByText(/a contact email is required/i)).toBeNull();

    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(lastRequest().email).toBe('careers@abc.com');
  });

  it('does not turn a field red while it is still being typed', async () => {
    const user = userEvent.setup();
    await openEditor(user);

    const email = screen.getByLabelText(/^email$/i);
    await user.clear(email);
    // 'c', 'ca', 'car' … every prefix is an invalid address, and saying so on
    // each keystroke is noise, not help.
    await user.type(email, 'careers@ab');
    expect(screen.queryByText(/valid email/i)).toBeNull();
  });
});

describe('leaving the editor', () => {
  it('goes straight back when nothing was changed', async () => {
    const user = userEvent.setup();
    await openEditor(user);

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(await screen.findByRole('button', { name: /edit profile/i })).toBeInTheDocument();
  });

  it('asks before throwing away edits, and keeping them is safe', async () => {
    const user = userEvent.setup();
    const nameInput = await openEditor(user);
    await user.type(nameInput, ' Ltd');

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    const dialog = await screen.findByRole('alertdialog');

    await user.click(within(dialog).getByRole('button', { name: /keep editing/i }));
    expect(screen.getByLabelText(/company name/i)).toHaveValue('ABC Technologies Ltd');
  });

  it('restores the saved values when the edits are discarded', async () => {
    const user = userEvent.setup();
    const nameInput = await openEditor(user);
    await user.clear(nameInput);
    await user.type(nameInput, 'Something Else');

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: /discard changes/i }),
    );

    expect(update).not.toHaveBeenCalled();
    expect(await screen.findByText('ABC Technologies')).toBeInTheDocument();

    // Re-opening starts from the saved profile, not from the abandoned edit.
    await user.click(screen.getByRole('button', { name: /edit profile/i }));
    expect(screen.getByLabelText(/company name/i)).toHaveValue('ABC Technologies');
  });
});

describe('failures', () => {
  it('offers a retry that recovers from a failed load', async () => {
    const user = userEvent.setup();
    get.mockRejectedValueOnce(axiosError(500));
    renderPage();

    await user.click(await screen.findByRole('button', { name: /try again/i }));
    expect(await screen.findByText('ABC Technologies')).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('keeps the edits on screen when the save could not be sent', async () => {
    const user = userEvent.setup();
    update.mockRejectedValue({ isAxiosError: true });
    const nameInput = await openEditor(user);
    await user.type(nameInput, ' Ltd');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/nothing was saved/i)).toBeInTheDocument();
    // Losing an admin's typing because the wifi dropped is unforgivable.
    expect(screen.getByLabelText(/company name/i)).toHaveValue('ABC Technologies Ltd');
  });

  it('re-syncs and closes the editor when the role changed underneath', async () => {
    const user = userEvent.setup();
    update.mockRejectedValue(axiosError(403, 'Access denied'));
    const nameInput = await openEditor(user);
    await user.type(nameInput, ' Ltd');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/your permissions changed/i)).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
    expect(screen.queryByLabelText(/company name/i)).toBeNull();
  });
});

describe('permissions', () => {
  it('lets a role without settings.edit read the profile but not change it', async () => {
    setAuth({ user: makeUser({ role: 'HR_MANAGER' }), initializing: false });
    renderPage();
    await screen.findByText('ABC Technologies');

    expect(screen.getByText(/read only/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit profile/i })).toBeNull();
    expect(screen.getByText(/ask a company admin to update it/i)).toBeInTheDocument();
    // Nothing on the page can be typed into.
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});

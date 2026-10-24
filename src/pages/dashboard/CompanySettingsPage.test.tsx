import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompanyProfileResponse } from '../../api/types';
import { authContextMock, makeUser, setAuth } from '../../test/authHarness';
import { makeCompanyProfile } from '../../test/companyFixtures';
import { axiosError } from '../../test/http';

/**
 * Company Settings — the workspace identity and the plan.
 *
 * <p>The company profile is not on this page any more; it is viewed and
 * edited on Profile Management, which has its own suite in
 * `CompanyProfilePage.test.tsx`. What is tested here is that the profile
 * really is gone, that the page still points at it, and the two cards that
 * remain.</p>
 */

vi.mock('../../auth/AuthContext', () => authContextMock);

const get = vi.fn<() => Promise<CompanyProfileResponse>>();
const update = vi.fn();
const uploadImage = vi.fn();
const removeImage = vi.fn();
const settings = vi.fn();
const updateSettings = vi.fn();
vi.mock('../../api/company', () => ({
  companyApi: { get, update, uploadImage, removeImage, settings, updateSettings },
}));

const list = vi.fn();
vi.mock('../../api/team', () => ({ teamApi: { list, invite: vi.fn(), resend: vi.fn(), revoke: vi.fn() } }));

const { CompanySettingsPage } = await import('./CompanySettingsPage');
const { TeamSummaryProvider } = await import('../../dashboard/TeamSummaryContext');
const { CompanyProfileProvider } = await import('../../dashboard/CompanyProfileContext');

const PROFILE = makeCompanyProfile();
const SWITCHES = {
  blindScreeningEnabled: false,
  aiScreeningDefault: true,
  candidateMatchingDefault: false,
  updatedAt: null,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <TeamSummaryProvider>
        <CompanyProfileProvider>
          <CompanySettingsPage />
        </CompanyProfileProvider>
      </TeamSummaryProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setAuth({ user: makeUser(), initializing: false });
  get.mockResolvedValue(PROFILE);
  list.mockResolvedValue([makeUser()]);
  settings.mockResolvedValue(SWITCHES);
});

describe('the company profile', () => {
  it('is not duplicated on this page', async () => {
    renderPage();
    await screen.findByText('Active');

    expect(screen.queryByText(/company profile/i)).toBeNull();
    expect(screen.queryByTestId('company-email')).toBeNull();
    expect(screen.queryByRole('button', { name: /edit profile/i })).toBeNull();
  });

  it('is pointed at, on Profile Management', async () => {
    renderPage();
    await screen.findByText('Active');

    expect(screen.getByRole('link', { name: /profile management/i })).toHaveAttribute(
      'href',
      '/dashboard/profile',
    );
  });
});

describe('the workspace card', () => {
  it('shows the company and its status', async () => {
    renderPage();

    expect(await screen.findByText('Active')).toBeInTheDocument();
    expect(screen.getByText('ABC Technologies')).toBeInTheDocument();
  });

  it('shows no subdomain, workspace address or careers link', async () => {
    renderPage();
    await screen.findByText('Active');

    expect(screen.queryByText(/subdomain/i)).toBeNull();
    expect(screen.queryByText(/talentpipe\.io/i)).toBeNull();
    expect(screen.queryByText(/careers page/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /^copy$/i })).toBeNull();
  });

  it('claims nothing about the status until the profile has loaded', async () => {
    renderPage();
    // A badge reading "Unknown" during the fetch is a statement about the
    // workspace; the workspace is fine, we just have not looked yet.
    expect(screen.queryByText('Active')).toBeNull();
    expect(screen.queryByText(/unknown/i)).toBeNull();

    expect(await screen.findByText('Active')).toBeInTheDocument();
  });
});

describe('the plan card', () => {
  it('is shown to a role with billing.view', async () => {
    renderPage();
    await screen.findByText('Active');

    expect(screen.getByText(/plan & usage/i)).toBeInTheDocument();
  });

  it('is hidden from a role without billing.view', async () => {
    setAuth({ user: makeUser({ role: 'HR_MANAGER' }), initializing: false });
    renderPage();
    await screen.findByText('Active');

    expect(screen.queryByText(/plan & usage/i)).toBeNull();
  });
});

describe('the hiring switches', () => {
  it('shows where each one stands and saves one as soon as it is flipped', async () => {
    updateSettings.mockResolvedValue({ ...SWITCHES, blindScreeningEnabled: true });
    const user = userEvent.setup();
    renderPage();

    const blind = await screen.findByRole('switch', { name: 'Blind screening' });
    expect(blind).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'AI screening' })).toBeChecked();

    await user.click(blind);

    expect(updateSettings).toHaveBeenCalledWith({ blindScreeningEnabled: true });
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Blind screening' })).toBeChecked());
  });

  it('puts a refused switch back and says why beside it', async () => {
    updateSettings.mockRejectedValue(axiosError(422, 'This company is suspended.'));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('switch', { name: 'Candidate matching' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This company is suspended.');
    expect(screen.getByRole('switch', { name: 'Candidate matching' })).not.toBeChecked();
  });

  it('can be read but not changed without settings.edit', async () => {
    setAuth({ user: makeUser({ role: 'HR_MANAGER' }), initializing: false });
    renderPage();

    expect(await screen.findByRole('switch', { name: 'Blind screening' })).toBeDisabled();
    expect(screen.getByText(/only someone who can edit company settings/i)).toBeInTheDocument();
  });
});

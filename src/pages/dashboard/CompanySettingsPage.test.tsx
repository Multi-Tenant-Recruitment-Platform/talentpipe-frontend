import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompanyProfileResponse } from '../../api/types';
import { authContextMock, makeUser, setAuth } from '../../test/authHarness';
import { makeCompanyProfile } from '../../test/companyFixtures';

/**
 * Company Settings — only what is unique to this page.
 *
 * <p>The view/edit/validate/save behaviour lives in
 * `CompanyProfilePage.test.tsx`, because both pages render the very same
 * `CompanyProfilePanel`. Re-testing it here would not be extra coverage, only
 * extra maintenance. What is tested here is the settings chrome: the workspace
 * identity, the careers link, the plan, and that the shared panel really is
 * mounted and editable in this location too.</p>
 */

vi.mock('../../auth/AuthContext', () => authContextMock);

const get = vi.fn<() => Promise<CompanyProfileResponse>>();
const update = vi.fn();
const uploadImage = vi.fn();
const removeImage = vi.fn();
vi.mock('../../api/company', () => ({ companyApi: { get, update, uploadImage, removeImage } }));

const list = vi.fn();
vi.mock('../../api/team', () => ({ teamApi: { list, invite: vi.fn(), resend: vi.fn(), revoke: vi.fn() } }));

const { CompanySettingsPage } = await import('./CompanySettingsPage');
const { TeamSummaryProvider } = await import('../../dashboard/TeamSummaryContext');
const { CompanyProfileProvider } = await import('../../dashboard/CompanyProfileContext');

const PROFILE = makeCompanyProfile();

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
  update.mockImplementation(async (request) => ({ ...PROFILE, ...request }));
  list.mockResolvedValue([makeUser()]);
});

describe('the company profile section', () => {
  it('renders the shared panel, editable in place', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByTestId('company-email')).toHaveTextContent('contact@abc.com');

    await user.click(screen.getByRole('button', { name: /edit profile/i }));
    expect(screen.getByLabelText(/^company name$/i)).toHaveValue('ABC Technologies');
    // The same fields as the profile page, because it is the same component.
    expect(screen.getByLabelText(/^country$/i)).toHaveValue('Sri Lanka');
    expect(screen.getByRole('checkbox', { name: /remote \/ hybrid work/i })).toBeInTheDocument();
  });

  it('does not offer the public preview here', async () => {
    renderPage();
    await screen.findByTestId('company-email');

    // Settings is for administering the profile; the presentation surface is
    // where "how does this look to a candidate?" belongs.
    expect(screen.queryByRole('button', { name: /preview public profile/i })).toBeNull();
  });

  it('points at the profile page rather than duplicating it', async () => {
    renderPage();
    await screen.findByTestId('company-email');

    expect(screen.getByRole('link', { name: /profile management/i })).toHaveAttribute(
      'href',
      '/dashboard/profile',
    );
  });

  it('marks the section read only for a role that cannot edit', async () => {
    setAuth({ user: makeUser({ role: 'HR_MANAGER' }), initializing: false });
    renderPage();
    await screen.findByTestId('company-email');

    expect(screen.getByText(/read only/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit profile/i })).toBeNull();
  });
});

describe('the workspace card', () => {
  it('shows the careers link when the workspace address is known', async () => {
    renderPage();
    await screen.findByTestId('company-email');

    expect(screen.getByText('abc.talentpipe.io/jobs')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^copy$/i })).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('claims nothing about the status until the profile has loaded', async () => {
    renderPage();
    // A badge reading "Unknown" during the fetch is a statement about the
    // workspace; the workspace is fine, we just have not looked yet.
    expect(screen.getByTestId('profile-skeleton')).toBeInTheDocument();
    expect(screen.queryByText(/unknown/i)).toBeNull();

    expect(await screen.findByText('Active')).toBeInTheDocument();
  });

  it('says the workspace address is unknown rather than half-rendering it', async () => {
    // The backend's UserResponse does not carry tenantSubdomain, and localhost
    // has none to read — so this is the ordinary case in development, not an
    // edge one. It used to render a stray '.talentpipe.io' and a dead link.
    get.mockResolvedValue({ ...PROFILE, subdomain: '' });
    renderPage();
    await screen.findByTestId('company-email');

    expect(screen.queryByText(/\.talentpipe\.io/)).toBeNull();
    expect(screen.queryByRole('button', { name: /^copy$/i })).toBeNull();
    expect(screen.getByText(/not available on this address/i)).toBeInTheDocument();
  });
});

describe('the plan card', () => {
  it('is hidden from a role without billing.view', async () => {
    setAuth({ user: makeUser({ role: 'HR_MANAGER' }), initializing: false });
    renderPage();
    await screen.findByTestId('company-email');

    expect(screen.queryByText(/plan & usage/i)).toBeNull();
  });
});

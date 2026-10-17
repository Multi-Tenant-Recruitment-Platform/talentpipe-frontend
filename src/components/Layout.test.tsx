import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authContextMock, makeUser, setAuth } from '../test/authHarness';

/**
 * The public header: the site links, the signed-in person's account menu, and
 * the icon-only Log out beside it.
 */

vi.mock('../auth/AuthContext', () => authContextMock);

const { Layout } = await import('./Layout');

const candidate = makeUser({
  role: 'CANDIDATE',
  tenantId: null,
  tenantName: null,
  firstName: 'Jane',
  lastName: 'Perera',
  email: 'jane@example.com',
});

function renderAt(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Layout />}>
          {/* The job board is the home page. */}
          <Route path="/" element={<p>home page</p>} />
          <Route path="/jobs/:jobKey" element={<p>advert page</p>} />
          <Route path="/profile" element={<p>profile page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const trigger = () => screen.getByRole('button', { name: 'Account menu for Jane Perera' });
const panel = () => screen.getByRole('navigation', { name: 'Account' });

beforeEach(() => {
  setAuth({ user: candidate, initializing: false });
});

describe('Layout — signed-in candidate', () => {
  it('shows the name and role as the account trigger, and keeps My profile out of the site links', () => {
    renderAt();
    expect(trigger()).toHaveTextContent('Jane Perera');
    expect(trigger()).toHaveTextContent('Candidate');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('link', { name: 'Find jobs' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('link', { name: 'My profile' })).not.toBeInTheDocument();
  });

  it('marks Find jobs as the current page on the board and on its adverts, and nowhere else', () => {
    const findJobs = () => screen.getByRole('link', { name: 'Find jobs' });
    for (const path of ['/', '/jobs/data-analyst-northwind']) {
      const { unmount } = renderAt(path);
      expect(findJobs()).toHaveAttribute('aria-current', 'page');
      unmount();
    }
    renderAt('/profile');
    expect(findJobs()).not.toHaveAttribute('aria-current');
  });

  it('opens a panel with My profile, and lists pages that are not built yet without linking them', async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(trigger());

    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    // The header above the links names whose menu this is.
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(within(panel()).getByRole('link', { name: 'My profile' })).toHaveAttribute('href', '/profile');
    for (const soon of ['Applied jobs', 'Settings']) {
      expect(within(panel()).queryByRole('link', { name: new RegExp(soon) })).not.toBeInTheDocument();
      expect(within(panel()).getByText(soon).closest('[aria-disabled="true"]')).toHaveTextContent('Soon');
    }
    expect(within(panel()).queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('moves focus into the panel, and Escape closes it and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(trigger());
    await waitFor(() => expect(within(panel()).getByRole('link', { name: 'My profile' })).toHaveFocus());

    await user.keyboard('{Escape}');
    await waitFor(() => expect(trigger()).toHaveAttribute('aria-expanded', 'false'));
    expect(trigger()).toHaveFocus();
  });

  it('navigates from the panel and marks the current page', async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(trigger());
    await user.click(within(panel()).getByRole('link', { name: 'My profile' }));
    expect(screen.getByText('profile page')).toBeInTheDocument();

    await user.click(trigger());
    expect(within(panel()).getByRole('link', { name: 'My profile' })).toHaveAttribute('aria-current', 'page');
  });

  it('logs out from the account menu, as in the dashboard, with no separate button in the header', async () => {
    const user = userEvent.setup();
    renderAt('/profile');
    // Log out lives behind the name only.
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument();

    await user.click(trigger());
    const logout = screen.getByRole('button', { name: 'Log out' });
    expect(logout).toHaveTextContent('Log out');
    // Below the person's pages, not among them.
    expect(within(panel()).queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument();

    await user.click(logout);
    expect(await screen.findByText('home page')).toBeInTheDocument();
  });

  it('shows the role in the menu header, as the dashboard does', async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(trigger());
    const header = screen.getByText('jane@example.com').parentElement!;
    expect(within(header).getByText('Candidate')).toBeInTheDocument();
  });
});

describe('Layout — other sessions', () => {
  it('gives a company user Dashboard in the menu and no candidate pages', async () => {
    setAuth({ user: makeUser({ role: 'COMPANY_ADMIN', firstName: 'Ada', lastName: 'Lovelace' }) });
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole('button', { name: 'Account menu for Ada Lovelace' }));
    expect(within(panel()).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(within(panel()).queryByText('My profile')).not.toBeInTheDocument();
    expect(within(panel()).queryByText('Applied jobs')).not.toBeInTheDocument();
  });

  it('offers Log in and Get started when signed out', () => {
    setAuth({ user: null });
    renderAt();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get started' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Account menu/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument();
  });

  it('opens login as a popup over the current page instead of leaving it', async () => {
    setAuth({ user: null });
    const user = userEvent.setup();
    renderAt('/profile');

    await user.click(screen.getByRole('button', { name: 'Log in' }));

    const dialog = await screen.findByRole('dialog', { name: 'Welcome back' });
    expect(within(dialog).getByRole('button', { name: /sign in as company/i })).toBeInTheDocument();
    expect(screen.getByText('profile page')).toBeInTheDocument();
  });

  it('closes the login popup on Escape', async () => {
    setAuth({ user: null });
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    await screen.findByRole('dialog', { name: 'Welcome back' });

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('home page')).toBeInTheDocument();
  });
});

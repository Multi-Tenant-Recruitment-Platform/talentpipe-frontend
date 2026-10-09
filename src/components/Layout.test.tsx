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

function renderAt(path = '/jobs') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<p>home page</p>} />
          <Route path="/jobs" element={<p>jobs page</p>} />
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
    expect(screen.getByRole('link', { name: 'Browse jobs' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My profile' })).not.toBeInTheDocument();
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

  it('logs out from the icon-only button, which still has a name', async () => {
    const user = userEvent.setup();
    renderAt();
    const logout = screen.getByRole('button', { name: 'Log out' });
    expect(logout).not.toHaveTextContent('Log out');
    await user.click(logout);
    expect(await screen.findByText('home page')).toBeInTheDocument();
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
});

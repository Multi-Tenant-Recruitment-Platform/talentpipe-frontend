import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserResponse } from '../../api/types';
import { authContextMock, makeUser, setAuth } from '../../test/authHarness';

/**
 * Notes for anyone extending this file:
 *
 * 1. The roster is fetched in an effect by TeamSummaryProvider, so the FIRST
 *    assertion of every test must be an `await screen.findBy…` — a bare
 *    `getBy` races the promise.
 * 2. jsdom does not apply Tailwind (`css: false`), so the mobile echo line
 *    inside the member cell is present in the DOM at every viewport. Scope
 *    row assertions with `within(row)` and the `*-cell` testids rather than
 *    querying bare text.
 * 3. Rejections use the plain `{ isAxiosError: true, response: … }` shape,
 *    which is what `axios.isAxiosError` checks and what LoginPage.test.tsx
 *    already relies on.
 */

vi.mock('../../auth/AuthContext', () => authContextMock);

const list = vi.fn<() => Promise<UserResponse[]>>();
const invite = vi.fn();
const resend = vi.fn();
const revoke = vi.fn();
vi.mock('../../api/team', () => ({ teamApi: { list, invite, resend, revoke } }));

const { TeamPage } = await import('./TeamPage');
const { TeamSummaryProvider } = await import('../../dashboard/TeamSummaryContext');

const SELF = makeUser({ id: 'u-1', firstName: 'Ada', lastName: 'Lovelace', email: 'admin@acme.test' });
const ACTIVE = makeUser({
  id: 'u-2',
  firstName: 'Kasun',
  lastName: 'Silva',
  email: 'kasun@acme.test',
  role: 'HR_MANAGER',
});
const INVITED = makeUser({
  id: 'u-3',
  firstName: 'Amaya',
  lastName: 'Rathnayake',
  email: 'amaya@acme.test',
  role: 'INTERVIEWER',
  status: 'INVITED',
});
const DISABLED = makeUser({ id: 'u-4', firstName: 'Nimal', lastName: 'Perera', status: 'DISABLED' });
const UNVERIFIED = makeUser({
  id: 'u-5',
  firstName: 'Sithara',
  lastName: 'Fernando',
  status: 'PENDING_VERIFICATION',
});

const axiosError = (status: number, message = 'boom') => ({
  isAxiosError: true,
  response: { status, data: { message } },
});

function renderTeam() {
  return render(
    <TeamSummaryProvider>
      <TeamPage />
    </TeamSummaryProvider>,
  );
}

const rowFor = (name: RegExp) => screen.getByRole('row', { name });

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  setAuth({ user: SELF, initializing: false });
  list.mockResolvedValue([SELF, ACTIVE, INVITED, DISABLED, UNVERIFIED]);
  invite.mockResolvedValue(makeUser({ id: 'u-9', status: 'INVITED' }));
  resend.mockResolvedValue(undefined);
  revoke.mockResolvedValue(undefined);
});

describe('every status stays visible', () => {
  it('renders members of all four statuses, correctly labelled', async () => {
    renderTeam();
    expect(await screen.findByText('Kasun Silva')).toBeInTheDocument();

    // The core defect: disabled and unverified accounts used to be dropped.
    expect(screen.getByText('Nimal Perera')).toBeInTheDocument();
    expect(screen.getByText('Sithara Fernando')).toBeInTheDocument();

    const statuses = screen.getAllByTestId('status-cell').map((cell) => cell.textContent);
    expect(statuses.join(' ')).toMatch(/Active/);
    expect(statuses.join(' ')).toMatch(/Invited/);
    expect(statuses.join(' ')).toMatch(/Disabled/);
    expect(statuses.join(' ')).toMatch(/Unverified/);
  });

  it('keeps an unknown future status on screen', async () => {
    list.mockResolvedValue([SELF, makeUser({ id: 'u-8', firstName: 'Zed', lastName: 'Ninety', status: 'ARCHIVED' })]);
    renderTeam();
    expect(await screen.findByText('Zed Ninety')).toBeInTheDocument();
    expect(within(rowFor(/Zed Ninety/)).queryByRole('button')).toBeNull();
  });

  it('narrows to pending and restores everyone from All', async () => {
    const user = userEvent.setup();
    renderTeam();
    await screen.findByText('Amaya Rathnayake');

    await user.click(screen.getByRole('radio', { name: /pending/i }));
    expect(screen.queryByText('Nimal Perera')).toBeNull();
    expect(screen.getByText('Amaya Rathnayake')).toBeInTheDocument();

    // The banner explains where the hidden accounts went. It's an info-tone
    // Alert, which renders as a native <output> (not a div[role]) — see
    // Alert.tsx.
    const banner = screen.getByText(/disabled or awaiting email verification/i);
    await user.click(within(banner.closest('output') as HTMLElement).getByRole('button', { name: /show all/i }));
    expect(screen.getByText('Nimal Perera')).toBeInTheDocument();
  });
});

describe('search, filter and sort', () => {
  it('searches by email fragment and announces the result count', async () => {
    const user = userEvent.setup();
    renderTeam();
    await screen.findByText('Amaya Rathnayake');

    await user.type(screen.getByLabelText(/search teammates/i), 'amaya@');
    expect(await screen.findByText(/showing 1 of 5 people/i)).toBeInTheDocument();
    expect(screen.queryByText('Kasun Silva')).toBeNull();
  });

  it('searches by the formatted role name', async () => {
    const user = userEvent.setup();
    renderTeam();
    await screen.findByText('Kasun Silva');

    // Only Kasun is an HR_MANAGER; makeUser defaults the rest to COMPANY_ADMIN.
    await user.type(screen.getByLabelText(/search teammates/i), 'hr manager');
    expect(await screen.findByText(/showing 1 of 5 people/i)).toBeInTheDocument();
    expect(screen.getByText('Kasun Silva')).toBeInTheDocument();
  });

  it('filters by role', async () => {
    const user = userEvent.setup();
    renderTeam();
    await screen.findByText('Amaya Rathnayake');

    await user.selectOptions(screen.getByLabelText(/filter by role/i), 'INTERVIEWER');
    expect(screen.getByText('Amaya Rathnayake')).toBeInTheDocument();
    expect(screen.queryByText('Kasun Silva')).toBeNull();
  });

  it('toggles sort direction and reflects it in aria-sort', async () => {
    const user = userEvent.setup();
    renderTeam();
    await screen.findByText('Kasun Silva');

    const header = screen.getByRole('columnheader', { name: /member/i });
    await user.click(within(header).getByRole('button'));
    expect(header).toHaveAttribute('aria-sort', 'ascending');

    await user.click(within(header).getByRole('button'));
    expect(header).toHaveAttribute('aria-sort', 'descending');
  });

  it('distinguishes "no results" from "no teammates"', async () => {
    const user = userEvent.setup();
    renderTeam();
    await screen.findByText('Kasun Silva');

    await user.type(screen.getByLabelText(/search teammates/i), 'zzz');
    expect(await screen.findByText(/no one matches/i)).toBeInTheDocument();
    // Two are offered on purpose — one in the toolbar, one in the empty state
    // where the user is actually looking. Either must recover.
    await user.click(screen.getAllByRole('button', { name: /clear filters/i })[1]);
    expect(await screen.findByText('Kasun Silva')).toBeInTheDocument();

    cleanup();
    // GET /team always returns the caller, so "only me" is the real empty case.
    list.mockResolvedValue([SELF]);
    renderTeam();
    expect(await screen.findByText(/only person here/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /invite member/i }).length).toBeGreaterThan(1);
  });
});

describe('resend', () => {
  it('does not refetch, and remembers that it happened', async () => {
    const user = userEvent.setup();
    renderTeam();
    await screen.findByText('Amaya Rathnayake');

    await user.click(within(rowFor(/Amaya Rathnayake/)).getByRole('button', { name: /resend/i }));
    expect(resend).toHaveBeenCalledWith('u-3');
    expect(await screen.findByText(/re-sent to amaya@acme.test/i)).toBeInTheDocument();
    // 204 with no body and no row change — a GET would return an identical array.
    expect(list).toHaveBeenCalledTimes(1);
    expect(within(rowFor(/Amaya Rathnayake/)).getByRole('button', { name: /resend again/i })).toBeInTheDocument();
  });

  it('keeps the re-sent note across a remount', async () => {
    const user = userEvent.setup();
    renderTeam();
    await screen.findByText('Amaya Rathnayake');
    await user.click(within(rowFor(/Amaya Rathnayake/)).getByRole('button', { name: /resend/i }));
    await screen.findByText(/re-sent to amaya@acme.test/i);

    cleanup();
    renderTeam();
    expect(await screen.findByText(/re-sent just now/i)).toBeInTheDocument();
  });

  it('explains a 404 and re-syncs the list', async () => {
    const user = userEvent.setup();
    resend.mockRejectedValue(axiosError(404, 'Invitation not found'));
    renderTeam();
    await screen.findByText('Amaya Rathnayake');

    await user.click(within(rowFor(/Amaya Rathnayake/)).getByRole('button', { name: /resend/i }));
    expect(await screen.findByText(/already accepted it, or it was revoked/i)).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('reports a network failure without refetching', async () => {
    const user = userEvent.setup();
    resend.mockRejectedValue({ isAxiosError: true });
    renderTeam();
    await screen.findByText('Amaya Rathnayake');

    await user.click(within(rowFor(/Amaya Rathnayake/)).getByRole('button', { name: /resend/i }));
    expect(await screen.findByText(/couldn't reach the server/i)).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(1);
  });
});

describe('revoke', () => {
  it('asks before deleting, and cancelling is safe', async () => {
    const user = userEvent.setup();
    renderTeam();
    await screen.findByText('Amaya Rathnayake');

    const trigger = within(rowFor(/Amaya Rathnayake/)).getByRole('button', { name: /revoke/i });
    await user.click(trigger);

    const dialog = await screen.findByRole('alertdialog');
    expect(revoke).not.toHaveBeenCalled();
    expect(within(dialog).getByText(/amaya@acme.test/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));
    expect(revoke).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('revokes on confirm and refetches', async () => {
    const user = userEvent.setup();
    renderTeam();
    await screen.findByText('Amaya Rathnayake');

    await user.click(within(rowFor(/Amaya Rathnayake/)).getByRole('button', { name: /revoke/i }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /revoke invitation/i }));

    expect(revoke).toHaveBeenCalledWith('u-3');
    expect(await screen.findByText(/revoked/i)).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('treats a 404 as information, since the goal is already met', async () => {
    const user = userEvent.setup();
    revoke.mockRejectedValue(axiosError(404, 'Invitation not found'));
    renderTeam();
    await screen.findByText('Amaya Rathnayake');

    await user.click(within(rowFor(/Amaya Rathnayake/)).getByRole('button', { name: /revoke/i }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: /revoke invitation/i }),
    );
    expect(await screen.findByText(/already revoked or accepted/i)).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
  });
});

describe('invite', () => {
  async function openAndFill(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getAllByRole('button', { name: /invite member/i })[0]);
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/first name/i), 'Nimali');
    await user.type(within(dialog).getByLabelText(/last name/i), 'Perera');
    await user.type(within(dialog).getByLabelText(/work email/i), 'nimali@acme.test');
    return dialog;
  }

  it('sends exactly the four fields the API accepts', async () => {
    const user = userEvent.setup();
    renderTeam();
    await screen.findByText('Kasun Silva');

    const dialog = await openAndFill(user);
    await user.click(within(dialog).getByRole('button', { name: /send invitation/i }));

    // Exact object: a leftover `note` would fail this.
    expect(invite).toHaveBeenCalledWith({
      firstName: 'Nimali',
      lastName: 'Perera',
      email: 'nimali@acme.test',
      role: 'HR_MANAGER',
    });
    expect(await screen.findByText(/invitation sent to nimali@acme.test/i)).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('no longer collects a personal note', async () => {
    const user = userEvent.setup();
    renderTeam();
    await screen.findByText('Kasun Silva');
    await user.click(screen.getAllByRole('button', { name: /invite member/i })[0]);
    await screen.findByRole('dialog');
    expect(screen.queryByLabelText(/note/i)).toBeNull();
  });

  it('keeps the dialog and the typed values when the email is a duplicate', async () => {
    const user = userEvent.setup();
    invite.mockRejectedValue(axiosError(409, "A user with email 'nimali@acme.test' already exists"));
    renderTeam();
    await screen.findByText('Kasun Silva');

    const dialog = await openAndFill(user);
    await user.click(within(dialog).getByRole('button', { name: /send invitation/i }));

    // Previously the form wiped itself and the error rendered behind the backdrop.
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/work email/i)).toHaveValue('nimali@acme.test');
    expect(within(dialog).getByText(/already exists/i)).toBeInTheDocument();
  });
});

describe('load failures and permissions', () => {
  it('offers a retry that recovers', async () => {
    const user = userEvent.setup();
    list.mockRejectedValueOnce(axiosError(500, 'We could not load your team right now.'));
    renderTeam();

    await user.click(await screen.findByRole('button', { name: /try again/i }));
    expect(await screen.findByText('Kasun Silva')).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('offers no action on rows the API cannot act on', async () => {
    renderTeam();
    await screen.findByText('Kasun Silva');

    // No role-change or remove affordance exists anywhere — those endpoints
    // do not exist, so promising them would be a lie.
    expect(within(rowFor(/Kasun Silva/)).queryByRole('button')).toBeNull();
    expect(within(rowFor(/Nimal Perera/)).queryByRole('button')).toBeNull();
    expect(screen.queryByRole('button', { name: /remove|deactivate|change role/i })).toBeNull();
  });

  it('shows skeletons only on the first load, not on a background refresh', async () => {
    const user = userEvent.setup();
    renderTeam();
    await screen.findByText('Amaya Rathnayake');
    expect(screen.queryAllByTestId('roster-skeleton')).toHaveLength(0);

    await user.click(within(rowFor(/Amaya Rathnayake/)).getByRole('button', { name: /revoke/i }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: /revoke invitation/i }),
    );
    // Rows persist through the refetch rather than blinking into skeletons.
    expect(screen.queryAllByTestId('roster-skeleton')).toHaveLength(0);
    expect(screen.getByText('Kasun Silva')).toBeInTheDocument();
  });
});

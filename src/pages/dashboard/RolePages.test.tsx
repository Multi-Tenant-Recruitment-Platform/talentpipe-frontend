import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RoleAuditEvent } from '../../api/types';
import { authContextMock, LocationProbe, makeUser, setAuth } from '../../test/authHarness';
import { ALL_KEYS, CATALOGUE, COORDINATOR, INTERVIEWER, OWNER, RECRUITER, makeRole } from '../../test/roleFixtures';

/**
 * The roles screens against a mocked API, through a real router: the list,
 * the editor (create, edit, read-only) and the access log.
 */

vi.mock('../../auth/AuthContext', () => authContextMock);

const rolesApi = {
  permissions: vi.fn(),
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  duplicate: vi.fn(),
  remove: vi.fn(),
  audit: vi.fn(),
};
vi.mock('../../api/roles', () => ({ rolesApi }));

const teamList = vi.fn();
vi.mock('../../api/team', () => ({ teamApi: { list: teamList } }));

const { RolesPage } = await import('./RolesPage');
const { RoleEditorPage } = await import('./RoleEditorPage');
const { RoleActivityPage } = await import('./RoleActivityPage');
const { TeamSummaryProvider } = await import('../../dashboard/TeamSummaryContext');

const SELF = makeUser({ id: 'u-1', roleId: 'r-owner', roleName: 'Owner', permissions: ALL_KEYS });
const KASUN = makeUser({ id: 'u-2', firstName: 'Kasun', lastName: 'Silva', role: 'HR_MANAGER', roleId: 'r-recruiter', roleName: 'Recruiter' });
const AMAYA = makeUser({ id: 'u-3', firstName: 'Amaya', lastName: 'Perera', role: 'CUSTOM', roleId: 'r-custom', roleName: 'Hiring Coordinator' });
const NIMAL = makeUser({ id: 'u-4', firstName: 'Nimal', lastName: 'Fernando', role: 'CUSTOM', roleId: 'r-custom', roleName: 'Hiring Coordinator' });
const ROLES = [OWNER, RECRUITER, INTERVIEWER, COORDINATOR];

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <TeamSummaryProvider>
        <Routes>
          <Route path="/dashboard/team" element={<p>members page</p>} />
          <Route path="/dashboard/team/roles" element={<RolesPage />} />
          <Route path="/dashboard/team/roles/new" element={<RoleEditorPage mode="create" />} />
          <Route path="/dashboard/team/roles/:id" element={<RoleEditorPage mode="edit" />} />
          <Route path="/dashboard/team/activity" element={<RoleActivityPage />} />
        </Routes>
      </TeamSummaryProvider>
    </MemoryRouter>,
  );
}

const location = () => screen.getByTestId('location').textContent;

/** A paragraph whose whole text is {@code text} — sentences here are split across <strong>s. */
const sentence = (text: string | RegExp) =>
  screen.getByText((_, element) => {
    if (element?.tagName !== 'P') {
      return false;
    }
    const content = element.textContent ?? '';
    return typeof text === 'string' ? content === text : text.test(content);
  });

const failure = (status: number, code: string, message: string) => ({
  isAxiosError: true,
  response: { status, data: { code, message } },
});

beforeEach(() => {
  vi.clearAllMocks();
  setAuth({ user: SELF, initializing: false });
  rolesApi.permissions.mockResolvedValue(CATALOGUE);
  rolesApi.list.mockResolvedValue(ROLES);
  rolesApi.get.mockImplementation(async (id: string) => {
    const found = ROLES.find((role) => role.id === id);
    if (!found) {
      throw failure(404, 'NOT_FOUND', 'Role not found');
    }
    return found;
  });
  teamList.mockResolvedValue([SELF, KASUN, AMAYA, NIMAL]);
});

describe('the roles page', () => {
  it('lists the default roles first, then the company own, with who holds them', async () => {
    renderAt('/dashboard/team/roles');

    const defaults = await screen.findByRole('region', { name: 'Default roles' });
    expect(await within(defaults).findByRole('link', { name: 'Owner' })).toBeInTheDocument();
    expect(within(defaults).getByRole('link', { name: 'Recruiter' })).toBeInTheDocument();
    expect(within(defaults).getByRole('link', { name: 'Interviewer' })).toBeInTheDocument();

    const custom = screen.getByRole('region', { name: 'Your roles' });
    const card = within(custom).getByRole('link', { name: 'Hiring Coordinator' }).closest('article') as HTMLElement;
    expect(within(card).getByText('2 people')).toBeInTheDocument();
    expect(within(card).getByText('3 permissions of 13')).toBeInTheDocument();
    // Default roles can be copied but not deleted.
    expect(within(defaults).queryByRole('button', { name: /delete/i })).toBeNull();
  });

  it('opens a duplicate in the editor, with a note to rename it', async () => {
    const copy = makeRole({ id: 'r-copy', name: 'Recruiter (copy)', permissions: RECRUITER.permissions });
    rolesApi.duplicate.mockResolvedValue(copy);
    rolesApi.get.mockResolvedValue(copy);
    const user = userEvent.setup();
    renderAt('/dashboard/team/roles');

    await user.click(await screen.findByRole('button', { name: 'Duplicate Recruiter' }));

    expect(rolesApi.duplicate).toHaveBeenCalledWith('r-recruiter');
    expect(await screen.findByText(/copied recruiter as “recruiter \(copy\)”/i)).toBeInTheDocument();
    expect(location()).toBe('/dashboard/team/roles/r-copy');
  });

  it('moves the members of a deleted role to the closest one', async () => {
    rolesApi.remove.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderAt('/dashboard/team/roles');

    await user.click(await screen.findByRole('button', { name: 'Delete Hiring Coordinator' }));
    const dialog = await screen.findByRole('dialog', { name: /delete “hiring coordinator”/i });
    expect(within(dialog).getByText(/2 people have this role/i)).toBeInTheDocument();
    expect(within(dialog).getByText('Closest match')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /move people and delete/i }));

    expect(rolesApi.remove).toHaveBeenCalledWith('r-custom', 'r-recruiter');
    expect(await screen.findByText(/its 2 members are now recruiter/i)).toBeInTheDocument();
  });

  it('deletes a role nobody holds after a plain confirmation', async () => {
    rolesApi.list.mockResolvedValue([...ROLES, makeRole({ id: 'r-spare', name: 'Spare' })]);
    rolesApi.remove.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderAt('/dashboard/team/roles');

    await user.click(await screen.findByRole('button', { name: 'Delete Spare' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete role' }));

    expect(rolesApi.remove).toHaveBeenCalledWith('r-spare', undefined);
  });

  it('offers no changes to someone who may only look', async () => {
    setAuth({ user: makeUser({ role: 'CUSTOM', roleId: 'r-custom', permissions: ['team.view'] }) });
    renderAt('/dashboard/team/roles');

    expect(await screen.findByRole('link', { name: 'Recruiter' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /new role|duplicate|delete/i })).toBeNull();
  });
});

describe('creating a role', () => {
  it('brings along what a permission needs, says why, and saves in catalogue order', async () => {
    const created = makeRole({ id: 'r-new', name: 'Talent Partner' });
    rolesApi.create.mockResolvedValue(created);
    rolesApi.get.mockResolvedValue(created);
    const user = userEvent.setup();
    renderAt('/dashboard/team/roles/new');

    await user.type(await screen.findByLabelText(/role name/i), 'Talent Partner');
    await user.click(screen.getByRole('checkbox', { name: 'Invite people' }));

    const view = screen.getByRole('checkbox', { name: 'View team' });
    expect(view).toBeChecked();
    expect(view).toBeDisabled();
    expect(screen.getByText('Included because Invite people needs it.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create role' }));

    expect(rolesApi.create).toHaveBeenCalledWith({
      name: 'Talent Partner',
      description: null,
      permissions: ['team.view', 'team.invite'],
    });
    expect(await screen.findByText(/“talent partner” created/i)).toBeInTheDocument();
  });

  it('catches a name another role already has before asking the server', async () => {
    const user = userEvent.setup();
    renderAt('/dashboard/team/roles/new');

    await user.type(await screen.findByLabelText(/role name/i), 'recruiter');
    await user.click(screen.getByRole('button', { name: 'Create role' }));

    expect(screen.getByText(/another role already has this name/i)).toBeInTheDocument();
    expect(rolesApi.create).not.toHaveBeenCalled();
  });

  it('starts from an existing role permissions', async () => {
    const user = userEvent.setup();
    renderAt('/dashboard/team/roles/new');

    await user.click(await screen.findByLabelText('Start from'));
    await user.click(await screen.findByTitle('The permissions of Interviewer'));

    expect(screen.getByRole('checkbox', { name: 'Conduct interviews' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'View team' })).not.toBeChecked();
  });
});

describe('editing a role', () => {
  it('shows what a change adds and saves it with the version it loaded', async () => {
    rolesApi.update.mockImplementation(async (_id: string, request: { permissions: string[] }) => ({
      ...COORDINATOR,
      permissions: request.permissions,
      version: 1,
    }));
    const user = userEvent.setup();
    renderAt('/dashboard/team/roles/r-custom');

    await user.click(await screen.findByRole('checkbox', { name: 'Move applicants' }));
    const changes = screen.getByRole('list', { name: 'Permission changes' });
    expect(changes).toHaveTextContent('Move applicants');

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(rolesApi.update).toHaveBeenCalledWith('r-custom', {
      name: 'Hiring Coordinator',
      description: 'Organises interviews.',
      permissions: ['team.view', 'applications.manage', 'interviews.schedule', 'interviews.conduct'],
      version: 0,
    });
    expect(await screen.findByText(/the 2 people with this role can do exactly this/i)).toBeInTheDocument();
  });

  it('offers the newer version when someone else saved first', async () => {
    rolesApi.update.mockRejectedValue(
      failure(409, 'CONCURRENT_UPDATE', 'Someone else changed this role after you opened it.'),
    );
    const user = userEvent.setup();
    renderAt('/dashboard/team/roles/r-custom');

    await user.click(await screen.findByRole('checkbox', { name: 'Move applicants' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText(/someone else changed this role/i)).toBeInTheDocument();

    rolesApi.get.mockResolvedValue({ ...COORDINATOR, name: 'Interview Coordinator', version: 4 });
    await user.click(screen.getByRole('button', { name: 'Load their version' }));

    expect(await screen.findByLabelText(/role name/i)).toHaveValue('Interview Coordinator');
    expect(screen.getByRole('checkbox', { name: 'Move applicants' })).not.toBeChecked();
    expect(screen.getByText(/this is the latest version/i)).toBeInTheDocument();
  });

  it('shows the Owner role as a read-only list', async () => {
    renderAt('/dashboard/team/roles/r-owner');

    expect(await screen.findByText(/always holds every permission/i)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
    expect(screen.getByText('Publish vacancies')).toBeInTheDocument();
  });

  it('is read-only for someone who may not change roles', async () => {
    setAuth({ user: makeUser({ role: 'CUSTOM', roleId: 'r-custom', permissions: ['team.view'] }) });
    renderAt('/dashboard/team/roles/r-recruiter');

    expect(await screen.findByText(/changing roles isn.t part of yours/i)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('button', { name: /duplicate/i })).toBeNull();
  });

  it('says so when the role no longer exists', async () => {
    renderAt('/dashboard/team/roles/r-gone');
    expect(await screen.findByText('This role no longer exists')).toBeInTheDocument();
  });
});

describe('the access log', () => {
  const event = (overrides: Partial<RoleAuditEvent>): RoleAuditEvent => ({
    id: `e-${Math.random()}`,
    action: 'ROLE_UPDATED',
    actorUserId: 'u-1',
    roleId: 'r-custom',
    roleName: 'Hiring Coordinator',
    targetUserId: null,
    previousValue: null,
    newValue: null,
    occurredAt: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    rolesApi.audit.mockResolvedValue({
      content: [
        event({
          action: 'MEMBER_ROLE_CHANGED',
          targetUserId: 'u-2',
          roleId: 'r-recruiter',
          roleName: 'Recruiter',
          previousValue: 'Interviewer',
          newValue: 'Recruiter',
        }),
        event({
          actorUserId: 'u-3',
          previousValue: 'Coordinator: team.view',
          newValue: 'Hiring Coordinator: team.view, interviews.schedule',
        }),
        event({ action: 'ROLE_DELETED', actorUserId: 'u-old', roleId: 'r-gone', roleName: 'Contractor', newValue: '3 member(s) moved' }),
      ],
      page: 0,
      size: 50,
      totalElements: 3,
      totalPages: 1,
    });
  });

  it('writes each change as a sentence about people', async () => {
    renderAt('/dashboard/team/activity');

    expect(await screen.findByRole('region', { name: 'Today' })).toBeInTheDocument();
    expect(sentence('You moved Kasun Silva from Interviewer to Recruiter')).toBeInTheDocument();
    expect(sentence('Amaya Perera changed Hiring Coordinator')).toBeInTheDocument();
    expect(sentence('Renamed from Coordinator to Hiring Coordinator')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Added' })).toHaveTextContent('Organise interviews');
    expect(sentence('A former member deleted the role Contractor')).toBeInTheDocument();
    expect(screen.getByText('Its 3 members were moved to another role.')).toBeInTheDocument();
  });

  it('narrows to the people who were moved', async () => {
    const user = userEvent.setup();
    renderAt('/dashboard/team/activity');
    await screen.findByRole('region', { name: 'Today' });

    const radio = screen.getByRole('radio', { name: /people moved/i });
    await user.click(radio.closest('label') ?? radio);

    expect(sentence('You moved Kasun Silva from Interviewer to Recruiter')).toBeInTheDocument();
    expect(screen.queryByText('Renamed from', { exact: false })).toBeNull();
  });
});


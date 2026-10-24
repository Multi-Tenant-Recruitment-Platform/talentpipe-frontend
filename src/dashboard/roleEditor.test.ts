import { describe, expect, it } from 'vitest';
import { ALL_KEYS, CATALOGUE, COORDINATOR, INTERVIEWER, OWNER, RECRUITER, makeRole } from '../test/roleFixtures';
import {
  closestRole,
  diffPermissions,
  groupCoverage,
  heldPermissions,
  isRoleDirty,
  isWorkspaceOwner,
  parseRoleSnapshot,
  requiredBy,
  ROLE_MESSAGES,
  roleUnavailableReason,
  toggleGroup,
  togglePermission,
  toRoleFormValues,
  toRoleRequest,
  validateRole,
} from './roleEditor';
import { describeRoleError } from './roleErrors';

const team = CATALOGUE[0];

describe('ticking permissions', () => {
  it('brings a permission requirements along, and leaves them when it is unticked', () => {
    const on = togglePermission(new Set(), 'jobs.publish', true, CATALOGUE);
    expect([...on].sort()).toEqual(['jobs.manage', 'jobs.publish']);

    const off = togglePermission(on, 'jobs.publish', false, CATALOGUE);
    expect([...off]).toEqual(['jobs.manage']);
  });

  it('names what keeps a requirement ticked', () => {
    const selected = new Set(['team.view', 'team.invite', 'roles.manage']);
    expect(requiredBy('team.view', selected, CATALOGUE)).toEqual(['team.invite', 'roles.manage']);
    expect(requiredBy('team.invite', selected, CATALOGUE)).toEqual([]);
  });

  it('selects a whole group, but only what the member may hand out', () => {
    const next = toggleGroup(new Set(), team, true, CATALOGUE, (key) => key !== 'roles.manage');
    expect([...next].sort()).toEqual(['team.invite', 'team.manage', 'team.view']);
  });

  it('clears a group but keeps a requirement another group still needs', () => {
    const catalogue = [
      ...CATALOGUE,
      {
        key: 'EXTRA',
        label: 'Extra',
        permissions: [{ key: 'reports.view', label: 'Reports', description: '', requires: ['team.view'] }],
      },
    ];
    const selected = new Set(['team.view', 'team.invite', 'reports.view']);
    const next = toggleGroup(selected, team, false, catalogue, () => true);
    expect([...next].sort()).toEqual(['reports.view', 'team.view']);
  });
});

describe('the form', () => {
  it('asks for a name, and one no other role has, whatever its case', () => {
    const values = { name: '   ', description: '', permissions: new Set<string>() };
    expect(validateRole(values, []).name).toBe(ROLE_MESSAGES.nameRequired);
    expect(validateRole({ ...values, name: ' recruiter ' }, ['Recruiter']).name).toBe(ROLE_MESSAGES.nameTaken);
    expect(validateRole({ ...values, name: 'Talent Partner' }, ['Recruiter'])).toEqual({});
  });

  it('sends a tidy request: single spaces, no empty description, catalogue order', () => {
    const request = toRoleRequest(
      { name: '  Hiring   Coordinator ', description: '  ', permissions: new Set(['interviews.conduct', 'team.view']) },
      CATALOGUE,
      3,
    );
    expect(request).toEqual({
      name: 'Hiring Coordinator',
      description: null,
      permissions: ['team.view', 'interviews.conduct'],
      version: 3,
    });
  });

  it('is dirty only when something meaningful changed', () => {
    const initial = toRoleFormValues(COORDINATOR);
    expect(isRoleDirty({ ...initial, name: `${initial.name} ` }, initial)).toBe(false);
    expect(isRoleDirty({ ...initial, permissions: new Set(['team.view']) }, initial)).toBe(true);
  });
});

describe('who may hand out what', () => {
  it('reads the member permission list, or assumes everything for an admin on an older server', () => {
    expect([...heldPermissions({ role: 'CUSTOM', permissions: ['team.view'] }, CATALOGUE)]).toEqual(['team.view']);
    expect(heldPermissions({ role: 'COMPANY_ADMIN' }, CATALOGUE).size).toBe(ALL_KEYS.length);
    expect(heldPermissions({ role: 'INTERVIEWER' }, CATALOGUE).size).toBe(0);
  });

  it('keeps Owner for Owners, and refuses roles that grant more than the member holds', () => {
    const held = new Set(RECRUITER.permissions);
    expect(roleUnavailableReason(OWNER, held, false)).toBe('Owners only');
    expect(roleUnavailableReason(OWNER, new Set(ALL_KEYS), true)).toBeUndefined();
    expect(roleUnavailableReason(INTERVIEWER, held, false)).toBeUndefined();
    expect(roleUnavailableReason(makeRole({ permissions: ['roles.manage'] }), held, false)).toBe(
      'Needs permissions you lack',
    );
  });

  it('knows an Owner by the role they hold', () => {
    const roles = [OWNER, RECRUITER];
    expect(isWorkspaceOwner({ role: 'COMPANY_ADMIN', roleId: 'r-owner' }, roles)).toBe(true);
    expect(isWorkspaceOwner({ role: 'HR_MANAGER', roleId: 'r-recruiter' }, roles)).toBe(false);
    expect(isWorkspaceOwner({ role: 'COMPANY_ADMIN' }, [])).toBe(true);
  });

  it('suggests the closest role for a deleted role members, never Owner', () => {
    const choices = [OWNER, RECRUITER, INTERVIEWER, COORDINATOR].map((role) => ({ role }));
    const doomed = makeRole({ id: 'r-doomed', permissions: ['interviews.conduct', 'interviews.schedule'] });
    expect(closestRole(doomed, choices)?.name).toBe('Hiring Coordinator');
    expect(closestRole(doomed, [{ role: OWNER }, { role: INTERVIEWER, unavailable: 'x' }])?.name).toBe('Owner');
  });
});

describe('comparing roles', () => {
  it('lists what a change adds and removes, in catalogue order', () => {
    expect(diffPermissions(INTERVIEWER.permissions, COORDINATOR.permissions, CATALOGUE)).toEqual({
      gained: ['team.view', 'interviews.schedule'],
      lost: [],
    });
  });

  it('counts how much of each group a role holds', () => {
    const coverage = groupCoverage(new Set(INTERVIEWER.permissions), CATALOGUE);
    expect(coverage.map(({ group, held, total }) => `${group.key} ${held}/${total}`)).toEqual([
      'TEAM 0/4',
      'COMPANY 0/1',
      'VACANCIES 0/3',
      'HIRING 0/3',
      'INTERVIEWS 1/2',
    ]);
  });

  it('reads the audit snapshot of a role, and nothing else', () => {
    expect(parseRoleSnapshot('Hiring: Coordinator: team.view, jobs.manage')).toEqual({
      name: 'Hiring: Coordinator',
      permissions: ['team.view', 'jobs.manage'],
    });
    expect(parseRoleSnapshot('Empty: (no permissions)')).toEqual({ name: 'Empty', permissions: [] });
    expect(parseRoleSnapshot('3 member(s) moved')).toBeNull();
    expect(parseRoleSnapshot('Note: this is a sentence')).toBeNull();
    expect(parseRoleSnapshot(null)).toBeNull();
  });
});

describe('role errors', () => {
  const failure = (status: number, code: string, message: string) => ({
    isAxiosError: true,
    response: { status, data: { code, message } },
  });

  it('routes a taken name, a stale version and a vanished role differently', () => {
    expect(describeRoleError(failure(409, 'CONFLICT', 'A role named X exists.'), 'create').nameTaken).toBe(true);
    expect(describeRoleError(failure(409, 'CONCURRENT_UPDATE', 'Someone else changed it.'), 'save')).toMatchObject({
      stale: true,
      message: 'Someone else changed it.',
    });
    expect(describeRoleError(failure(404, 'NOT_FOUND', 'Role not found'), 'save')).toMatchObject({
      notFound: true,
      refetch: true,
    });
  });

  it('shows the server sentence for a rule it refused', () => {
    const plan = describeRoleError(
      failure(422, 'BUSINESS_RULE', "You can only give out permissions you have yourself. You don't have: Manage roles."),
      'save',
    );
    expect(plan.message).toMatch(/you don.t have: manage roles/i);
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  PERMISSIONS,
  ROLES,
  can,
  homeRouteFor,
  isRole,
  permissionsFor,
  type Permission,
  type Role,
} from './permissions';

/**
 * The matrix is written out by hand on purpose. Deriving it from the map under
 * test would make this a tautology — the point is that changing a cell in
 * permissions.ts has to be a deliberate, reviewed change here too.
 */
const EXPECTED: Record<Permission, Record<Role, boolean>> = {
  //                      ADMIN   HR     INTERVIEWER  CANDIDATE
  'dashboard.view': { COMPANY_ADMIN: true, HR_MANAGER: true, INTERVIEWER: true, CANDIDATE: false },
  'overview.view': { COMPANY_ADMIN: true, HR_MANAGER: true, INTERVIEWER: true, CANDIDATE: false },
  'team.view': { COMPANY_ADMIN: true, HR_MANAGER: false, INTERVIEWER: false, CANDIDATE: false },
  'team.invite': { COMPANY_ADMIN: true, HR_MANAGER: false, INTERVIEWER: false, CANDIDATE: false },
  'team.invite.manage': {
    COMPANY_ADMIN: true,
    HR_MANAGER: false,
    INTERVIEWER: false,
    CANDIDATE: false,
  },
  'pipeline.view': { COMPANY_ADMIN: true, HR_MANAGER: true, INTERVIEWER: true, CANDIDATE: false },
  'pipeline.manage': {
    COMPANY_ADMIN: true,
    HR_MANAGER: true,
    INTERVIEWER: false,
    CANDIDATE: false,
  },
  'settings.view': { COMPANY_ADMIN: true, HR_MANAGER: true, INTERVIEWER: false, CANDIDATE: false },
  'settings.edit': { COMPANY_ADMIN: true, HR_MANAGER: false, INTERVIEWER: false, CANDIDATE: false },
  'billing.view': { COMPANY_ADMIN: true, HR_MANAGER: false, INTERVIEWER: false, CANDIDATE: false },
  'jobs.browse': { COMPANY_ADMIN: true, HR_MANAGER: true, INTERVIEWER: true, CANDIDATE: true },
  'applications.viewOwn': {
    COMPANY_ADMIN: false,
    HR_MANAGER: false,
    INTERVIEWER: false,
    CANDIDATE: true,
  },
};

describe('permission matrix', () => {
  it.each(PERMISSIONS)('pins every role for %s', (permission) => {
    for (const role of ROLES) {
      expect(can(role, permission), `${role} → ${permission}`).toBe(EXPECTED[permission][role]);
    }
  });

  it('covers every declared permission', () => {
    expect(Object.keys(EXPECTED).sort()).toEqual([...PERMISSIONS].sort());
  });
});

describe('unknown and missing roles fail closed', () => {
  it('denies every permission to a role the frontend has never heard of', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const permission of PERMISSIONS) {
      expect(can('RECRUITER', permission)).toBe(false);
    }
    warn.mockRestore();
  });

  it('warns once per lookup in dev so a new backend role is discoverable', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    permissionsFor('RECRUITER');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('RECRUITER'));
    warn.mockRestore();
  });

  it('stays quiet for a signed-out user', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(permissionsFor(null).size).toBe(0);
    expect(permissionsFor(undefined).size).toBe(0);
    expect(permissionsFor('').size).toBe(0);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('isRole', () => {
  it.each(ROLES)('accepts %s', (role) => expect(isRole(role)).toBe(true));

  it('rejects anything else', () => {
    expect(isRole('recruiter')).toBe(false);
    expect(isRole('company_admin')).toBe(false); // case-sensitive on purpose
    expect(isRole(null)).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });
});

describe('homeRouteFor', () => {
  it('sends company roles to the dashboard', () => {
    expect(homeRouteFor('COMPANY_ADMIN')).toBe('/dashboard');
    expect(homeRouteFor('HR_MANAGER')).toBe('/dashboard');
    expect(homeRouteFor('INTERVIEWER')).toBe('/dashboard');
  });

  it('sends candidates, unknown roles and signed-out users to the job board', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(homeRouteFor('CANDIDATE')).toBe('/jobs');
    expect(homeRouteFor('RECRUITER')).toBe('/jobs');
    expect(homeRouteFor(null)).toBe('/jobs');
    warn.mockRestore();
  });
});

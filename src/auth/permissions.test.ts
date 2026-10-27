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
  // Moving people between roles and editing roles exist only on servers that
  // send a permission list, so the fixed-role fallback never offers them.
  'team.manage': { COMPANY_ADMIN: false, HR_MANAGER: false, INTERVIEWER: false, CANDIDATE: false },
  'roles.view': { COMPANY_ADMIN: false, HR_MANAGER: false, INTERVIEWER: false, CANDIDATE: false },
  'roles.manage': { COMPANY_ADMIN: false, HR_MANAGER: false, INTERVIEWER: false, CANDIDATE: false },
  'pipeline.view': { COMPANY_ADMIN: true, HR_MANAGER: true, INTERVIEWER: true, CANDIDATE: false },
  'pipeline.manage': {
    COMPANY_ADMIN: true,
    HR_MANAGER: true,
    INTERVIEWER: false,
    CANDIDATE: false,
  },
  // Every company role may read their own company's profile; only an admin
  // may change it (settings.edit). Candidates get it from a public route one
  // day, never from the dashboard.
  'company.profile.view': {
    COMPANY_ADMIN: true,
    HR_MANAGER: true,
    INTERVIEWER: true,
    CANDIDATE: false,
  },
  'settings.view': { COMPANY_ADMIN: true, HR_MANAGER: true, INTERVIEWER: false, CANDIDATE: false },
  'settings.edit': { COMPANY_ADMIN: true, HR_MANAGER: false, INTERVIEWER: false, CANDIDATE: false },
  'billing.view': { COMPANY_ADMIN: true, HR_MANAGER: false, INTERVIEWER: false, CANDIDATE: false },
  'jobs.browse': { COMPANY_ADMIN: true, HR_MANAGER: true, INTERVIEWER: true, CANDIDATE: true },
  // Opening a role is the HR manager's day job, so it sits with pipeline.manage
  // rather than with the admin-only cells. An interviewer reads the pipeline;
  // they do not decide what the company hires for.
  // Servers without a permission list refused GET /jobs to interviewers.
  'jobs.view': { COMPANY_ADMIN: true, HR_MANAGER: true, INTERVIEWER: false, CANDIDATE: false },
  'jobs.viewAll': { COMPANY_ADMIN: true, HR_MANAGER: true, INTERVIEWER: false, CANDIDATE: false },
  'jobs.manage': { COMPANY_ADMIN: true, HR_MANAGER: true, INTERVIEWER: false, CANDIDATE: false },
  'jobs.publish': { COMPANY_ADMIN: true, HR_MANAGER: true, INTERVIEWER: false, CANDIDATE: false },
  // Templates are read by whoever opens roles and changed only by the admin.
  // An interviewer never picks a pipeline, so the list would only be noise.
  'templates.view': { COMPANY_ADMIN: true, HR_MANAGER: true, INTERVIEWER: false, CANDIDATE: false },
  'templates.manage': {
    COMPANY_ADMIN: true,
    HR_MANAGER: false,
    INTERVIEWER: false,
    CANDIDATE: false,
  },
  'applications.viewOwn': {
    COMPANY_ADMIN: false,
    HR_MANAGER: false,
    INTERVIEWER: false,
    CANDIDATE: true,
  },
  // A candidate's own profile. Company users have no candidate profile, so a
  // company role that could open it would only meet a 404.
  'profile.manageOwn': {
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

describe('a company member with a permission list', () => {
  const member = (role: string, permissions: string[]) => ({ role, permissions, tenantId: 't-1' });

  it('gets the screens their permissions open, whatever the role is called', () => {
    // A custom role: team and interview scheduling, nothing about vacancies.
    const coordinator = member('CUSTOM', ['team.view', 'team.invite', 'applications.view.all', 'interviews.schedule']);

    for (const granted of ['dashboard.view', 'team.view', 'roles.view', 'team.invite', 'team.invite.manage'] as const) {
      expect(can(coordinator, granted), granted).toBe(true);
    }
    for (const denied of ['jobs.manage', 'jobs.publish', 'roles.manage', 'settings.edit', 'team.manage'] as const) {
      expect(can(coordinator, denied), denied).toBe(false);
    }
  });

  it('lets every member list the vacancies they work on, and only some see them all', () => {
    const interviewer = member('INTERVIEWER', ['interviews.conduct']);
    const recruiter = member('HR_MANAGER', ['jobs.view.all', 'jobs.manage', 'jobs.publish']);

    expect(can(interviewer, 'jobs.view')).toBe(true);
    expect(can(interviewer, 'jobs.viewAll')).toBe(false);
    expect(can(recruiter, 'jobs.viewAll')).toBe(true);
    expect(can(recruiter, 'jobs.publish')).toBe(true);
  });

  it('keeps pipeline templates on the fixed role, which is what the backend still checks', () => {
    const owner = member('COMPANY_ADMIN', ['pipeline.templates.manage', 'roles.manage', 'team.manage']);
    const customWithTemplates = member('CUSTOM', ['pipeline.templates.manage']);

    expect(can(owner, 'templates.manage')).toBe(true);
    expect(can(owner, 'roles.manage')).toBe(true);
    expect(can(customWithTemplates, 'templates.view')).toBe(false);
  });

  it('ignores a permission key it does not know', () => {
    expect([...permissionsFor(member('CUSTOM', ['reports.export']))].sort()).toEqual(
      [...permissionsFor(member('CUSTOM', []))].sort(),
    );
  });

  it('treats an empty list on a candidate as no company role, not as an empty one', () => {
    const candidate = { role: 'CANDIDATE', permissions: [], tenantId: null };

    expect(can(candidate, 'profile.manageOwn')).toBe(true);
    expect(can(candidate, 'dashboard.view')).toBe(false);
    expect(homeRouteFor(candidate)).toBe('/');
    expect(homeRouteFor(member('CUSTOM', []))).toBe('/dashboard');
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
    expect(homeRouteFor('CANDIDATE')).toBe('/');
    expect(homeRouteFor('RECRUITER')).toBe('/');
    expect(homeRouteFor(null)).toBe('/');
    warn.mockRestore();
  });
});

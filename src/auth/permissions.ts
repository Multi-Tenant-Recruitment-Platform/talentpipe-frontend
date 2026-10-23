import { formatRole } from '../utils/format';

/**
 * Central RBAC map — the single source of truth for "who may do what" in the
 * SPA.
 *
 * <p>This is a UX guard, not a security boundary: the backend enforces both
 * the permission and the tenant scope on every request. The rule that keeps
 * the two honest is that this map must never be MORE permissive than the
 * backend — a permission granted here that the API rejects turns into a 403
 * the user can see but cannot act on.</p>
 *
 * <h3>Where the answer comes from</h3>
 *
 * <p>Companies define their own roles (backend ADR-9), so a role's name no
 * longer says what it may do. Login, refresh and `/auth/me` return the
 * signed-in user's permission keys, and when they are there the UI permissions
 * below are derived from them ({@link fromBackendKeys}): a custom "Hiring
 * Coordinator" gets exactly the screens its permissions allow, and a change to
 * the role shows on the next sign-in or reload.</p>
 *
 * <p>The fixed role matrix remains for a user without that list — a server
 * older than company roles, or a fixture in a test. It describes what those
 * servers allowed, so it never grants anything they would refuse.</p>
 */

export const ROLES = ['COMPANY_ADMIN', 'HR_MANAGER', 'INTERVIEWER', 'CANDIDATE'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'dashboard.view', // may enter the company workspace chrome at all
  'overview.view',
  'team.view', // GET /team
  'team.invite', // POST /team/invitations
  'team.invite.manage', // resend / revoke
  'team.manage', // PUT /team/members/{id}/role — move someone to another role
  'roles.view', // GET /roles — see the workspace's roles and who holds them
  'roles.manage', // create, edit, duplicate and delete roles; read the audit trail
  'pipeline.view',
  'pipeline.manage', // move candidates between stages
  'company.profile.view', // the Profile Management page (PB-010)
  'settings.view',
  'settings.edit', // PATCH /tenant, logo and cover, PATCH /tenant/settings
  'billing.view', // plan & seat usage
  'jobs.browse',
  'jobs.view', // GET /jobs — the vacancies this person works on, or all of them
  'jobs.viewAll', // sees every vacancy in the company, not only the ones they work on
  'jobs.manage', // create, edit, duplicate, staff and switch features on vacancies
  'jobs.publish', // publish, close and archive
  'templates.view', // GET /pipeline-templates — read the reusable hiring pipelines
  'templates.manage', // create, edit and archive pipeline templates
  'applications.viewOwn',
  'profile.manageOwn', // a candidate's own My profile page
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Everything every company member shares, whatever their role. */
const COMPANY_BASE = [
  'dashboard.view',
  'overview.view',
  'pipeline.view',
  'jobs.browse',
  // Everyone in the workspace may read the company's own profile — it is the
  // company they work for, and it is destined to be candidate-visible anyway.
  // Changing it still needs settings.edit.
  'company.profile.view',
] as const satisfies readonly Permission[];

/**
 * The fixed-role matrix, for users without a permission list. The annotation
 * makes a typo or a missing role a build error.
 */
const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  COMPANY_ADMIN: new Set([
    ...COMPANY_BASE,
    'team.view',
    'team.invite',
    'team.invite.manage',
    'pipeline.manage',
    'jobs.view',
    'jobs.viewAll',
    'jobs.manage',
    'jobs.publish',
    'templates.view',
    'templates.manage',
    'settings.view',
    'settings.edit',
    'billing.view',
  ]),
  // Opening a role is the HR manager's job, not a privilege of ownership, so
  // the vacancy permissions sit alongside pipeline.manage rather than with the
  // admin-only cells above. Pipeline templates are the admin's to shape; the
  // HR manager, as the one who opens roles, only needs to read them.
  HR_MANAGER: new Set([
    ...COMPANY_BASE,
    'pipeline.manage',
    'jobs.view',
    'jobs.viewAll',
    'jobs.manage',
    'jobs.publish',
    'templates.view',
    'settings.view',
  ]),
  // Servers older than company roles refused GET /jobs to interviewers, so the
  // fallback leaves them out; a server with roles sends permissions instead.
  INTERVIEWER: new Set(COMPANY_BASE),
  CANDIDATE: new Set(['jobs.browse', 'applications.viewOwn', 'profile.manageOwn']),
};

/**
 * What each backend permission key opens in the UI. A key the UI does not
 * know yet opens nothing — a newer backend never widens an older SPA.
 */
const FROM_BACKEND_KEY: Record<string, readonly Permission[]> = {
  'team.view': ['team.view', 'roles.view'],
  'team.invite': ['team.invite', 'team.invite.manage'],
  'team.manage': ['team.manage'],
  'roles.manage': ['roles.manage'],
  'settings.edit': ['settings.edit', 'billing.view'],
  'jobs.view.all': ['jobs.viewAll'],
  'jobs.manage': ['jobs.manage'],
  'jobs.publish': ['jobs.publish'],
  'applications.manage': ['pipeline.manage'],
};

/** Pipeline templates still check the fixed role on the backend, so the UI does too. */
const TEMPLATE_PERMISSIONS = ['templates.view', 'templates.manage'] as const satisfies readonly Permission[];

/**
 * Who a permission question is about: the signed-in user (preferred), or a
 * bare role name where only that is known.
 */
export type PermissionSubject =
  | string
  | null
  | undefined
  | { role: string; permissions?: readonly string[] | null; tenantId?: string | null };

const EMPTY: ReadonlySet<Permission> = new Set<Permission>();

/** Narrows the backend's free-form role string to a role we know about. */
export function isRole(value: string | null | undefined): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

function roleMatrix(role: string | null | undefined): ReadonlySet<Permission> {
  if (!isRole(role)) {
    if (import.meta.env.DEV && role && role !== 'CUSTOM') {
      console.warn(`[rbac] unknown role "${role}" — denying every permission`);
    }
    return EMPTY;
  }
  return ROLE_PERMISSIONS[role];
}

/**
 * A company member's UI permissions from the keys their role grants. Every
 * member may enter the dashboard, read the company and its settings, and list
 * the vacancies they work on (the backend narrows that list for them).
 */
function fromBackendKeys(role: string, keys: readonly string[]): ReadonlySet<Permission> {
  const granted = new Set<Permission>([...COMPANY_BASE, 'settings.view', 'jobs.view']);
  for (const key of keys) {
    for (const permission of FROM_BACKEND_KEY[key] ?? []) {
      granted.add(permission);
    }
  }
  const legacy = roleMatrix(role);
  for (const permission of TEMPLATE_PERMISSIONS) {
    if (legacy.has(permission)) {
      granted.add(permission);
    }
  }
  return granted;
}

/**
 * Permissions held by a subject. Unknown roles without a permission list get
 * nothing: a role the frontend has never heard of fails closed rather than
 * inheriting someone else's access.
 */
export function permissionsFor(subject: PermissionSubject): ReadonlySet<Permission> {
  if (subject === null || subject === undefined) {
    return EMPTY;
  }
  if (typeof subject === 'string') {
    return roleMatrix(subject);
  }
  const { role, permissions, tenantId } = subject;
  // Only company members carry company permissions; a candidate's empty list
  // means "no company role", not "a company role with nothing in it".
  if (Array.isArray(permissions) && tenantId) {
    return fromBackendKeys(role, permissions);
  }
  return roleMatrix(role);
}

export function can(subject: PermissionSubject, permission: Permission): boolean {
  return permissionsFor(subject).has(permission);
}

/** Where a subject belongs when it lands somewhere it may not be. */
export function homeRouteFor(subject: PermissionSubject): string {
  return can(subject, 'dashboard.view') ? '/dashboard' : '/';
}

/**
 * What to call someone's role on screen: the company's own name for it when
 * the server sends one ("Hiring Coordinator"), otherwise the fixed role.
 */
export function roleLabelFor(subject: { role: string; roleName?: string | null }): string {
  return subject.roleName?.trim() || formatRole(subject.role);
}

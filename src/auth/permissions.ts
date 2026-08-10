/**
 * Central RBAC map — the single source of truth for "who may do what" in the
 * SPA.
 *
 * <p>This is a UX guard, not a security boundary: the backend enforces both
 * the role and the tenant scope on every request. The rule that keeps the two
 * honest is that this map must never be MORE permissive than the backend — a
 * permission granted here that the API rejects turns into a 403 the user can
 * see but cannot act on.</p>
 */

export const ROLES = ['COMPANY_ADMIN', 'HR_MANAGER', 'INTERVIEWER', 'CANDIDATE'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'dashboard.view', // may enter the company workspace chrome at all
  'overview.view',
  'team.view', // GET /team
  'team.invite', // POST /team/invitations
  'team.invite.manage', // resend / revoke
  'pipeline.view',
  'pipeline.manage', // future: move candidates between stages
  'settings.view',
  'settings.edit', // future: PATCH /tenant
  'billing.view', // plan & seat usage
  'jobs.browse',
  'applications.viewOwn',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Everything the three company roles share. */
const COMPANY_BASE = [
  'dashboard.view',
  'overview.view',
  'pipeline.view',
  'jobs.browse',
] as const satisfies readonly Permission[];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  COMPANY_ADMIN: [
    ...COMPANY_BASE,
    'team.view',
    'team.invite',
    'team.invite.manage',
    'pipeline.manage',
    'settings.view',
    'settings.edit',
    'billing.view',
  ],
  // Team management is COMPANY_ADMIN-only on the backend (see api/team.ts), so
  // granting an HR manager team.view would render a page that instantly 403s.
  // NOTE: settings.view is safe only while CompanySettingsPage is mock-backed.
  // Revisit this cell when GET /tenant lands — if that endpoint is admin-only,
  // HR_MANAGER must lose it.
  HR_MANAGER: [...COMPANY_BASE, 'pipeline.manage', 'settings.view'],
  INTERVIEWER: [...COMPANY_BASE],
  CANDIDATE: ['jobs.browse', 'applications.viewOwn'],
};

const PERMISSION_SETS = Object.fromEntries(
  ROLES.map((role) => [role, new Set(ROLE_PERMISSIONS[role])]),
) as Record<Role, ReadonlySet<Permission>>;

const EMPTY: ReadonlySet<Permission> = new Set<Permission>();

/** Narrows the backend's free-form role string to a role we know about. */
export function isRole(value: string | null | undefined): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/**
 * Permissions held by a role. Unknown roles get nothing: a role the frontend
 * has never heard of fails closed, loudly in dev, rather than inheriting
 * someone else's access.
 */
export function permissionsFor(role: string | null | undefined): ReadonlySet<Permission> {
  if (!isRole(role)) {
    if (import.meta.env.DEV && role) {
      console.warn(`[rbac] unknown role "${role}" — denying every permission`);
    }
    return EMPTY;
  }
  return PERMISSION_SETS[role];
}

export function can(role: string | null | undefined, permission: Permission): boolean {
  return permissionsFor(role).has(permission);
}

/** Where a role belongs when it lands somewhere it may not be. */
export function homeRouteFor(role: string | null | undefined): string {
  return can(role, 'dashboard.view') ? '/dashboard' : '/jobs';
}

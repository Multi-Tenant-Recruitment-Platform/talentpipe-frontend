import type { PermissionDefinition, PermissionGroup, RoleRequest, RoleResponse } from '../api/types';

/**
 * The rules behind the role editor, kept apart from the screen so they can be
 * read — and tested — as rules.
 *
 * <p>Two of them mirror the backend exactly, because a mismatch would only
 * show up as a refusal after Save:</p>
 * <ul>
 *   <li><b>Requirements travel with what needs them.</b> "Invite people" is
 *   meaningless without "View team", so granting the first grants the second
 *   (the server's {@code Permission.withRequirements}). The editor shows the
 *   requirement ticked and locked, naming what holds it there.</li>
 *   <li><b>Nobody hands out what they do not hold.</b> A permission the
 *   signed-in member lacks cannot be granted or taken away by them.</li>
 * </ul>
 */

export const ROLE_NAME_MAX = 60;
export const ROLE_DESCRIPTION_MAX = 300;
/** The backend's cap on a workspace's own roles; the three defaults do not count. */
export const MAX_CUSTOM_ROLES = 50;

export interface RoleFormValues {
  name: string;
  description: string;
  permissions: ReadonlySet<string>;
}

export type RoleField = 'name' | 'description';
export type RoleErrors = Partial<Record<RoleField, string>>;

export const ROLE_MESSAGES = {
  nameRequired: 'Give the role a name.',
  nameTooLong: `Keep the role name to ${ROLE_NAME_MAX} characters or fewer.`,
  nameTaken: 'Another role already has this name. Choose a different one.',
  descriptionTooLong: `Keep the description to ${ROLE_DESCRIPTION_MAX} characters or fewer.`,
} as const;

export const EMPTY_ROLE_VALUES: RoleFormValues = { name: '', description: '', permissions: new Set() };

export function toRoleFormValues(role: RoleResponse): RoleFormValues {
  return { name: role.name, description: role.description ?? '', permissions: new Set(role.permissions) };
}

/** Collapses runs of spaces the way the server stores the name. */
export function cleanRoleName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/** The request body, permissions in catalogue order so a diff reads the same way twice. */
export function toRoleRequest(values: RoleFormValues, catalogue: readonly PermissionGroup[], version?: number): RoleRequest {
  const order = allPermissions(catalogue).map((permission) => permission.key);
  const permissions = order.filter((key) => values.permissions.has(key));
  // Anything the catalogue does not know yet (a newer server) is kept rather than dropped.
  for (const key of values.permissions) {
    if (!order.includes(key)) {
      permissions.push(key);
    }
  }
  const description = values.description.trim();
  return {
    name: cleanRoleName(values.name),
    description: description === '' ? null : description,
    permissions,
    ...(version === undefined ? {} : { version }),
  };
}

export function validateRole(values: RoleFormValues, takenNames: readonly string[]): RoleErrors {
  const errors: RoleErrors = {};
  const name = cleanRoleName(values.name);
  if (name === '') {
    errors.name = ROLE_MESSAGES.nameRequired;
  } else if (name.length > ROLE_NAME_MAX) {
    errors.name = ROLE_MESSAGES.nameTooLong;
  } else if (takenNames.some((taken) => taken.toLowerCase() === name.toLowerCase())) {
    errors.name = ROLE_MESSAGES.nameTaken;
  }
  if (values.description.trim().length > ROLE_DESCRIPTION_MAX) {
    errors.description = ROLE_MESSAGES.descriptionTooLong;
  }
  return errors;
}

export function isRoleDirty(values: RoleFormValues, initial: RoleFormValues): boolean {
  return (
    cleanRoleName(values.name) !== cleanRoleName(initial.name) ||
    values.description.trim() !== initial.description.trim() ||
    !sameSet(values.permissions, initial.permissions)
  );
}

export function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  return a.size === b.size && [...a].every((key) => b.has(key));
}

/* --- The catalogue ------------------------------------------------------- */

export function allPermissions(catalogue: readonly PermissionGroup[]): PermissionDefinition[] {
  return catalogue.flatMap((group) => group.permissions);
}

export function permissionIndex(catalogue: readonly PermissionGroup[]): ReadonlyMap<string, PermissionDefinition> {
  return new Map(allPermissions(catalogue).map((permission) => [permission.key, permission]));
}

/** What to call a permission key on screen; an unknown key is shown as itself. */
export function permissionLabel(key: string, index: ReadonlyMap<string, PermissionDefinition>): string {
  return index.get(key)?.label ?? key;
}

/** A key and everything it needs, transitively. */
function withRequirements(keys: Iterable<string>, index: ReadonlyMap<string, PermissionDefinition>): Set<string> {
  const result = new Set<string>();
  const pending = [...keys];
  while (pending.length > 0) {
    const key = pending.pop() as string;
    if (result.has(key)) {
      continue;
    }
    result.add(key);
    pending.push(...(index.get(key)?.requires ?? []));
  }
  return result;
}

/**
 * Ticks or unticks one permission. Ticking brings its requirements along;
 * unticking leaves them — they were a consequence, not the choice, and may be
 * wanted on their own.
 */
export function togglePermission(
  selected: ReadonlySet<string>,
  key: string,
  on: boolean,
  catalogue: readonly PermissionGroup[],
): Set<string> {
  const index = permissionIndex(catalogue);
  if (on) {
    return new Set([...selected, ...withRequirements([key], index)]);
  }
  const next = new Set(selected);
  next.delete(key);
  return next;
}

/** Ticks or unticks a whole group, as "Select all" does. */
export function toggleGroup(
  selected: ReadonlySet<string>,
  group: PermissionGroup,
  on: boolean,
  catalogue: readonly PermissionGroup[],
  grantable: (key: string) => boolean,
): Set<string> {
  const index = permissionIndex(catalogue);
  const keys = group.permissions.map((permission) => permission.key).filter(grantable);
  if (on) {
    return new Set([...selected, ...withRequirements(keys, index)]);
  }
  const next = new Set(selected);
  for (const key of keys) {
    // A permission another group still needs stays, or the role would be saved
    // in a shape the server immediately undoes.
    if (requiredBy(key, next, catalogue).length === 0) {
      next.delete(key);
    }
  }
  return next;
}

/**
 * The ticked permissions that need {@code key} — what keeps it ticked. Empty
 * when it was chosen on its own.
 */
export function requiredBy(key: string, selected: ReadonlySet<string>, catalogue: readonly PermissionGroup[]): string[] {
  return allPermissions(catalogue)
    .filter((permission) => permission.key !== key && selected.has(permission.key) && permission.requires.includes(key))
    .map((permission) => permission.key);
}

/* --- Who may hand out what ----------------------------------------------- */

/**
 * The permission keys the signed-in member holds. A member whose server sent
 * no list (older backend) is treated as holding what the Owner role holds if
 * they are the company admin, and nothing otherwise — it only shapes what the
 * editor offers; the server decides.
 */
export function heldPermissions(
  user: { role: string; permissions?: readonly string[] | null } | null | undefined,
  catalogue: readonly PermissionGroup[],
): ReadonlySet<string> {
  if (!user) {
    return new Set();
  }
  if (Array.isArray(user.permissions)) {
    return new Set(user.permissions);
  }
  return user.role === 'COMPANY_ADMIN' ? new Set(allPermissions(catalogue).map((p) => p.key)) : new Set();
}

/** Keys of {@code permissions} the member does not hold, in the order given. */
export function missingFrom(permissions: Iterable<string>, held: ReadonlySet<string>): string[] {
  return [...permissions].filter((key) => !held.has(key));
}

/** Whether the signed-in member holds the Owner role. */
export function isWorkspaceOwner(
  user: { role: string; roleId?: string | null } | null | undefined,
  roles: readonly RoleResponse[],
): boolean {
  if (!user) {
    return false;
  }
  const own = user.roleId ? roles.find((role) => role.id === user.roleId) : undefined;
  return own ? own.locked : user.role === 'COMPANY_ADMIN';
}

/**
 * Why the signed-in member cannot give someone {@code role} — the same two
 * rules the server applies — or undefined when they can.
 */
export function roleUnavailableReason(
  role: RoleResponse,
  held: ReadonlySet<string>,
  actorIsOwner: boolean,
): string | undefined {
  if (role.locked) {
    return actorIsOwner ? undefined : 'Owners only';
  }
  return missingFrom(role.permissions, held).length > 0 ? 'Needs permissions you lack' : undefined;
}

/* --- Comparing two roles ------------------------------------------------- */

export interface PermissionDiff {
  gained: string[];
  lost: string[];
}

/** What moving from {@code before} to {@code after} adds and removes, in catalogue order. */
export function diffPermissions(
  before: Iterable<string>,
  after: Iterable<string>,
  catalogue: readonly PermissionGroup[],
): PermissionDiff {
  const from = new Set(before);
  const to = new Set(after);
  const order = allPermissions(catalogue).map((permission) => permission.key);
  const rank = (key: string) => {
    const at = order.indexOf(key);
    return at === -1 ? order.length : at;
  };
  const byOrder = (a: string, b: string) => rank(a) - rank(b);
  return {
    gained: [...to].filter((key) => !from.has(key)).sort(byOrder),
    lost: [...from].filter((key) => !to.has(key)).sort(byOrder),
  };
}

/** How much of each group a role holds — the coverage strip on a role card. */
export function groupCoverage(
  permissions: ReadonlySet<string>,
  catalogue: readonly PermissionGroup[],
): { group: PermissionGroup; held: number; total: number }[] {
  return catalogue.map((group) => ({
    group,
    held: group.permissions.filter((permission) => permissions.has(permission.key)).length,
    total: group.permissions.length,
  }));
}

/**
 * Reads the audit trail's "Name: key, key" snapshot of a role. Anything else
 * (older entries, "3 member(s) moved") comes back as null.
 */
export function parseRoleSnapshot(value: string | null): { name: string; permissions: string[] } | null {
  if (!value) {
    return null;
  }
  const at = value.lastIndexOf(': ');
  if (at <= 0) {
    return null;
  }
  const name = value.slice(0, at);
  const rest = value.slice(at + 2).trim();
  if (rest === '(no permissions)') {
    return { name, permissions: [] };
  }
  const permissions = rest.split(',').map((key) => key.trim()).filter(Boolean);
  // Keys look like `team.view`; a sentence after a colon is not a snapshot.
  if (permissions.length === 0 || !permissions.every((key) => /^[a-z]+(\.[a-z]+)+$/.test(key))) {
    return null;
  }
  return { name, permissions };
}

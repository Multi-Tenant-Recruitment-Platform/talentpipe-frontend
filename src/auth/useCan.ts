import { useCallback } from 'react';
import { useAuth } from './AuthContext';
import { can, type Permission } from './permissions';

/**
 * Permission predicate bound to the signed-in user.
 *
 * <pre>
 * const allow = useCan();
 * {allow('team.invite') && <InviteButton />}
 * </pre>
 *
 * <p>Deliberately a plain .ts module: keeping it free of JSX lets tests import
 * the permission logic without pulling in a component tree.</p>
 */
export function useCan(): (permission: Permission) => boolean {
  const { user } = useAuth();
  const role = user?.role ?? null;
  return useCallback((permission: Permission) => can(role, permission), [role]);
}

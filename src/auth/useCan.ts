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
  // The whole user, not just the role: a company member's permissions come
  // from their role's permission list, which a custom role's name says nothing about.
  return useCallback((permission: Permission) => can(user, permission), [user]);
}

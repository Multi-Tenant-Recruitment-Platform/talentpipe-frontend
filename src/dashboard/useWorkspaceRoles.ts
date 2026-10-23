import { useCallback, useEffect, useRef, useState } from 'react';
import { rolesApi } from '../api/roles';
import type { PermissionGroup, RoleResponse } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useCan } from '../auth/useCan';
import { describeRoleError } from './roleErrors';

/**
 * Role data for the team screens: the workspace's roles and the permission
 * catalogue. Writes are made by the page that performs them, which then hands
 * the server's copy back through `apply` / `drop`.
 */

/** Drops answers that arrive after a newer request or after unmount. */
function useLatest() {
  const latest = useRef(0);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return useCallback(() => {
    const ticket = ++latest.current;
    return () => mounted.current && ticket === latest.current;
  }, []);
}

interface RolesController {
  roles: RoleResponse[];
  /** True until the first answer arrives; false at once for someone who may not read roles. */
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Puts the server's copy of a created or changed role into the list. */
  apply: (role: RoleResponse) => void;
  drop: (id: string) => void;
}

/**
 * The workspace's roles, for anyone who may see the team. For everyone else
 * — and on a server older than company roles, where the permission never
 * arrives — this stays empty and idle rather than firing a request that can
 * only 403, so callers fall back to the fixed roles.
 */
export function useWorkspaceRoles(): RolesController {
  const { user } = useAuth();
  const allow = useCan();
  const canRead = allow('roles.view');
  const begin = useLatest();
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [loading, setLoading] = useState(canRead);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    const current = begin();
    try {
      const list = await rolesApi.list();
      if (current()) {
        setRoles(list);
        setError(null);
      }
    } catch (err: unknown) {
      if (current()) {
        setError(describeRoleError(err, 'load').message);
      }
    } finally {
      if (current()) {
        setLoading(false);
      }
    }
  }, [begin, canRead]);

  // Re-runs when the signed-in identity changes, so switching workspaces never
  // leaves the previous company's roles on screen.
  useEffect(() => {
    void refresh();
  }, [refresh, user?.id]);

  const apply = useCallback((role: RoleResponse) => {
    setRoles((current) =>
      current.some((existing) => existing.id === role.id)
        ? current.map((existing) => (existing.id === role.id ? role : existing))
        : [...current, role],
    );
  }, []);

  const drop = useCallback((id: string) => {
    setRoles((current) => current.filter((role) => role.id !== id));
  }, []);

  return { roles, loading, error, refresh, apply, drop };
}

interface CatalogueController {
  groups: PermissionGroup[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Every permission a role can hold, grouped as the editor lists them. */
export function usePermissionCatalogue(enabled = true): CatalogueController {
  const begin = useLatest();
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const current = begin();
    try {
      const catalogue = await rolesApi.permissions();
      if (current()) {
        setGroups(catalogue);
        setError(null);
      }
    } catch (err: unknown) {
      if (current()) {
        setError(describeRoleError(err, 'load').message);
      }
    } finally {
      if (current()) {
        setLoading(false);
      }
    }
  }, [begin, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { groups, loading, error, refresh };
}

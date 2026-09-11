/**
 * Per-tenant localStorage.
 *
 * <p>Anything cached about a workspace is written under
 * {@code talentpipe.tenant.<tenantId>.*}, so signing in as a different company
 * on the same device cannot surface the previous one's state. Callers get a
 * no-op store when there is no tenant (candidates), which keeps the call sites
 * free of null checks.</p>
 */

const NAMESPACE = 'talentpipe.tenant.';

const keyFor = (tenantId: string, name: string) => `${NAMESPACE}${tenantId}.${name}`;

export interface TenantStorage {
  get(name: string): string | null;
  set(name: string, value: string): void;
  remove(name: string): void;
}

export function tenantStorage(tenantId: string | null): TenantStorage {
  return {
    get: (name) => (tenantId ? localStorage.getItem(keyFor(tenantId, name)) : null),
    set: (name, value) => {
      if (tenantId) localStorage.setItem(keyFor(tenantId, name), value);
    },
    remove: (name) => {
      if (tenantId) localStorage.removeItem(keyFor(tenantId, name));
    },
  };
}

/**
 * Drops every namespaced entry that does not belong to the given tenant.
 * Called whenever the active tenant is stamped.
 *
 * <p>The refresh token (talentpipe.refreshToken) is deliberately out of scope:
 * it belongs to the session being established, not to the one being discarded.
 * Only tokenStore.clear() removes it.</p>
 *
 * @returns how many keys were evicted.
 */
export function purgeForeignTenantKeys(activeTenantId: string | null): number {
  const doomed: string[] = [];
  const prefix = activeTenantId ? `${NAMESPACE}${activeTenantId}.` : null;

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key?.startsWith(NAMESPACE)) continue;
    if (!prefix || !key.startsWith(prefix)) doomed.push(key);
  }

  doomed.forEach((key) => localStorage.removeItem(key));
  return doomed.length;
}

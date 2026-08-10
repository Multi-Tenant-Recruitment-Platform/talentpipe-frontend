import { purgeForeignTenantKeys } from '../utils/tenantStorage';

/** Fired when a response arrives for a workspace other than the active one. */
export const TENANT_MISMATCH_EVENT = 'talentpipe:tenant-mismatch';

export interface TenantMismatchDetail {
  expected: string;
  received: string;
  /** Request path, or 'storage' when another tab changed the active tenant. */
  path: string;
}

const ACTIVE_TENANT_KEY = 'talentpipe.activeTenantId';

/**
 * The workspace this tab is signed into.
 *
 * <p>The in-memory value is authoritative; localStorage is only a bootstrap
 * seed so the response interceptor has an answer before the startup refresh
 * resolves. That split matters for multi-tab: another tab signing into a
 * different company must not silently retarget this tab's guard — it must trip
 * it.</p>
 */
let current: string | null = null;
let hydrated = false;

export const activeTenant = {
  get(): string | null {
    if (!hydrated) {
      current = localStorage.getItem(ACTIVE_TENANT_KEY);
      hydrated = true;
    }
    return current;
  },

  /** Stamps the tenant and evicts any other tenant's cached state. */
  set(tenantId: string | null): void {
    const previous = activeTenant.get();
    current = tenantId;
    hydrated = true;

    if (tenantId) {
      localStorage.setItem(ACTIVE_TENANT_KEY, tenantId);
    } else {
      localStorage.removeItem(ACTIVE_TENANT_KEY);
    }

    if (previous !== tenantId) {
      purgeForeignTenantKeys(tenantId);
    }
  },

  clear(): void {
    activeTenant.set(null);
  },
};

export function reportTenantMismatch(detail: TenantMismatchDetail): void {
  window.dispatchEvent(new CustomEvent<TenantMismatchDetail>(TENANT_MISMATCH_EVENT, { detail }));
}

/**
 * Another tab signing into a different workspace ends this session too.
 * Surprising when testing two companies side by side, but it is exactly the
 * isolation guarantee: one tab must never keep rendering company A while the
 * shared token belongs to company B.
 *
 * @returns an unsubscribe function.
 */
export function watchCrossTabTenantChange(): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== ACTIVE_TENANT_KEY) return;
    const mine = current;
    if (mine && event.newValue && event.newValue !== mine) {
      reportTenantMismatch({ expected: mine, received: event.newValue, path: 'storage' });
    }
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

/** Test seam: forgets the hydrated in-memory value. */
export function resetActiveTenantForTests(): void {
  current = null;
  hydrated = false;
}

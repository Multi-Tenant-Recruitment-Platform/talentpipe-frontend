import type { AxiosResponse } from 'axios';
import { activeTenant, reportTenantMismatch } from '../tenant/activeTenant';

/**
 * Cross-tenant tripwire.
 *
 * <p>The backend derives the tenant from the access token and is the real
 * boundary. This is defence in depth: if a response ever arrives carrying a
 * different workspace's id, the client refuses it and ends the session rather
 * than rendering another company's data.</p>
 */

/** Container keys worth descending into — the DTO shapes we actually ship. */
const NESTED_KEYS = ['user', 'admin', 'tenant', 'content', 'data', 'items', 'results'] as const;
const MAX_DEPTH = 3;

export class TenantMismatchError extends Error {
  constructor(
    readonly expected: string,
    readonly received: string,
    readonly path: string,
  ) {
    super('Response belonged to a different workspace.');
    this.name = 'TenantMismatchError';
  }
}

/**
 * The first tenantId in the payload that is NOT the active tenant, or null
 * when the payload is clean.
 *
 * <p>Fails OPEN by design: a payload that carries no tenantId at all cannot be
 * judged, so it passes. This hardens a backend that <em>does</em> echo
 * tenantId; it must never break one that doesn't.</p>
 */
export function findForeignTenantId(
  payload: unknown,
  activeTenantId: string | null,
  depth = 0,
): string | null {
  if (!activeTenantId || depth > MAX_DEPTH || payload === null || typeof payload !== 'object') {
    return null;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const foreign = findForeignTenantId(item, activeTenantId, depth + 1);
      if (foreign) return foreign;
    }
    return null;
  }

  const record = payload as Record<string, unknown>;
  const own = record.tenantId;
  if (typeof own === 'string' && own !== activeTenantId) {
    return own;
  }

  for (const nested of NESTED_KEYS) {
    if (nested in record) {
      const foreign = findForeignTenantId(record[nested], activeTenantId, depth + 1);
      if (foreign) return foreign;
    }
  }
  return null;
}

/** Auth endpoints establish the tenant, so they cannot be judged against it. */
function isExempt(url: string | undefined): boolean {
  return !url || url.includes('/auth/');
}

export function tenantGuardInterceptor(response: AxiosResponse): AxiosResponse {
  const expected = activeTenant.get();
  if (!expected || isExempt(response.config.url)) {
    return response;
  }

  const received = findForeignTenantId(response.data, expected);
  if (!received) {
    return response;
  }

  const path = response.config.url ?? '';
  reportTenantMismatch({ expected, received, path });
  throw new TenantMismatchError(expected, received, path);
}

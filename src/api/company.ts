import { activeTenant } from '../tenant/activeTenant';
import { tenantStorage, type TenantStorage } from '../utils/tenantStorage';
import type { CompanyProfileResponse, UpdateCompanyProfileRequest } from './types';

/**
 * Company profile endpoints — the workspace's own details (PB-005 UI).
 *
 * <p><strong>No backend endpoint serves this yet.</strong> The API surface is
 * `/auth`, `/team`, `/public/candidates` and `/public/jobs`; there is no tenant
 * controller, and the `Tenant` entity has columns only for name, subdomain,
 * industry, plan tier and status. So the two calls below are served from
 * per-workspace `localStorage` — the screen, its validation and its states are
 * real, and the data survives a reload, but it never leaves the device.</p>
 *
 * <p><strong>When `GET /tenant` and `PATCH /tenant` land</strong>, the whole
 * swap is inside this file: `get` becomes
 * `(await api.get<CompanyProfileResponse>('/tenant')).data`, `update` becomes
 * `(await api.patch<CompanyProfileResponse>('/tenant', request)).data`, the
 * `seed` argument is dropped at the one call site, and the draft store below is
 * deleted. Nothing above the API layer changes, because nothing above it knows
 * where the profile comes from. Tenant scope is never sent — the backend takes
 * it from the access token, exactly as `team.ts` does.</p>
 */

/** Where the draft lives, namespaced per workspace by {@link tenantStorage}. */
const DRAFT_KEY = 'company.profile';

/**
 * Draft-only: enough delay for the loading and saving states to be real rather
 * than theoretical. The network will supply its own once the endpoint exists.
 */
const LATENCY_MS = 220;

/**
 * Identity the draft store cannot invent: the company name and subdomain come
 * from the session (`UserResponse.tenantName` / `tenantSubdomain`).
 *
 * <p>The real `GET /tenant` reads all of this from the access token, so this
 * argument disappears with the draft store.</p>
 */
export interface CompanyProfileSeed {
  name?: string | null;
  subdomain?: string | null;
}

/** Exactly the editable fields, plus when they were last written. */
interface StoredDraft extends UpdateCompanyProfileRequest {
  updatedAt: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function readDraft(store: TenantStorage): StoredDraft | null {
  try {
    const raw = store.get(DRAFT_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    // Hand-edited or written by an older shape: discard rather than crash the
    // settings page on a field that is suddenly a number.
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as StoredDraft)
      : null;
  } catch {
    return null;
  }
}

/** Assembles the response the endpoint will eventually return. */
function toResponse(
  tenantId: string | null,
  seed: CompanyProfileSeed,
  draft: StoredDraft | null,
): CompanyProfileResponse {
  return {
    id: tenantId ?? 'draft-tenant',
    // An edited name wins over the session's copy — it is the newer of the two.
    name: draft?.name ?? seed.name ?? '',
    subdomain: seed.subdomain ?? '',
    industry: draft?.industry ?? null,
    size: draft?.size ?? null,
    email: draft?.email ?? null,
    phone: draft?.phone ?? null,
    website: draft?.website ?? null,
    address: draft?.address ?? null,
    description: draft?.description ?? null,
    // Fixed until a billing endpoint exists; the entity defaults match these.
    planTier: 'STANDARD',
    status: 'ACTIVE',
    updatedAt: draft?.updatedAt ?? null,
  };
}

export const companyApi = {
  /** The signed-in workspace's profile. */
  async get(seed: CompanyProfileSeed = {}): Promise<CompanyProfileResponse> {
    await sleep(LATENCY_MS);
    const tenantId = activeTenant.get();
    return toResponse(tenantId, seed, readDraft(tenantStorage(tenantId)));
  },

  /** Replaces the editable fields and returns the profile as now stored. */
  async update(
    request: UpdateCompanyProfileRequest,
    seed: CompanyProfileSeed = {},
  ): Promise<CompanyProfileResponse> {
    await sleep(LATENCY_MS);
    const tenantId = activeTenant.get();
    const draft: StoredDraft = { ...request, updatedAt: new Date().toISOString() };
    try {
      tenantStorage(tenantId).set(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Quota, or a privacy mode that blocks writes. The caller still gets the
      // saved profile back, so the screen stays truthful for this session — and
      // once this is a real PATCH, persistence stops being the client's problem.
    }
    return toResponse(tenantId, seed, draft);
  },
};

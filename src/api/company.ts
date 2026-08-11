import { activeTenant } from '../tenant/activeTenant';
import { tenantStorage, type TenantStorage } from '../utils/tenantStorage';
import type {
  CompanyImageKind,
  CompanyProfileResponse,
  UpdateCompanyProfileRequest,
} from './types';

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
 * <p><strong>Integration points for the API developer.</strong> Four calls,
 * and the swap is confined to this file — nothing above the API layer knows or
 * cares where a profile comes from:</p>
 *
 * <ul>
 *   <li>{@link companyApi.get} → `GET /tenant`, returning
 *       {@link CompanyProfileResponse}. Drop the `seed` argument at its one
 *       call site (`useCompanyProfile`) once the response carries the name and
 *       subdomain itself.</li>
 *   <li>{@link companyApi.update} → `PATCH /tenant` with
 *       {@link UpdateCompanyProfileRequest}, returning the saved profile.</li>
 *   <li>{@link companyApi.uploadImage} → `POST /tenant/logo` or
 *       `/tenant/cover` as `multipart/form-data`, returning the stored image's
 *       URL.</li>
 *   <li>{@link companyApi.removeImage} → `DELETE` on the same two paths.</li>
 * </ul>
 *
 * <p>Tenant scope is never sent — the backend takes it from the access token,
 * exactly as `team.ts` does. The URLs above are a proposal, not a commitment:
 * match whatever the backend actually ships.</p>
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

/** Exactly the editable fields, plus the images and when they were written. */
interface StoredDraft extends UpdateCompanyProfileRequest {
  updatedAt: string;
  /** Data URLs while this is a draft; real URLs once the endpoints exist. */
  logoUrl?: string | null;
  coverImageUrl?: string | null;
}

/** Which stored field each image kind writes to. */
const IMAGE_FIELD: Record<CompanyImageKind, 'logoUrl' | 'coverImageUrl'> = {
  logo: 'logoUrl',
  cover: 'coverImageUrl',
};

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

function writeDraft(store: TenantStorage, draft: StoredDraft): void {
  try {
    store.set(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Quota — an inlined logo is the likely culprit — or a privacy mode that
    // blocks writes. The caller still gets the saved profile back, so the
    // screen stays truthful for this session; once these are real requests,
    // persistence stops being the client's problem at all.
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
    logoUrl: draft?.logoUrl ?? null,
    coverImageUrl: draft?.coverImageUrl ?? null,
    industry: draft?.industry ?? null,
    size: draft?.size ?? null,
    description: draft?.description ?? null,
    culture: draft?.culture ?? null,
    benefits: draft?.benefits ?? [],
    email: draft?.email ?? null,
    phone: draft?.phone ?? null,
    website: draft?.website ?? null,
    linkedinUrl: draft?.linkedinUrl ?? null,
    facebookUrl: draft?.facebookUrl ?? null,
    twitterUrl: draft?.twitterUrl ?? null,
    address: draft?.address ?? null,
    city: draft?.city ?? null,
    country: draft?.country ?? null,
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
    const store = tenantStorage(tenantId);
    // Carry the logo across: it is written by its own call, and a text save
    // must never be the thing that erases it.
    const existing = readDraft(store);
    const draft: StoredDraft = {
      ...request,
      // Carry the images across: they are written by their own calls, and a
      // text save must never be the thing that erases them.
      logoUrl: existing?.logoUrl ?? null,
      coverImageUrl: existing?.coverImageUrl ?? null,
      updatedAt: new Date().toISOString(),
    };
    writeDraft(store, draft);
    return toResponse(tenantId, seed, draft);
  },

  /**
   * Stores the logo or the cover image and returns the URL it can be fetched
   * from.
   *
   * <p>Draft behaviour: the file is inlined as a data URL, so the preview the
   * admin approved is exactly what is shown afterwards. The real endpoint
   * takes `multipart/form-data` and returns a URL — same signature, so no
   * caller changes.</p>
   */
  async uploadImage(kind: CompanyImageKind, file: File): Promise<string> {
    await sleep(LATENCY_MS);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('That image could not be read.'));
      reader.readAsDataURL(file);
    });

    const store = tenantStorage(activeTenant.get());
    const existing = readDraft(store);
    if (existing) {
      writeDraft(store, { ...existing, [IMAGE_FIELD[kind]]: dataUrl });
    }
    return dataUrl;
  },

  /** Drops a stored image. Idempotent, like the DELETE it will become. */
  async removeImage(kind: CompanyImageKind): Promise<void> {
    await sleep(LATENCY_MS);
    const store = tenantStorage(activeTenant.get());
    const existing = readDraft(store);
    if (existing) {
      writeDraft(store, { ...existing, [IMAGE_FIELD[kind]]: null });
    }
  },
};

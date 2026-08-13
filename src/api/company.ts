import { api } from './client';
import type {
  CompanyImageKind,
  CompanyProfileResponse,
  UpdateCompanyProfileRequest,
} from './types';

/**
 * Company profile endpoints — the workspace's own details (PB-005).
 *
 * <p>Tenant scope is never sent: the backend derives it from the access token,
 * exactly as `team.ts` does. There is no path or body field naming a company,
 * so there is no request shape that could reach another one.</p>
 *
 * <p>Reading is open to every member of the workspace; every write is
 * COMPANY_ADMIN only and answers 403 otherwise. The two images have their own
 * endpoints because they are `multipart/form-data`, and because keeping them
 * separate means a text save can never be the thing that erases a logo.</p>
 */

/** Which response field carries the stored URL for each image kind. */
const IMAGE_URL_FIELD: Record<CompanyImageKind, 'logoUrl' | 'coverImageUrl'> = {
  logo: 'logoUrl',
  cover: 'coverImageUrl',
};

export const companyApi = {
  /** The signed-in workspace's profile. */
  async get(): Promise<CompanyProfileResponse> {
    const { data } = await api.get<CompanyProfileResponse>('/tenant');
    return data;
  },

  /**
   * Replaces the editable fields and returns the profile as now stored.
   *
   * <p>Full replacement, not a sparse patch: the form always submits its
   * complete editable set, so a null means "cleared". The images are absent
   * from the request and are left untouched by the server.</p>
   */
  async update(request: UpdateCompanyProfileRequest): Promise<CompanyProfileResponse> {
    const { data } = await api.patch<CompanyProfileResponse>('/tenant', request);
    return data;
  },

  /**
   * Stores the logo or the cover image and returns the URL to fetch it from.
   *
   * <p>The URL is served by a public endpoint and carries a version derived
   * from the profile's `updatedAt`, so replacing an image yields a new URL and
   * the browser cannot show a cached copy of the previous one. Public because
   * an `<img>` tag cannot attach an Authorization header — and these images are
   * candidate-facing on job adverts regardless.</p>
   */
  async uploadImage(kind: CompanyImageKind, file: File): Promise<string> {
    const form = new FormData();
    form.append('file', file);
    // Content-Type is deliberately unset: the browser has to add the multipart
    // boundary itself, and naming the type here would omit it.
    const { data } = await api.post<CompanyProfileResponse>(`/tenant/${kind}`, form);
    return data[IMAGE_URL_FIELD[kind]] ?? '';
  },

  /** Drops a stored image. Idempotent — removing an absent image succeeds. */
  async removeImage(kind: CompanyImageKind): Promise<void> {
    await api.delete(`/tenant/${kind}`);
  },
};

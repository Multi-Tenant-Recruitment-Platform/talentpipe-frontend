import { api } from './client';
import type {
  JobVacancyRequest,
  JobVacancyResponse,
  JobVacancyUpdateRequest,
  PageResponse,
} from './types';

/**
 * Job vacancy endpoints (PB-011, PB-018 → PB-022).
 *
 * <p>The full contract the backend implements — paths, roles, status codes and
 * the state machine — is written down in `docs/backend/job-vacancies-api.md`.
 * Keep the two in step: this file is the client half of that document.</p>
 *
 * <p>Tenant scope is never sent — the backend derives it from the access token,
 * exactly as `team.ts` and `company.ts` do. A vacancy belonging to another
 * workspace answers 404, indistinguishable from one that does not exist.</p>
 *
 * <p>There is deliberately no `saveDraft`. A draft is not a different
 * resource, it is a vacancy whose `status` is `DRAFT`, so it travels through
 * {@link jobsApi.create} like any other.</p>
 *
 * <p>Lifecycle moves are verbs on the resource (`/publish`, `/close`,
 * `/archive`) rather than a status field on PUT. Each move has its own rule —
 * publishing re-validates the whole vacancy, closing stops applications — and a
 * dedicated endpoint is where that rule can live without a PUT having to guess
 * which kind of edit it is looking at.</p>
 */

/** The backend caps page size; asking for its maximum keeps round trips few. */
const PAGE_SIZE = 100;

/**
 * Safety valve on the page walk. 50 pages of 100 is far past any workspace this
 * screen is built for; past it, the list is wrong in a way a bigger loop would
 * only hide, and server-side filtering is the fix (see the contract doc).
 */
const MAX_PAGES = 50;

export const jobsApi = {
  /**
   * Every vacancy in the workspace, archived included, newest first.
   *
   * <p>Walks the pages rather than asking for one: the list screen filters,
   * counts and sorts client-side — the same arrangement as the team roster — so
   * it needs the whole set, and the segment counts would lie if it only had the
   * first page of it.</p>
   */
  async list(): Promise<JobVacancyResponse[]> {
    const all: JobVacancyResponse[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const { data } = await api.get<PageResponse<JobVacancyResponse>>('/jobs', {
        params: { page, size: PAGE_SIZE },
      });
      all.push(...data.content);
      if (page + 1 >= data.totalPages) {
        break;
      }
    }
    return all;
  },

  /** One vacancy. 404 when it does not exist or belongs to another workspace. */
  async get(id: string): Promise<JobVacancyResponse> {
    const { data } = await api.get<JobVacancyResponse>(`/jobs/${encodeURIComponent(id)}`);
    return data;
  },

  /** Files a new vacancy, as a DRAFT or straight to PUBLISHED. */
  async create(request: JobVacancyRequest): Promise<JobVacancyResponse> {
    const { data } = await api.post<JobVacancyResponse>('/jobs', request);
    return data;
  },

  /**
   * Replaces a vacancy's content. Status is untouched.
   *
   * <p>409 when `version` is stale (someone else saved first); 422 when the
   * vacancy is CLOSED or ARCHIVED, or when it is PUBLISHED and the edit would
   * leave a required field empty.</p>
   */
  async update(id: string, request: JobVacancyUpdateRequest): Promise<JobVacancyResponse> {
    const { data } = await api.put<JobVacancyResponse>(`/jobs/${encodeURIComponent(id)}`, request);
    return data;
  },

  /** DRAFT → PUBLISHED. 422 if the vacancy is incomplete or its deadline has passed. */
  async publish(id: string): Promise<JobVacancyResponse> {
    const { data } = await api.post<JobVacancyResponse>(`/jobs/${encodeURIComponent(id)}/publish`);
    return data;
  },

  /** PUBLISHED → CLOSED. New applications stop; received ones are kept. */
  async close(id: string): Promise<JobVacancyResponse> {
    const { data } = await api.post<JobVacancyResponse>(`/jobs/${encodeURIComponent(id)}/close`);
    return data;
  },

  /** CLOSED → ARCHIVED. Leaves the active lists; kept for reporting. */
  async archive(id: string): Promise<JobVacancyResponse> {
    const { data } = await api.post<JobVacancyResponse>(`/jobs/${encodeURIComponent(id)}/archive`);
    return data;
  },
};

import { api } from './client';
import type { JobVacancyRequest, JobVacancyResponse, PageResponse } from './types';

/**
 * Job vacancy endpoints (PB-011).
 *
 * <p>PROPOSED CONTRACT — nothing calls these yet. The Job module does not exist
 * on the backend, so the vacancy screens run against the fixture-backed store
 * in `src/dashboard/useJobVacancies.ts`, the same arrangement the overview and
 * pipeline pages use with `src/data/mockDashboard.ts`. This file exists so that
 * wiring the real module is a change to that one hook: the request and response
 * shapes, the pagination envelope and the tenant-scoping rule are already
 * settled here.</p>
 *
 * <p>Tenant scope is never sent — the backend derives it from the access token,
 * exactly as `team.ts` and `company.ts` do.</p>
 *
 * <p>There is deliberately no `saveDraft`. A draft is not a different
 * resource, it is a vacancy whose `status` is `DRAFT`, so it travels through
 * {@link jobsApi.create} like any other. A second endpoint doing the same POST
 * with one field pre-set would be two names for one thing, and the first one to
 * gain a field the other lacks would start the divergence.</p>
 */
export const jobsApi = {
  /** Every vacancy in the workspace, drafts included. */
  async list(): Promise<JobVacancyResponse[]> {
    const { data } = await api.get<PageResponse<JobVacancyResponse>>('/jobs');
    return data.content;
  },

  /** Files a new vacancy and returns it as now stored. */
  async create(request: JobVacancyRequest): Promise<JobVacancyResponse> {
    const { data } = await api.post<JobVacancyResponse>('/jobs', request);
    return data;
  },
};

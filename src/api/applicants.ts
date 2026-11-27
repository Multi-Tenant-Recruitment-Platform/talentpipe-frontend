import { api } from './client';
import type { ApplicantPage, ApplicantReview, ApplicantSummary, ApplicantVacancy } from './types';

/** Which applicants the list shows; `all` includes pending and withdrawn ones. */
export type ApplicantBand = 'all' | 'auto' | 'manual' | 'rejected';

/** `default`: advanced, then manual review, then pending, then rejected — highest score first within each. */
export type ApplicantSort = 'default' | 'score' | 'appliedAt' | 'name';

export interface ApplicantQuery {
  band: ApplicantBand;
  /** Part of a name or email; ignored by the server in blind mode. */
  q: string;
  sort: ApplicantSort;
  direction?: 'asc' | 'desc';
  page: number;
  size: number;
}

/**
 * A vacancy's applicants, for the recruiter's dashboard.
 *
 * <p>Tenant scope is never sent: the backend derives it from the access token.
 * A vacancy the caller may not see — another workspace's, or one they don't
 * work on without permission to see every applicant — answers 404.</p>
 */
export const applicantsApi = {
  /** One ranked, filtered page, with the counts per group and the vacancy's thresholds. */
  async list(jobId: string, query: ApplicantQuery, signal?: AbortSignal): Promise<ApplicantPage> {
    const { data } = await api.get<ApplicantPage>(`/jobs/${encodeURIComponent(jobId)}/applicants`, {
      params: {
        band: query.band,
        ...(query.q.trim() ? { q: query.q.trim() } : {}),
        sort: query.sort,
        ...(query.direction ? { direction: query.direction } : {}),
        page: query.page,
        size: query.size,
      },
      signal,
    });
    return data;
  },

  /** The counts and when anything last changed — cheap, for polling. */
  async summary(jobId: string, signal?: AbortSignal): Promise<ApplicantSummary> {
    const { data } = await api.get<ApplicantSummary>(`/jobs/${encodeURIComponent(jobId)}/applicants/summary`, {
      signal,
    });
    return data;
  },

  /** The vacancies whose applicants the caller may review, with their counts. Archived ones are never listed. */
  async vacancies(status: ApplicantVacancyStatus, signal?: AbortSignal): Promise<ApplicantVacancy[]> {
    const { data } = await api.get<ApplicantVacancy[]>('/applicants/vacancies', { params: { status }, signal });
    return data;
  },

  /** One application in full: the candidate, the score and why, the stages, the history. */
  async review(applicationId: string, signal?: AbortSignal): Promise<ApplicantReview> {
    const { data } = await api.get<ApplicantReview>(`/applications/${encodeURIComponent(applicationId)}/review`, {
      signal,
    });
    return data;
  },

  /**
   * Sends an applicant waiting for manual review to the vacancy's interview
   * stage. `version` is the one on screen: if someone else changed the
   * application since, the server refuses with 409.
   */
  async advanceToInterview(applicationId: string, version: number): Promise<ApplicantReview> {
    const { data } = await api.post<ApplicantReview>(
      `/applications/${encodeURIComponent(applicationId)}/advance-to-interview`,
      { version },
    );
    return data;
  },

  /**
   * The CV the candidate applied with, as a file. Fetched through the shared
   * client because the access token lives in memory: an `<iframe src>` or a
   * plain link could not send it.
   */
  async cv(applicationId: string, disposition: 'inline' | 'attachment', signal?: AbortSignal): Promise<Blob> {
    const { data } = await api.get<Blob>(`/applications/${encodeURIComponent(applicationId)}/cv`, {
      params: { disposition },
      responseType: 'blob',
      signal,
    });
    return data;
  },
};

/** Live roles, or closed ones whose applicants may still be under review. */
export type ApplicantVacancyStatus = 'published' | 'closed';

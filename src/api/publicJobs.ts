import axios from 'axios';
import { MOCK_PUBLIC_JOBS } from '../data/mockPublicJobs';
import { NO_FILTERS, boardFacets, filterJobs, toBoardParams, type JobFilters } from '../jobs/jobFilters';
import { jobUrlKey } from '../jobs/jobPaths';
import { api } from './client';
import type { JobDetail, JobFilterOptions, JobSummary, PageResponse } from './types';

const PUBLIC_JOBS_PAGE_SIZE = 20;

/**
 * Opt-in only: the fixture is used when VITE_PUBLIC_JOBS_SOURCE=mock, never as
 * a fallback when the live request fails.
 */
const USE_MOCK = import.meta.env.VITE_PUBLIC_JOBS_SOURCE === 'mock';

const MOCK_LATENCY_MS = 400;
const delay = () => new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));

/**
 * What the board is searching for: the words and place typed into the search
 * bar, and every filter beside it. Each part is optional; anything missing is
 * "any".
 */
export type PublicJobQuery = Partial<JobFilters>;

/**
 * Published vacancies only; the backend decides what is publicly visible.
 * The search and every filter run in the database, over every published
 * vacancy, so a match is found whichever page it would otherwise have been
 * on. Whatever is at its default is left out of the request (see
 * `toBoardParams`), so an unfiltered request stays the plain board.
 */
export async function listPublicJobs(
  page = 0,
  query: PublicJobQuery = {},
  size = PUBLIC_JOBS_PAGE_SIZE,
): Promise<PageResponse<JobSummary>> {
  if (USE_MOCK) {
    await delay();
    const matches = filterJobs(MOCK_PUBLIC_JOBS, { ...NO_FILTERS, ...query });
    return {
      content: matches.slice(page * size, (page + 1) * size),
      page,
      size,
      totalElements: matches.length,
      totalPages: Math.ceil(matches.length / size),
    };
  }
  const { data } = await api.get<PageResponse<JobSummary>>('/public/jobs', {
    params: { page, size, ...toBoardParams(query) },
  });
  return data;
}

/**
 * What the board can be filtered by right now — the industries, job types,
 * workplaces and salary spans of the published jobs, each with how many hold
 * it. Endpoint: GET /api/v1/public/jobs/filters.
 */
export async function getPublicJobFilters(): Promise<JobFilterOptions> {
  if (USE_MOCK) {
    await delay();
    return boardFacets(MOCK_PUBLIC_JOBS);
  }
  const { data } = await api.get<JobFilterOptions>('/public/jobs/filters');
  return data;
}

/**
 * One published vacancy by the name in its link (see jobUrlKey), or null when
 * it does not exist or is not public. The backend accepts the slug or the id.
 */
export async function getPublicJob(slug: string): Promise<JobDetail | null> {
  if (USE_MOCK) {
    await delay();
    return MOCK_PUBLIC_JOBS.find((job) => jobUrlKey(job) === slug) ?? null;
  }
  try {
    const { data } = await api.get<JobDetail>(`/public/jobs/${encodeURIComponent(slug)}`);
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

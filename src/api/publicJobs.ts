import axios from 'axios';
import { MOCK_PUBLIC_JOBS } from '../data/mockPublicJobs';
import { NO_FILTERS, filterJobs } from '../jobs/jobFilters';
import { jobUrlKey } from '../jobs/jobPaths';
import { api } from './client';
import type { JobDetail, JobSummary, PageResponse } from './types';

export const PUBLIC_JOBS_PAGE_SIZE = 20;

/**
 * Opt-in only: the fixture is used when VITE_PUBLIC_JOBS_SOURCE=mock, never as
 * a fallback when the live request fails.
 */
const USE_MOCK = import.meta.env.VITE_PUBLIC_JOBS_SOURCE === 'mock';

const MOCK_LATENCY_MS = 400;
const delay = () => new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));

/** What the backend searches by. Blank means "do not narrow by this". */
export interface PublicJobSearch {
  /** Matched against title, skills, summary and description, ranked by relevance. */
  keyword?: string;
  /** Matched anywhere in the vacancy's location, ignoring case. */
  location?: string;
}

/**
 * Published vacancies only; the backend decides what is publicly visible.
 * The search runs in the database, over every published vacancy, so a match
 * is found whichever page it would otherwise have been on.
 */
export async function listPublicJobs(
  page = 0,
  { keyword = '', location = '' }: PublicJobSearch = {},
  size = PUBLIC_JOBS_PAGE_SIZE,
): Promise<PageResponse<JobSummary>> {
  if (USE_MOCK) {
    await delay();
    const matches = filterJobs(MOCK_PUBLIC_JOBS, { ...NO_FILTERS, keyword, location });
    return {
      content: matches.slice(page * size, (page + 1) * size),
      page,
      size,
      totalElements: matches.length,
      totalPages: Math.ceil(matches.length / size),
    };
  }
  const { data } = await api.get<PageResponse<JobSummary>>('/public/jobs', {
    // Left out rather than sent empty, so an unfiltered request stays the plain board.
    params: { page, size, ...(keyword && { q: keyword }), ...(location && { location }) },
  });
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

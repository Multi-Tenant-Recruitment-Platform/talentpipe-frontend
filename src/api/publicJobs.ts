import axios from 'axios';
import { MOCK_PUBLIC_JOBS } from '../data/mockPublicJobs';
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

/** Published vacancies only; the backend decides what is publicly visible. */
export async function listPublicJobs(page = 0, size = PUBLIC_JOBS_PAGE_SIZE): Promise<PageResponse<JobSummary>> {
  if (USE_MOCK) {
    await delay();
    const content = MOCK_PUBLIC_JOBS.slice(page * size, (page + 1) * size);
    return {
      content,
      page,
      size,
      totalElements: MOCK_PUBLIC_JOBS.length,
      totalPages: Math.ceil(MOCK_PUBLIC_JOBS.length / size),
    };
  }
  const { data } = await api.get<PageResponse<JobSummary>>('/public/jobs', { params: { page, size } });
  return data;
}

/**
 * One published vacancy by the name in its link (see jobUrlKey), or null when
 * it does not exist or is not public.
 * ASSUMPTION: GET /public/jobs/{slug} is not implemented by the backend yet.
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

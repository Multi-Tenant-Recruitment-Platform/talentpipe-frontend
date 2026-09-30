import { api } from './client';
import type { JobApplicationRequest, JobApplicationResponse } from './types';

/** Follows the public job board: mock jobs can only be applied to in mock mode. */
const USE_MOCK = import.meta.env.VITE_PUBLIC_JOBS_SOURCE === 'mock';

const MOCK_LATENCY_MS = 800;

/**
 * Submits an application for one vacancy.
 * ASSUMPTION: POST /public/jobs/{id}/applications is a placeholder until the
 * application API (PB-019) exists; the backend is expected to reject duplicates.
 */
export async function submitApplication(jobId: string, request: JobApplicationRequest): Promise<JobApplicationResponse> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
    return { id: crypto.randomUUID(), jobId, status: 'SUBMITTED', submittedAt: new Date().toISOString() };
  }
  const { data } = await api.post<JobApplicationResponse>(`/public/jobs/${encodeURIComponent(jobId)}/applications`, request);
  return data;
}

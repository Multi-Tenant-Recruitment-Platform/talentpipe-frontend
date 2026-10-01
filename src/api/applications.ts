import { api } from './client';
import type { JobApplicationRequest, JobApplicationResponse } from './types';

/** Follows the public job board: mock jobs can only be applied to in mock mode. */
const USE_MOCK = import.meta.env.VITE_PUBLIC_JOBS_SOURCE === 'mock';

const MOCK_LATENCY_MS = 800;

/**
 * Submits an application for one vacancy: the answers as a JSON `application`
 * part and the CV as a `resume` file part.
 * ASSUMPTION: POST /public/jobs/{id}/applications is a placeholder until the
 * application API (PB-019) exists; the backend is expected to reject duplicates.
 */
export async function submitApplication(
  jobId: string,
  request: JobApplicationRequest,
  resume: File,
): Promise<JobApplicationResponse> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
    return { id: crypto.randomUUID(), jobId, status: 'SUBMITTED', submittedAt: new Date().toISOString() };
  }
  const body = new FormData();
  body.append('application', new Blob([JSON.stringify(request)], { type: 'application/json' }));
  body.append('resume', resume);
  const { data } = await api.post<JobApplicationResponse>(`/public/jobs/${encodeURIComponent(jobId)}/applications`, body);
  return data;
}

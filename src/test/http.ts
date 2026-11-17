import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { JobVacancyRequest, JobVacancyResponse, PipelineTemplate } from '../api/types';

/** A rejection in the plain `{ isAxiosError: true, response }` shape that `axios.isAxiosError` checks. */
export const axiosError = (status: number, message = 'boom') => ({
  isAxiosError: true,
  response: { status, data: { message } },
});

const timestamp = '2026-01-01T00:00:00Z';
const template: PipelineTemplate = {
  id: 'pipeline-standard', name: 'Standard Engineering', description: 'Screening and one interview round',
  defaultAutoThreshold: 80, defaultManualThreshold: 70, idealMatchingEnabled: false, blindModeEnabled: true,
  status: 'ACTIVE', stageCount: 4, interviewRoundCount: 1,
  createdAt: timestamp, updatedAt: timestamp, archivedAt: null,
  stages: [
    { id: 'stage-application', position: 0, stageType: 'POST_APPLICATION', name: 'Application', benchmark: null },
    { id: 'stage-screening', position: 1, stageType: 'SCREENING', name: 'Screening', benchmark: null },
    { id: 'stage-interview', position: 2, stageType: 'INTERVIEW', name: 'Interview', benchmark: 70 },
    { id: 'stage-onboard', position: 3, stageType: 'ONBOARD', name: 'Onboard', benchmark: null },
  ],
};
const vacancies = new Map<string, JobVacancyResponse>();

/** Clear persisted mock jobs between tests. */
export function resetMockData() {
  vacancies.clear();
}

const notFound = (path: string) => HttpResponse.json({
  timestamp: new Date().toISOString(), status: 404, error: 'Not Found',
  code: 'NOT_FOUND', message: 'Resource not found', path,
}, { status: 404 });

/** Shared handlers for the local test harness; individual tests may override them. */
export const handlers = [
  http.get('*/api/v1/pipeline-templates', ({ request }) => {
    const query = new URL(request.url).searchParams;
    const page = Math.max(0, Number(query.get('page')) || 0);
    const size = Math.min(100, Math.max(1, Number(query.get('size')) || 20));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { stages: _stages, ...summary } = template;
    const matches = template.name.toLowerCase().includes((query.get('search') ?? '').toLowerCase());
    const rows = matches ? [summary] : [];
    return HttpResponse.json({ content: rows.slice(page * size, (page + 1) * size),
      page, size, totalElements: rows.length, totalPages: Math.ceil(rows.length / size) });
  }),
  http.get('*/api/v1/pipeline-templates/:id', ({ params, request }) =>
    params.id === template.id ? HttpResponse.json(template) : notFound(new URL(request.url).pathname)),
  http.post('*/api/v1/jobs', async ({ request }) => {
    const body = await request.json() as JobVacancyRequest;
    if (body.recruitmentPipelineId && body.recruitmentPipelineId !== template.id) {
      return notFound(new URL(request.url).pathname);
    }
    const selected = body.recruitmentPipelineId ? template : null;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const job: JobVacancyResponse = {
      ...body, id, version: 0, createdAt: now, updatedAt: now,
      publishedAt: body.status === 'PUBLISHED' ? now : null,
      closedAt: null, archivedAt: null, applicantCount: 0,
      recruitmentPipelineName: selected?.name ?? null,
      autoThreshold: body.autoThreshold ?? selected?.defaultAutoThreshold ?? null,
      manualThreshold: body.manualThreshold ?? selected?.defaultManualThreshold ?? null,
      idealMatchingEnabled: body.idealMatchingEnabled ?? selected?.idealMatchingEnabled ?? false,
      blindModeEnabled: body.blindModeEnabled ?? selected?.blindModeEnabled ?? false,
      stages: selected?.stages.map((stage) => ({ ...stage, id: crypto.randomUUID(), jobId: id })) ?? [],
    };
    vacancies.set(id, job);
    return HttpResponse.json(job, { status: 201 });
  }),
  http.get('*/api/v1/jobs/:id/stages', ({ params, request }) => {
    const job = vacancies.get(String(params.id));
    return job ? HttpResponse.json(job.stages) : notFound(new URL(request.url).pathname);
  }),
];

export const server = setupServer(...handlers);

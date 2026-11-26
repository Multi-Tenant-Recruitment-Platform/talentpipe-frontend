import { describe, expect, it } from 'vitest';
import { jobsApi } from '../api/jobs';
import { pipelineTemplatesApi } from '../api/pipelineTemplates';
import { makeVacancy } from './vacancyFixtures';

describe('job creation MSW harness', () => {
  it('lists templates, creates a job with defaults, and reads its stage snapshots', async () => {
    const templates = await pipelineTemplatesApi.list();
    expect(templates).toHaveLength(1);
    const template = await pipelineTemplatesApi.get(templates[0].id);
    const job = await jobsApi.create({ ...makeVacancy(),
      pipelineTemplateId: template.id, status: 'DRAFT',
    });
    expect(job.id).not.toBe('v-1');
    expect(job.publishedAt).toBeNull();
    expect(job.autoThreshold).toBe(template.defaultAutoThreshold);
    const stages = await jobsApi.stages(job.id);
    expect(stages).toHaveLength(template.stageCount);
    expect(stages.map((stage) => stage.position)).toEqual([0, 1, 2, 3]);
    expect(stages[0]).toMatchObject({ jobId: job.id, stageType: 'POST_APPLICATION' });
    expect(stages[0].id).not.toBe(template.stages[0].id);
  });

  it('honours overrides and template search and pagination', async () => {
    expect(await pipelineTemplatesApi.list({ search: 'missing' })).toEqual([]);
    const job = await jobsApi.create({ ...makeVacancy(),
      pipelineTemplateId: 'pipeline-standard', autoThreshold: 90,
      manualThreshold: 75, blindModeEnabled: true,
    });
    expect(job).toMatchObject({ autoThreshold: 90, manualThreshold: 75, blindModeEnabled: true });
    expect(job.publishedAt).not.toBeNull();
  });

  it('returns 404 for unknown templates and jobs', async () => {
    await expect(jobsApi.create({ ...makeVacancy(), pipelineTemplateId: 'missing' }))
      .rejects.toMatchObject({ response: { status: 404 } });
    await expect(jobsApi.stages('missing/id'))
      .rejects.toMatchObject({ response: { status: 404 } });
  });
});

/**
 * The harness must refuse what the real `POST /api/v1/jobs` refuses (BUG-03):
 * tests run against it, so a mock that accepts a job the server rejects lets a
 * broken form pass.
 */
describe('job creation MSW harness — the refusals the real API makes', () => {
  it.each([
    ['left out', undefined],
    ['null', null],
    ['blank', ''],
  ])('answers 400 with the field error for a template that is %s', async (_case, pipelineTemplateId) => {
    const body = { ...makeVacancy(), status: 'DRAFT' as const, pipelineTemplateId: pipelineTemplateId as string };

    await expect(jobsApi.create(body)).rejects.toMatchObject({
      response: {
        status: 400,
        data: {
          code: 'VALIDATION_FAILED',
          message: 'pipelineTemplateId: Pipeline template is required.',
          fieldErrors: [{ field: 'pipelineTemplateId', message: 'Pipeline template is required.' }],
        },
      },
    });
  });

  it('reports every invalid field at once, sorted as the real API sorts them', async () => {
    const body = { ...makeVacancy(), status: 'DRAFT' as const, pipelineTemplateId: '', autoThreshold: 101 };

    await expect(jobsApi.create(body)).rejects.toMatchObject({
      response: {
        status: 400,
        data: {
          fieldErrors: [
            { field: 'autoThreshold', message: 'Set the auto threshold between 0 and 100.' },
            { field: 'pipelineTemplateId', message: 'Pipeline template is required.' },
          ],
        },
      },
    });
  });

  it('answers 422 when the thresholds end up out of order against the template’s defaults', async () => {
    // The template's auto threshold is 80: overriding only the manual one can still break the order.
    const body = {
      ...makeVacancy(), status: 'DRAFT' as const,
      pipelineTemplateId: 'pipeline-standard', autoThreshold: null, manualThreshold: 85,
    };

    await expect(jobsApi.create(body)).rejects.toMatchObject({
      response: {
        status: 422,
        data: { code: 'BUSINESS_RULE', message: 'The manual threshold must be lower than the auto threshold.' },
      },
    });
  });
});

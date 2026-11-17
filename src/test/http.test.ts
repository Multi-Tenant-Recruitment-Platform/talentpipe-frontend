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

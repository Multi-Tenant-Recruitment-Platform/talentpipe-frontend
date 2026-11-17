import type { JobVacancyResponse, PipelineTemplateSummary } from '../api/types';

/**
 * A stored vacancy that satisfies every publish rule, as the API returns it.
 *
 * <p>Complete by default so a test varies only the field it is about — an
 * incomplete draft is `makeVacancy({ status: 'DRAFT', jobSummary: '' })`, not a
 * forty-line literal that hides which field matters.</p>
 */
export function makeVacancy(overrides: Partial<JobVacancyResponse> = {}): JobVacancyResponse {
  return {
    id: 'v-1',
    version: 0,
    title: 'Senior Backend Engineer',
    department: 'Engineering',
    openings: 2,
    employmentType: 'FULL_TIME',
    workplaceType: 'HYBRID',
    location: 'Colombo, Sri Lanka',
    applicationDeadline: '2099-01-31',
    jobSummary: 'Lead the services behind our candidate pipeline.',
    jobDescription: 'A longer description of the role and the team it joins.',
    keyResponsibilities: ['Own the matching service'],
    requiredSkills: ['Java'],
    preferredSkills: [],
    minimumExperienceYears: null,
    education: null,
    certifications: [],
    languageRequirements: [],
    otherRequirements: null,
    salaryMin: null,
    salaryMax: null,
    currency: null,
    payPeriod: null,
    benefits: [],
    workingDays: [],
    workingHours: null,
    shiftType: null,
    expectedHoursPerWeek: null,
    assignedRecruiterId: null,
    hiringManagerId: null,
    recruitmentPipelineId: null,
    screeningQuestions: [],
    // On a pipeline, as every vacancy created since templates is.
    pipelineTemplateId: 'tpl-1',
    pipelineTemplateName: 'Engineering hiring',
    stageCount: 4,
    interviewRoundCount: 1,
    autoThreshold: 80,
    manualThreshold: 70,
    blindModeEnabled: false,
    status: 'PUBLISHED',
    createdAt: '2026-09-01T09:00:00Z',
    updatedAt: '2026-09-01T09:00:00Z',
    publishedAt: '2026-09-01T09:00:00Z',
    closedAt: null,
    archivedAt: null,
    applicantCount: null,
    ...overrides,
  };
}

/** A vacancy created before pipeline templates: no template, no screening settings. */
export function makeVacancyWithoutPipeline(overrides: Partial<JobVacancyResponse> = {}): JobVacancyResponse {
  return makeVacancy({
    pipelineTemplateId: null,
    pipelineTemplateName: null,
    stageCount: null,
    interviewRoundCount: null,
    autoThreshold: null,
    manualThreshold: null,
    blindModeEnabled: false,
    ...overrides,
  });
}

/** One row of `GET /pipeline-templates`, as the template picker receives it. */
export function makeTemplateSummary(overrides: Partial<PipelineTemplateSummary> = {}): PipelineTemplateSummary {
  return {
    id: 'tpl-1',
    name: 'Engineering hiring',
    description: null,
    defaultAutoThreshold: 80,
    defaultManualThreshold: 70,
    idealMatchingEnabled: false,
    blindModeEnabled: false,
    status: 'ACTIVE',
    stageCount: 4,
    interviewRoundCount: 1,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    archivedAt: null,
    ...overrides,
  };
}

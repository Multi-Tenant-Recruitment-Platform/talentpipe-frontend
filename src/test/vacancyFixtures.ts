import type { JobVacancyResponse } from '../api/types';

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

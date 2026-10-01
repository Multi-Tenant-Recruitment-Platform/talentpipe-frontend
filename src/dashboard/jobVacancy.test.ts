import { describe, expect, it } from 'vitest';
import {
  EMPTY_VACANCY_VALUES,
  firstInvalidField,
  formatSalary,
  formatWorkingDays,
  isVacancyDirty,
  sectionProgress,
  sectionsWithErrors,
  todayIso,
  toVacancyRequest,
  VACANCY_SECTIONS,
  validateVacancy,
  type JobVacancyFormValues,
} from './jobVacancy';
import type { JobVacancyResponse } from '../api/types';

/**
 * The vacancy rules, tested without a render.
 *
 * <p>Everything the form decides lives in `jobVacancy.ts`, so this is where the
 * decisions are pinned; the page suite covers what a person can do on screen.
 * The same split `companyProfile.test.ts` and the profile page suite use.</p>
 */

/** A vacancy that satisfies every required field, for tests that vary one. */
function completeValues(overrides: Partial<JobVacancyFormValues> = {}): JobVacancyFormValues {
  return {
    ...EMPTY_VACANCY_VALUES,
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
    ...overrides,
  };
}

describe('validateVacancy', () => {
  it('passes a complete vacancy', () => {
    expect(validateVacancy(completeValues())).toEqual({});
  });

  it('names every required field on an empty form', () => {
    const errors = validateVacancy(EMPTY_VACANCY_VALUES);
    // openings and workplaceType are prefilled — the two required fields whose
    // controls cannot show "unanswered" — so everything else must be flagged.
    expect(Object.keys(errors).sort()).toEqual(
      [
        'applicationDeadline',
        'department',
        'employmentType',
        'jobDescription',
        'jobSummary',
        'keyResponsibilities',
        'location',
        'requiredSkills',
        'title',
      ].sort(),
    );
  });

  it('rejects a deadline that has already passed', () => {
    const errors = validateVacancy(completeValues({ applicationDeadline: '2020-01-01' }));
    expect(errors.applicationDeadline).toMatch(/already passed/i);
  });

  it('accepts today as a deadline', () => {
    expect(validateVacancy(completeValues({ applicationDeadline: todayIso() }))).toEqual({});
  });

  it('refuses a maximum salary below the minimum', () => {
    const errors = validateVacancy(
      completeValues({ salaryMin: 300_000, salaryMax: 100_000, currency: 'LKR — Sri Lankan rupee', payPeriod: 'MONTHLY' }),
    );
    expect(errors.salaryMax).toMatch(/at least the minimum/i);
  });

  it('will not take a salary without a currency and a period', () => {
    const errors = validateVacancy(completeValues({ salaryMin: 300_000 }));
    expect(errors.currency).toBeDefined();
    expect(errors.payPeriod).toBeDefined();
  });

  it('leaves the salary alone when no figure was entered', () => {
    expect(validateVacancy(completeValues())).toEqual({});
  });

  it('does not count a blank bullet row as a responsibility', () => {
    const errors = validateVacancy(completeValues({ keyResponsibilities: ['', '  '] }));
    expect(errors.keyResponsibilities).toBeDefined();
  });

  it('points at the first problem in reading order', () => {
    const errors = validateVacancy(EMPTY_VACANCY_VALUES);
    expect(firstInvalidField(errors)).toBe('title');
  });

  it('reports which sections need attention', () => {
    const errors = validateVacancy(completeValues({ title: '', requiredSkills: [] }));
    expect(sectionsWithErrors(errors)).toEqual(new Set(['basics', 'requirements']));
  });
});

describe('progress', () => {
  it('counts only required fields as a section is filled', () => {
    const basics = VACANCY_SECTIONS[0];
    const empty = sectionProgress(EMPTY_VACANCY_VALUES, basics);
    expect(empty.total).toBe(7);
    // openings and workplaceType are prefilled, so two are already answered.
    expect(empty.filled).toBe(2);
    expect(empty.complete).toBe(false);

    expect(sectionProgress(completeValues(), basics).complete).toBe(true);
  });

  it('tracks optional work so an all-optional section still shows effort', () => {
    const schedule = VACANCY_SECTIONS[4];
    const progress = sectionProgress(completeValues({ workingDays: ['MON'] }), schedule);
    expect(progress.total).toBe(0);
    expect(progress.optionalFilled).toBe(1);
  });
});

describe('isVacancyDirty', () => {
  it('is false for an untouched form', () => {
    expect(isVacancyDirty(EMPTY_VACANCY_VALUES)).toBe(false);
  });

  it('ignores a blank bullet row someone added but never typed into', () => {
    expect(isVacancyDirty({ ...EMPTY_VACANCY_VALUES, keyResponsibilities: [''] })).toBe(false);
  });

  it('is true once anything real is entered', () => {
    expect(isVacancyDirty({ ...EMPTY_VACANCY_VALUES, title: 'Engineer' })).toBe(true);
  });
});

describe('toVacancyRequest', () => {
  it('sends blank optionals as null, never as empty strings', () => {
    const request = toVacancyRequest(completeValues(), 'PUBLISHED');
    expect(request.education).toBeNull();
    expect(request.currency).toBeNull();
    expect(request.payPeriod).toBeNull();
    expect(request.shiftType).toBeNull();
    expect(request.assignedRecruiterId).toBeNull();
    expect(request.otherRequirements).toBeNull();
  });

  it('keeps lists as arrays and drops the blank rows', () => {
    const request = toVacancyRequest(
      completeValues({ screeningQuestions: ['Right to work?', '', '  '] }),
      'DRAFT',
    );
    expect(request.screeningQuestions).toEqual(['Right to work?']);
    expect(request.preferredSkills).toEqual([]);
  });

  it('carries the status it was asked for', () => {
    expect(toVacancyRequest(completeValues(), 'DRAFT').status).toBe('DRAFT');
    expect(toVacancyRequest(completeValues(), 'PUBLISHED').status).toBe('PUBLISHED');
  });

  it('trims and collapses whitespace in single-line fields', () => {
    const request = toVacancyRequest(completeValues({ title: '  Senior   Engineer  ' }), 'DRAFT');
    expect(request.title).toBe('Senior Engineer');
  });
});

describe('reading a vacancy back', () => {
  const vacancy = (overrides: Partial<JobVacancyResponse>): JobVacancyResponse => ({
    ...toVacancyRequest(completeValues(), 'PUBLISHED'),
    id: 'v-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  });

  it('reads a run of days as a range and a scatter as a list', () => {
    expect(formatWorkingDays(['MON', 'TUE', 'WED', 'THU', 'FRI'])).toBe('Mon–Fri');
    expect(formatWorkingDays(['MON', 'WED', 'FRI'])).toBe('Mon, Wed, Fri');
    expect(formatWorkingDays([])).toBe('');
  });

  it('states an open-ended salary as a bound rather than a range', () => {
    expect(
      formatSalary(vacancy({ salaryMin: 100_000, salaryMax: null, currency: 'LKR — Sri Lankan rupee', payPeriod: 'MONTHLY' })),
    ).toBe('From 100,000 LKR Per month');
    expect(
      formatSalary(vacancy({ salaryMin: null, salaryMax: 250_000, currency: 'LKR — Sri Lankan rupee', payPeriod: 'MONTHLY' })),
    ).toBe('Up to 250,000 LKR Per month');
    expect(formatSalary(vacancy({ salaryMin: null, salaryMax: null }))).toBe('');
  });
});

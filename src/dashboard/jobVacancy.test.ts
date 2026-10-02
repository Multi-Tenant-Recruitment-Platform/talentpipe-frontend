import { describe, expect, it } from 'vitest';
import {
  canEditVacancy,
  canTransition,
  deadlineSignal,
  duplicateValues,
  EMPTY_VACANCY_VALUES,
  publishBlockers,
  toFormValues,
  toVacancyUpdate,
  vacancyActions,
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
import { makeVacancy } from '../test/vacancyFixtures';

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
  const vacancy = (overrides: Partial<JobVacancyResponse>): JobVacancyResponse =>
    makeVacancy(overrides);

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

describe('the lifecycle', () => {
  it('allows only the forward moves the backlog defines', () => {
    expect(canTransition('DRAFT', 'PUBLISHED')).toBe(true);
    expect(canTransition('PUBLISHED', 'CLOSED')).toBe(true);
    expect(canTransition('CLOSED', 'ARCHIVED')).toBe(true);
    // No inverse anywhere — reopening, unpublishing and unarchiving are not agreed.
    expect(canTransition('PUBLISHED', 'DRAFT')).toBe(false);
    expect(canTransition('CLOSED', 'PUBLISHED')).toBe(false);
    expect(canTransition('ARCHIVED', 'CLOSED')).toBe(false);
    expect(canTransition('DRAFT', 'ARCHIVED')).toBe(false);
  });

  it('lets content change only while a vacancy is a draft or live', () => {
    expect(canEditVacancy('DRAFT')).toBe(true);
    expect(canEditVacancy('PUBLISHED')).toBe(true);
    expect(canEditVacancy('CLOSED')).toBe(false);
    expect(canEditVacancy('ARCHIVED')).toBe(false);
  });

  it('offers each state exactly its own actions on a list row', () => {
    expect(vacancyActions('DRAFT')).toEqual({ primary: ['edit', 'publish'], overflow: ['duplicate'] });
    expect(vacancyActions('PUBLISHED')).toEqual({
      primary: ['view', 'edit'],
      overflow: ['duplicate', 'close'],
    });
    expect(vacancyActions('CLOSED')).toEqual({ primary: ['view'], overflow: ['duplicate', 'archive'] });
    expect(vacancyActions('ARCHIVED')).toEqual({ primary: ['view'], overflow: [] });
  });

  it('drops View on the detail page, which is already the view', () => {
    expect(vacancyActions('PUBLISHED', 'detail').primary).toEqual(['edit']);
    expect(vacancyActions('CLOSED', 'detail')).toEqual({ primary: ['duplicate'], overflow: ['archive'] });
    expect(vacancyActions('ARCHIVED', 'detail')).toEqual({ primary: [], overflow: [] });
  });
});

describe('editing and duplicating', () => {
  it('reads a stored vacancy back into the form it was written from', () => {
    const values = completeValues({ education: 'Diploma', screeningQuestions: ['Right to work?'] });
    const stored = makeVacancy({ ...toVacancyRequest(values, 'DRAFT') });
    expect(toFormValues(stored)).toEqual(values);
  });

  it('turns a blank choice back into an empty control, not a default', () => {
    const values = toFormValues(makeVacancy({ employmentType: null, applicationDeadline: null }));
    expect(values.employmentType).toBe('');
    expect(values.applicationDeadline).toBe('');
  });

  it('copies the content of a duplicate but none of its history', () => {
    const copy = duplicateValues(makeVacancy({ status: 'CLOSED', applicantCount: 12 }));
    expect(copy.title).toBe('Senior Backend Engineer (copy)');
    expect(copy.applicationDeadline).toBe('');
    expect(copy.requiredSkills).toEqual(['Java']);
    // Form values carry no id, status or counts at all.
    expect(Object.keys(copy)).not.toContain('status');
    expect(Object.keys(copy)).not.toContain('applicantCount');
  });

  it('sends no status on an edit, only the lock it was made against', () => {
    const update = toVacancyUpdate(completeValues(), 4);
    expect(update.version).toBe(4);
    expect(Object.keys(update)).not.toContain('status');
  });

  it('sends a blank choice or date as null, never as an invented default', () => {
    const request = toVacancyRequest(
      { ...EMPTY_VACANCY_VALUES, workplaceType: '' },
      'DRAFT',
    );
    expect(request.employmentType).toBeNull();
    expect(request.workplaceType).toBeNull();
    expect(request.applicationDeadline).toBeNull();
  });

  it('does not call an untouched edit unsaved', () => {
    const start = toFormValues(makeVacancy());
    expect(isVacancyDirty({ ...start }, start)).toBe(false);
    expect(isVacancyDirty({ ...start, title: 'Something else' }, start)).toBe(true);
    // A list that changed in content but not in length is still a change.
    expect(isVacancyDirty({ ...start, requiredSkills: ['Kotlin'] }, start)).toBe(true);
  });
});

describe('deadlineSignal', () => {
  const today = '2026-10-02';
  const signal = (applicationDeadline: string | null, status: JobVacancyResponse['status'] = 'PUBLISHED') =>
    deadlineSignal({ status, applicationDeadline }, today);

  it('counts down in calendar days', () => {
    expect(signal('2026-10-30')).toEqual({ tone: 'neutral', label: 'Closes in 28 days' });
    expect(signal('2026-10-05')).toEqual({ tone: 'warning', label: 'Closes in 3 days' });
    expect(signal('2026-10-03')).toEqual({ tone: 'warning', label: 'Closes tomorrow' });
    expect(signal('2026-10-02')).toEqual({ tone: 'warning', label: 'Closes today' });
  });

  it('flags a live vacancy still open past its own deadline', () => {
    expect(signal('2026-09-30')).toEqual({ tone: 'warning', label: 'Deadline passed' });
    expect(signal('2026-09-30', 'DRAFT')?.label).toMatch(/set a new one/i);
  });

  it('says nothing about a deadline once the vacancy is finished', () => {
    expect(signal('2026-09-30', 'CLOSED')).toBeNull();
    expect(signal('2026-09-30', 'ARCHIVED')).toBeNull();
  });

  it('names a missing deadline', () => {
    expect(signal(null, 'DRAFT')).toEqual({ tone: 'neutral', label: 'No deadline set' });
  });
});

describe('publishBlockers', () => {
  it('has nothing to say about a complete vacancy', () => {
    expect(publishBlockers(makeVacancy({ status: 'DRAFT' }), '2026-10-02')).toEqual([]);
  });

  it('names what is missing, grouped by section, in reading order', () => {
    const blockers = publishBlockers(
      makeVacancy({ status: 'DRAFT', applicationDeadline: null, jobSummary: '', requiredSkills: [] }),
      '2026-10-02',
    );
    expect(blockers.map((b) => b.section.id)).toEqual(['basics', 'description', 'requirements']);
    expect(blockers[0].fields).toEqual(['Application deadline']);
  });
});

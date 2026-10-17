import { describe, expect, it } from 'vitest';
import type { JobSummary } from '../api/types';
import { NO_FILTERS, activeFilterCount, filterJobs, hasActiveFilters, salaryBounds } from './jobFilters';

const FRONTEND: JobSummary = {
  id: '1',
  title: 'Senior Frontend Engineer',
  companyName: 'Demo Company',
  department: 'Engineering',
  location: 'Colombo, Sri Lanka',
  employmentType: 'FULL_TIME',
  workplaceType: 'HYBRID',
  requiredSkills: ['React', 'TypeScript'],
  salaryMin: 450000,
  publishedAt: '2026-10-01T08:00:00Z',
};
const BACKEND: JobSummary = {
  id: '2',
  title: 'Backend Engineer',
  companyName: 'Northwind Analytics',
  location: 'Remote',
  employmentType: 'CONTRACT',
  workplaceType: 'REMOTE',
  jobSummary: 'Design APIs consumed by our React frontend.',
  publishedAt: '2026-10-05T08:00:00Z',
};
const ANALYST: JobSummary = { id: '3', title: 'Data Analyst', companyName: 'Northwind Analytics' };
const JOBS = [FRONTEND, BACKEND, ANALYST];

const ids = (jobs: JobSummary[]) => jobs.map((job) => job.id);

describe('filterJobs', () => {
  it('returns every job in API order when nothing is set', () => {
    expect(ids(filterJobs(JOBS, NO_FILTERS))).toEqual(['1', '2', '3']);
  });

  it('matches keywords against title, company, skills and summary, ignoring case', () => {
    expect(ids(filterJobs(JOBS, { ...NO_FILTERS, keyword: 'northwind' }))).toEqual(['2', '3']);
    expect(ids(filterJobs(JOBS, { ...NO_FILTERS, keyword: 'TYPESCRIPT' }))).toEqual(['1']);
    expect(ids(filterJobs(JOBS, { ...NO_FILTERS, keyword: 'apis' }))).toEqual(['2']);
  });

  it('requires every word, and puts title matches first', () => {
    expect(ids(filterJobs(JOBS, { ...NO_FILTERS, keyword: 'engineer react' }))).toEqual(['1', '2']);
    // "frontend" is in job 2's summary but in job 1's title.
    expect(ids(filterJobs([BACKEND, FRONTEND], { ...NO_FILTERS, keyword: 'frontend' }))).toEqual(['1', '2']);
    expect(filterJobs(JOBS, { ...NO_FILTERS, keyword: 'engineer plumber' })).toEqual([]);
  });

  it('filters by location, job type, workplace and stated salary', () => {
    expect(ids(filterJobs(JOBS, { ...NO_FILTERS, location: 'colombo' }))).toEqual(['1']);
    expect(ids(filterJobs(JOBS, { ...NO_FILTERS, employmentTypes: ['CONTRACT', 'INTERNSHIP'] }))).toEqual(['2']);
    expect(ids(filterJobs(JOBS, { ...NO_FILTERS, workplaceTypes: ['HYBRID'] }))).toEqual(['1']);
    expect(ids(filterJobs(JOBS, { ...NO_FILTERS, salaryOnly: true }))).toEqual(['1']);
  });

  it('filters by experience asked for, treating an unstated amount as none', () => {
    const senior: JobSummary = { ...ANALYST, id: '4', minimumExperienceYears: 6 };
    const mid: JobSummary = { ...ANALYST, id: '5', minimumExperienceYears: 2 };
    const jobs = [ANALYST, senior, mid];
    expect(ids(filterJobs(jobs, { ...NO_FILTERS, experience: 'none' }))).toEqual(['3']);
    expect(ids(filterJobs(jobs, { ...NO_FILTERS, experience: 'upTo2' }))).toEqual(['3', '5']);
    expect(ids(filterJobs(jobs, { ...NO_FILTERS, experience: 'upTo5' }))).toEqual(['3', '5']);
    expect(ids(filterJobs(jobs, { ...NO_FILTERS, experience: 'fivePlus' }))).toEqual(['4']);
  });

  it('filters by pay period, and by a salary range that overlaps the stated pay', () => {
    const monthly = (id: string, salaryMin: number | null, salaryMax: number | null): JobSummary => ({
      ...ANALYST,
      id,
      payPeriod: 'MONTHLY',
      currency: 'LKR — Sri Lankan rupee',
      salaryMin,
      salaryMax,
    });
    const jobs = [monthly('a', 100, 200), monthly('b', 300, null), monthly('c', null, 50), { ...ANALYST, id: 'd', payPeriod: 'HOURLY' as const }];
    expect(ids(filterJobs(jobs, { ...NO_FILTERS, payPeriod: 'MONTHLY' }))).toEqual(['a', 'b', 'c']);
    expect(ids(filterJobs(jobs, { ...NO_FILTERS, payPeriod: 'MONTHLY', salaryRange: [150, 300] }))).toEqual(['a', 'b']);
    // A job that states no salary cannot be shown to fall inside a range.
    expect(ids(filterJobs([ANALYST], { ...NO_FILTERS, salaryRange: [0, 1000] }))).toEqual([]);
  });

  it('sorts newest first, with undated jobs last', () => {
    expect(ids(filterJobs(JOBS, { ...NO_FILTERS, sort: 'newest' }))).toEqual(['2', '1', '3']);
  });

  it('does not reorder the list it was given', () => {
    const jobs = [...JOBS];
    filterJobs(jobs, { ...NO_FILTERS, sort: 'newest' });
    expect(ids(jobs)).toEqual(['1', '2', '3']);
  });
});

describe('hasActiveFilters', () => {
  it('ignores sorting and blank text', () => {
    expect(hasActiveFilters(NO_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...NO_FILTERS, sort: 'newest', keyword: '   ' })).toBe(false);
    expect(hasActiveFilters({ ...NO_FILTERS, salaryOnly: true })).toBe(true);
    expect(hasActiveFilters({ ...NO_FILTERS, location: 'Kandy' })).toBe(true);
    expect(hasActiveFilters({ ...NO_FILTERS, experience: 'upTo2' })).toBe(true);
    expect(hasActiveFilters({ ...NO_FILTERS, payPeriod: 'HOURLY' })).toBe(true);
  });
});

describe('activeFilterCount', () => {
  it('counts each choice, but not the text search', () => {
    expect(activeFilterCount({ ...NO_FILTERS, keyword: 'react' })).toBe(0);
    expect(
      activeFilterCount({ ...NO_FILTERS, employmentTypes: ['CONTRACT', 'FULL_TIME'], experience: 'none', payPeriod: 'ANNUAL', salaryRange: [1, 2] }),
    ).toBe(5);
  });
});

describe('salaryBounds', () => {
  const paid = (id: string, currency: string, salaryMin: number, salaryMax: number): JobSummary => ({
    ...ANALYST,
    id,
    payPeriod: 'MONTHLY',
    currency,
    salaryMin,
    salaryMax,
  });

  it('needs a pay period first', () => {
    expect(salaryBounds([paid('a', 'LKR', 1, 2)], null)).toEqual({ available: false, reason: 'Choose a pay period to set a range' });
  });

  it('spans every stated salary in that period and currency', () => {
    expect(salaryBounds([paid('a', 'LKR', 100, 200), paid('b', 'LKR', 50, 400)], 'MONTHLY')).toEqual({
      available: true,
      min: 50,
      max: 400,
      currency: 'LKR',
    });
  });

  it('offers no range across currencies, or where nothing is stated', () => {
    expect(salaryBounds([paid('a', 'LKR', 1, 2), paid('b', 'USD', 1, 2)], 'MONTHLY').available).toBe(false);
    expect(salaryBounds([ANALYST], 'MONTHLY').available).toBe(false);
  });
});

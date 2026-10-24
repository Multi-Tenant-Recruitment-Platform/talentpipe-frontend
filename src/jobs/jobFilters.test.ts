import { describe, expect, it } from 'vitest';
import type { JobSummary } from '../api/types';
import {
  NO_FILTERS,
  activeFilterCount,
  boardFacets,
  filterJobs,
  hasActiveFilters,
  salaryBoundsFrom,
  toBoardParams,
} from './jobFilters';

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

describe('filterJobs, with the newer filters', () => {
  it('narrows by industry, and keeps a salary range to its currency', () => {
    const tech = { ...FRONTEND, id: 'tech', industry: 'Information Technology' };
    const bank = { ...FRONTEND, id: 'bank', industry: 'Finance & Banking' };
    expect(ids(filterJobs([tech, bank], { ...NO_FILTERS, industry: 'Finance & Banking' }))).toEqual(['bank']);

    const lkr = { ...ANALYST, id: 'lkr', payPeriod: 'MONTHLY' as const, currency: 'LKR', salaryMin: 100, salaryMax: 200 };
    const usd = { ...lkr, id: 'usd', currency: 'USD — US dollar' };
    const range = { ...NO_FILTERS, payPeriod: 'MONTHLY' as const, salaryRange: [150, 300] as [number, number] };
    expect(ids(filterJobs([lkr, usd], { ...range, currency: 'USD' }))).toEqual(['usd']);
    expect(ids(filterJobs([lkr, usd], range))).toEqual(['lkr', 'usd']);
  });
});

describe('toBoardParams', () => {
  it('sends nothing for the plain board', () => {
    expect(toBoardParams(NO_FILTERS)).toEqual({});
    expect(toBoardParams({ keyword: '  ', sort: 'relevant' })).toEqual({});
  });

  it('names every choice the way the backend reads it', () => {
    expect(
      toBoardParams({
        ...NO_FILTERS,
        keyword: ' react ',
        location: 'Colombo',
        industry: 'Information Technology',
        employmentTypes: ['FULL_TIME', 'CONTRACT'],
        workplaceTypes: ['REMOTE'],
        experience: 'upTo2',
        salaryOnly: true,
        payPeriod: 'MONTHLY',
        currency: 'LKR',
        salaryRange: [100000, 250000],
        sort: 'newest',
      }),
    ).toEqual({
      q: 'react',
      location: 'Colombo',
      industry: 'Information Technology',
      employmentType: 'FULL_TIME,CONTRACT',
      workplaceType: 'REMOTE',
      maxExperience: 2,
      salaryOnly: true,
      payPeriod: 'MONTHLY',
      currency: 'LKR',
      salaryMin: 100000,
      salaryMax: 250000,
      sort: 'newest',
    });
  });

  it('turns experience levels into bounds', () => {
    expect(toBoardParams({ experience: 'none' })).toEqual({ maxExperience: 0 });
    expect(toBoardParams({ experience: 'fivePlus' })).toEqual({ minExperience: 5 });
  });

  it('never sends a salary range without its pay period, which the backend refuses', () => {
    expect(toBoardParams({ salaryRange: [1, 2], currency: 'LKR' })).toEqual({});
  });
});

describe('boardFacets', () => {
  it('counts what the jobs hold, most populated first, and spans pay per period and currency', () => {
    const paid = (id: string, currency: string, salaryMin: number, salaryMax: number): JobSummary => ({
      ...ANALYST,
      id,
      industry: 'Information Technology',
      payPeriod: 'MONTHLY',
      currency,
      salaryMin,
      salaryMax,
    });
    const facets = boardFacets([...JOBS, paid('a', 'LKR', 100, 200), paid('b', 'LKR — Sri Lankan rupee', 50, 400)]);
    expect(facets.employmentTypes).toEqual([
      { value: 'CONTRACT', count: 1 },
      { value: 'FULL_TIME', count: 1 },
    ]);
    expect(facets.industries).toEqual([{ value: 'Information Technology', count: 2 }]);
    expect(facets.salaryRanges).toEqual([{ payPeriod: 'MONTHLY', currency: 'LKR', min: 50, max: 400, count: 2 }]);
  });
});

describe('salaryBoundsFrom', () => {
  const range = (currency: string, min: number, max: number, count: number) => ({
    payPeriod: 'MONTHLY' as const,
    currency,
    min,
    max,
    count,
  });

  it('needs a pay period first', () => {
    expect(salaryBoundsFrom([range('LKR', 1, 2, 1)], null, null)).toEqual({
      available: false,
      reason: 'Choose a pay period to set a range',
    });
  });

  it('spans the most common currency, and offers the others', () => {
    const ranges = [range('USD', 1000, 5000, 2), range('LKR', 50, 400, 7)];
    expect(salaryBoundsFrom(ranges, 'MONTHLY', null)).toEqual({
      available: true,
      min: 50,
      max: 400,
      currency: 'LKR',
      currencies: ['LKR', 'USD'],
    });
    expect(salaryBoundsFrom(ranges, 'MONTHLY', 'USD')).toMatchObject({ min: 1000, max: 5000, currency: 'USD' });
  });

  it('offers no range where nothing is stated, or every salary is the same', () => {
    expect(salaryBoundsFrom([], 'MONTHLY', null).available).toBe(false);
    expect(salaryBoundsFrom(undefined, 'HOURLY', null).available).toBe(false);
    expect(salaryBoundsFrom([range('LKR', 100, 100, 3)], 'MONTHLY', null)).toEqual({
      available: false,
      reason: 'Every salary here is the same',
    });
  });
});

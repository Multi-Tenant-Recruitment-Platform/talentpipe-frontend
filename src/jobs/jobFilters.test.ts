import { describe, expect, it } from 'vitest';
import type { JobSummary } from '../api/types';
import { NO_FILTERS, filterJobs, hasActiveFilters } from './jobFilters';

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
  });
});

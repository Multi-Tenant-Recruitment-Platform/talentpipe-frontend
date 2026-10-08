import { describe, expect, it } from 'vitest';
import { makeVacancy } from '../test/vacancyFixtures';
import {
  DEFAULT_VACANCY_QUERY,
  departmentOptions,
  parseVacancyQuery,
  selectVacancies,
  summarizeVacancies,
  toVacancySearchParams,
  type VacancyQuery,
} from './vacancyList';

const list = [
  makeVacancy({ id: 'a', title: 'Backend Engineer', status: 'PUBLISHED', createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-20T00:00:00Z', applicationDeadline: '2026-10-30' }),
  makeVacancy({ id: 'b', title: 'Product Designer', department: 'Design', status: 'DRAFT', requiredSkills: ['Figma'], createdAt: '2026-09-10T00:00:00Z', updatedAt: '2026-09-11T00:00:00Z', applicationDeadline: null }),
  makeVacancy({ id: 'c', title: 'Android Developer', status: 'CLOSED', createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-09-25T00:00:00Z', applicationDeadline: '2026-10-05' }),
  makeVacancy({ id: 'd', title: 'Data Analyst', department: 'Data', status: 'ARCHIVED', createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-02T00:00:00Z' }),
];

const query = (overrides: Partial<VacancyQuery> = {}): VacancyQuery => ({
  ...DEFAULT_VACANCY_QUERY,
  ...overrides,
});

const ids = (q: VacancyQuery) => selectVacancies(list, q).visible.map((v) => v.id);

describe('selectVacancies', () => {
  it('leaves archived vacancies out of All, and counts every segment', () => {
    const { visible, counts } = selectVacancies(list, query());
    expect(visible.map((v) => v.id)).not.toContain('d');
    expect(counts).toEqual({ all: 3, DRAFT: 1, PUBLISHED: 1, CLOSED: 1, ARCHIVED: 1 });
  });

  it('shows archived vacancies in their own segment', () => {
    expect(ids(query({ segment: 'ARCHIVED' }))).toEqual(['d']);
  });

  it('searches title, department, location and skills, ignoring case and padding', () => {
    expect(ids(query({ query: '  FIGMA ' }))).toEqual(['b']);
    expect(ids(query({ query: 'android' }))).toEqual(['c']);
  });

  it('counts segments after search, so a count says what clicking it shows', () => {
    const { counts } = selectVacancies(list, query({ query: 'engineer' }));
    expect(counts.PUBLISHED).toBe(1);
    expect(counts.DRAFT).toBe(0);
  });

  it('filters by department', () => {
    expect(ids(query({ department: 'Design' }))).toEqual(['b']);
  });

  it('sorts every way it offers', () => {
    expect(ids(query({ sort: 'newest' }))).toEqual(['b', 'a', 'c']);
    expect(ids(query({ sort: 'updated' }))).toEqual(['c', 'a', 'b']);
    // No deadline sorts last — it has nothing to be soon about.
    expect(ids(query({ sort: 'deadline' }))).toEqual(['c', 'a', 'b']);
    expect(ids(query({ sort: 'title' }))).toEqual(['c', 'a', 'b']);
  });

  it('reports filters as active only when search or department narrow the list', () => {
    expect(selectVacancies(list, query({ segment: 'DRAFT' })).filtersActive).toBe(false);
    expect(selectVacancies(list, query({ query: 'x' })).filtersActive).toBe(true);
  });
});

describe('the list query in the URL', () => {
  it('round-trips, and keeps a default view a plain URL', () => {
    const q = query({ segment: 'CLOSED', query: 'react', department: 'Engineering', sort: 'deadline' });
    expect(parseVacancyQuery(toVacancySearchParams(q))).toEqual(q);
    expect(toVacancySearchParams(query()).toString()).toBe('');
  });

  it('falls back to defaults for anything it does not recognise', () => {
    expect(parseVacancyQuery(new URLSearchParams('status=bogus&sort=sideways'))).toEqual(query());
  });
});

describe('departmentOptions', () => {
  it('merges the profile list with departments vacancies were actually filed under', () => {
    expect(departmentOptions(list, ['Engineering', 'Finance'])).toEqual([
      'Data',
      'Design',
      'Engineering',
      'Finance',
    ]);
  });
});

describe('summarizeVacancies', () => {
  it('counts live roles, drafts and live roles closing within a week', () => {
    expect(summarizeVacancies(list, '2026-10-25')).toEqual({ live: 1, drafts: 1, closingThisWeek: 1 });
    expect(summarizeVacancies(list, '2026-10-01')).toEqual({ live: 1, drafts: 1, closingThisWeek: 0 });
  });
});

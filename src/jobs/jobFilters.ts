import type { EmploymentType, JobSummary, WorkplaceType } from '../api/types';

/**
 * Search, filters and sorting for the public job board.
 *
 * GET /public/jobs takes no search parameters yet, so this narrows the jobs
 * the board has already loaded. It is pure on purpose: when the endpoint
 * learns to search, {@link JobFilters} becomes its query and only the hook
 * that calls it changes.
 */

export type JobSort = 'relevant' | 'newest';

export interface JobFilters {
  /** Words that must all appear in the title, company, department, skills or summary. */
  keyword: string;
  location: string;
  /** Empty means any. */
  employmentTypes: EmploymentType[];
  workplaceTypes: WorkplaceType[];
  /** Only jobs that state what they pay. */
  salaryOnly: boolean;
  sort: JobSort;
}

export const NO_FILTERS: JobFilters = {
  keyword: '',
  location: '',
  employmentTypes: [],
  workplaceTypes: [],
  salaryOnly: false,
  sort: 'relevant',
};

/** Sorting reorders the list without narrowing it, so it does not count. */
export const hasActiveFilters = (filters: JobFilters) =>
  Boolean(filters.keyword.trim()) ||
  Boolean(filters.location.trim()) ||
  filters.employmentTypes.length > 0 ||
  filters.workplaceTypes.length > 0 ||
  filters.salaryOnly;

/** Case- and accent-insensitive, so "colombo" finds "Colombo" and "resume" finds "résumé". */
const fold = (text: string) =>
  text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const words = (text: string) => fold(text).split(/\s+/).filter(Boolean);

export const hasSalary =(job: JobSummary) => (job.salaryMin ?? null) !== null || (job.salaryMax ?? null) !== null;

/** 2 when every word is in the title, 1 when the job matches elsewhere, 0 when it does not match. */
function keywordRank(job: JobSummary, keywords: string[]): number {
  if (keywords.length === 0) return 1;
  const title = fold(job.title);
  if (keywords.every((word) => title.includes(word))) return 2;
  const rest = fold([job.companyName, job.department, job.jobSummary, ...(job.requiredSkills ?? [])].filter(Boolean).join(' '));
  return keywords.every((word) => title.includes(word) || rest.includes(word)) ? 1 : 0;
}

const publishedTime = (job: JobSummary) => {
  const time = job.publishedAt ? Date.parse(job.publishedAt) : Number.NaN;
  return Number.isNaN(time) ? null : time;
};

/** The jobs that pass every filter, in the chosen order. Never mutates its input. */
export function filterJobs(jobs: JobSummary[], filters: JobFilters): JobSummary[] {
  const keywords = words(filters.keyword);
  const place = fold(filters.location.trim());

  const matches = jobs
    .map((job, index) => ({ job, index, rank: keywordRank(job, keywords) }))
    .filter(({ job, rank }) => {
      if (rank === 0) return false;
      if (place && !fold(job.location ?? '').includes(place)) return false;
      if (filters.employmentTypes.length > 0 && !(job.employmentType && filters.employmentTypes.includes(job.employmentType))) {
        return false;
      }
      if (filters.workplaceTypes.length > 0 && !(job.workplaceType && filters.workplaceTypes.includes(job.workplaceType))) {
        return false;
      }
      return !filters.salaryOnly || hasSalary(job);
    });

  if (filters.sort === 'newest') {
    // Jobs with no publish date go last rather than pretending to be new or old.
    matches.sort((a, b) => {
      const at = publishedTime(a.job);
      const bt = publishedTime(b.job);
      if (at === bt) return a.index - b.index;
      if (at === null) return 1;
      if (bt === null) return -1;
      return bt - at;
    });
  } else {
    // "Most relevant": title matches first, otherwise the order the API chose.
    matches.sort((a, b) => b.rank - a.rank || a.index - b.index);
  }

  return matches.map(({ job }) => job);
}

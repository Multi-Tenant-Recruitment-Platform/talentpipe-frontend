import type { EmploymentType, JobSummary, PayPeriod, WorkplaceType } from '../api/types';
import { currencyCode } from './jobLabels';

/**
 * Search, filters and sorting for the public job board.
 *
 * GET /public/jobs takes no search parameters yet, so this narrows the jobs
 * the board has already loaded. It is pure on purpose: when the endpoint
 * learns to search, {@link JobFilters} becomes its query and only the hook
 * that calls it changes.
 */

export type JobSort = 'relevant' | 'newest';

/** How much experience a job may ask for. A job that names none asks for none. */
export type ExperienceLevel = 'any' | 'none' | 'upTo2' | 'upTo5' | 'fivePlus';

export const EXPERIENCE_LEVELS: { id: ExperienceLevel; label: string }[] = [
  { id: 'any', label: 'Any experience' },
  { id: 'none', label: 'No experience' },
  { id: 'upTo2', label: 'Up to 2 years' },
  { id: 'upTo5', label: 'Up to 5 years' },
  { id: 'fivePlus', label: '5+ years' },
];

export interface JobFilters {
  /** Words that must all appear in the title, company, department, skills or summary. */
  keyword: string;
  location: string;
  /** Empty means any. */
  employmentTypes: EmploymentType[];
  workplaceTypes: WorkplaceType[];
  /** Only jobs that state what they pay. */
  salaryOnly: boolean;
  experience: ExperienceLevel;
  /** Null means any. */
  payPeriod: PayPeriod | null;
  /**
   * Only jobs whose stated pay overlaps this range. Meaningful only within one
   * pay period and one currency, which {@link salaryBounds} decides.
   */
  salaryRange: [number, number] | null;
  sort: JobSort;
}

export const NO_FILTERS: JobFilters = {
  keyword: '',
  location: '',
  employmentTypes: [],
  workplaceTypes: [],
  salaryOnly: false,
  experience: 'any',
  payPeriod: null,
  salaryRange: null,
  sort: 'relevant',
};

/** Sorting reorders the list without narrowing it, so it does not count. */
export const hasActiveFilters = (filters: JobFilters) =>
  Boolean(filters.keyword.trim()) ||
  Boolean(filters.location.trim()) ||
  filters.employmentTypes.length > 0 ||
  filters.workplaceTypes.length > 0 ||
  filters.salaryOnly ||
  filters.experience !== 'any' ||
  filters.payPeriod !== null ||
  filters.salaryRange !== null;

/** How many choices are narrowing the list — the number on the Filters badge. Text search is not one of them. */
export const activeFilterCount = (filters: JobFilters) =>
  filters.employmentTypes.length +
  filters.workplaceTypes.length +
  (filters.salaryOnly ? 1 : 0) +
  (filters.experience !== 'any' ? 1 : 0) +
  (filters.payPeriod ? 1 : 0) +
  (filters.salaryRange ? 1 : 0);

/** Case- and accent-insensitive, so "colombo" finds "Colombo" and "resume" finds "résumé". */
const fold = (text: string) =>
  text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const words = (text: string) => fold(text).split(/\s+/).filter(Boolean);

export const hasSalary = (job: JobSummary) => (job.salaryMin ?? null) !== null || (job.salaryMax ?? null) !== null;

function matchesExperience(job: JobSummary, level: ExperienceLevel): boolean {
  const years = job.minimumExperienceYears ?? 0;
  switch (level) {
    case 'none':
      return years === 0;
    case 'upTo2':
      return years <= 2;
    case 'upTo5':
      return years <= 5;
    case 'fivePlus':
      return years >= 5;
    default:
      return true;
  }
}

/** The pay a job states, as a range; a one-sided salary is a range of one point. */
function salarySpan(job: JobSummary): [number, number] | null {
  const min = job.salaryMin ?? job.salaryMax ?? null;
  const max = job.salaryMax ?? job.salaryMin ?? null;
  return min === null || max === null ? null : [min, max];
}

export type SalaryBounds =
  | { available: true; min: number; max: number; currency: string }
  | { available: false; reason: string };

/**
 * The salary slider's range for one pay period, or why there is none. Pay is
 * only comparable within one period and one currency, so a range is offered
 * only when every job with a stated salary in that period shares a currency.
 */
export function salaryBounds(jobs: JobSummary[], payPeriod: PayPeriod | null): SalaryBounds {
  if (!payPeriod) return { available: false, reason: 'Choose a pay period to set a range' };
  const paid = jobs.filter((job) => job.payPeriod === payPeriod && hasSalary(job));
  if (paid.length === 0) return { available: false, reason: 'No salaries stated for this pay period' };
  const currencies = new Set(paid.map((job) => currencyCode(job.currency)));
  if (currencies.size > 1) return { available: false, reason: 'Salaries are in different currencies' };
  const spans = paid.map((job) => salarySpan(job) as [number, number]);
  const min = Math.min(...spans.map(([low]) => low));
  const max = Math.max(...spans.map(([, high]) => high));
  if (min === max) return { available: false, reason: 'Every salary here is the same' };
  return { available: true, min, max, currency: [...currencies][0] };
}

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

/** No choices means any; otherwise the job must have one of them. */
const oneOf = <T>(choices: T[], value: T | null | undefined) =>
  choices.length === 0 || (value !== null && value !== undefined && choices.includes(value));

/** No range means any; otherwise the job's stated pay must overlap it. A job that states none cannot. */
function overlapsRange(job: JobSummary, range: [number, number] | null): boolean {
  if (!range) return true;
  const span = salarySpan(job);
  return span !== null && span[1] >= range[0] && span[0] <= range[1];
}

/** Every narrowing except the keyword, which ranks the jobs as well as filtering them. */
function passesFilters(job: JobSummary, filters: JobFilters, place: string): boolean {
  return (
    (!place || fold(job.location ?? '').includes(place)) &&
    oneOf(filters.employmentTypes, job.employmentType) &&
    oneOf(filters.workplaceTypes, job.workplaceType) &&
    (!filters.salaryOnly || hasSalary(job)) &&
    matchesExperience(job, filters.experience) &&
    (!filters.payPeriod || job.payPeriod === filters.payPeriod) &&
    overlapsRange(job, filters.salaryRange)
  );
}

/** A match, with what the sorts need: its keyword rank and where the API put it. */
interface Ranked {
  job: JobSummary;
  index: number;
  rank: number;
}

/** "Newest": latest first. Jobs with no publish date go last rather than pretending to be new or old. */
function byNewest(a: Ranked, b: Ranked): number {
  const at = publishedTime(a.job);
  const bt = publishedTime(b.job);
  if (at === bt) return a.index - b.index;
  if (at === null) return 1;
  if (bt === null) return -1;
  return bt - at;
}

/** "Most relevant": title matches first, otherwise the order the API chose. */
const byRelevance = (a: Ranked, b: Ranked) => b.rank - a.rank || a.index - b.index;

/** The jobs that pass every filter, in the chosen order. Never mutates its input. */
export function filterJobs(jobs: JobSummary[], filters: JobFilters): JobSummary[] {
  const keywords = words(filters.keyword);
  const place = fold(filters.location.trim());

  return jobs
    .map((job, index): Ranked => ({ job, index, rank: keywordRank(job, keywords) }))
    .filter(({ job, rank }) => rank > 0 && passesFilters(job, filters, place))
    .sort(filters.sort === 'newest' ? byNewest : byRelevance)
    .map(({ job }) => job);
}

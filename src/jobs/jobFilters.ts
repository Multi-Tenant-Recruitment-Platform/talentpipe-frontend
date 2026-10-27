import type {
  EmploymentType,
  JobFilterOption,
  JobFilterOptions,
  JobSummary,
  PayPeriod,
  SalaryRangeOption,
  WorkplaceType,
} from '../api/types';
import { currencyCode } from './jobLabels';

/**
 * Search, filters and sorting for the public job board.
 *
 * <p>{@link JobFilters} is the board's query: {@link toBoardParams} turns it
 * into the query string of `GET /public/jobs`, which searches every published
 * job, so a filter never covers only the pages loaded so far. The same rules
 * are kept here in {@link filterJobs}, run over the sample jobs when the
 * board is pointed at mock data, and {@link boardFacets} answers
 * `/public/jobs/filters` for them — so the mock board behaves like the real
 * one, and the rules can be read and tested in one place.</p>
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
  /** One of the board's industries; null means any. */
  industry: string | null;
  /** Empty means any. */
  employmentTypes: EmploymentType[];
  workplaceTypes: WorkplaceType[];
  /** Only jobs that state what they pay. */
  salaryOnly: boolean;
  experience: ExperienceLevel;
  /** Null means any. */
  payPeriod: PayPeriod | null;
  /** The three-letter code a salary range is in; null means whichever is most common. */
  currency: string | null;
  /**
   * Only jobs whose stated pay overlaps this range. Meaningful only within one
   * pay period and one currency, which {@link salaryBoundsFrom} decides.
   */
  salaryRange: [number, number] | null;
  sort: JobSort;
}

export const NO_FILTERS: JobFilters = {
  keyword: '',
  location: '',
  industry: null,
  employmentTypes: [],
  workplaceTypes: [],
  salaryOnly: false,
  experience: 'any',
  payPeriod: null,
  currency: null,
  salaryRange: null,
  sort: 'relevant',
};

/** Sorting reorders the list without narrowing it, so it does not count. */
export const hasActiveFilters = (filters: JobFilters) =>
  Boolean(filters.keyword.trim()) ||
  Boolean(filters.location.trim()) ||
  filters.industry !== null ||
  filters.employmentTypes.length > 0 ||
  filters.workplaceTypes.length > 0 ||
  filters.salaryOnly ||
  filters.experience !== 'any' ||
  filters.payPeriod !== null ||
  filters.salaryRange !== null;

/** How many choices are narrowing the list — the number on the Filters badge. Text search is not one of them. */
export const activeFilterCount = (filters: JobFilters) =>
  (filters.industry ? 1 : 0) +
  filters.employmentTypes.length +
  filters.workplaceTypes.length +
  (filters.salaryOnly ? 1 : 0) +
  (filters.experience !== 'any' ? 1 : 0) +
  (filters.payPeriod ? 1 : 0) +
  (filters.salaryRange ? 1 : 0);

/* --- The query string -------------------------------------------------- */

/** Years asked for, as the bounds the server filters by. */
const EXPERIENCE_BOUNDS: Record<ExperienceLevel, { minExperience?: number; maxExperience?: number }> = {
  any: {},
  none: { maxExperience: 0 },
  upTo2: { maxExperience: 2 },
  upTo5: { maxExperience: 5 },
  fivePlus: { minExperience: 5 },
};

export type BoardParams = Record<string, string | number | boolean>;

/**
 * The filters as `GET /public/jobs` reads them. Anything at its default is
 * left out, so an unfiltered request stays the plain board and its URL short;
 * lists travel comma-separated.
 */
export function toBoardParams(filters: Partial<JobFilters>): BoardParams {
  const params: BoardParams = {};
  const keyword = filters.keyword?.trim();
  const location = filters.location?.trim();
  if (keyword) params.q = keyword;
  if (location) params.location = location;
  if (filters.industry) params.industry = filters.industry;
  if (filters.employmentTypes?.length) params.employmentType = filters.employmentTypes.join(',');
  if (filters.workplaceTypes?.length) params.workplaceType = filters.workplaceTypes.join(',');
  Object.assign(params, EXPERIENCE_BOUNDS[filters.experience ?? 'any']);
  if (filters.salaryOnly) params.salaryOnly = true;
  if (filters.payPeriod) {
    params.payPeriod = filters.payPeriod;
    // A range means nothing without its period; the server refuses one alone.
    if (filters.salaryRange) {
      if (filters.currency) params.currency = filters.currency;
      params.salaryMin = filters.salaryRange[0];
      params.salaryMax = filters.salaryRange[1];
    }
  }
  if (filters.sort === 'newest') params.sort = 'newest';
  return params;
}

/* --- Matching, for the mock board ---------------------------------------- */

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
  const { minExperience, maxExperience } = EXPERIENCE_BOUNDS[level];
  return (minExperience === undefined || years >= minExperience) && (maxExperience === undefined || years <= maxExperience);
}

/** The pay a job states, as a range; a one-sided salary is a range of one point. */
function salarySpan(job: JobSummary): [number, number] | null {
  const min = job.salaryMin ?? job.salaryMax ?? null;
  const max = job.salaryMax ?? job.salaryMin ?? null;
  return min === null || max === null ? null : [min, max];
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
function overlapsRange(job: JobSummary, filters: JobFilters): boolean {
  if (!filters.salaryRange) return true;
  if (filters.currency && currencyCode(job.currency ?? null) !== filters.currency) return false;
  const span = salarySpan(job);
  return span !== null && span[1] >= filters.salaryRange[0] && span[0] <= filters.salaryRange[1];
}

/** Every narrowing except the keyword, which ranks the jobs as well as filtering them. */
function passesFilters(job: JobSummary, filters: JobFilters, place: string): boolean {
  return (
    (!place || fold(job.location ?? '').includes(place)) &&
    (!filters.industry || job.industry === filters.industry) &&
    oneOf(filters.employmentTypes, job.employmentType) &&
    oneOf(filters.workplaceTypes, job.workplaceType) &&
    (!filters.salaryOnly || hasSalary(job)) &&
    matchesExperience(job, filters.experience) &&
    (!filters.payPeriod || job.payPeriod === filters.payPeriod) &&
    overlapsRange(job, filters)
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

/* --- Facets ------------------------------------------------------------- */

/** Values with how many jobs hold each, most populated first, ties by name. */
function tally(values: (string | null | undefined)[]): JobFilterOption[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

/** What `/public/jobs/filters` would answer for these jobs. */
export function boardFacets(jobs: JobSummary[]): JobFilterOptions {
  const ranges = new Map<string, SalaryRangeOption>();
  for (const job of jobs) {
    const span = salarySpan(job);
    if (!span || !job.payPeriod) continue;
    const currency = currencyCode(job.currency ?? null);
    const key = `${job.payPeriod}|${currency}`;
    const range = ranges.get(key);
    ranges.set(
      key,
      range
        ? { ...range, min: Math.min(range.min, span[0]), max: Math.max(range.max, span[1]), count: range.count + 1 }
        : { payPeriod: job.payPeriod, currency, min: span[0], max: span[1], count: 1 },
    );
  }
  return {
    categories: tally(jobs.map((job) => job.department)),
    locations: tally(jobs.map((job) => job.location)),
    industries: tally(jobs.map((job) => job.industry)),
    employmentTypes: tally(jobs.map((job) => job.employmentType)),
    workplaceTypes: tally(jobs.map((job) => job.workplaceType)),
    salaryRanges: [...ranges.values()],
  };
}

/** How many jobs a facet list says hold {@code value}; 0 when it is not listed. */
export const facetCount = (options: JobFilterOption[] | undefined, value: string) =>
  options?.find((option) => option.value === value)?.count ?? 0;

export type SalaryBounds =
  | { available: true; min: number; max: number; currency: string; currencies: string[] }
  | { available: false; reason: string };

/**
 * The salary slider's range for one pay period, or why there is none. Pay
 * only compares within one period and one currency, so when a period is paid
 * in several currencies the slider covers one of them — the one chosen, or
 * else the most common — and the others are offered beside it.
 */
export function salaryBoundsFrom(
  ranges: SalaryRangeOption[] | undefined,
  payPeriod: PayPeriod | null,
  currency: string | null,
): SalaryBounds {
  if (!payPeriod) return { available: false, reason: 'Choose a pay period to set a range' };
  const paid = (ranges ?? []).filter((range) => range.payPeriod === payPeriod).sort((a, b) => b.count - a.count);
  if (paid.length === 0) return { available: false, reason: 'No salaries stated for this pay period' };
  const range = paid.find((candidate) => candidate.currency === currency) ?? paid[0];
  if (range.min === range.max) return { available: false, reason: 'Every salary here is the same' };
  return {
    available: true,
    min: range.min,
    max: range.max,
    currency: range.currency,
    currencies: paid.map((candidate) => candidate.currency),
  };
}

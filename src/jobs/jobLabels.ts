import type { EmploymentType, JobSummary, PayPeriod, ShiftType, WeekDay, WorkplaceType } from '../api/types';
import {
  EMPLOYMENT_TYPES,
  SHIFT_TYPES,
  WORKPLACE_TYPES,
  currencyCode as storedCurrencyCode,
  formatWorkingDays as formatStoredWorkingDays,
} from '../dashboard/jobVacancy';

/**
 * Candidate-facing wording for the identifiers a vacancy is stored with. The
 * labels are the vacancy form's own catalogues (src/dashboard/jobVacancy.ts),
 * so a company sees the same words on the board that it picked in the form.
 * What differs is tolerance: the board reads rows it did not write, so every
 * helper here accepts a missing value and keeps an unknown one readable.
 */

const byId = (catalogue: { id: string; label: string }[]): Record<string, string> =>
  Object.fromEntries(catalogue.map((entry) => [entry.id, entry.label]));

const EMPLOYMENT_LABELS = byId(EMPLOYMENT_TYPES);
const WORKPLACE_LABELS = byId(WORKPLACE_TYPES);
const SHIFT_LABELS = byId(SHIFT_TYPES);

/** The unit after the slash — 'LKR 150,000 / month' — which the form's 'Per month' does not fit. */
const PAY_PERIODS: Record<PayPeriod, string> = {
  HOURLY: 'hour',
  MONTHLY: 'month',
  ANNUAL: 'year',
};

/** 'SOME_NEW_VALUE' → 'Some new value', so a value the board does not know yet is still readable. */
function humanize(id: string): string {
  const words = id.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const labelOf = (labels: Record<string, string>, id: string) => labels[id] ?? humanize(id);

export const employmentTypeLabel = (id: EmploymentType) => labelOf(EMPLOYMENT_LABELS, id);
export const workplaceTypeLabel = (id: WorkplaceType) => labelOf(WORKPLACE_LABELS, id);
export const shiftTypeLabel = (id: ShiftType) => labelOf(SHIFT_LABELS, id);

/** 'LKR — Sri Lankan rupee' → 'LKR'. The code is what belongs next to a number. */
export const currencyCode = (currency: string | null | undefined) => storedCurrencyCode(currency ?? null);

const amount = (value: number) => value.toLocaleString('en-US');

/** 'LKR 150,000 – 220,000 / month', with whichever halves exist; '' when no salary is stated. */
export function formatSalary(job: Pick<JobSummary, 'salaryMin' | 'salaryMax' | 'currency' | 'payPeriod'>): string {
  const min = job.salaryMin ?? null;
  const max = job.salaryMax ?? null;
  if (min === null && max === null) return '';

  let prefix = '';
  let numbers: string;
  if (min !== null && max !== null) numbers = min === max ? amount(min) : `${amount(min)} – ${amount(max)}`;
  else if (min !== null) {
    prefix = 'From ';
    numbers = amount(min);
  } else {
    prefix = 'Up to ';
    numbers = amount(max as number);
  }

  const code = currencyCode(job.currency);
  const money = `${prefix}${code ? `${code} ` : ''}${numbers}`;
  return job.payPeriod ? `${money} / ${labelOf(PAY_PERIODS, job.payPeriod)}` : money;
}

/** '3+ years experience'; zero means the role is open to newcomers. */
export function formatExperience(years: number | null | undefined): string {
  if (years === null || years === undefined) return '';
  if (years === 0) return 'No experience required';
  return `${years}+ ${years === 1 ? 'year' : 'years'} experience`;
}

/** 'Mon–Fri' where the days are a run, 'Mon, Wed, Fri' where they are not. */
export const formatWorkingDays = (days: WeekDay[] | null | undefined) => formatStoredWorkingDays(days ?? []);

import type { EmploymentType, JobSummary, PayPeriod, ShiftType, WeekDay, WorkplaceType } from '../api/types';

/**
 * Candidate-facing wording for the identifiers a vacancy is stored with. The
 * labels match the vacancy creation form's catalogues (src/dashboard/jobVacancy.ts
 * on the vacancy form branch), so a company sees the same words on the board
 * that it picked in the form. Once both live on one branch, import from there.
 */

const EMPLOYMENT_TYPES: Record<EmploymentType, string> = {
  FULL_TIME: 'Full time',
  PART_TIME: 'Part time',
  CONTRACT: 'Contract',
  INTERNSHIP: 'Internship',
  TEMPORARY: 'Temporary',
};

const WORKPLACE_TYPES: Record<WorkplaceType, string> = {
  ON_SITE: 'On-site',
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
};

const PAY_PERIODS: Record<PayPeriod, string> = {
  HOURLY: 'hour',
  MONTHLY: 'month',
  ANNUAL: 'year',
};

const SHIFT_TYPES: Record<ShiftType, string> = {
  DAY: 'Day shift',
  NIGHT: 'Night shift',
  ROTATING: 'Rotating shift',
  FLEXIBLE: 'Flexible',
};

const WEEK_DAYS: { id: WeekDay; short: string }[] = [
  { id: 'MON', short: 'Mon' },
  { id: 'TUE', short: 'Tue' },
  { id: 'WED', short: 'Wed' },
  { id: 'THU', short: 'Thu' },
  { id: 'FRI', short: 'Fri' },
  { id: 'SAT', short: 'Sat' },
  { id: 'SUN', short: 'Sun' },
];

/** 'SOME_NEW_VALUE' → 'Some new value', so a value the board does not know yet is still readable. */
function humanize(id: string): string {
  const words = id.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const labelOf = (labels: Record<string, string>, id: string) => labels[id] ?? humanize(id);

export const employmentTypeLabel = (id: EmploymentType) => labelOf(EMPLOYMENT_TYPES, id);
export const workplaceTypeLabel = (id: WorkplaceType) => labelOf(WORKPLACE_TYPES, id);
export const shiftTypeLabel = (id: ShiftType) => labelOf(SHIFT_TYPES, id);

/** 'LKR — Sri Lankan rupee' → 'LKR'. The code is what belongs next to a number. */
export function currencyCode(currency: string | null | undefined): string {
  return currency ? currency.split('—')[0].trim() : '';
}

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
export function formatWorkingDays(days: WeekDay[] | null | undefined): string {
  if (!days || days.length === 0) return '';
  const order = WEEK_DAYS.map((day) => day.id);
  const chosen = order.filter((id) => days.includes(id));
  const indexes = chosen.map((id) => order.indexOf(id));
  const isRun = chosen.length > 2 && indexes.every((value, i) => i === 0 || value === indexes[i - 1] + 1);
  const short = (id: WeekDay) => WEEK_DAYS.find((day) => day.id === id)?.short ?? id;
  return isRun ? `${short(chosen[0])}–${short(chosen[chosen.length - 1])}` : chosen.map(short).join(', ');
}

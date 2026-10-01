import type {
  EmploymentType,
  JobVacancyRequest,
  JobVacancyResponse,
  PayPeriod,
  ShiftType,
  VacancyStatus,
  WeekDay,
  WorkplaceType,
} from '../api/types';
import { cleanValues } from './companyProfile';

/**
 * Derivation layer for job vacancies.
 *
 * <p>Everything the vacancy screens decide — what a section contains, what a
 * field must hold, which fields are required, what a form becomes on the wire —
 * lives here, pure and DOM-free, so the rules can be tested without a render.
 * The pages orchestrate; this file knows the vocabulary.</p>
 *
 * <p>{@link VACANCY_SECTIONS} is the spine. The rail, the six cards, the
 * per-section completion marks and the order validation focuses fields in are
 * all read from it, so adding a field means touching one array rather than
 * four screens that drift apart.</p>
 */

/* --- Form state ---------------------------------------------------------- */

/**
 * Form state, which is deliberately not {@link JobVacancyRequest}.
 *
 * <p>Enumerated fields carry `''` for "nothing chosen" because that is what an
 * empty `Select` yields, and `''` is what becomes `null` on the wire. Numbers
 * are `number | null` rather than strings: antd's `InputNumber` owns the
 * half-typed states internally and hands back a number or nothing, so the
 * string dance the company profile form needs does not apply here.</p>
 */
export interface JobVacancyFormValues {
  title: string;
  department: string;
  openings: number | null;
  employmentType: EmploymentType | '';
  workplaceType: WorkplaceType | '';
  location: string;
  /** ISO `YYYY-MM-DD`, or `''` while unset. */
  applicationDeadline: string;

  jobSummary: string;
  jobDescription: string;
  keyResponsibilities: string[];

  requiredSkills: string[];
  preferredSkills: string[];
  minimumExperienceYears: number | null;
  education: string;
  certifications: string[];
  languageRequirements: string[];
  otherRequirements: string;

  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  payPeriod: PayPeriod | '';
  benefits: string[];

  workingDays: WeekDay[];
  workingHours: string;
  shiftType: ShiftType | '';
  expectedHoursPerWeek: number | null;

  assignedRecruiterId: string;
  hiringManagerId: string;
  recruitmentPipelineId: string;
  screeningQuestions: string[];
}

export type JobVacancyField = keyof JobVacancyFormValues;
export type JobVacancyFieldErrors = Partial<Record<JobVacancyField, string>>;

export const EMPTY_VACANCY_VALUES: JobVacancyFormValues = {
  title: '',
  department: '',
  openings: 1,
  employmentType: '',
  // Prefilled because a segmented control cannot render "nothing chosen": antd
  // paints the first option as selected regardless, so an unset value would
  // show On-site highlighted and then fail validation for not being answered.
  // The state matches what the control says, and on-site is the common case.
  workplaceType: 'ON_SITE',
  location: '',
  applicationDeadline: '',
  jobSummary: '',
  jobDescription: '',
  keyResponsibilities: [],
  requiredSkills: [],
  preferredSkills: [],
  minimumExperienceYears: null,
  education: '',
  certifications: [],
  languageRequirements: [],
  otherRequirements: '',
  salaryMin: null,
  salaryMax: null,
  currency: '',
  payPeriod: '',
  benefits: [],
  workingDays: [],
  workingHours: '',
  shiftType: '',
  expectedHoursPerWeek: null,
  assignedRecruiterId: '',
  hiringManagerId: '',
  recruitmentPipelineId: '',
  screeningQuestions: [],
};

export const FIELD_LABELS: Record<JobVacancyField, string> = {
  title: 'Job title',
  department: 'Department',
  openings: 'Number of openings',
  employmentType: 'Employment type',
  workplaceType: 'Workplace type',
  location: 'Location',
  applicationDeadline: 'Application deadline',
  jobSummary: 'Job summary',
  jobDescription: 'Job description',
  keyResponsibilities: 'Key responsibilities',
  requiredSkills: 'Required skills',
  preferredSkills: 'Preferred skills',
  minimumExperienceYears: 'Minimum experience',
  education: 'Education / qualification',
  certifications: 'Certifications',
  languageRequirements: 'Language requirements',
  otherRequirements: 'Other requirements',
  salaryMin: 'Minimum salary',
  salaryMax: 'Maximum salary',
  currency: 'Currency',
  payPeriod: 'Pay period',
  benefits: 'Benefits & perks',
  workingDays: 'Working days',
  workingHours: 'Working hours',
  shiftType: 'Shift type',
  expectedHoursPerWeek: 'Expected hours per week',
  assignedRecruiterId: 'Assigned recruiter',
  hiringManagerId: 'Hiring manager',
  recruitmentPipelineId: 'Recruitment pipeline',
  screeningQuestions: 'Screening questions',
};

/* --- Catalogues ---------------------------------------------------------- */

/**
 * Enumerated vocabularies. Stored as identifiers, shown as labels, so the
 * wording can be revised without a migration — the same rule the benefits
 * catalogue follows in `companyProfile.ts`.
 */
export const EMPLOYMENT_TYPES: { id: EmploymentType; label: string }[] = [
  { id: 'FULL_TIME', label: 'Full time' },
  { id: 'PART_TIME', label: 'Part time' },
  { id: 'CONTRACT', label: 'Contract' },
  { id: 'INTERNSHIP', label: 'Internship' },
  { id: 'TEMPORARY', label: 'Temporary' },
];

export const WORKPLACE_TYPES: { id: WorkplaceType; label: string }[] = [
  { id: 'ON_SITE', label: 'On-site' },
  { id: 'REMOTE', label: 'Remote' },
  { id: 'HYBRID', label: 'Hybrid' },
];

export const PAY_PERIODS: { id: PayPeriod; label: string }[] = [
  { id: 'HOURLY', label: 'Per hour' },
  { id: 'MONTHLY', label: 'Per month' },
  { id: 'ANNUAL', label: 'Per year' },
];

export const SHIFT_TYPES: { id: ShiftType; label: string }[] = [
  { id: 'DAY', label: 'Day shift' },
  { id: 'NIGHT', label: 'Night shift' },
  { id: 'ROTATING', label: 'Rotating shift' },
  { id: 'FLEXIBLE', label: 'Flexible' },
];

/** Monday first: the working week starts where the product's users start it. */
export const WEEK_DAYS: { id: WeekDay; label: string; short: string }[] = [
  { id: 'MON', label: 'Monday', short: 'Mon' },
  { id: 'TUE', label: 'Tuesday', short: 'Tue' },
  { id: 'WED', label: 'Wednesday', short: 'Wed' },
  { id: 'THU', label: 'Thursday', short: 'Thu' },
  { id: 'FRI', label: 'Friday', short: 'Fri' },
  { id: 'SAT', label: 'Saturday', short: 'Sat' },
  { id: 'SUN', label: 'Sunday', short: 'Sun' },
];

export const EDUCATION_LEVELS = [
  'No formal requirement',
  'Secondary education (O/L)',
  'Higher secondary (A/L)',
  'Diploma',
  'Bachelor’s degree',
  'Master’s degree',
  'Doctorate',
  'Professional qualification',
];

/**
 * Stage templates for the hiring funnel, in the product's own vocabulary
 * (Applied → Screening → Interview → Offer → Hired).
 *
 * <p>A fixed list rather than a per-company builder: the pipeline module does
 * not exist yet, and offering an editor for something the backend cannot store
 * would be a control that only fails later. These are choices the form records,
 * not analytics it claims to run.</p>
 */
export const PIPELINE_TEMPLATES: { id: string; label: string; stages: string[] }[] = [
  {
    id: 'STANDARD',
    label: 'Standard hiring pipeline',
    stages: ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'],
  },
  {
    id: 'TECHNICAL',
    label: 'Technical hiring pipeline',
    stages: ['Applied', 'Screening', 'Technical interview', 'Panel interview', 'Offer', 'Hired'],
  },
  {
    id: 'EXECUTIVE',
    label: 'Executive hiring pipeline',
    stages: ['Applied', 'Screening', 'First interview', 'Final interview', 'Offer', 'Hired'],
  },
];

/** Beyond this a screening step has become the interview. */
export const MAX_SCREENING_QUESTIONS = 10;

export const MAX_TITLE = 120;
export const MAX_SUMMARY = 300;
export const MAX_DESCRIPTION = 5000;
export const MAX_OTHER_REQUIREMENTS = 1000;

/* --- Sections ------------------------------------------------------------ */

export interface VacancySection {
  /** Anchor id — also the DOM id the rail scrolls to. */
  id: string;
  /** The sequence number the rail and the card headings show. */
  index: string;
  title: string;
  /** One line under the heading, saying what the section is for. */
  summary: string;
  fields: JobVacancyField[];
  required: JobVacancyField[];
}

/**
 * The form's spine. Order is load-bearing twice over: it is the reading order
 * of the page, and it is the order validation walks when deciding which field
 * to focus after a failed submit.
 */
export const VACANCY_SECTIONS: VacancySection[] = [
  {
    id: 'basics',
    index: '01',
    title: 'Basic information',
    summary: 'What the role is, where it sits, and when applications close.',
    fields: [
      'title',
      'department',
      'openings',
      'employmentType',
      'workplaceType',
      'location',
      'applicationDeadline',
    ],
    required: [
      'title',
      'department',
      'openings',
      'employmentType',
      'workplaceType',
      'location',
      'applicationDeadline',
    ],
  },
  {
    id: 'description',
    index: '02',
    title: 'Job description',
    summary: 'What a candidate reads first, and what the job actually involves.',
    fields: ['jobSummary', 'jobDescription', 'keyResponsibilities'],
    required: ['jobSummary', 'jobDescription', 'keyResponsibilities'],
  },
  {
    id: 'requirements',
    index: '03',
    title: 'Candidate requirements',
    summary: 'What someone needs to do this job, and what would help.',
    fields: [
      'requiredSkills',
      'preferredSkills',
      'minimumExperienceYears',
      'education',
      'certifications',
      'languageRequirements',
      'otherRequirements',
    ],
    required: ['requiredSkills'],
  },
  {
    id: 'salary',
    index: '04',
    title: 'Salary & benefits',
    summary: 'What the role pays and what comes with it. Optional, but a stated range gets more applicants.',
    fields: ['salaryMin', 'salaryMax', 'currency', 'payPeriod', 'benefits'],
    required: [],
  },
  {
    id: 'schedule',
    index: '05',
    title: 'Work schedule',
    summary: 'The working week this role is expected to keep.',
    fields: ['workingDays', 'workingHours', 'shiftType', 'expectedHoursPerWeek'],
    required: [],
  },
  {
    id: 'recruitment',
    index: '06',
    title: 'Recruitment settings',
    summary: 'Who runs this hire, and what every applicant is asked.',
    fields: [
      'assignedRecruiterId',
      'hiringManagerId',
      'recruitmentPipelineId',
      'screeningQuestions',
    ],
    required: [],
  },
];

/** Every field in reading order — the order a failed submit walks. */
export const VACANCY_FIELD_ORDER: JobVacancyField[] = VACANCY_SECTIONS.flatMap(
  (section) => section.fields,
);

const REQUIRED_FIELDS = new Set<JobVacancyField>(
  VACANCY_SECTIONS.flatMap((section) => section.required),
);

export const isRequired = (field: JobVacancyField): boolean => REQUIRED_FIELDS.has(field);

/* --- Normalising --------------------------------------------------------- */

/** Long-form fields keep their line breaks; everything else is one line. */
const MULTILINE_FIELDS = new Set<JobVacancyField>([
  'jobSummary',
  'jobDescription',
  'otherRequirements',
]);

const TEXT_FIELDS = [
  'title',
  'department',
  'location',
  'applicationDeadline',
  'jobSummary',
  'jobDescription',
  'education',
  'otherRequirements',
  'currency',
  'workingHours',
  'assignedRecruiterId',
  'hiringManagerId',
  'recruitmentPipelineId',
] as const;

const LIST_FIELDS = [
  'keyResponsibilities',
  'requiredSkills',
  'preferredSkills',
  'certifications',
  'languageRequirements',
  'screeningQuestions',
] as const;

/**
 * The values as they would be saved. Validating and comparing raw input would
 * call a trailing space a change, and would then store it.
 */
export function normalizeVacancy(values: JobVacancyFormValues): JobVacancyFormValues {
  const normalized = { ...values };
  for (const field of TEXT_FIELDS) {
    normalized[field] = MULTILINE_FIELDS.has(field)
      ? values[field].trim()
      : values[field].trim().replace(/\s+/g, ' ');
  }
  for (const field of LIST_FIELDS) {
    normalized[field] = cleanValues(values[field]);
  }
  return normalized;
}

/** Local calendar day as `YYYY-MM-DD`. Deliberately not `toISOString`, which
 *  reports the UTC day and is a day out for anyone east of Greenwich. */
export function todayIso(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/* --- Validation ---------------------------------------------------------- */

/**
 * Field-level errors for the values as they would be saved.
 *
 * <p>Only the eleven fields marked required in {@link VACANCY_SECTIONS} are
 * enforced: a vacancy without a salary band or a shift pattern is a legitimate
 * vacancy, and a form that refuses to submit without them would be inventing
 * policy the company has not set. Everything else is checked only for shape,
 * and only when it has been filled in.</p>
 *
 * <p>Save Draft never calls this. A draft that cannot be saved because it is
 * incomplete is not a draft.</p>
 */
export function validateVacancy(values: JobVacancyFormValues): JobVacancyFieldErrors {
  const n = normalizeVacancy(values);
  const errors: JobVacancyFieldErrors = {};

  checkBasics(n, errors);
  checkDescription(n, errors);
  checkRequirements(n, errors);
  checkSalary(n, errors);
  checkSchedule(n, errors);
  checkRecruitment(n, errors);

  return errors;
}

function checkBasics(n: JobVacancyFormValues, errors: JobVacancyFieldErrors): void {
  if (n.title === '') {
    errors.title = 'A job title is required — it is the first thing a candidate reads.';
  } else if (n.title.length > MAX_TITLE) {
    errors.title = `Keep the job title under ${MAX_TITLE} characters.`;
  }

  if (n.department === '') {
    errors.department = 'Choose the department this role reports into.';
  }

  if (n.openings === null) {
    errors.openings = 'Enter how many people you are hiring.';
  } else if (!Number.isInteger(n.openings) || n.openings < 1) {
    errors.openings = 'Enter a whole number of openings — at least one.';
  } else if (n.openings > 999) {
    errors.openings = 'That is more openings than the form can be sure you meant.';
  }

  if (n.employmentType === '') {
    errors.employmentType = 'Choose an employment type.';
  }

  if (n.workplaceType === '') {
    errors.workplaceType = 'Choose whether this role is on-site, remote or hybrid.';
  }

  if (n.location === '') {
    errors.location =
      n.workplaceType === 'REMOTE'
        ? 'Remote still needs a base — name the region this role hires from.'
        : 'Enter where this role is based.';
  } else if (n.location.length > 120) {
    errors.location = 'Keep the location under 120 characters.';
  }

  if (n.applicationDeadline === '') {
    errors.applicationDeadline = 'Set the date applications close.';
  } else if (n.applicationDeadline < todayIso()) {
    errors.applicationDeadline = 'The deadline has already passed — pick a future date.';
  }
}

function checkDescription(n: JobVacancyFormValues, errors: JobVacancyFieldErrors): void {
  if (n.jobSummary === '') {
    errors.jobSummary = 'Write a one-or-two line summary — it is what appears in search results.';
  } else if (n.jobSummary.length > MAX_SUMMARY) {
    errors.jobSummary = `Keep the summary under ${MAX_SUMMARY} characters — it is ${n.jobSummary.length} right now.`;
  }

  if (n.jobDescription === '') {
    errors.jobDescription = 'Describe the role. This is the body of the advert.';
  } else if (n.jobDescription.length > MAX_DESCRIPTION) {
    errors.jobDescription = `Keep the description under ${MAX_DESCRIPTION} characters — it is ${n.jobDescription.length} right now.`;
  }

  if (n.keyResponsibilities.length === 0) {
    errors.keyResponsibilities = 'Add at least one responsibility.';
  }
}

function checkRequirements(n: JobVacancyFormValues, errors: JobVacancyFieldErrors): void {
  if (n.requiredSkills.length === 0) {
    errors.requiredSkills = 'Add at least one required skill.';
  }

  if (n.minimumExperienceYears !== null) {
    if (!Number.isInteger(n.minimumExperienceYears) || n.minimumExperienceYears < 0) {
      errors.minimumExperienceYears = 'Enter a whole number of years, or leave it blank.';
    } else if (n.minimumExperienceYears > 50) {
      errors.minimumExperienceYears = 'Enter 50 years or fewer.';
    }
  }

  if (n.otherRequirements.length > MAX_OTHER_REQUIREMENTS) {
    errors.otherRequirements = `Keep other requirements under ${MAX_OTHER_REQUIREMENTS} characters.`;
  }
}

function checkSalary(n: JobVacancyFormValues, errors: JobVacancyFieldErrors): void {
  for (const field of ['salaryMin', 'salaryMax'] as const) {
    const value = n[field];
    if (value !== null && value < 0) {
      errors[field] = 'A salary cannot be negative.';
    }
  }

  if (
    n.salaryMin !== null &&
    n.salaryMax !== null &&
    !errors.salaryMin &&
    !errors.salaryMax &&
    n.salaryMax < n.salaryMin
  ) {
    errors.salaryMax = 'The maximum must be at least the minimum.';
  }

  // A number with no unit is not a salary: a candidate reading "150,000" has to
  // guess both the currency and whether it is a month or a year.
  if ((n.salaryMin !== null || n.salaryMax !== null) && n.currency === '') {
    errors.currency = 'Choose a currency for the range you entered.';
  }
  if ((n.salaryMin !== null || n.salaryMax !== null) && n.payPeriod === '') {
    errors.payPeriod = 'Say whether that range is hourly, monthly or yearly.';
  }
}

function checkSchedule(n: JobVacancyFormValues, errors: JobVacancyFieldErrors): void {
  if (n.workingHours.length > 60) {
    errors.workingHours = 'Keep working hours short, like “9:00 AM – 6:00 PM”.';
  }

  if (n.expectedHoursPerWeek !== null) {
    if (n.expectedHoursPerWeek <= 0) {
      errors.expectedHoursPerWeek = 'Enter the hours a week this role is expected to work.';
    } else if (n.expectedHoursPerWeek > 168) {
      errors.expectedHoursPerWeek = 'There are only 168 hours in a week.';
    }
  }
}

function checkRecruitment(n: JobVacancyFormValues, errors: JobVacancyFieldErrors): void {
  if (n.screeningQuestions.length > MAX_SCREENING_QUESTIONS) {
    errors.screeningQuestions = `Ask at most ${MAX_SCREENING_QUESTIONS} screening questions — past that it is an interview.`;
  }
}

/** The first invalid field in reading order, so a failed submit lands there. */
export function firstInvalidField(errors: JobVacancyFieldErrors): JobVacancyField | null {
  return VACANCY_FIELD_ORDER.find((field) => errors[field]) ?? null;
}

/** Which sections hold at least one error, for the rail's error marks. */
export function sectionsWithErrors(errors: JobVacancyFieldErrors): Set<string> {
  const ids = new Set<string>();
  for (const section of VACANCY_SECTIONS) {
    if (section.fields.some((field) => errors[field])) {
      ids.add(section.id);
    }
  }
  return ids;
}

/* --- Progress ------------------------------------------------------------ */

/**
 * True when a field holds something a person actually entered.
 *
 * <p>Blank list entries do not count: the bullet editor keeps an empty row on
 * screen to type into, and a section must not report itself answered because
 * someone pressed Add.</p>
 */
export function hasValue(values: JobVacancyFormValues, field: JobVacancyField): boolean {
  const value = values[field];
  if (Array.isArray(value)) {
    return value.some((entry) => entry.trim() !== '');
  }
  if (typeof value === 'number') {
    return true;
  }
  return typeof value === 'string' && value.trim() !== '';
}

export interface SectionProgress {
  /** Required fields answered. */
  filled: number;
  /** Required fields in the section. */
  total: number;
  /** A section with no required fields is complete once it is left alone. */
  complete: boolean;
  /** Optional fields answered, so an all-optional section can still show work. */
  optionalFilled: number;
}

export function sectionProgress(
  values: JobVacancyFormValues,
  section: VacancySection,
): SectionProgress {
  const filled = section.required.filter((field) => hasValue(values, field)).length;
  const optionalFilled = section.fields.filter(
    (field) => !section.required.includes(field) && hasValue(values, field),
  ).length;
  return {
    filled,
    total: section.required.length,
    complete: filled === section.required.length,
    optionalFilled,
  };
}

/** Anything entered at all — what Cancel checks before confirming. */
export function isVacancyDirty(values: JobVacancyFormValues): boolean {
  const n = normalizeVacancy(values);
  return VACANCY_FIELD_ORDER.some((field) => {
    const current = n[field];
    const empty = EMPTY_VACANCY_VALUES[field];
    if (Array.isArray(current) && Array.isArray(empty)) {
      return current.length !== empty.length;
    }
    return current !== empty;
  });
}

/* --- Wire shapes --------------------------------------------------------- */

/** Form state → request body. Blank optionals travel as null, never as `''`. */
export function toVacancyRequest(
  values: JobVacancyFormValues,
  status: VacancyStatus,
): JobVacancyRequest {
  const n = normalizeVacancy(values);
  const orNull = (value: string) => (value === '' ? null : value);

  return {
    // Required on the wire. A draft can legitimately be missing these, so the
    // empty string stands in rather than a lie — the backend rejects a publish
    // without them, and the form never reaches PUBLISHED without validating.
    title: n.title,
    department: n.department,
    openings: n.openings ?? 1,
    employmentType: (n.employmentType || 'FULL_TIME') as EmploymentType,
    workplaceType: (n.workplaceType || 'ON_SITE') as WorkplaceType,
    location: n.location,
    applicationDeadline: n.applicationDeadline,

    jobSummary: n.jobSummary,
    jobDescription: n.jobDescription,
    keyResponsibilities: n.keyResponsibilities,

    requiredSkills: n.requiredSkills,
    preferredSkills: n.preferredSkills,
    minimumExperienceYears: n.minimumExperienceYears,
    education: orNull(n.education),
    certifications: n.certifications,
    languageRequirements: n.languageRequirements,
    otherRequirements: orNull(n.otherRequirements),

    salaryMin: n.salaryMin,
    salaryMax: n.salaryMax,
    currency: orNull(n.currency),
    payPeriod: n.payPeriod === '' ? null : n.payPeriod,
    benefits: n.benefits,

    workingDays: n.workingDays,
    workingHours: orNull(n.workingHours),
    shiftType: n.shiftType === '' ? null : n.shiftType,
    expectedHoursPerWeek: n.expectedHoursPerWeek,

    assignedRecruiterId: orNull(n.assignedRecruiterId),
    hiringManagerId: orNull(n.hiringManagerId),
    recruitmentPipelineId: orNull(n.recruitmentPipelineId),
    screeningQuestions: n.screeningQuestions,

    status,
  };
}

/* --- Labels for reading back --------------------------------------------- */

const labelFrom = <T extends string>(catalogue: { id: T; label: string }[], id: T | null) =>
  catalogue.find((entry) => entry.id === id)?.label ?? null;

export const employmentTypeLabel = (id: EmploymentType | null) => labelFrom(EMPLOYMENT_TYPES, id);
export const workplaceTypeLabel = (id: WorkplaceType | null) => labelFrom(WORKPLACE_TYPES, id);
export const payPeriodLabel = (id: PayPeriod | null) => labelFrom(PAY_PERIODS, id);
export const shiftTypeLabel = (id: ShiftType | null) => labelFrom(SHIFT_TYPES, id);

export const pipelineLabel = (id: string | null) =>
  PIPELINE_TEMPLATES.find((template) => template.id === id)?.label ?? null;

/** 'ISO — Name' → 'ISO'. The code is what belongs next to a number. */
export function currencyCode(currency: string | null): string {
  return currency ? currency.split('—')[0].trim() : '';
}

/**
 * 'Mon–Fri' where the selection is a run, 'Mon, Wed, Fri' where it is not.
 * A five-day week is the common case and deserves to read like one.
 */
export function formatWorkingDays(days: WeekDay[]): string {
  if (days.length === 0) {
    return '';
  }
  const order = WEEK_DAYS.map((day) => day.id);
  const chosen = order.filter((id) => days.includes(id));
  const indexes = chosen.map((id) => order.indexOf(id));
  const isRun =
    chosen.length > 2 && indexes.every((value, i) => i === 0 || value === indexes[i - 1] + 1);
  const short = (id: WeekDay) => WEEK_DAYS.find((day) => day.id === id)?.short ?? id;
  return isRun
    ? `${short(chosen[0])}–${short(chosen[chosen.length - 1])}`
    : chosen.map(short).join(', ');
}

/** '150,000 – 220,000 LKR per month', with whichever halves exist. */
export function formatSalary(vacancy: JobVacancyResponse): string {
  const { salaryMin, salaryMax, currency, payPeriod } = vacancy;
  if (salaryMin === null && salaryMax === null) {
    return '';
  }
  const amount = (value: number) => value.toLocaleString();
  let range: string;
  if (salaryMin !== null && salaryMax !== null) {
    range = `${amount(salaryMin)} – ${amount(salaryMax)}`;
  } else if (salaryMin !== null) {
    range = `From ${amount(salaryMin)}`;
  } else {
    range = `Up to ${amount(salaryMax as number)}`;
  }
  const code = currencyCode(currency);
  const period = payPeriodLabel(payPeriod);
  return [range, code, period].filter(Boolean).join(' ');
}

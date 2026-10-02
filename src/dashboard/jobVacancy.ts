import type {
  EmploymentType,
  JobVacancyRequest,
  JobVacancyResponse,
  JobVacancyUpdateRequest,
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
  // Hidden from the form: every field in it is optional, and the pipeline and
  // recruiter modules it points at are not built yet. The fields stay in
  // JobVacancyFormValues and on the wire, so restoring the section is putting
  // this entry back — nothing stored is lost in the meantime.
  // {
  //   id: 'recruitment',
  //   index: '06',
  //   title: 'Recruitment settings',
  //   summary: 'Who runs this hire, and what every applicant is asked.',
  //   fields: [
  //     'assignedRecruiterId',
  //     'hiringManagerId',
  //     'recruitmentPipelineId',
  //     'screeningQuestions',
  //   ],
  //   required: [],
  // },
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

/** Required fields across the whole form — the denominator of every "7 of 11". */
export const REQUIRED_TOTAL = VACANCY_SECTIONS.reduce(
  (count, section) => count + section.required.length,
  0,
);

/** Required fields answered across every section. */
export function requiredFilled(values: JobVacancyFormValues): number {
  return VACANCY_SECTIONS.reduce(
    (count, section) => count + sectionProgress(values, section).filled,
    0,
  );
}

/**
 * Anything changed since the form opened — what Cancel checks before asking.
 *
 * <p>Compared against where the form started, not against an empty form: an
 * edit opens full, and measuring it against blank would call an untouched edit
 * "unsaved changes" and make Cancel ask about nothing. Both sides are
 * normalised first, so a trailing space or an empty bullet row is not a
 * change.</p>
 */
export function isVacancyDirty(
  values: JobVacancyFormValues,
  initial: JobVacancyFormValues = EMPTY_VACANCY_VALUES,
): boolean {
  const n = normalizeVacancy(values);
  const start = normalizeVacancy(initial);
  return VACANCY_FIELD_ORDER.some((field) => {
    const current = n[field];
    const before = start[field];
    if (Array.isArray(current) && Array.isArray(before)) {
      return current.length !== before.length || current.some((entry, i) => entry !== before[i]);
    }
    return current !== before;
  });
}

/* --- Wire shapes --------------------------------------------------------- */

/** Form state → request body. Blank optionals travel as null, never as `''`. */
export function toVacancyRequest(
  values: JobVacancyFormValues,
  status: VacancyStatus,
): JobVacancyRequest {
  return { ...toVacancyContent(values), status };
}

/**
 * Form state → the body of an edit. Status is not part of it — every status
 * change has its own endpoint — and `version` is the lock the edit was made
 * against, so a save that lost a race is refused rather than winning it.
 */
export function toVacancyUpdate(
  values: JobVacancyFormValues,
  version: number,
): JobVacancyUpdateRequest {
  return { ...toVacancyContent(values), version };
}

/** The content fields both a create and an edit carry. */
function toVacancyContent(values: JobVacancyFormValues): Omit<JobVacancyRequest, 'status'> {
  const n = normalizeVacancy(values);
  const orNull = (value: string) => (value === '' ? null : value);

  return {
    // Required to publish, optional on a draft. Text stays a string; a choice
    // or a date nobody made travels as null rather than as a default someone
    // could mistake for an answer — the backend refuses to publish without
    // them, and the form never reaches PUBLISHED without validating.
    title: n.title,
    department: n.department,
    openings: n.openings ?? 1,
    employmentType: n.employmentType === '' ? null : n.employmentType,
    workplaceType: n.workplaceType === '' ? null : n.workplaceType,
    location: n.location,
    applicationDeadline: orNull(n.applicationDeadline),

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
  };
}

/**
 * A stored vacancy → form state, for Edit and Duplicate.
 *
 * <p>The inverse of {@link toVacancyContent}: every null the wire carries for
 * "not chosen" becomes the `''` an empty control yields, and lists are copied
 * so the form can never mutate the record it was opened from.</p>
 */
export function toFormValues(vacancy: JobVacancyResponse): JobVacancyFormValues {
  return {
    title: vacancy.title ?? '',
    department: vacancy.department ?? '',
    openings: vacancy.openings ?? 1,
    employmentType: vacancy.employmentType ?? '',
    workplaceType: vacancy.workplaceType ?? '',
    location: vacancy.location ?? '',
    applicationDeadline: vacancy.applicationDeadline ?? '',
    jobSummary: vacancy.jobSummary ?? '',
    jobDescription: vacancy.jobDescription ?? '',
    keyResponsibilities: [...(vacancy.keyResponsibilities ?? [])],
    requiredSkills: [...(vacancy.requiredSkills ?? [])],
    preferredSkills: [...(vacancy.preferredSkills ?? [])],
    minimumExperienceYears: vacancy.minimumExperienceYears ?? null,
    education: vacancy.education ?? '',
    certifications: [...(vacancy.certifications ?? [])],
    languageRequirements: [...(vacancy.languageRequirements ?? [])],
    otherRequirements: vacancy.otherRequirements ?? '',
    salaryMin: vacancy.salaryMin ?? null,
    salaryMax: vacancy.salaryMax ?? null,
    currency: vacancy.currency ?? '',
    payPeriod: vacancy.payPeriod ?? '',
    benefits: [...(vacancy.benefits ?? [])],
    workingDays: [...(vacancy.workingDays ?? [])],
    workingHours: vacancy.workingHours ?? '',
    shiftType: vacancy.shiftType ?? '',
    expectedHoursPerWeek: vacancy.expectedHoursPerWeek ?? null,
    assignedRecruiterId: vacancy.assignedRecruiterId ?? '',
    hiringManagerId: vacancy.hiringManagerId ?? '',
    recruitmentPipelineId: vacancy.recruitmentPipelineId ?? '',
    screeningQuestions: [...(vacancy.screeningQuestions ?? [])],
  };
}

/**
 * The starting point for a duplicate (PB-021).
 *
 * <p>Content is copied; everything that describes *that* vacancy's life is not.
 * No id, status, timestamps or applicant count — the copy is a new vacancy that
 * has not been anywhere yet. The deadline is cleared because the original's
 * date is almost never right for the new round, and a copied one that happens
 * to still be valid is exactly the kind that gets published unchecked.</p>
 */
export function duplicateValues(vacancy: JobVacancyResponse): JobVacancyFormValues {
  const values = toFormValues(vacancy);
  return {
    ...values,
    title: values.title.trim() === '' ? '' : `${values.title.trim()} (copy)`,
    applicationDeadline: '',
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

/* --- Lifecycle (PB-018 → PB-022) ----------------------------------------- */

/**
 * Every legal status move, and nothing else.
 *
 * <p>The backlog defines publishing, closing and archiving but not their
 * inverses, so there is no reopen, unpublish or unarchive here — inventing one
 * would put a button on screen that the backend has never agreed to honour.
 * This table is the one place to change when that agreement is made; every
 * menu, header and guard below reads from it.</p>
 */
export const VACANCY_TRANSITIONS: Record<VacancyStatus, readonly VacancyStatus[]> = {
  DRAFT: ['PUBLISHED'],
  PUBLISHED: ['CLOSED'],
  CLOSED: ['ARCHIVED'],
  ARCHIVED: [],
};

export const VACANCY_STATUS_LABEL: Record<VacancyStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  CLOSED: 'Closed',
  ARCHIVED: 'Archived',
};

export function canTransition(from: VacancyStatus, to: VacancyStatus): boolean {
  return VACANCY_TRANSITIONS[from].includes(to);
}

/**
 * Content can change while a vacancy is a draft or live. Once closed, the
 * advert candidates applied to is the record of what they applied to, and
 * rewriting it would change history under them.
 */
export function canEditVacancy(status: VacancyStatus): boolean {
  return status === 'DRAFT' || status === 'PUBLISHED';
}

export type VacancyAction = 'view' | 'edit' | 'publish' | 'duplicate' | 'close' | 'archive';

export interface VacancyActionSet {
  /** Shown as buttons, in this order. */
  primary: VacancyAction[];
  /** Behind the ⋮ menu. Destructive moves come last, below a divider. */
  overflow: VacancyAction[];
}

/** Actions that end something. Separated in menus and confirmed in a dialog. */
export const DESTRUCTIVE_ACTIONS: ReadonlySet<VacancyAction> = new Set(['close', 'archive']);

/**
 * What a recruiter can do with a vacancy in a given state, and where each
 * action sits.
 *
 * <p>An action the state does not allow is absent, not disabled: a greyed
 * "Publish" on a closed vacancy can never become clickable, so all it does is
 * make the reader work out why. The two contexts differ only in that a list row
 * offers View (the detail page is the destination) and the detail page does
 * not (it is already there).</p>
 */
export function vacancyActions(
  status: VacancyStatus,
  context: 'list' | 'detail' = 'list',
): VacancyActionSet {
  const sets: Record<VacancyStatus, VacancyActionSet> = {
    DRAFT: { primary: ['edit', 'publish'], overflow: ['duplicate'] },
    PUBLISHED: { primary: ['view', 'edit'], overflow: ['duplicate', 'close'] },
    CLOSED: { primary: ['view'], overflow: ['duplicate', 'archive'] },
    ARCHIVED: { primary: ['view'], overflow: [] },
  };
  const set = sets[status];
  if (context === 'list') {
    return set;
  }
  // On the detail page the most useful next step leads; for a closed vacancy
  // that is reusing it, since nothing else about it can change.
  if (status === 'CLOSED') {
    return { primary: ['duplicate'], overflow: ['archive'] };
  }
  return { primary: set.primary.filter((action) => action !== 'view'), overflow: set.overflow };
}

/* --- Deadline ------------------------------------------------------------ */

const DAY_MS = 86_400_000;

/** Whole days from `fromIso` to `toIso`, both `YYYY-MM-DD`. Calendar days, not 24h spans. */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY_MS);
}

export interface DeadlineSignal {
  tone: 'neutral' | 'warning';
  label: string;
}

/** Inside this many days a live deadline is worth the recruiter's attention. */
const DEADLINE_SOON_DAYS = 3;

/**
 * How close the deadline is, in words.
 *
 * <p>Only for a vacancy that is not finished: once closed or archived the date
 * is history, and "Deadline passed" under a closed vacancy would read as a
 * problem when it is simply what happened. Amber is spent only where there is
 * something to do — a live role about to close, or one still live past its own
 * deadline, or a draft whose date would block publishing.</p>
 */
export function deadlineSignal(
  vacancy: Pick<JobVacancyResponse, 'status' | 'applicationDeadline'>,
  today: string = todayIso(),
): DeadlineSignal | null {
  if (vacancy.status === 'CLOSED' || vacancy.status === 'ARCHIVED') {
    return null;
  }
  if (!vacancy.applicationDeadline) {
    return { tone: 'neutral', label: 'No deadline set' };
  }
  const days = daysBetween(today, vacancy.applicationDeadline);
  if (days < 0) {
    return {
      tone: 'warning',
      label: vacancy.status === 'PUBLISHED' ? 'Deadline passed' : 'Deadline passed — set a new one',
    };
  }
  if (days === 0) {
    return { tone: 'warning', label: 'Closes today' };
  }
  if (days === 1) {
    return { tone: 'warning', label: 'Closes tomorrow' };
  }
  return { tone: days <= DEADLINE_SOON_DAYS ? 'warning' : 'neutral', label: `Closes in ${days} days` };
}

/* --- Publish readiness ---------------------------------------------------- */

export interface PublishBlocker {
  section: VacancySection;
  /** Field labels, in reading order. */
  fields: string[];
}

/**
 * What stands between a stored draft and publishing it, grouped by section.
 *
 * <p>A draft is saved without validation on purpose, which means a Publish
 * button anywhere outside the form could otherwise push a half-written advert
 * live. This runs the same rules the form runs, against the record as stored,
 * so the list and detail pages can refuse in advance — and say where to go —
 * instead of letting the backend refuse after a confirmation.</p>
 */
export function publishBlockers(
  vacancy: JobVacancyResponse,
  today: string = todayIso(),
): PublishBlocker[] {
  const values = toFormValues(vacancy);
  const errors = validateVacancy(values);
  // validateVacancy reads the real clock for the deadline; re-check against the
  // given day so the answer is the same one the caller is reasoning about.
  if (values.applicationDeadline !== '' && values.applicationDeadline >= today) {
    delete errors.applicationDeadline;
  }
  return VACANCY_SECTIONS.map((section) => ({
    section,
    fields: section.fields.filter((field) => errors[field]).map((field) => FIELD_LABELS[field]),
  })).filter((blocker) => blocker.fields.length > 0);
}

/** "Job title, Application deadline and Required skills" — for one sentence. */
export function joinLabels(labels: string[]): string {
  if (labels.length <= 1) {
    return labels.join('');
  }
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

/** How much of a stored vacancy is filled in, for a draft's row. */
export function vacancyCompleteness(vacancy: JobVacancyResponse): { filled: number; total: number } {
  return { filled: requiredFilled(toFormValues(vacancy)), total: REQUIRED_TOTAL };
}

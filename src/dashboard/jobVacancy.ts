import type {
  EmploymentType,
  InterviewPanelRequest,
  InterviewPanelResponse,
  JobVacancyRequest,
  JobVacancyResponse,
  JobVacancyUpdateRequest,
  MemberSummary,
  PayPeriod,
  ShiftType,
  VacancyStatus,
  WeekDay,
  WorkplaceType,
} from '../api/types';
import { currencyCode } from '../utils/format';
import {
  matchingKey,
  matchingProblems,
  toMatchingRequest,
  type IdealMatchingDraft,
} from './idealMatching';
import { cleanValues } from './companyProfile';

/**
 * Derivation layer for job vacancies.
 *
 * <p>Everything the vacancy screens decide — what a section contains, what a
 * field must hold, which fields are required, what a form becomes on the wire —
 * lives here, pure and DOM-free, so the rules can be tested without a render.
 * The pages orchestrate; this file knows the vocabulary.</p>
 *
 * <p>{@link VACANCY_SECTIONS} is the spine. The stepper, the six cards, the
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
  /** One of the company's industries; `''` leaves it to the server (the main one, or what it had). */
  industry: string;
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
  /** Tools, technologies and platforms the person will use — Docker, Git, AWS. */
  toolsAndTechnologies: string[];
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

  /** The template the vacancy runs on; `''` until one is chosen. Fixed once the vacancy exists. */
  pipelineTemplateId: string;
  /** Display only: the template's name as the vacancy stored it. Never sent. */
  pipelineTemplateName: string;
  /** Screening settings, 0–100 with manual below auto. */
  autoThreshold: number | null;
  manualThreshold: number | null;
  blindModeEnabled: boolean;

  /**
   * Who interviews in each interview round, in pipeline order. `null` until
   * the rounds are known — no template chosen yet, or the stored panels not
   * read — and then nothing is checked or sent, so the server keeps what it has.
   */
  interviewPanels: InterviewPanelDraft[] | null;

  /** Display only: whether the vacancy's pipeline template offers ideal candidate matching. Never sent. */
  idealMatchingAvailable: boolean;
  /**
   * The ideal candidate: weighted skills, tools and experience sharing 100%,
   * and the unweighted degree types and certifications. `null` until the
   * stored profile is read; nothing is then checked or sent.
   */
  idealMatching: IdealMatchingDraft | null;
}

/**
 * One interview round's panel as the form holds it. The people are kept
 * whole, not as ids, so a chosen person stays named on screen after the
 * search that found them has moved on.
 */
export interface InterviewPanelDraft {
  stagePosition: number;
  stageName: string;
  /** 1–{@link MAX_INTERVIEWERS}; `null` until decided. */
  interviewerCount: number | null;
  interviewers: MemberSummary[];
}

/** The most interviewers one round may have; the server and the database say the same. */
export const MAX_INTERVIEWERS = 10;

export type JobVacancyField = keyof JobVacancyFormValues;

/** Every way the vacancy form is opened. */
export type VacancyFormMode = 'create' | 'duplicate' | 'edit-draft' | 'edit-published';

/** A form that will create a vacancy, rather than change a stored one. */
export const createsVacancy = (mode: VacancyFormMode): boolean =>
  mode === 'create' || mode === 'duplicate';
export type JobVacancyFieldErrors = Partial<Record<JobVacancyField, string>>;

export const EMPTY_VACANCY_VALUES: JobVacancyFormValues = {
  title: '',
  department: '',
  industry: '',
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
  toolsAndTechnologies: [],
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
  pipelineTemplateId: '',
  pipelineTemplateName: '',
  autoThreshold: null,
  manualThreshold: null,
  blindModeEnabled: false,
  interviewPanels: null,
  idealMatchingAvailable: false,
  idealMatching: {
    enabled: false,
    items: [],
    degreeTypes: [],
    niceToHaveCertifications: [],
  },
};

export const FIELD_LABELS: Record<JobVacancyField, string> = {
  title: 'Job title',
  department: 'Department',
  industry: 'Industry',
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
  toolsAndTechnologies: 'Tools & technologies',
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
  pipelineTemplateId: 'Pipeline template',
  pipelineTemplateName: 'Pipeline template',
  autoThreshold: 'Auto-advance threshold',
  manualThreshold: 'Manual-review threshold',
  blindModeEnabled: 'Blind screening',
  interviewPanels: 'Interview panels',
  idealMatchingAvailable: 'Ideal candidate matching',
  idealMatching: 'Ideal candidate matching',
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
      'industry',
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
      'toolsAndTechnologies',
      'minimumExperienceYears',
      'education',
      'certifications',
      'languageRequirements',
      'otherRequirements',
    ],
    required: ['requiredSkills'],
  },
  {
    // Pay and hours are one step: both optional, both what a candidate weighs
    // an offer by, and short enough that two steps of them were mostly chrome.
    id: 'compensation',
    index: '04',
    title: 'Compensation & schedule',
    summary:
      'What the role pays, what comes with it, and the working week it keeps. All optional, but a stated salary range gets more applicants.',
    fields: [
      'salaryMin',
      'salaryMax',
      'currency',
      'payPeriod',
      'benefits',
      'workingDays',
      'workingHours',
      'shiftType',
      'expectedHoursPerWeek',
    ],
    required: [],
  },
  {
    id: 'pipeline',
    index: '05',
    title: 'Pipeline & screening',
    summary: 'The stages applicants move through, and how AI screening sorts them.',
    fields: ['pipelineTemplateId', 'autoThreshold', 'manualThreshold', 'blindModeEnabled', 'interviewPanels'],
    // Empty on purpose. The template is required to create a vacancy, which
    // validatePipelineChoice enforces in the two modes that create one; listing
    // it here would also demand it of vacancies older than templates, which
    // could then never be published.
    required: [],
  },
  {
    id: 'matching',
    index: '06',
    title: 'Ideal candidate matching',
    summary: 'Who the best applicant is, and how much each skill, tool and experience counts in AI screening.',
    fields: ['idealMatching'],
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
const VACANCY_FIELD_ORDER: JobVacancyField[] = VACANCY_SECTIONS.flatMap(
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
  'industry',
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
  'toolsAndTechnologies',
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
  checkPipeline(n, errors);
  checkPanels(n, errors, true);
  checkMatching(n, errors, true);

  return errors;
}

/** The sentences the backend answers with, so the form and the server say the same thing. */
export const PIPELINE_MESSAGES = {
  templateRequired: 'Pipeline template is required.',
  autoRequired: 'Enter the auto-advance threshold.',
  manualRequired: 'Enter the manual-review threshold.',
  thresholdRange: 'Set the threshold between 0 and 100.',
  thresholdOrder: 'The manual threshold must be lower than the auto threshold.',
} as const;

/**
 * Whether the vacancy in the form runs on a pipeline: a template is chosen, or
 * it already has one. Only a vacancy created before pipeline templates has
 * none of these, and it then has no screening settings to show or send. Read
 * from the values rather than the template id, because deleting a template
 * clears the id while the vacancy keeps its name and thresholds.
 */
export function runsOnPipeline(values: JobVacancyFormValues): boolean {
  return (
    values.pipelineTemplateId !== '' ||
    values.pipelineTemplateName !== '' ||
    values.autoThreshold !== null ||
    values.manualThreshold !== null
  );
}

function checkThreshold(value: number | null, missing: string): string | undefined {
  if (value === null) {
    return missing;
  }
  return Number.isInteger(value) && value >= 0 && value <= 100 ? undefined : PIPELINE_MESSAGES.thresholdRange;
}

function checkPipeline(n: JobVacancyFormValues, errors: JobVacancyFieldErrors): void {
  if (!runsOnPipeline(n)) {
    return;
  }
  const auto = checkThreshold(n.autoThreshold, PIPELINE_MESSAGES.autoRequired);
  const manual = checkThreshold(n.manualThreshold, PIPELINE_MESSAGES.manualRequired);
  if (auto) {
    errors.autoThreshold = auto;
  }
  if (manual) {
    errors.manualThreshold = manual;
  } else if (!auto && n.manualThreshold !== null && n.autoThreshold !== null && n.manualThreshold >= n.autoThreshold) {
    errors.manualThreshold = PIPELINE_MESSAGES.thresholdOrder;
  }
}

/* --- Interview panels ---------------------------------------------------- */

const interviewers = (count: number) => (count === 1 ? 'interviewer' : 'interviewers');

/**
 * What is wrong with one round's panel, in the server's own words, or `null`.
 *
 * <p>Some problems are refused in every state — more people than the count
 * asks for, or people before a count — because no vacancy could ever be
 * right that way. Being short is only a problem for publishing: a draft is
 * where a panel gets put together.</p>
 */
export function panelProblem(panel: InterviewPanelDraft, forPublish: boolean): string | null {
  const chosen = panel.interviewers.length;
  if (panel.interviewerCount === null) {
    if (chosen > 0) {
      return `Set how many interviewers ${panel.stageName} needs before choosing them.`;
    }
    return forPublish ? `${panel.stageName} needs its interviewers` : null;
  }
  if (chosen > panel.interviewerCount) {
    return `${panel.stageName} has ${chosen} ${interviewers(chosen)} but needs only ${panel.interviewerCount}. Remove some or raise the number.`;
  }
  if (forPublish && chosen < panel.interviewerCount) {
    return `${panel.stageName} needs ${panel.interviewerCount} ${interviewers(panel.interviewerCount)}, ${chosen} chosen`;
  }
  return null;
}

/** Every round's problems as one sentence, the way the server reports them. */
function checkPanels(n: JobVacancyFormValues, errors: JobVacancyFieldErrors, forPublish: boolean): void {
  if (n.interviewPanels === null) {
    return;
  }
  const problems = n.interviewPanels
    .map((panel) => panelProblem(panel, forPublish))
    .filter((problem): problem is string => problem !== null)
    .map((problem) => problem.replace(/\.$/, ''));
  if (problems.length > 0) {
    errors.interviewPanels = `${problems.join('; ')}.`;
  }
}

/** The rounds of a freshly chosen pipeline, with nobody on them yet — keeping any panel already put together for the same round. */
export function panelDraftsFor(
  stages: { position: number; stageType: string; name: string }[],
  existing: InterviewPanelDraft[] | null,
): InterviewPanelDraft[] {
  return stages
    .filter((stage) => stage.stageType === 'INTERVIEW')
    .sort((a, b) => a.position - b.position)
    .map((stage) => {
      const kept = existing?.find((panel) => panel.stagePosition === stage.position);
      return kept
        ? { ...kept, stageName: stage.name }
        : { stagePosition: stage.position, stageName: stage.name, interviewerCount: null, interviewers: [] };
    });
}

/** A vacancy's stored panels → form state. */
export function toPanelDrafts(panels: InterviewPanelResponse[]): InterviewPanelDraft[] {
  return [...panels]
    .sort((a, b) => a.position - b.position)
    .map((panel) => ({
      stagePosition: panel.position,
      stageName: panel.name,
      interviewerCount: panel.interviewerCount,
      interviewers: panel.interviewers.map((person) => ({ ...person })),
    }));
}

/**
 * The panels a duplicate starts from: the original's, minus anyone who can no
 * longer sit on one — the same people the server would refuse to add.
 */
export function duplicatePanels(panels: InterviewPanelResponse[]): InterviewPanelDraft[] {
  return toPanelDrafts(panels).map((panel) => ({
    ...panel,
    interviewers: panel.interviewers.filter((person) => person.status === 'ACTIVE'),
  }));
}

/** Form panels → the request body; `null` sends nothing, so the server keeps what it has. */
function toPanelRequests(panels: InterviewPanelDraft[] | null): InterviewPanelRequest[] | null {
  return panels === null
    ? null
    : panels.map((panel) => ({
        stagePosition: panel.stagePosition,
        interviewerCount: panel.interviewerCount,
        interviewerIds: panel.interviewers.map((person) => person.id),
      }));
}

/**
 * The ideal candidate's problems as one sentence. Some block every save; the
 * 100% rule waits for Publish, and only applies with matching switched on.
 */
function checkMatching(n: JobVacancyFormValues, errors: JobVacancyFieldErrors, forPublish: boolean): void {
  if (n.idealMatching === null) {
    return;
  }
  const { summary } = matchingProblems(n.idealMatching, forPublish);
  if (summary) {
    errors.idealMatching = summary;
  }
}

/** A comparable fingerprint of the panels, for the unsaved-changes check. */
function panelsKey(panels: InterviewPanelDraft[] | null): string {
  if (panels === null) {
    return 'none';
  }
  return panels
    .map((panel) => `${panel.stagePosition}:${panel.interviewerCount ?? '-'}:${panel.interviewers.map((person) => person.id).join(',')}`)
    .join('|');
}

/**
 * The pipeline rules, which a draft is held to as well. The server applies
 * them to every save: a new vacancy needs a template, because its stages are
 * copied the moment the vacancy is stored, and the thresholds must be whole
 * scores with manual below auto. A threshold left empty would not clear on
 * the server either — on an edit `null` keeps the stored value — so the form
 * asks for both rather than show a value the vacancy does not have.
 * A stored vacancy's template is fixed, so an edit never asks for one.
 */
export function validatePipeline(values: JobVacancyFormValues, mode: VacancyFormMode): JobVacancyFieldErrors {
  const errors: JobVacancyFieldErrors = {};
  if (createsVacancy(mode) && values.pipelineTemplateId === '') {
    errors.pipelineTemplateId = PIPELINE_MESSAGES.templateRequired;
  }
  checkPipeline(values, errors);
  // Only what is wrong in every state; a short panel waits for Publish.
  checkPanels(values, errors, false);
  checkMatching(values, errors, false);
  return errors;
}

/** Required fields of a section in this form: the template too, when the form creates the vacancy. */
export function requiredFieldsOf(section: VacancySection, mode: VacancyFormMode): JobVacancyField[] {
  return section.id === 'pipeline' && createsVacancy(mode) ? ['pipelineTemplateId'] : section.required;
}

/** Whether this form asks for the field before it can be saved or published. */
export const isRequiredIn = (field: JobVacancyField, mode: VacancyFormMode): boolean =>
  isRequired(field) || (field === 'pipelineTemplateId' && createsVacancy(mode));

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

/* --- Steps --------------------------------------------------------------- */

/** The step after the sections, where the vacancy is read back before it goes out. */
export const REVIEW_STEP = 'review';

/** Every step of the form, in the order Next walks them: the sections, then the review. */
export const VACANCY_STEP_IDS: string[] = [...VACANCY_SECTIONS.map((section) => section.id), REVIEW_STEP];

/**
 * Every rule the form is held to before it can go out: the publish rules and
 * the pipeline rules this mode adds. What Publish checks, and what each Next
 * checks a slice of.
 */
export function vacancyProblems(values: JobVacancyFormValues, mode: VacancyFormMode): JobVacancyFieldErrors {
  return { ...validateVacancy(values), ...validatePipeline(values, mode) };
}

/** The problems that belong to one section — what stops Next on its step. */
export function sectionProblems(errors: JobVacancyFieldErrors, sectionId: string): JobVacancyFieldErrors {
  const section = VACANCY_SECTIONS.find((entry) => entry.id === sectionId);
  const found: JobVacancyFieldErrors = {};
  for (const field of section?.fields ?? []) {
    if (errors[field]) {
      found[field] = errors[field];
    }
  }
  return found;
}

/**
 * The furthest step someone may open, as an index into {@link VACANCY_STEP_IDS}.
 *
 * <p>Next refuses to leave a section with problems, so a step is reachable
 * only when every section before it is in order. The first section that is
 * not is as far as anyone gets; with none, the review is open.</p>
 */
export function furthestReachableStep(errors: JobVacancyFieldErrors): number {
  const blocked = VACANCY_SECTIONS.findIndex((section) => Object.keys(sectionProblems(errors, section.id)).length > 0);
  return blocked === -1 ? VACANCY_SECTIONS.length : blocked;
}

/** The section a field is asked in. */
export function sectionOf(field: JobVacancyField): VacancySection | null {
  return VACANCY_SECTIONS.find((section) => section.fields.includes(field)) ?? null;
}

/* --- Progress ------------------------------------------------------------ */

/**
 * True when a field holds something a person actually entered.
 *
 * <p>Blank list entries do not count: the bullet editor keeps an empty row on
 * screen to type into, and a section must not report itself answered because
 * someone pressed Add.</p>
 */
function hasValue(values: JobVacancyFormValues, field: JobVacancyField): boolean {
  if (field === 'interviewPanels') {
    return (values.interviewPanels ?? []).some((panel) => panel.interviewerCount !== null);
  }
  if (field === 'idealMatching') {
    return Boolean(values.idealMatching?.enabled && values.idealMatching.items.some((item) => item.weight !== null));
  }
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
  required: JobVacancyField[] = section.required,
): SectionProgress {
  const filled = required.filter((field) => hasValue(values, field)).length;
  const optionalFilled = section.fields.filter(
    (field) => !required.includes(field) && hasValue(values, field),
  ).length;
  return {
    filled,
    total: required.length,
    complete: filled === required.length,
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

/** {@link REQUIRED_TOTAL} and {@link requiredFilled} for one form: a new vacancy also needs its template. */
export function formProgress(values: JobVacancyFormValues, mode: VacancyFormMode): { filled: number; total: number } {
  return VACANCY_SECTIONS.reduce(
    (sum, section) => {
      const progress = sectionProgress(values, section, requiredFieldsOf(section, mode));
      return { filled: sum.filled + progress.filled, total: sum.total + progress.total };
    },
    { filled: 0, total: 0 },
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
    if (field === 'interviewPanels') {
      return panelsKey(n.interviewPanels) !== panelsKey(start.interviewPanels);
    }
    if (field === 'idealMatching') {
      return matchingKey(n.idealMatching) !== matchingKey(start.idealMatching);
    }
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
  return {
    ...toVacancyContent(values),
    pipelineTemplateId: values.pipelineTemplateId,
    ...toScreeningSettings(values),
    status,
    interviewPanels: toPanelRequests(values.interviewPanels),
    idealMatching: values.idealMatching ? toMatchingRequest(values.idealMatching) : null,
  };
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
  // No template id: it is fixed when the vacancy is created.
  return {
    ...toVacancyContent(values),
    ...toScreeningSettings(values),
    version,
    interviewPanels: toPanelRequests(values.interviewPanels),
    idealMatching: values.idealMatching ? toMatchingRequest(values.idealMatching) : null,
  };
}

type ScreeningSettings = Pick<JobVacancyRequest, 'autoThreshold' | 'manualThreshold' | 'blindModeEnabled'>;

/**
 * The thresholds and blind mode as they are sent. A vacancy without a pipeline
 * sends none of them: the server refuses screening settings for it (422),
 * and `null` keeps what is stored.
 */
function toScreeningSettings(values: JobVacancyFormValues): ScreeningSettings {
  if (!runsOnPipeline(values)) {
    return { autoThreshold: null, manualThreshold: null, blindModeEnabled: null };
  }
  return {
    autoThreshold: values.autoThreshold,
    manualThreshold: values.manualThreshold,
    blindModeEnabled: values.blindModeEnabled,
  };
}

type VacancyContent = Omit<
  JobVacancyRequest,
  'status' | 'pipelineTemplateId' | 'interviewPanels' | 'idealMatching' | keyof ScreeningSettings
>;

/** The content fields both a create and an edit carry. */
function toVacancyContent(values: JobVacancyFormValues): VacancyContent {
  const n = normalizeVacancy(values);
  const orNull = (value: string) => (value === '' ? null : value);

  return {
    // Required to publish, optional on a draft. Text stays a string; a choice
    // or a date nobody made travels as null rather than as a default someone
    // could mistake for an answer — the backend refuses to publish without
    // them, and the form never reaches PUBLISHED without validating.
    title: n.title,
    department: n.department,
    industry: orNull(n.industry),
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
    toolsAndTechnologies: n.toolsAndTechnologies,
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
    industry: vacancy.industry ?? '',
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
    toolsAndTechnologies: [...(vacancy.toolsAndTechnologies ?? [])],
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
    pipelineTemplateId: vacancy.pipelineTemplateId ?? '',
    pipelineTemplateName: vacancy.pipelineTemplateName ?? '',
    autoThreshold: vacancy.autoThreshold ?? null,
    manualThreshold: vacancy.manualThreshold ?? null,
    blindModeEnabled: vacancy.blindModeEnabled ?? false,
    // Read separately (`GET /jobs/{id}/interview-panels`); the page fills them in.
    interviewPanels: null,
    idealMatchingAvailable: vacancy.idealMatchingAvailable ?? false,
    // Read separately (`GET /jobs/{id}/ideal-matching`); the page fills it in.
    idealMatching: null,
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
    // The copy chooses its template like any new vacancy: the original's is
    // preselected (and dropped if it is no longer active), and its stored name
    // describes the original, not the copy.
    pipelineTemplateName: '',
  };
}

/* --- Labels for reading back --------------------------------------------- */

/**
 * Who filed a vacancy, as a screen says it: "You" for the reader, otherwise
 * the name the server sent. `null` when nobody is recorded — vacancies older
 * than the record, or a creator who has since been removed.
 */
export function creatorLabel(
  vacancy: Pick<JobVacancyResponse, 'createdBy' | 'createdByName'>,
  viewerId: string | undefined,
): string | null {
  if (vacancy.createdBy && vacancy.createdBy === viewerId) {
    return 'You';
  }
  return vacancy.createdByName?.trim() || null;
}

const labelFrom = <T extends string>(catalogue: { id: T; label: string }[], id: T | null) =>
  catalogue.find((entry) => entry.id === id)?.label ?? null;

export const employmentTypeLabel = (id: EmploymentType | null) => labelFrom(EMPLOYMENT_TYPES, id);
export const workplaceTypeLabel = (id: WorkplaceType | null) => labelFrom(WORKPLACE_TYPES, id);
export const payPeriodLabel = (id: PayPeriod | null) => labelFrom(PAY_PERIODS, id);
export const shiftTypeLabel = (id: ShiftType | null) => labelFrom(SHIFT_TYPES, id);

export { currencyCode };

const counted = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * "4 stages · 1 interview round" — a pipeline's shape in one line, for the
 * template picker and a vacancy's page alike. Empty when the counts are unknown.
 */
export function pipelineShape(counts: { stageCount: number | null; interviewRoundCount: number | null }): string {
  if (counts.stageCount === null || counts.interviewRoundCount === null) {
    return '';
  }
  return `${counted(counts.stageCount, 'stage', 'stages')} · ${counted(
    counts.interviewRoundCount,
    'interview round',
    'interview rounds',
  )}`;
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

interface VacancyActionSet {
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

interface DeadlineSignal {
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

interface PublishBlocker {
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

/**
 * TypeScript mirrors of the backend API contracts (DTOs).
 * Keep in sync with the backend DTOs (backend/src/main/java/com/talentpipe/.../dto).
 */

export interface TenantResponse {
  id: string;
  name: string;
  subdomain: string;
  industry: string | null;
  planTier: string;
  status: string;
  createdAt: string;
}

/**
 * The company's own profile, as the settings page needs it.
 *
 * <p>PROPOSED CONTRACT — no endpoint serves this yet. The backend exposes no
 * tenant controller at all, and {@code Tenant} carries only name, industry,
 * planTier and status; the contact block and description have no
 * column. The shape follows {@link TenantResponse}'s conventions (nullable
 * optionals, ISO timestamps) so that wiring `GET /tenant` is a change to
 * `src/api/company.ts` alone.</p>
 */
export interface CompanyProfileResponse {
  id: string;
  name: string;
  /**
   * Where the logo can be fetched from. A URL to the caller — how it is stored
   * is entirely the logo endpoint's business.
   */
  logoUrl: string | null;
  /** Wide banner behind the logo on the candidate-facing profile. */
  coverImageUrl: string | null;
  /** One line under the name, e.g. 'Hiring software for growing teams'. */
  tagline: string | null;
  industry: string | null;
  /** Private limited, public, partnership… */
  companyType: string | null;
  /** Headcount band, e.g. '51–200 employees'. */
  size: string | null;
  foundedYear: number | null;
  description: string | null;
  mission: string | null;
  vision: string | null;

  // Registration. Held for contracts and invoices, never candidate-facing.
  legalName: string | null;
  registrationNumber: string | null;

  // How the company operates.
  timezone: string | null;
  currency: string | null;
  language: string | null;
  /**
   * Perks, as stable identifiers rather than prose, so a candidate-facing
   * search can one day filter on them. Empty array, never null, so callers
   * never branch on "no benefits" twice.
   */
  benefits: string[];
  /** Contact address candidates and applicants reach the company on. */
  email: string | null;
  /** Where applications and candidate questions go, if not the main address. */
  hrEmail: string | null;
  phone: string | null;
  alternativePhone: string | null;
  website: string | null;
  linkedinUrl: string | null;
  facebookUrl: string | null;
  twitterUrl: string | null;
  instagramUrl: string | null;
  /** Street line, then the administrative parts as separate fields so they can
   *  be filtered and grouped later without parsing one free-text blob. */
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  /**
   * Every city the company operates from, headquarters included. The number of
   * offices is this list's length — a separate count would be a second source
   * of truth that goes stale the first time a branch opens.
   */
  officeLocations: string[];

  /**
   * Organization shape. An admin-defined vocabulary that jobs and people are
   * later filed under — the count is the array's length, never a separate
   * number, so the two can never disagree.
   */
  departments: string[];

  /**
   * Industries besides the main {@link industry}, at most three, from the same
   * list. A vacancy is filed under one of these or the main one. Absent from
   * servers older than this field.
   */
  additionalIndustries?: string[];

  planTier: string;
  status: string;
  /** Null until the profile has been edited at least once. */
  updatedAt: string | null;
}

/**
 * The editable subset. Identity and billing fields (id, planTier, status) are
 * deliberately absent: they are not the admin's to change from
 * this screen, so sending them would invite a backend that trusts them.
 *
 * <p>`logoUrl` is absent too — the logo has its own upload endpoint, because a
 * binary does not belong in a JSON patch of text fields.</p>
 */
export interface UpdateCompanyProfileRequest {
  /** Required — the backend enforces it and the frontend validator does too. */
  name: string;
  /** Required — candidates need a way to reach the company. */
  email: string;
  tagline: string | null;
  industry: string | null;
  companyType: string | null;
  size: string | null;
  foundedYear: number | null;
  description: string | null;
  mission: string | null;
  vision: string | null;
  benefits: string[];
  legalName: string | null;
  registrationNumber: string | null;
  timezone: string | null;
  currency: string | null;
  language: string | null;
  hrEmail: string | null;
  phone: string | null;
  alternativePhone: string | null;
  website: string | null;
  linkedinUrl: string | null;
  facebookUrl: string | null;
  twitterUrl: string | null;
  instagramUrl: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  officeLocations: string[];
  departments: string[];
  /** Up to three more industries besides `industry`; the main one and repeats are dropped. */
  additionalIndustries: string[];
}

/**
 * Curated public view of a company, returned by GET /public/companies/{subdomain}.
 *
 * <p>A strict subset of {@link CompanyProfileResponse}: only the fields a
 * candidate needs to evaluate a prospective employer are included. Internal
 * details (legal name, registration number, HR email, billing info) are
 * deliberately absent — this endpoint is unauthenticated and candidate-facing.</p>
 */
export interface PublicCompanyProfileResponse {
  name: string;
  subdomain: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  tagline: string | null;
  description: string | null;
  industry: string | null;
  size: string | null;
  foundedYear: number | null;
  website: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  city: string | null;
  country: string | null;
}

/** Which image an upload is for. The two have different shapes and limits. */
export type CompanyImageKind = 'logo' | 'cover';

export interface UserResponse {
  id: string;
  tenantId: string | null;
  tenantName: string | null;
  /**
   * The fixed role the API has always sent: COMPANY_ADMIN, HR_MANAGER,
   * INTERVIEWER, CANDIDATE or SUPER_ADMIN — or CUSTOM for a member of a role
   * the company defined. Kept for older screens; decide what to show from
   * {@link permissions}, and what to call the role from {@link roleName}.
   */
  role: string;
  /** The company role's id; absent for candidates and platform operators. */
  roleId?: string | null;
  /** What the company calls the role, e.g. "Owner" or "Hiring Coordinator". */
  roleName?: string | null;
  /**
   * Permission keys the role grants (`jobs.manage`, `team.invite`, …), in
   * catalogue order. Present on login, refresh and `/auth/me`; absent on a
   * user embedded in another response.
   */
  permissions?: string[];
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
}

/**
 * One account a sign-in could mean, offered when an email and password fit
 * more than one (`409 WORKSPACE_SELECTION_REQUIRED`).
 */
export interface WorkspaceChoice {
  accountId: string;
  type: 'COMPANY' | 'PLATFORM' | 'CANDIDATE';
  /** Company name; absent for platform and candidate accounts. */
  workspaceName?: string | null;
  subdomain?: string | null;
  logoUrl?: string | null;
  /** The person's role there, e.g. "Recruiter" or "Candidate". */
  roleName?: string | null;
}

/** The `details` of a `WORKSPACE_SELECTION_REQUIRED` error. */
export interface WorkspaceSelection {
  /** Single use; sent back with the chosen account to `POST /auth/login/select`. */
  selectionToken: string;
  expiresInSeconds: number;
  /** Companies by name, then the platform account, then the candidate one. */
  accounts: WorkspaceChoice[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  /** Access-token lifetime in seconds. */
  expiresIn: number;
  user: UserResponse;
}

/**
 * Company registration. No workspace address: the backend derives one from the
 * company name when none is sent, and the UI never asks for or shows it.
 */
export interface RegisterRequest {
  companyName: string;
  admin: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  };
}

export interface RegisterResponse {
  tenant: TenantResponse;
  admin: UserResponse;
}

/** Public candidate self-registration (no tenant). */
export interface CandidateRegisterRequest {
  fullName: string;
  identityCardNumber: string;
  address: string;
  contactNumber: string;
  email: string;
  password: string;
}

/**
 * The candidate module's own view of a candidate, returned by registration.
 * Candidates are tenant-independent, so this carries no tenant fields.
 */
export interface CandidateProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
}

/** A CV already stored against a candidate. Size and URL may be withheld. */
export interface CandidateCvResponse {
  fileName: string;
  sizeBytes: number | null;
  url: string | null;
}

/**
 * The signed-in candidate's own profile, behind the My profile page. Not the
 * self-registration response {@link CandidateProfile}.
 */
export interface MyCandidateProfileResponse {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  /** National identity card (NIC) or passport number. */
  identityCardNumber: string | null;
  photoUrl: string | null;
  inTalentPool: boolean;
  cv: CandidateCvResponse | null;
}

/**
 * The parts of the `multipart/form-data` body that saves the signed-in
 * candidate's profile. Booleans travel as 'true' / 'false'; absent keys are
 * not sent.
 */
export interface UpdateMyCandidateProfileRequest {
  fullName: string;
  email: string;
  /** Empty when not given. */
  phone: string;
  /** Trimmed and upper-cased. Same name as on CandidateRegisterRequest. */
  identityCardNumber: string;
  addToTalentPool: boolean;
  photo?: File;
  /** Only ever present when `addToTalentPool` is true. */
  cv?: File;
  /** Drop the stored photo. */
  removePhoto?: boolean;
  /** Drop the stored CV while staying in the Talent Pool. */
  removeCv?: boolean;
}

/** Roles a company admin may invite (PB-003 / PB-004). */
export type InvitableRole = 'HR_MANAGER' | 'INTERVIEWER';

/**
 * Invitation payload. Carries no tenant: the invitee always joins the caller's
 * workspace, which the backend takes from the access token.
 */
export interface InviteUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  /**
   * The company role to invite into — any role but Owner. Takes precedence
   * over {@link role}, which servers older than company roles still need.
   */
  roleId?: string;
  role?: InvitableRole;
}

/* --- Company roles (ADR-9) ------------------------------------------------ *
 * A role is a named set of permissions. Every workspace starts with Owner,
 * Recruiter and Interviewer and can add its own. Mirrors of the backend's
 * RoleResponse / RoleRequest / PermissionGroupResponse / RoleAuditEventResponse.
 */

/** One permission in the catalogue, as a role editor lists it. */
export interface PermissionDefinition {
  /** Stable key, e.g. `jobs.manage`. */
  key: string;
  label: string;
  description: string;
  /** Keys this one needs; granting it grants these too. */
  requires: string[];
}

export interface PermissionGroup {
  key: 'TEAM' | 'COMPANY' | 'VACANCIES' | 'HIRING' | 'INTERVIEWS' | string;
  label: string;
  permissions: PermissionDefinition[];
}

/** The three roles every workspace starts with; absent on a custom role. */
export type SystemRoleKey = 'OWNER' | 'RECRUITER' | 'INTERVIEWER';

export interface RoleResponse {
  id: string;
  name: string;
  description: string | null;
  systemRole: SystemRoleKey | null;
  /** True for the Owner role: it always holds every permission and cannot be edited. */
  locked: boolean;
  /** False for the three default roles. */
  deletable: boolean;
  permissions: string[];
  memberCount: number;
  /** Optimistic-lock counter; send it back on PUT. */
  version: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface RoleRequest {
  name: string;
  description: string | null;
  permissions: string[];
  /** Required on PUT; ignored on create. */
  version?: number;
}

export type RoleAuditAction = 'ROLE_CREATED' | 'ROLE_UPDATED' | 'ROLE_DELETED' | 'MEMBER_ROLE_CHANGED';

export interface RoleAuditEvent {
  id: string;
  action: RoleAuditAction;
  actorUserId: string | null;
  roleId: string | null;
  roleName: string | null;
  /** The member a MEMBER_ROLE_CHANGED event is about. */
  targetUserId: string | null;
  previousValue: string | null;
  newValue: string | null;
  occurredAt: string;
}

/**
 * A row of the team screen: a member or a pending invitation. A superset of
 * {@link UserResponse} without the permission list.
 */
export interface TeamMemberResponse extends UserResponse {
  /** When the open invitation was sent; null once accepted. */
  invitationSentAt?: string | null;
  invitationExpiresAt?: string | null;
}

/* --- Vacancy hiring team (ADR-11) ----------------------------------------- */

/** A workspace member as another screen shows them. */
export interface MemberSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleName: string | null;
  /** ACTIVE, INVITED, PENDING_VERIFICATION or DISABLED. */
  status: string;
}

/** Everyone who works on a vacancy. */
export interface HiringTeamResponse {
  vacancyId: string;
  recruiter: MemberSummary | null;
  hiringManager: MemberSummary | null;
  /** The rest of the hiring team, in the order they were added. */
  members: MemberSummary[];
}

/* --- Feature switches (PB-015, ADR-13) ------------------------------------ */

/** `PATCH /jobs/{id}/features`; a switch left out keeps its value. */
export interface VacancyFeaturesRequest {
  aiScreeningEnabled?: boolean;
  candidateMatchingEnabled?: boolean;
}

/** The company's switches (`/tenant/settings`). */
export interface TenantSettings {
  blindScreeningEnabled: boolean;
  aiScreeningDefault: boolean;
  candidateMatchingDefault: boolean;
  updatedAt: string | null;
}

export type TenantSettingsUpdate = Partial<Omit<TenantSettings, 'updatedAt'>>;

/* --- Public board facets --------------------------------------------------- */

export interface JobFilterOption {
  value: string;
  count: number;
}

/** The span of pay published vacancies state for one pay period and currency. */
export interface SalaryRangeOption {
  payPeriod: PayPeriod;
  /** Three-letter code, e.g. LKR. */
  currency: string;
  min: number;
  max: number;
  count: number;
}

/** `GET /public/jobs/filters`. The newer lists are absent on older servers. */
export interface JobFilterOptions {
  categories: JobFilterOption[];
  locations: JobFilterOption[];
  industries?: JobFilterOption[];
  employmentTypes?: JobFilterOption[];
  workplaceTypes?: JobFilterOption[];
  salaryRanges?: SalaryRangeOption[];
}

/** Uniform pagination envelope returned by every list endpoint. */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/**
 * Public job-board card: the candidate-facing part of a PUBLISHED vacancy.
 *
 * <p>Field names and vocabularies are the vacancy form's own
 * ({@link JobVacancyRequest}, below), so the backend can serve both from one
 * entity and a published vacancy reaches the board with the identifiers it was
 * saved with. Internal fields — recruiter, hiring manager, pipeline, status,
 * applicant count — are never public and are absent here. Everything past id,
 * title and companyName is optional: the board shows what it is given rather
 * than failing on a partial row. ASSUMED until GET /public/jobs returns real
 * rows. Text fields are plain text, never HTML.</p>
 */
export interface JobSummary {
  id: string;
  /** Unique, URL-safe name used in job links, e.g. "data-analyst-northwind-analytics". */
  slug?: string | null;
  title: string;
  companyName: string;
  companyLogoUrl?: string | null;
  department?: string | null;
  openings?: number | null;
  employmentType?: EmploymentType | null;
  workplaceType?: WorkplaceType | null;
  location?: string | null;
  /** ISO date. */
  applicationDeadline?: string | null;
  jobSummary?: string | null;
  requiredSkills?: string[] | null;
  minimumExperienceYears?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  /** As the form stores it: 'LKR — Sri Lankan rupee'. */
  currency?: string | null;
  payPeriod?: PayPeriod | null;
  /** ISO timestamp of the move to PUBLISHED. */
  publishedAt?: string | null;
  /** False once the deadline has passed: the advert still shows, but an application would be refused. */
  acceptingApplications?: boolean | null;
  /** One of the company's industries, e.g. "Finance & Banking". */
  industry?: string | null;
}

/**
 * Application for one vacancy. ASSUMED shape; the application API (PB-019) is
 * not built yet. Sent as the JSON `application` part of a multipart request,
 * next to the `resume` file part. Optional fields are sent as null rather than omitted.
 */
export interface JobApplicationRequest {
  fullName: string;
  email: string;
  phone: string;
  location: string | null;
  currentTitle: string | null;
  yearsOfExperience: number | null;
  portfolioUrl: string | null;
  coverLetter: string | null;
  /** The candidate agreed to the company processing their data for this application. */
  consentGiven: true;
}

export interface JobApplicationResponse {
  id: string;
  jobId: string;
  status: string;
  submittedAt: string;
}

/** Public vacancy details: the card plus the rest of the advert. ASSUMED shape; there is no details endpoint yet. */
export interface JobDetail extends JobSummary {
  jobDescription?: string | null;
  keyResponsibilities?: string[] | null;
  preferredSkills?: string[] | null;
  education?: string | null;
  certifications?: string[] | null;
  languageRequirements?: string[] | null;
  otherRequirements?: string | null;
  /** Benefit catalogue ids, e.g. 'HEALTH_INSURANCE' (see BENEFIT_CATALOGUE). */
  benefits?: string[] | null;
  workingDays?: WeekDay[] | null;
  workingHours?: string | null;
  shiftType?: ShiftType | null;
  expectedHoursPerWeek?: number | null;
}

/* --- Job vacancies (PB-011) ---------------------------------------------- */

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'TEMPORARY';
export type WorkplaceType = 'ON_SITE' | 'REMOTE' | 'HYBRID';
export type PayPeriod = 'HOURLY' | 'MONTHLY' | 'ANNUAL';
export type ShiftType = 'DAY' | 'NIGHT' | 'ROTATING' | 'FLEXIBLE';
/** Weekday identifiers, so a working week survives translation. */
export type WeekDay = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
/**
 * Where a vacancy is in its life (PB-018 → PB-022).
 *
 * <p>DRAFT is visible only inside the workspace; PUBLISHED is on the candidate
 * portal and accepting applications; CLOSED is still visible to the team but
 * takes no new applications; ARCHIVED has left every active list and is kept
 * for reporting. The legal moves between them live in
 * `VACANCY_TRANSITIONS` (`src/dashboard/jobVacancy.ts`) and are enforced by the
 * backend — the frontend only declines to offer the others.</p>
 */
export type VacancyStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';

/**
 * A vacancy as the creation form submits it.
 *
 * <p>PROPOSED CONTRACT — no endpoint serves this yet, exactly like
 * {@link CompanyProfileResponse} before `/tenant` landed. It follows the same
 * conventions so that wiring `POST /jobs` is a change to `src/api/jobs.ts` and
 * the hook behind it, and nothing in the form: blank optionals travel as
 * `null`, lists are always arrays and never null, and every enumerated value is
 * a stable identifier rather than the words the UI happens to show.</p>
 *
 * <p>Tenant scope is absent by design — the backend derives it from the access
 * token, as `team.ts` and `company.ts` already do, so there is no request shape
 * that could file a vacancy under another company.</p>
 */
export interface JobVacancyRequest {
  /**
   * The basics are required to PUBLISH and optional on a DRAFT — a draft is a
   * partial vacancy by definition. Blank text travels as `''`, a blank choice
   * or date as `null`, so a draft never carries a value nobody chose.
   */
  title: string;
  department: string;
  /**
   * One of the company's industries (its profile lists them). Null asks for
   * the default: the main industry on a new vacancy, the current one on an edit.
   */
  industry?: string | null;
  openings: number;
  employmentType: EmploymentType | null;
  workplaceType: WorkplaceType | null;
  location: string;
  /** ISO date, no time: a deadline is a day, not an instant. Null on a draft without one. */
  applicationDeadline: string | null;

  jobSummary: string;
  jobDescription: string;
  keyResponsibilities: string[];

  requiredSkills: string[];
  preferredSkills: string[];
  minimumExperienceYears: number | null;
  education: string | null;
  certifications: string[];
  languageRequirements: string[];
  otherRequirements: string | null;

  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  payPeriod: PayPeriod | null;
  benefits: string[];

  workingDays: WeekDay[];
  workingHours: string | null;
  shiftType: ShiftType | null;
  expectedHoursPerWeek: number | null;

  /** Workspace user ids. Null until someone is assigned. */
  assignedRecruiterId: string | null;
  hiringManagerId: string | null;
  recruitmentPipelineId: string | null;
  screeningQuestions: string[];

  /**
   * PB-015 switches. Left out, a new vacancy takes the company's defaults
   * (`/tenant/settings`) and an edit keeps what the vacancy has.
   */
  aiScreeningEnabled?: boolean | null;
  candidateMatchingEnabled?: boolean | null;

  /**
   * Only DRAFT or PUBLISHED on create. Every later move goes through its own
   * lifecycle endpoint, never through a field edit.
   */
  status: VacancyStatus;
}

/**
 * An edit to a stored vacancy: every content field, no status.
 *
 * <p>Status is absent on purpose. Publishing, closing and archiving each have
 * their own endpoint with their own rules, and a PUT that could also flip
 * status would be a second, unguarded route to the same transition.</p>
 *
 * <p>`version` is the optimistic-lock token from the response being edited.
 * Two recruiters saving the same vacancy is a real case in a shared workspace;
 * the second save answers 409 rather than silently overwriting the first.</p>
 */
export type JobVacancyUpdateRequest = Omit<JobVacancyRequest, 'status'> & { version: number };

/** A stored vacancy: everything submitted, plus what only the server knows. */
export interface JobVacancyResponse extends JobVacancyRequest {
  id: string;
  /** Optimistic-lock counter; echoed back on PUT. */
  version: number;
  /** Who filed it; null for vacancies filed before this was recorded. */
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Set on the transition into each state; null until then. */
  publishedAt: string | null;
  closedAt: string | null;
  archivedAt: string | null;
  /**
   * Applications received. Null — not zero — until the applications module
   * exists: zero would claim that nobody applied, which nobody can know yet.
   */
  applicantCount: number | null;
}

/**
 * The stable reason the backend gives for a failure. Branch on this, never on
 * `message`: the message is a sentence for people and may be reworded, the
 * code is the contract and is only ever added to.
 */
export type ApiErrorCode =
  | 'VALIDATION_FAILED'
  | 'INVALID_REQUEST'
  | 'MALFORMED_REQUEST'
  | 'INVALID_PARAMETER'
  | 'MISSING_HEADER'
  | 'INVALID_CREDENTIALS'
  | 'AUTHENTICATION_REQUIRED'
  | 'INVALID_TOKEN'
  | 'ACCESS_DENIED'
  | 'ACCOUNT_NOT_VERIFIED'
  | 'INVITATION_NOT_ACCEPTED'
  | 'ACCOUNT_LOCKED'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'CONFLICT'
  | 'CONCURRENT_UPDATE'
  | 'WORKSPACE_SELECTION_REQUIRED'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'BUSINESS_RULE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

/** One invalid request field, so a form can show the message next to its input. */
export interface FieldErrorDetail {
  /** The field's path in the request body, e.g. `admin.password`. */
  field: string;
  message: string;
}

/** Uniform error envelope returned by the backend on every failure. */
export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  /** Absent only from servers older than the error codes. */
  code?: ApiErrorCode;
  message: string;
  path: string;
  /** Present on `VALIDATION_FAILED` only. */
  fieldErrors?: FieldErrorDetail[];
  /** Present for codes that carry a payload, e.g. `WORKSPACE_SELECTION_REQUIRED`. */
  details?: unknown;
}

/* --- Pipeline templates --------------------------------------------------- *
 * Mirrors of the backend DTOs in `com.talentpipe.pipeline.dto`
 * (PipelineTemplateRequest / PipelineTemplateResponse /
 * PipelineTemplateSummaryResponse / PipelineStageRequest / PipelineStageResponse).
 * Responses carry no tenantId: the backend scopes every query by the token.
 */

/**
 * One stage kind in a hiring pipeline. Post application is always first and
 * onboard always last; screening and the interview rounds sit between them.
 */
export type PipelineStageType = 'POST_APPLICATION' | 'SCREENING' | 'INTERVIEW' | 'ONBOARD';

/** Archived templates are kept, because jobs created from them point back at them. */
export type PipelineTemplateStatus = 'ACTIVE' | 'ARCHIVED';

export interface PipelineStage {
  id: string;
  /** 0-based and consecutive — the backend rejects any other numbering. Computed from screen order, never typed. */
  position: number;
  stageType: PipelineStageType;
  name: string;
  /** The interviewer score a candidate must reach, 0–100. Required on interview rounds; must be null elsewhere. */
  benchmark: number | null;
}

/** Fields the list and the full template share. */
interface PipelineTemplateBase {
  id: string;
  name: string;
  /** The backend stores a missing description as an empty string. */
  description: string | null;
  /** AI scores at or above this move on automatically. */
  defaultAutoThreshold: number;
  /** AI scores from here up to the auto threshold wait for a person. Lower scores are rejected. */
  defaultManualThreshold: number;
  /** Whether jobs using this template may add an ideal-candidate scorecard. */
  idealMatchingEnabled: boolean;
  status: PipelineTemplateStatus;
  stageCount: number;
  interviewRoundCount: number;
  createdAt: string;
  updatedAt: string;
  /** Set when the template is archived; null while active. */
  archivedAt: string | null;
}

/** A template with its stages in position order — `GET /pipeline-templates/{id}`. */
export interface PipelineTemplate extends PipelineTemplateBase {
  stages: PipelineStage[];
}

/** One row of `GET /pipeline-templates` (paged). No stages — the counts describe its shape. */
export type PipelineTemplateSummary = PipelineTemplateBase;

/** One stage of a create or update request. */
export type PipelineStageRequest = Omit<PipelineStage, 'id'>;

/** Body of `POST /pipeline-templates` and `PUT /pipeline-templates/{id}`. */
export interface PipelineTemplateRequest {
  name: string;
  description: string | null;
  defaultAutoThreshold: number;
  defaultManualThreshold: number;
  idealMatchingEnabled: boolean;
  stages: PipelineStageRequest[];
}

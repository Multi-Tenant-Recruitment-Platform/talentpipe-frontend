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
  role: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
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
  role: InvitableRole;
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

/** Uniform error envelope returned by the backend on every failure. */
export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}

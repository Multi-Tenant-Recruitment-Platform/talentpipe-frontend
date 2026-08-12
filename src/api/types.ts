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
 * tenant controller at all, and {@code Tenant} carries only name, subdomain,
 * industry, planTier and status; the contact block and description have no
 * column. The shape follows {@link TenantResponse}'s conventions (nullable
 * optionals, ISO timestamps) so that wiring `GET /tenant` is a change to
 * `src/api/company.ts` alone.</p>
 */
export interface CompanyProfileResponse {
  id: string;
  name: string;
  /** Workspace address. Identity, not a profile field — never editable here. */
  subdomain: string;
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
  /** Exact headcount, where the band is not precise enough. */
  employeeCount: number | null;
  foundedYear: number | null;
  description: string | null;
  /** What it is like to work here — separate from what the company does. */
  culture: string | null;
  mission: string | null;
  vision: string | null;
  /** Short phrases, not prose — 'Ownership', 'Craft', 'Curiosity'. */
  values: string[];

  // Registration. Held for contracts and invoices, never candidate-facing.
  legalName: string | null;
  registrationNumber: string | null;
  taxNumber: string | null;
  vatNumber: string | null;

  // How the company operates.
  workModes: string[];
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
   * Organisation shape. Admin-defined vocabularies that jobs and people are
   * later filed under — the count of each is the array's length, never a
   * separate number, so the two can never disagree.
   */
  departments: string[];
  teams: string[];
  businessUnits: string[];

  /** Hiring vocabulary. What this company's jobs may be posted against. */
  employmentTypes: string[];
  jobCategories: string[];
  jobFamilies: string[];
  jobLevels: string[];
  jobTitles: string[];

  planTier: string;
  status: string;
  /** Null until the profile has been edited at least once. */
  updatedAt: string | null;
}

/**
 * The editable subset. Identity and billing fields (id, subdomain, planTier,
 * status) are deliberately absent: they are not the admin's to change from
 * this screen, so sending them would invite a backend that trusts them.
 *
 * <p>`logoUrl` is absent too — the logo has its own upload endpoint, because a
 * binary does not belong in a JSON patch of text fields.</p>
 */
export interface UpdateCompanyProfileRequest {
  name: string;
  tagline: string | null;
  industry: string | null;
  companyType: string | null;
  size: string | null;
  employeeCount: number | null;
  foundedYear: number | null;
  description: string | null;
  culture: string | null;
  mission: string | null;
  vision: string | null;
  values: string[];
  benefits: string[];
  legalName: string | null;
  registrationNumber: string | null;
  taxNumber: string | null;
  vatNumber: string | null;
  workModes: string[];
  timezone: string | null;
  currency: string | null;
  language: string | null;
  email: string | null;
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
  teams: string[];
  businessUnits: string[];
  employmentTypes: string[];
  jobCategories: string[];
  jobFamilies: string[];
  jobLevels: string[];
  jobTitles: string[];
}

/** Which image an upload is for. The two have different shapes and limits. */
export type CompanyImageKind = 'logo' | 'cover';

export interface UserResponse {
  id: string;
  tenantId: string | null;
  tenantName: string | null;
  /**
   * Workspace address, e.g. 'acme'. Optional: the UI falls back to reading it
   * from the browser host, so a backend that doesn't send it loses only the
   * subdomain line in the sidebar.
   */
  tenantSubdomain?: string | null;
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

export interface RegisterRequest {
  companyName: string;
  subdomain?: string;
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

export interface JobSummary {
  id: string;
  title: string;
  companyName: string;
}

/** Uniform error envelope returned by the backend on every failure. */
export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}

import type { CompanyProfileResponse } from '../api/types';

/**
 * A complete company profile for tests.
 *
 * <p>Shared rather than repeated in each spec: the response now carries more
 * than thirty fields, and three hand-maintained copies would drift the first
 * time one was added — and the drift would show up as an unrelated test
 * failing for a reason nobody could see.</p>
 */
export function makeCompanyProfile(
  overrides: Partial<CompanyProfileResponse> = {},
): CompanyProfileResponse {
  return {
    id: 't-1',
    name: 'ABC Technologies',
    subdomain: 'abc',
    logoUrl: null,
    coverImageUrl: null,
    tagline: 'Hiring software for growing teams',
    industry: 'Information Technology',
    companyType: 'Private limited company',
    size: '51–200 employees',
    employeeCount: 120,
    foundedYear: 2015,
    description: 'ABC Technologies is a software company.',
    culture: 'We encourage collaboration and continuous learning.',
    mission: 'Make hiring fair and fast.',
    vision: 'Every team hires the right person first time.',
    values: ['Ownership', 'Craft'],
    benefits: ['REMOTE_HYBRID', 'HEALTH_INSURANCE'],
    legalName: 'ABC Technologies (Private) Limited',
    registrationNumber: 'PV 12345',
    workModes: ['REMOTE', 'HYBRID'],
    timezone: 'Asia/Colombo',
    currency: 'LKR — Sri Lankan rupee',
    language: 'English',
    email: 'contact@abc.com',
    hrEmail: 'careers@abc.com',
    phone: '011 234 5678',
    alternativePhone: null,
    website: 'https://abc.com',
    linkedinUrl: 'https://linkedin.com/company/abc',
    facebookUrl: null,
    twitterUrl: null,
    instagramUrl: null,
    address: 'No. 42, Galle Road',
    city: 'Colombo',
    state: 'Western',
    postalCode: '00300',
    country: 'Sri Lanka',
    officeLocations: ['Colombo', 'Kandy'],
    departments: ['Engineering', 'QA', 'HR'],
    teams: ['Backend', 'Frontend'],
    businessUnits: ['Software Development'],
    employmentTypes: ['FULL_TIME', 'INTERNSHIP'],
    jobCategories: ['Software Engineering', 'QA'],
    jobFamilies: ['Engineering'],
    jobLevels: ['JUNIOR', 'SENIOR'],
    jobTitles: ['Software Engineer', 'QA Engineer'],
    planTier: 'STANDARD',
    status: 'ACTIVE',
    updatedAt: '2026-08-11T09:00:00Z',
    ...overrides,
  };
}

/** The same profile with every optional field blank — the "fresh tenant" case. */
export function makeEmptyCompanyProfile(
  overrides: Partial<CompanyProfileResponse> = {},
): CompanyProfileResponse {
  const blanked = Object.fromEntries(
    Object.entries(makeCompanyProfile()).map(([key, value]) => [
      key,
      Array.isArray(value) ? [] : null,
    ]),
  ) as unknown as CompanyProfileResponse;

  return {
    ...blanked,
    // Identity and status are never null on a real tenant.
    id: 't-1',
    name: 'ABC Technologies',
    subdomain: 'abc',
    planTier: 'STANDARD',
    status: 'ACTIVE',
    ...overrides,
  };
}

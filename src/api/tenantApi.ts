/**
 * Named re-export of {@link companyApi} for callers that follow the
 * integration guide's naming convention (`tenantApi`).
 *
 * <p>Both names resolve to the identical runtime object — there is no
 * duplication of logic. Prefer importing {@link companyApi} directly from
 * `./company` inside this repository; use this module only when you need the
 * `tenantApi` name to match external documentation or generated code.</p>
 */
export { companyApi as tenantApi } from './company';

// Re-export the types the guide references alongside the API object, so a
// consumer can import everything from one place.
export type {
  CompanyProfileResponse,
  UpdateCompanyProfileRequest,
  PublicCompanyProfileResponse,
} from './types';

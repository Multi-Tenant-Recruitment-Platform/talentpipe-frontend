import { createContext, useContext, type ReactNode } from 'react';
import { useCompanyProfile, type CompanyProfileController } from './useCompanyProfile';

/**
 * One company profile for the whole dashboard.
 *
 * <p>Before this, each surface called {@link useCompanyProfile} for itself, so
 * the workspace chrome had no idea the profile existed: renaming the company
 * on Profile Management left the top bar still showing the name from the login
 * response until the next sign-in. Two independent copies of the same record
 * will always drift — the fix is to have one.</p>
 *
 * <p>It also means the profile is fetched once for the session rather than on
 * every navigation between the two pages that show it, and that saving on one
 * of them is immediately visible on the other.</p>
 */
const CompanyProfileContext = createContext<CompanyProfileController | null>(null);

export function CompanyProfileProvider({ children }: Readonly<{ children: ReactNode }>) {
  const controller = useCompanyProfile();
  return (
    <CompanyProfileContext.Provider value={controller}>{children}</CompanyProfileContext.Provider>
  );
}

export function useCompanyProfileContext(): CompanyProfileController {
  const context = useContext(CompanyProfileContext);
  if (!context) {
    throw new Error('useCompanyProfileContext must be used inside a CompanyProfileProvider');
  }
  return context;
}

/**
 * The company's display name and logo, for chrome that only needs to label the
 * workspace.
 *
 * <p>Falls back to the session's `tenantName` while the profile is loading, so
 * the top bar never flashes empty — the login response already knows enough to
 * label the workspace, it is just the older of the two answers.</p>
 */
export function useCompanyIdentity(fallbackName: string | null | undefined): {
  name: string;
  logoUrl: string | null;
} {
  const context = useContext(CompanyProfileContext);
  return {
    name: context?.saved.name || fallbackName || 'Workspace',
    logoUrl: context?.savedLogoUrl ?? null,
  };
}

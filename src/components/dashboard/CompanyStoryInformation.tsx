import type { CompanyFormValues } from '../../dashboard/companyProfile';

/**
 * Mission and vision — what the company says it is for.
 *
 * <p>Each part disappears when unset rather than showing "Not set": these are
 * statements a company either has or has not written, and an empty "Mission"
 * heading on a candidate-facing page is worse than no heading at all.</p>
 */
export function CompanyStoryInformation({ values }: Readonly<{ values: CompanyFormValues }>) {
  if (values.mission === '' && values.vision === '') {
    return null;
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {values.mission && (
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">Mission</h4>
          <p
            data-testid="company-mission"
            className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-700"
          >
            {values.mission}
          </p>
        </div>
      )}
      {values.vision && (
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">Vision</h4>
          <p
            data-testid="company-vision"
            className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-700"
          >
            {values.vision}
          </p>
        </div>
      )}
    </div>
  );
}

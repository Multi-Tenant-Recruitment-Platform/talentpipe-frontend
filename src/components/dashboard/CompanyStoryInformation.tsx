import type { CompanyFormValues } from '../../dashboard/companyProfile';

/**
 * Mission, vision and values — what the company says it is for.
 *
 * <p>Each part disappears when unset rather than showing "Not set": these are
 * statements a company either has or has not written, and an empty "Mission"
 * heading on a candidate-facing page is worse than no heading at all.</p>
 */
export function CompanyStoryInformation({ values }: { values: CompanyFormValues }) {
  const hasStatements = values.mission !== '' || values.vision !== '';

  return (
    <div className="space-y-5">
      {hasStatements && (
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
      )}

      {values.values.length > 0 && (
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">Values</h4>
          <ul data-testid="company-values" className="mt-2 flex flex-wrap gap-2">
            {values.values.map((value) => (
              <li
                key={value}
                className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20"
              >
                {value}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

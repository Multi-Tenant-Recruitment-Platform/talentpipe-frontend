import type { CompanyFormValues } from '../../dashboard/companyProfile';
import { Badge } from './Badge';
import { CompanyCoverImage } from './CompanyCoverImage';
import { CompanyLogo } from './CompanyLogo';

/**
 * Who the company is: cover, logo, name, industry, size, the description, and
 * the departments it is organised into.
 *
 * <p>Written to be read by someone deciding whether to apply, not only by the
 * admin maintaining it — hence a banner, a headline and a paragraph rather
 * than another row of labelled fields.</p>
 */
export function CompanyInformation({
  values,
  logoUrl,
  coverUrl,
  withCover = false,
  headingLevel = 'h3',
}: Readonly<{
  values: CompanyFormValues;
  logoUrl: string | null;
  coverUrl: string | null;
  /** The roomy variant leads with the banner; the settings card does not. */
  withCover?: boolean;
  headingLevel?: 'h2' | 'h3';
}>) {
  const Heading = headingLevel;

  return (
    <div className="space-y-6">
      {withCover ? (
        <div>
          <CompanyCoverImage coverUrl={coverUrl} logoUrl={logoUrl} name={values.name} />
          <div className="mt-4">
            <Heading className="truncate text-xl font-semibold tracking-tight text-slate-900">
              {values.name || 'Unnamed company'}
            </Heading>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {values.industry ? (
                <Badge tone="indigo">{values.industry}</Badge>
              ) : (
                <span className="text-sm text-slate-400">Industry not set</span>
              )}
              {values.size ? <Badge tone="slate">{values.size}</Badge> : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-4">
          <CompanyLogo src={logoUrl} name={values.name} size="md" />
          <div className="min-w-0 flex-1">
            <Heading className="truncate text-lg font-semibold tracking-tight text-slate-900">
              {values.name || 'Unnamed company'}
            </Heading>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {values.industry ? (
                <Badge tone="indigo">{values.industry}</Badge>
              ) : (
                <span className="text-sm text-slate-400">Industry not set</span>
              )}
              {values.size ? <Badge tone="slate">{values.size}</Badge> : null}
            </div>
          </div>
        </div>
      )}

      <div>
        <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">
          About the company
        </h4>
        {values.description ? (
          // whitespace-pre-line so paragraph breaks the admin typed survive.
          <p
            data-testid="company-description"
            className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700"
          >
            {values.description}
          </p>
        ) : (
          <p data-testid="company-description" className="mt-2 text-sm text-slate-400">
            No description yet. This is what candidates read to understand what the company does.
          </p>
        )}
      </div>

      {/* Like mission and vision: shown once there is something to show, and
          absent otherwise — an empty "Departments" label says nothing. */}
      {values.departments.length > 0 && (
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Departments
          </h4>
          <ul data-testid="company-departments" className="mt-2 flex flex-wrap gap-2">
            {values.departments.map((department) => (
              <li
                key={department}
                className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
              >
                {department}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

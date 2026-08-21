import {
  employmentTypeLabel,
  jobLevelLabel,
  type CompanyFormValues,
} from '../../dashboard/companyProfile';

/**
 * The vocabularies a company files its work under — its organization shape,
 * and the terms its jobs are posted against.
 *
 * <p>Laid out as a specification table: a fixed label column on the left, the
 * values filling the width on the right, one hairline-separated row each. The
 * earlier two-column grid of pill blocks gave eight unrelated lists identical
 * visual weight, wrapped each into a ragged two- or three-line block, and left
 * the columns uneven — so the eye had to re-find the start of every list. A
 * label column means you scan straight down to the one you want, and a
 * full-width value column means most lists fit on one line.</p>
 */

function TaxonomyRow({
  label,
  items,
  testId,
}: Readonly<{
  label: string;
  items: string[];
  testId: string;
}>) {
  return (
    <div className="grid gap-1.5 border-t border-slate-100 py-3.5 first:border-t-0 first:pt-0 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="flex items-baseline gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
        {items.length > 0 && (
          <span className="tabular-nums text-slate-300">{items.length}</span>
        )}
      </dt>
      <dd className="min-w-0" data-testid={testId}>
        {items.length > 0 ? (
          <ul className="flex flex-wrap gap-x-1.5 gap-y-1">
            {items.map((item) => (
              <li
                key={item}
                className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
              >
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-sm text-slate-400">Not set</span>
        )}
      </dd>
    </div>
  );
}

export function CompanyOrganization({ values }: Readonly<{ values: CompanyFormValues }>) {
  return (
    <dl>
      <TaxonomyRow label="Departments" items={values.departments} testId="company-departments" />
      <TaxonomyRow label="Teams" items={values.teams} testId="company-teams" />
      <TaxonomyRow
        label="Business units"
        items={values.businessUnits}
        testId="company-businessUnits"
      />
    </dl>
  );
}

export function CompanyJobTaxonomy({ values }: Readonly<{ values: CompanyFormValues }>) {
  return (
    <dl>
      <TaxonomyRow
        label="Employment types"
        // Labels, not the stored ids — 'FULL_TIME' is for the database.
        items={values.employmentTypes.map(employmentTypeLabel)}
        testId="company-employmentTypes"
      />
      <TaxonomyRow
        label="Job levels"
        items={values.jobLevels.map(jobLevelLabel)}
        testId="company-jobLevels"
      />
      <TaxonomyRow
        label="Job categories"
        items={values.jobCategories}
        testId="company-jobCategories"
      />
      <TaxonomyRow label="Job families" items={values.jobFamilies} testId="company-jobFamilies" />
      <TaxonomyRow label="Job titles" items={values.jobTitles} testId="company-jobTitles" />
    </dl>
  );
}

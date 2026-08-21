import {
  formatLocation,
  formatStreet,
  type CompanyFormValues,
} from '../../dashboard/companyProfile';
import { DetailItem } from './DetailItem';
import { Icon } from './Icon';

/**
 * Where the company is: the street line, then the administrative parts.
 *
 * <p>City, state and country are stored separately but shown as one line —
 * "Colombo, Western, Sri Lanka" is how a person reads a location, while
 * separate fields are what lets jobs be filtered by country later without
 * parsing prose.</p>
 */
export function LocationInformation({ values }: Readonly<{ values: CompanyFormValues }>) {
  return (
    <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      <DetailItem
        icon="building"
        label="Street address"
        value={formatStreet(values)}
        testId="company-address"
      />
      <DetailItem
        icon="map-pin"
        label="City, state & country"
        value={formatLocation(values)}
        testId="company-location"
      />
      {/* The office count is this list's length, never a number someone typed:
          a stored count goes stale the first time a branch opens. */}
      <div className="flex min-w-0 items-start gap-3 sm:col-span-2">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
          <Icon name="building" className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Offices{values.officeLocations.length > 0 && ` (${values.officeLocations.length})`}
          </dt>
          <dd className="mt-1 min-w-0" data-testid="company-officeLocations">
            {values.officeLocations.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {values.officeLocations.map((office) => (
                  <li
                    key={office}
                    className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {office}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-sm text-slate-400">Not set</span>
            )}
          </dd>
        </div>
      </div>
    </dl>
  );
}

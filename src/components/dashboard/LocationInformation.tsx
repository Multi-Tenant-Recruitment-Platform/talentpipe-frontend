import { formatLocation, type CompanyFormValues } from '../../dashboard/companyProfile';
import { DetailItem } from './DetailItem';

/**
 * Where the company is: street address, then city and country.
 *
 * <p>City and country are stored separately but shown as one line — "Colombo,
 * Sri Lanka" is how a candidate reads a location, while two fields are what
 * lets jobs be filtered by country later without parsing prose.</p>
 */
export function LocationInformation({ values }: { values: CompanyFormValues }) {
  return (
    <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      <DetailItem icon="building" label="Address" value={values.address} testId="company-address" />
      <DetailItem
        icon="map-pin"
        label="City & country"
        value={formatLocation(values)}
        testId="company-location"
      />
    </dl>
  );
}

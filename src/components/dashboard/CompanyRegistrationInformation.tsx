import type { CompanyFormValues } from '../../dashboard/companyProfile';
import { DetailItem } from './DetailItem';

/**
 * Legal name and registration number.
 *
 * <p>Administrative detail, not marketing — it belongs on the management
 * surfaces and never on anything a candidate sees, which is why the public
 * preview does not render it. Formats vary by country, so these are stored and
 * shown verbatim rather than reformatted into a shape that would be wrong
 * somewhere.</p>
 */
export function CompanyRegistrationInformation({ values }: Readonly<{ values: CompanyFormValues }>) {
  return (
    <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      <DetailItem
        icon="identification"
        label="Legal company name"
        value={values.legalName}
        testId="company-legalName"
      />
      <DetailItem
        icon="identification"
        label="Registration number"
        value={values.registrationNumber}
        testId="company-registrationNumber"
      />
    </dl>
  );
}

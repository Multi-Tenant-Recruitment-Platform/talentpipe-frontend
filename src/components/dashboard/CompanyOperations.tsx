import { currencyCode, type CompanyFormValues } from '../../dashboard/companyProfile';
import { DetailItem } from './DetailItem';

/**
 * How the company runs: time zone, currency, language — the settings that
 * make a job post render correctly: the currency beside a salary, the zone
 * beside an interview slot.
 */
export function CompanyOperations({ values }: Readonly<{ values: CompanyFormValues }>) {
  return (
    <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-3">
      <DetailItem icon="clock" label="Time zone" value={values.timezone} testId="company-timezone" />
      <DetailItem
        icon="chart-bar"
        label="Currency"
        // The code, not the full 'USD — US dollar': the label belongs in the
        // picker, the code belongs next to a number.
        value={values.currency ? currencyCode(values.currency) : ''}
        testId="company-currency"
      />
      <DetailItem
        icon="globe"
        label="Primary language"
        value={values.language}
        testId="company-language"
      />
    </dl>
  );
}

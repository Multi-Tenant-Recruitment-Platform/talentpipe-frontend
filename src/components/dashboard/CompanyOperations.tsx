import { BarChartOutlined, ClockCircleOutlined, GlobalOutlined } from '@ant-design/icons';
import { currencyCode, type CompanyFormValues } from '../../dashboard/companyProfile';
import { DetailItem } from './DetailItem';

/**
 * How the company runs: time zone, currency, language — the settings that
 * make a job post render correctly: the currency beside a salary, the zone
 * beside an interview slot.
 */
export function CompanyOperations({ values }: Readonly<{ values: CompanyFormValues }>) {
  return (
    <dl className="tp-detail-grid-3">
      <DetailItem icon={ClockCircleOutlined} label="Time zone" value={values.timezone} testId="company-timezone" />
      <DetailItem
        icon={BarChartOutlined}
        label="Currency"
        // The code, not the full 'USD — US dollar': the label belongs in the
        // picker, the code belongs next to a number.
        value={values.currency ? currencyCode(values.currency) : ''}
        testId="company-currency"
      />
      <DetailItem
        icon={GlobalOutlined}
        label="Primary language"
        value={values.language}
        testId="company-language"
      />
    </dl>
  );
}

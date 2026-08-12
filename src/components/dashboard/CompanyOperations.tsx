import {
  currencyCode,
  workModeLabel,
  type CompanyFormValues,
} from '../../dashboard/companyProfile';
import { Badge } from './Badge';
import { DetailItem } from './DetailItem';

/**
 * How the company runs: work arrangements, time zone, currency, language.
 *
 * <p>Work modes lead, because "do you hire remotely?" is the operational
 * question a candidate actually asks. The rest are the settings that make a
 * job post render correctly — the currency beside a salary, the zone beside an
 * interview slot.</p>
 */
export function CompanyOperations({ values }: { values: CompanyFormValues }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Work arrangements
        </p>
        <div className="mt-2 flex flex-wrap gap-2" data-testid="company-workModes">
          {values.workModes.length > 0 ? (
            values.workModes.map((mode) => (
              <Badge key={mode} tone="emerald">
                {workModeLabel(mode)}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-slate-400">Not set</span>
          )}
        </div>
      </div>

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
    </div>
  );
}

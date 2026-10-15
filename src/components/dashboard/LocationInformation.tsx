import { BankOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import {
  formatLocation,
  formatStreet,
  type CompanyFormValues,
} from '../../dashboard/companyProfile';
import { detailGrid } from '../ui/classes';
import { DetailItem } from './DetailItem';
import { PillList } from './PillList';

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
    <dl className={detailGrid}>
      <DetailItem
        icon={BankOutlined}
        label="Street address"
        value={formatStreet(values)}
        testId="company-address"
      />
      <DetailItem
        icon={EnvironmentOutlined}
        label="City, state & country"
        value={formatLocation(values)}
        testId="company-location"
      />
      {/* Not a DetailItem: the value is a list of chips rather than one string. */}
      <div className="col-span-full flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-sm bg-slate-50 text-slate-400">
          <BankOutlined aria-hidden className="text-[16px]" />
        </span>
        <div className="min-w-0">
          <dt className="text-caption font-medium uppercase tracking-[0.03em] text-slate-400">Other branches</dt>
          <dd className="ms-0 mt-1 min-w-0" data-testid="company-officeLocations">
            {values.officeLocations.length > 0 ? (
              <PillList items={values.officeLocations} />
            ) : (
              <Typography.Text type="secondary">Not set</Typography.Text>
            )}
          </dd>
        </div>
      </div>
    </dl>
  );
}

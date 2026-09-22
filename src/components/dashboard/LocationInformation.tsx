import { Tag, Typography } from 'antd';
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
    <dl className="tp-detail-grid">
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
      {/* Not a DetailItem: the value is a list of chips rather than one string. */}
      <div
        className="tp-detail-grid-full"
        style={{ display: 'flex', minWidth: 0, alignItems: 'flex-start', gap: 12 }}
      >
        <span
          style={{
            marginTop: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            flexShrink: 0,
            borderRadius: 8,
            background: '#f8fafc',
            color: '#94a3b8',
          }}
        >
          <Icon name="building" size={16} />
        </span>
        <div style={{ minWidth: 0 }}>
          <dt
            style={{
              fontSize: 12,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              color: '#94a3b8',
            }}
          >
            Other branches
          </dt>
          <dd style={{ marginTop: 4, marginInlineStart: 0, minWidth: 0 }} data-testid="company-officeLocations">
            {values.officeLocations.length > 0 ? (
              <ul
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                }}
              >
                {values.officeLocations.map((office) => (
                  <li key={office}>
                    <Tag style={{ marginInlineEnd: 0, borderRadius: 999 }}>{office}</Tag>
                  </li>
                ))}
              </ul>
            ) : (
              <Typography.Text type="secondary">Not set</Typography.Text>
            )}
          </dd>
        </div>
      </div>
    </dl>
  );
}

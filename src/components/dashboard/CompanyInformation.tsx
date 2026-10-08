import { Flex, Tag, Typography } from 'antd';
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
  const level = headingLevel === 'h2' ? 2 : 3;

  const identity = (
    <>
      <Typography.Title level={level} style={{ fontSize: withCover ? 20 : 18, margin: 0 }}>
        {values.name || 'Unnamed company'}
      </Typography.Title>
      <Flex wrap align="center" gap={8} style={{ marginTop: withCover ? 8 : 6 }}>
        {values.industry ? (
          <Badge>{values.industry}</Badge>
        ) : (
          <Typography.Text type="secondary">Industry not set</Typography.Text>
        )}
        {values.size ? <Badge>{values.size}</Badge> : null}
      </Flex>
    </>
  );

  return (
    <Flex vertical gap={24}>
      {withCover ? (
        <div>
          <CompanyCoverImage coverUrl={coverUrl} logoUrl={logoUrl} name={values.name} />
          <div style={{ marginTop: 16 }}>{identity}</div>
        </div>
      ) : (
        <Flex align="flex-start" gap={16}>
          <CompanyLogo src={logoUrl} name={values.name} size="md" />
          <div style={{ minWidth: 0, flex: 1 }}>{identity}</div>
        </Flex>
      )}

      <div>
        <Typography.Title level={4} className="tp-legend" style={{ margin: 0 }}>
          About the company
        </Typography.Title>
        {values.description ? (
          // pre-line so paragraph breaks the admin typed survive.
          <Typography.Paragraph
            data-testid="company-description"
            style={{ marginTop: 8, marginBottom: 0, whiteSpace: 'pre-line' }}
          >
            {values.description}
          </Typography.Paragraph>
        ) : (
          <Typography.Paragraph
            data-testid="company-description"
            type="secondary"
            style={{ marginTop: 8, marginBottom: 0 }}
          >
            No description yet. This is what candidates read to understand what the company does.
          </Typography.Paragraph>
        )}
      </div>

      {/* Like mission and vision: shown once there is something to show, and
          absent otherwise — an empty "Departments" label says nothing. */}
      {values.departments.length > 0 && (
        <div>
          <Typography.Title level={4} className="tp-legend" style={{ margin: 0 }}>
            Departments
          </Typography.Title>
          <ul
            data-testid="company-departments"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              listStyle: 'none',
              margin: '8px 0 0',
              padding: 0,
            }}
          >
            {values.departments.map((department) => (
              <li key={department}>
                <Tag style={{ marginInlineEnd: 0, borderRadius: 999 }}>{department}</Tag>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Flex>
  );
}

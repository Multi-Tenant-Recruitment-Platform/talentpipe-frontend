import { Flex, Typography } from 'antd';
import type { CompanyFormValues } from '../../dashboard/companyProfile';
import { Badge } from './Badge';
import { CompanyCoverImage } from './CompanyCoverImage';
import { CompanyLogo } from './CompanyLogo';
import { PillList } from './PillList';

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
      <Typography.Title level={level} className={`m-0 ${withCover ? 'text-section' : 'text-title'}`}>
        {values.name || 'Unnamed company'}
      </Typography.Title>
      <Flex wrap align="center" gap={8} className={withCover ? 'mt-2' : 'mt-1.5'}>
        {values.industry ? (
          <Badge>{values.industry}</Badge>
        ) : (
          <Typography.Text type="secondary">Industry not set</Typography.Text>
        )}
        {values.industry &&
          (values.additionalIndustries ?? []).map((industry) => <Badge key={industry}>{industry}</Badge>)}
        {values.size ? <Badge>{values.size}</Badge> : null}
      </Flex>
    </>
  );

  return (
    <Flex vertical gap={24}>
      {withCover ? (
        <div>
          <CompanyCoverImage coverUrl={coverUrl} logoUrl={logoUrl} name={values.name} />
          <div className="mt-4">{identity}</div>
        </div>
      ) : (
        <Flex align="flex-start" gap={16}>
          <CompanyLogo src={logoUrl} name={values.name} size="md" />
          <div className="min-w-0 flex-1">{identity}</div>
        </Flex>
      )}

      <div>
        <Typography.Title level={4} className="tp-legend m-0">
          About the company
        </Typography.Title>
        {values.description ? (
          // pre-line so paragraph breaks the admin typed survive.
          <Typography.Paragraph data-testid="company-description" className="mt-2 mb-0 whitespace-pre-line">
            {values.description}
          </Typography.Paragraph>
        ) : (
          <Typography.Paragraph data-testid="company-description" type="secondary" className="mt-2 mb-0">
            No description yet. This is what candidates read to understand what the company does.
          </Typography.Paragraph>
        )}
      </div>

      {/* Like mission and vision: shown once there is something to show, and
          absent otherwise — an empty "Departments" label says nothing. */}
      {values.departments.length > 0 && (
        <div>
          <Typography.Title level={4} className="tp-legend m-0">
            Departments
          </Typography.Title>
          <PillList data-testid="company-departments" items={values.departments} className="mt-2" />
        </div>
      )}
    </Flex>
  );
}

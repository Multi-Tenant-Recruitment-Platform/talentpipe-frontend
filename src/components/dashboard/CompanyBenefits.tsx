import { CheckOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import { benefitLabel, sortBenefits } from '../../dashboard/companyProfile';

/**
 * The perks a company advertises, as a checked list.
 *
 * <p>Always rendered in catalogue order, never selection order, so the same
 * set of perks reads identically on every profile — a candidate comparing two
 * companies should not have to re-scan a shuffled list.</p>
 */
export function CompanyBenefits({ benefits }: Readonly<{ benefits: string[] }>) {
  if (benefits.length === 0) {
    return (
      <Typography.Paragraph type="secondary" data-testid="company-benefits" className="m-0">
        No benefits listed yet. These are among the first things candidates look for.
      </Typography.Paragraph>
    );
  }

  return (
    <ul data-testid="company-benefits" className="tp-benefit-grid">
      {sortBenefits(benefits).map((id) => (
        <li key={id} className="flex items-start gap-2">
          <CheckOutlined aria-hidden className="mt-0.75 text-[16px] text-success" />
          {benefitLabel(id)}
        </li>
      ))}
    </ul>
  );
}

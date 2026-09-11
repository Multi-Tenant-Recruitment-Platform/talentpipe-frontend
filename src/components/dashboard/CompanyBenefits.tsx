import { benefitLabel, sortBenefits } from '../../dashboard/companyProfile';
import { Icon } from './Icon';

/**
 * The perks a company advertises, as a checked list.
 *
 * <p>Always rendered in catalogue order, never selection order, so the same
 * set of perks reads identically on every profile — a candidate comparing two
 * companies should not have to re-scan a shuffled list.</p>
 */
export function CompanyBenefits({ benefits }: { benefits: string[] }) {
  if (benefits.length === 0) {
    return (
      <p className="text-sm text-slate-400" data-testid="company-benefits">
        No benefits listed yet. These are among the first things candidates look for.
      </p>
    );
  }

  return (
    <ul
      data-testid="company-benefits"
      className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2"
    >
      {sortBenefits(benefits).map((id) => (
        <li key={id} className="flex items-start gap-2 text-sm text-slate-700">
          <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          {benefitLabel(id)}
        </li>
      ))}
    </ul>
  );
}

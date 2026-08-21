import type { CompanyFormValues } from '../../dashboard/companyProfile';
import { Icon, type IconName } from './Icon';

/**
 * The company's numbers, every one of them derived.
 *
 * <p>Each figure is the length of the list beneath it, never a field someone
 * types: a typed count is a second source of truth that goes stale the day a
 * department is added and nobody remembers to edit the number. Add a
 * department and the tile follows on its own.</p>
 *
 * <p>Headcounts of recruiters, HR staff and hiring managers deliberately do
 * not appear here. They belong to the team roster, which has its own page, and
 * open positions belong to jobs — putting other modules' numbers on the
 * company profile only raises "where do I change this?" on a screen that
 * cannot answer it.</p>
 */

interface Stat {
  label: string;
  value: number;
  icon: IconName;
  hint: string;
}

export function CompanyAtAGlance({ values }: Readonly<{ values: CompanyFormValues }>) {
  const stats: Stat[] = [
    {
      label: 'Departments',
      value: values.departments.length,
      icon: 'squares-2x2',
      hint: 'Counted from the departments list',
    },
    { label: 'Teams', value: values.teams.length, icon: 'users', hint: 'Counted from the teams list' },
    {
      label: 'Business units',
      value: values.businessUnits.length,
      icon: 'briefcase',
      hint: 'Counted from the business units list',
    },
    {
      label: 'Offices',
      value: values.officeLocations.length,
      icon: 'building',
      hint: 'Counted from the office locations',
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="company-stats">
      {stats.map((stat) => (
        <div
          key={stat.label}
          title={stat.hint}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
        >
          <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Icon name={stat.icon} className="h-3.5 w-3.5 text-slate-400" />
            {stat.label}
          </dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

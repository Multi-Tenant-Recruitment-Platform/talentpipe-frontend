import { HistoryOutlined, SafetyCertificateOutlined, TeamOutlined } from '@ant-design/icons';
import { NavLink } from 'react-router-dom';
import type { Permission } from '../../auth/permissions';
import { useCan } from '../../auth/useCan';
import type { IconComponent } from '../ui/icon';

export type TeamSection = 'members' | 'roles' | 'activity';

const SECTIONS: { id: TeamSection; to: string; label: string; icon: IconComponent; permission: Permission; end?: boolean }[] = [
  { id: 'members', to: '/dashboard/team', label: 'Members', icon: TeamOutlined, permission: 'team.view', end: true },
  {
    id: 'roles',
    to: '/dashboard/team/roles',
    label: 'Roles & permissions',
    icon: SafetyCertificateOutlined,
    permission: 'roles.view',
  },
  { id: 'activity', to: '/dashboard/team/activity', label: 'Activity', icon: HistoryOutlined, permission: 'roles.manage' },
];

/**
 * The Team area's own navigation: who is here, what each role may do, and
 * what has changed.
 *
 * <p>Links, not tabs. Each section is its own page with its own URL — it
 * survives a reload, can be shared, and Back returns to the previous one — so
 * the right semantics are a labelled `nav` whose current link carries
 * `aria-current`, which `NavLink` sets. Tabs would promise arrow-key panels
 * that are not there.</p>
 *
 * <p>Sections someone may not open are left out rather than disabled; with
 * only one left there is nothing to navigate between, and the bar is not
 * drawn at all — which is also what a server older than company roles gets.</p>
 */
export function TeamSectionNav({ counts = {} }: Readonly<{ counts?: Partial<Record<TeamSection, number>> }>) {
  const allow = useCan();
  const sections = SECTIONS.filter((section) => allow(section.permission));
  if (sections.length < 2) {
    return null;
  }

  return (
    <nav aria-label="Team" className="mb-6 overflow-x-auto">
      <ul className="m-0 inline-flex min-w-max list-none gap-1 rounded-xl border border-slate-200 bg-surface p-1 shadow-xs">
        {sections.map(({ id, to, label, icon: Glyph, end }) => (
          <li key={id}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-small font-medium no-underline transition-colors duration-(--tp-motion-base) ease-standard focus-visible:shadow-focus focus-visible:outline-none ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <Glyph aria-hidden className="text-[15px]" />
              {label}
              {counts[id] !== undefined && (
                <span className="rounded-pill bg-slate-100 px-1.5 py-px text-caption tabular-nums text-slate-600">
                  {counts[id]}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

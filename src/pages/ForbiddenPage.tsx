import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { homeRouteFor, type Permission } from '../auth/permissions';
import { Icon } from '../components/dashboard/Icon';
import { RoleBadge } from '../components/dashboard/RoleBadge';

/**
 * Why this particular door is closed. Generic copy is a dead end — naming the
 * role that does hold the permission tells the user who to ask.
 */
const REASONS: Partial<Record<Permission, string>> = {
  'team.view': 'Only a Company Admin can manage teammates and invitations.',
  'team.invite': 'Only a Company Admin can invite teammates.',
  'settings.view': 'Company settings are limited to admins and HR managers.',
  'settings.edit': 'Only a Company Admin can change company settings.',
  'billing.view': 'Plan and billing are visible to Company Admins only.',
  'pipeline.manage': 'Moving candidates between stages is limited to admins and HR managers.',
};

/**
 * In-place 403. Rendered inside the dashboard chrome (see RequirePermission)
 * so the sidebar and top bar stay usable and the URL survives — a silent
 * redirect away from a deep link reads as a bug, not as a permission boundary.
 */
export function ForbiddenPage({ requires }: { requires?: Permission }) {
  const { user } = useAuth();
  const home = homeRouteFor(user?.role);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-slate-200 bg-white px-8 py-12 text-center shadow-sm">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-md shadow-rose-500/20">
        <Icon name="lock-closed" className="h-7 w-7" />
      </span>

      <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">Error 403</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
        You don’t have access to this page
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        {(requires && REASONS[requires]) ??
          'Your role doesn’t include this part of the workspace.'}{' '}
        Ask a Company Admin if you need it.
      </p>

      {user && (
        <div className="mt-5 flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 ring-1 ring-inset ring-slate-200">
          <span className="text-xs text-slate-500">Signed in as</span>
          <RoleBadge role={user.role} />
        </div>
      )}

      <Link
        to={home}
        className="mt-7 inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
      >
        <Icon name="arrow-left" className="h-4 w-4" />
        {home === '/dashboard' ? 'Back to overview' : 'Browse jobs'}
      </Link>
    </div>
  );
}

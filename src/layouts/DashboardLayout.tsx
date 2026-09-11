import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { Permission } from '../auth/permissions';
import { useCan } from '../auth/useCan';
import { Avatar } from '../components/dashboard/Avatar';
import { Icon, type IconName } from '../components/dashboard/Icon';
import { RoleBadge } from '../components/dashboard/RoleBadge';
import { CompanyLogo } from '../components/dashboard/CompanyLogo';
import { CompanyProfileProvider, useCompanyIdentity } from '../dashboard/CompanyProfileContext';
import { TeamSummaryProvider } from '../dashboard/TeamSummaryContext';
import { activeTenant } from '../tenant/activeTenant';
import { tenantStorage } from '../utils/tenantStorage';

/** Each entry names the permission that earns it a place in the sidebar. */
const NAV_ITEMS: {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
  permission: Permission;
}[] = [
  { to: '/dashboard', label: 'Overview', icon: 'squares-2x2', end: true, permission: 'overview.view' },
  { to: '/dashboard/team', label: 'Team', icon: 'users', permission: 'team.view' },
  { to: '/dashboard/pipeline', label: 'Pipeline', icon: 'funnel', permission: 'pipeline.view' },
  {
    to: '/dashboard/profile',
    label: 'Profile Management',
    icon: 'building',
    permission: 'company.profile.view',
  },
  { to: '/dashboard/settings', label: 'Company Settings', icon: 'cog', permission: 'settings.view' },
];

/** Notification dismissals are per-workspace, like everything else cached. */
const NOTIFICATIONS_SEEN = 'notifications.seen';

/** Mock notification list — TODO(sprint2): wire to the notification module. */
const NOTIFICATIONS = [
  { id: 'n-1', icon: 'calendar' as IconName, text: 'Interview with Malith Jayasuriya starts in 30 minutes', time: 'Just now' },
  { id: 'n-2', icon: 'user-plus' as IconName, text: 'Kasun Silva accepted your invitation', time: '1 hour ago' },
  { id: 'n-3', icon: 'briefcase' as IconName, text: '5 new applications for UX Designer', time: '3 hours ago' },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const allow = useCan();
  const navItems = NAV_ITEMS.filter((item) => allow(item.permission));

  return (
    // Light chrome: the sidebar recedes so the workspace data is the only
    // thing competing for attention. Brand colour is spent on one mark and
    // the active nav row, nowhere else.
    <div className="flex h-full flex-col border-r border-slate-200 bg-white">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm">
          <Icon name="funnel" className="h-4 w-4" />
        </span>
        <span className="text-lg font-bold tracking-tight text-slate-900">TalentPipe</span>
      </div>

      {/* Primary navigation — only what this role may actually open. */}
      <nav className="mt-6 flex-1 space-y-1 px-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Menu</p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Left rail marks the active row without relying on fill
                    alone, so it stays legible at low contrast settings. */}
                <span
                  aria-hidden="true"
                  className={`absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-indigo-600 transition-opacity ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <Icon
                  name={item.icon}
                  className={`h-5 w-5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer links */}
      <div className="border-t border-slate-200 px-4 py-4">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Icon name="arrow-left" className="h-5 w-5 text-slate-400" />
          Back to site
        </Link>
      </div>
    </div>
  );
}

/**
 * Dedicated chrome for the company admin area: dark sidebar navigation,
 * a top bar with search / notifications / account, and the routed content
 * outlet. Collapses to a slide-over drawer on small screens.
 */
export function DashboardLayout() {
  return (
    // Both providers sit above the sidebar and the routed outlet, so the
    // roster and the company profile are each fetched once for the session and
    // shared — not re-requested per surface, and never two copies that drift.
    <TeamSummaryProvider>
      <CompanyProfileProvider>
        <DashboardChrome />
      </CompanyProfileProvider>
    </TeamSummaryProvider>
  );
}

function DashboardChrome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // The profile is the newer answer; the login response is the fallback while
  // it loads. Renaming the company now updates this chip immediately.
  const company = useCompanyIdentity(user?.tenantName);

  // Mac reads ⌘K, everything else Ctrl K. Computed once — `navigator` is
  // stable for the life of the document.
  const shortcutHint = useMemo(
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K'),
    [],
  );

  // The badge above advertises a shortcut, so it has to actually work.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Scoped to the workspace: dismissing these as one company must not mark
  // them read for the next company signed into on this device.
  const store = useMemo(() => tenantStorage(activeTenant.get()), []);
  const [unread, setUnread] = useState(() => store.get(NOTIFICATIONS_SEEN) !== 'true');

  function openNotifications() {
    setNotificationsOpen((open) => !open);
    setUnread(false);
    store.set(NOTIFICATIONS_SEEN, 'true');
  }

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <aside className="absolute inset-y-0 left-0 w-72 shadow-2xl">
            <SidebarContent onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Static sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <SidebarContent />
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden"
            aria-label="Open navigation"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>

          {/* Global search — decorative until the search API lands. */}
          <div className="group relative hidden max-w-md flex-1 sm:block">
            <Icon
              name="search"
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-600"
            />
            {/* TODO(sprint2): wire to global search once it exists. */}
            <input
              ref={searchRef}
              type="search"
              placeholder="Search jobs, candidates, people…"
              aria-label="Search"
              aria-keyshortcuts="Control+K Meta+K"
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-16 text-sm text-slate-700 shadow-sm transition-all placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/15 [&::-webkit-search-cancel-button]:appearance-none"
            />
            {/* Discoverability for the shortcut below; hidden once typing
                starts would need state, so it simply sits behind the text. */}
            <kbd
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-semibold text-slate-400 shadow-sm transition-opacity group-focus-within:opacity-0 lg:flex"
            >
              {shortcutHint}
            </kbd>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Which workspace this session is reading — sits with the account
                controls because it is identity, not navigation. Clicking the
                company opens its profile, which is where anyone who clicked
                the company's name expected to end up. */}
            <Link
              to="/dashboard/profile"
              title="View company profile"
              className="hidden items-center gap-2.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-3.5 transition-colors hover:border-slate-300 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 md:flex"
            >
              {company.logoUrl ? (
                <CompanyLogo src={company.logoUrl} name={company.name} size="sm" />
              ) : (
                <Avatar firstName={company.name} size="sm" />
              )}
              <p className="min-w-0 max-w-[11rem] truncate text-sm font-semibold text-slate-900">
                {company.name}
              </p>
            </Link>

            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={openNotifications}
                className="relative rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
              >
                <Icon name="bell" className="h-5 w-5" />
                {unread && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />}
              </button>
              {notificationsOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Dismiss notifications"
                    onClick={() => setNotificationsOpen(false)}
                    className="fixed inset-0 z-10 cursor-default"
                  />
                  <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5">
                    <p className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">Notifications</p>
                    <ul className="divide-y divide-slate-100">
                      {NOTIFICATIONS.map((n) => (
                        <li key={n.id} className="flex gap-3 px-4 py-3 transition-colors hover:bg-slate-50">
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                            <Icon name={n.icon} className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="text-sm leading-snug text-slate-700">{n.text}</p>
                            <p className="mt-0.5 text-xs text-slate-400">{n.time}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>

            {/* Account */}
            <div className="ml-1 flex items-center gap-3 border-l border-slate-200 pl-3">
              <Avatar firstName={user?.firstName ?? '?'} lastName={user?.lastName} size="sm" />
              <div className="hidden sm:block">
                <p className="text-sm font-semibold leading-tight text-slate-900">
                  {user?.firstName} {user?.lastName}
                </p>
                {/* The role decides what this session can reach, so it reads as
                    a pill rather than as grey caption text. */}
                {user && (
                  <div className="mt-0.5">
                    <RoleBadge role={user.role} />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label="Log out"
                title="Log out"
              >
                <Icon name="logout" className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Routed dashboard content */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

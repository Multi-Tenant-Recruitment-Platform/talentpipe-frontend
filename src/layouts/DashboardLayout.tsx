import {
  Badge as AntBadge,
  Drawer,
  Dropdown,
  Flex,
  Input,
  Layout,
  Menu,
  Typography,
  type InputRef,
} from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { Permission } from '../auth/permissions';
import { useCan } from '../auth/useCan';
import { Avatar } from '../components/dashboard/Avatar';
import { CompanyLogo } from '../components/dashboard/CompanyLogo';
import { Icon, type IconName } from '../components/dashboard/Icon';
import { RoleBadge } from '../components/dashboard/RoleBadge';
import { Button } from '../components/ui/Button';
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

/**
 * Which nav row the current URL selects.
 *
 * <p>The Overview item matches its path exactly, mirroring `NavLink`'s `end`:
 * a prefix match would light it up on every page in the dashboard.</p>
 */
function selectedKeyFor(pathname: string): string[] {
  const match = NAV_ITEMS.filter((item) =>
    item.end ? pathname === item.to : pathname.startsWith(item.to),
  );
  // Longest path wins, so /dashboard/profile/edit selects Profile Management.
  const best = match.sort((a, b) => b.to.length - a.to.length)[0];
  return best ? [best.to] : [];
}

function SidebarContent({ onNavigate }: Readonly<{ onNavigate?: () => void }>) {
  const allow = useCan();
  const { pathname } = useLocation();
  const navItems = NAV_ITEMS.filter((item) => allow(item.permission));

  return (
    // Light chrome: the sidebar recedes so the workspace data is the only
    // thing competing for attention. Brand colour is spent on one mark and
    // the active nav row, nowhere else.
    <Flex vertical style={{ height: '100%', background: '#fff', borderRight: '1px solid #e2e8f0' }}>
      {/* Brand */}
      <Flex align="center" gap={10} style={{ height: 64, padding: '0 24px', borderBottom: '1px solid #e2e8f0' }}>
        <span className="tp-brand-mark" style={{ width: 32, height: 32 }}>
          <Icon name="funnel" size={16} />
        </span>
        <Typography.Text strong style={{ fontSize: 18 }}>
          TalentPipe
        </Typography.Text>
      </Flex>

      {/* Primary navigation — only what this role may actually open. */}
      <div style={{ flex: 1, marginTop: 24 }}>
        <Typography.Text type="secondary" className="tp-eyebrow" style={{ display: 'block', padding: '0 28px 8px' }}>
          Menu
        </Typography.Text>
        <Menu
          mode="inline"
          selectedKeys={selectedKeyFor(pathname)}
          style={{ borderInlineEnd: 0, paddingInline: 8 }}
          items={navItems.map((item) => ({
            key: item.to,
            icon: <Icon name={item.icon} size={20} />,
            label: (
              <Link to={item.to} onClick={onNavigate}>
                {item.label}
              </Link>
            ),
          }))}
        />
      </div>

      {/* Footer links */}
      <div style={{ borderTop: '1px solid #e2e8f0', padding: 16 }}>
        <Link to="/" onClick={onNavigate} className="tp-sidebar-footer-link">
          <Icon name="arrow-left" size={20} />
          Back to site
        </Link>
      </div>
    </Flex>
  );
}

/**
 * Dedicated chrome for the company admin area: sidebar navigation, a top bar
 * with search / notifications / account, and the routed content outlet.
 * Collapses to a slide-over drawer on small screens.
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
  const searchRef = useRef<InputRef>(null);

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

  function openNotifications(open: boolean) {
    if (open) {
      setUnread(false);
      store.set(NOTIFICATIONS_SEEN, 'true');
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Mobile drawer */}
      <Drawer
        placement="left"
        width={288}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        closable={false}
        styles={{ body: { padding: 0 } }}
        rootClassName="tp-sidebar-drawer"
      >
        <SidebarContent onNavigate={() => setSidebarOpen(false)} />
      </Drawer>

      {/* Static sidebar */}
      <Layout.Sider width={256} theme="light" className="tp-sidebar" style={{ position: 'fixed', insetBlock: 0, left: 0, zIndex: 30 }}>
        <SidebarContent />
      </Layout.Sider>

      <Layout className="tp-dashboard-body">
        {/* Top bar */}
        <Layout.Header className="tp-topbar">
          <Button
            variant="ghost"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            className="tp-mobile-only"
          >
            <Icon name="menu" size={20} />
          </Button>

          {/* Global search — decorative until the search API lands. */}
          <div className="tp-topbar-search">
            {/* TODO(sprint2): wire to global search once it exists. */}
            <Input
              ref={searchRef}
              type="search"
              placeholder="Search jobs, candidates, people…"
              aria-label="Search"
              aria-keyshortcuts="Control+K Meta+K"
              prefix={<Icon name="search" size={16} style={{ opacity: 0.45 }} />}
              // Discoverability for the shortcut the effect above implements.
              suffix={
                <kbd aria-hidden="true" className="tp-kbd">
                  {shortcutHint}
                </kbd>
              }
              style={{ borderRadius: 999 }}
            />
          </div>

          <Flex align="center" gap={8} style={{ marginLeft: 'auto' }}>
            {/* Which workspace this session is reading — sits with the account
                controls because it is identity, not navigation. Clicking the
                company opens its profile, which is where anyone who clicked
                the company's name expected to end up. */}
            <Link to="/dashboard/profile" title="View company profile" className="tp-company-chip">
              {company.logoUrl ? (
                <CompanyLogo src={company.logoUrl} name={company.name} size="sm" />
              ) : (
                <Avatar firstName={company.name} size="sm" />
              )}
              <Typography.Text strong ellipsis style={{ maxWidth: 176 }}>
                {company.name}
              </Typography.Text>
            </Link>

            {/* Notifications */}
            <Dropdown
              trigger={['click']}
              onOpenChange={openNotifications}
              placement="bottomRight"
              popupRender={() => (
                <div className="tp-notifications">
                  <Typography.Text strong style={{ display: 'block', padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    Notifications
                  </Typography.Text>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {NOTIFICATIONS.map((n) => (
                      <li key={n.id} className="tp-notification">
                        <span className="tp-notification-icon">
                          <Icon name={n.icon} size={16} />
                        </span>
                        <div>
                          <Typography.Text style={{ display: 'block' }}>{n.text}</Typography.Text>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {n.time}
                          </Typography.Text>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            >
              <Button variant="ghost" aria-label="Notifications">
                <AntBadge dot={unread} offset={[-2, 2]}>
                  <Icon name="bell" size={20} />
                </AntBadge>
              </Button>
            </Dropdown>

            {/* Account */}
            <Flex align="center" gap={12} style={{ marginLeft: 4, borderLeft: '1px solid #e2e8f0', paddingLeft: 12 }}>
              <Avatar firstName={user?.firstName ?? '?'} lastName={user?.lastName} size="sm" />
              <div className="tp-account-name">
                <Typography.Text strong style={{ display: 'block', lineHeight: 1.2 }}>
                  {user?.firstName} {user?.lastName}
                </Typography.Text>
                {/* The role decides what this session can reach, so it reads as
                    a pill rather than as grey caption text. */}
                {user && (
                  <div style={{ marginTop: 2 }}>
                    <RoleBadge role={user.role} />
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                onClick={() => void handleLogout()}
                aria-label="Log out"
                title="Log out"
              >
                <Icon name="logout" size={20} />
              </Button>
            </Flex>
          </Flex>
        </Layout.Header>

        {/* Routed dashboard content */}
        <Layout.Content className="tp-dashboard-content">
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

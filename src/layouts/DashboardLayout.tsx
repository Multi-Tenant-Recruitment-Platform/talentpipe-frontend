import {
  Badge,
  Button,
  Divider,
  Drawer,
  Dropdown,
  Flex,
  Input,
  Layout,
  Menu,
  Space,
  Tag,
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
import { CompanyProfileProvider, useCompanyIdentity } from '../dashboard/CompanyProfileContext';
import { TeamSummaryProvider } from '../dashboard/TeamSummaryContext';
import { activeTenant } from '../tenant/activeTenant';
import { formatRole } from '../utils/format';
import { tenantStorage } from '../utils/tenantStorage';
import { fontSize, slate } from '../theme/tokens';

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
    <Flex vertical className="tp-sidebar-inner">
      {/* Brand. Exactly the header's height, so this divider and the top bar's
          bottom border form one continuous line across the fold. */}
      <Flex align="center" gap={10} className="tp-sidebar-brand">
        <span className="tp-brand-mark tp-brand-mark-sm">
          <Icon name="funnel" size={16} />
        </span>
        <Typography.Text strong style={{ fontSize: fontSize.lead, letterSpacing: '-0.01em' }}>
          TalentPipe
        </Typography.Text>
      </Flex>

      {/* Primary navigation — only what this role may actually open. */}
      <div className="tp-sidebar-nav">
        <Typography.Text type="secondary" className="tp-sidebar-caption">
          Menu
        </Typography.Text>
        <Menu
          mode="inline"
          selectedKeys={selectedKeyFor(pathname)}
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

      {/* Pinned to the bottom edge. Rendered through a Menu as well, rather
          than as a hand-styled link, so its icon gap and left padding are
          structurally identical to the rows above instead of two numbers that
          drift apart later. */}
      <div className="tp-sidebar-foot">
        <Menu
          mode="inline"
          selectable={false}
          items={[
            {
              key: 'back-to-site',
              icon: <Icon name="arrow-left" size={20} />,
              label: (
                <Link to="/" onClick={onNavigate}>
                  Back to site
                </Link>
              ),
            },
          ]}
        />
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

  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Mobile drawer — the same sidebar, so the two never diverge. */}
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
      <Layout.Sider
        width={256}
        theme="light"
        className="tp-sidebar"
        style={{ position: 'fixed', insetBlock: 0, left: 0, zIndex: 30 }}
      >
        <SidebarContent />
      </Layout.Sider>

      <Layout className="tp-dashboard-body">
        {/* Top bar. One flex row with a single centre axis — every child is a
            flex item with no vertical margin of its own, which is what stops
            the bell or the org tag sitting a pixel proud of the search box. */}
        <Layout.Header className="tp-topbar">
          <Button
            type="text"
            shape="circle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            className="tp-mobile-only"
            icon={<Icon name="menu" size={20} />}
          />

          {/* Search leads: it is the highest-frequency action in a recruiter's
              day, so it gets the largest target and the left anchor.
              Decorative until the search API lands. */}
          <div className="tp-topbar-search">
            {/* TODO(sprint2): wire to global search once it exists. */}
            <Input
              ref={searchRef}
              type="search"
              size="large"
              placeholder="Search jobs, candidates, people…"
              aria-label="Search"
              aria-keyshortcuts="Control+K Meta+K"
              prefix={<Icon name="search" size={18} style={{ color: slate[400] }} />}
              // Discoverability for the shortcut the effect above implements.
              suffix={
                <Tag aria-hidden="true" className="tp-kbd">
                  {shortcutHint}
                </Tag>
              }
            />
          </div>

          {/* Hard spacer, so the action cluster is pinned to the right edge
              regardless of how wide the search grows. */}
          <div style={{ flex: 1 }} />

          <Space size={8} align="center">
            {/* Workspace context, not navigation — a Tag reads deliberately
                lighter than the profile block beside it, so in an agency
                juggling tenants the two identities never compete. */}
            <Link
              to="/dashboard/profile"
              title="View company profile"
              className="tp-org-tag"
              aria-label={`Current workspace: ${company.name}. View company profile`}
            >
              <Tag className="tp-org-tag-inner">
                <Flex align="center" gap={7}>
                  {company.logoUrl ? (
                    <CompanyLogo src={company.logoUrl} name={company.name} size="sm" style={{ width: 18, height: 18, borderRadius: 5 }} />
                  ) : (
                    <Icon name="building" size={14} style={{ color: slate[500] }} />
                  )}
                  <span className="tp-org-tag-name">{company.name}</span>
                </Flex>
              </Tag>
            </Link>

            {/* Notifications */}
            <Dropdown
              trigger={['click']}
              onOpenChange={openNotifications}
              placement="bottomRight"
              popupRender={() => (
                <div className="tp-popover">
                  <Typography.Text strong className="tp-popover-head">
                    Notifications
                  </Typography.Text>
                  <ul className="tp-notification-list">
                    {NOTIFICATIONS.map((n) => (
                      <li key={n.id} className="tp-notification">
                        <span className="tp-notification-icon">
                          <Icon name={n.icon} size={16} />
                        </span>
                        <div>
                          <Typography.Text style={{ display: 'block' }}>{n.text}</Typography.Text>
                          <Typography.Text type="secondary" style={{ fontSize: fontSize.caption }}>
                            {n.time}
                          </Typography.Text>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            >
              <Button
                type="text"
                shape="circle"
                aria-label="Notifications"
                className="tp-icon-button"
                icon={
                  <Badge dot={unread} offset={[-1, 2]}>
                    <Icon name="bell" size={20} />
                  </Badge>
                }
              />
            </Dropdown>

            <Divider type="vertical" className="tp-topbar-divider" />

            {/* Account. The whole block is the trigger — avatar, name, role and
                chevron together — so the hit target matches what reads as one
                control, and the chevron says it opens rather than navigates. */}
            <Dropdown
              trigger={['click']}
              placement="bottomRight"
              popupRender={() => (
                <div className="tp-popover tp-profile-popover">
                  <Flex align="center" gap={12} className="tp-profile-identity">
                    <Avatar firstName={user?.firstName ?? '?'} lastName={user?.lastName} size="md" />
                    <div style={{ minWidth: 0 }}>
                      <Typography.Text strong ellipsis style={{ display: 'block' }}>
                        {fullName}
                      </Typography.Text>
                      <Typography.Text type="secondary" ellipsis style={{ fontSize: fontSize.caption, display: 'block' }}>
                        {user?.email}
                      </Typography.Text>
                      {user && (
                        <div style={{ marginTop: 6 }}>
                          <RoleBadge role={user.role} />
                        </div>
                      )}
                    </div>
                  </Flex>
                  <Menu
                    selectable={false}
                    className="tp-profile-menu"
                    items={[
                      {
                        key: 'logout',
                        // Ending a session is destructive enough to be labelled
                        // and to turn red under the cursor — never a faint
                        // unlabelled icon sitting a click away from the avatar.
                        danger: true,
                        icon: <Icon name="logout" size={16} />,
                        label: 'Log out',
                        onClick: () => void handleLogout(),
                      },
                    ]}
                  />
                </div>
              )}
            >
              <button
                type="button"
                className="tp-profile-trigger"
                aria-label={`Account menu for ${fullName}`}
              >
                <Avatar
                  firstName={user?.firstName ?? '?'}
                  lastName={user?.lastName}
                  size="sm"
                        />
                <span className="tp-profile-meta">
                  <span className="tp-profile-name">{fullName}</span>
                  <span className="tp-profile-role">{user ? formatRole(user.role) : ''}</span>
                </span>
                <Icon name="chevron-down" size={16} className="tp-profile-chevron" />
              </button>
            </Dropdown>
          </Space>
        </Layout.Header>

        {/* Routed dashboard content */}
        <Layout.Content className="tp-dashboard-content">
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

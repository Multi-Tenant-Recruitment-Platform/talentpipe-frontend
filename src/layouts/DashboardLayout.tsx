import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  BankOutlined,
  BellOutlined,
  CalendarOutlined,
  FunnelPlotOutlined,
  LogoutOutlined,
  MenuOutlined,
  NodeIndexOutlined,
  SearchOutlined,
  SettingOutlined,
  SolutionOutlined,
  TeamOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Button,
  ConfigProvider,
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
  type ThemeConfig,
} from 'antd';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { PageLoader } from '../components/PageLoader';
import { ProfileTrigger } from '../components/ProfileTrigger';
import { pageContainer, popoverShell } from '../components/ui/classes';
import type { UserResponse } from '../api/types';
import type { Permission } from '../auth/permissions';
import { useCan } from '../auth/useCan';
import { Avatar } from '../components/dashboard/Avatar';
import { CompanyLogo } from '../components/dashboard/CompanyLogo';
import { RoleBadge } from '../components/dashboard/RoleBadge';
import { CompanyProfileProvider, useCompanyIdentity } from '../dashboard/CompanyProfileContext';
import { TeamSummaryProvider } from '../dashboard/TeamSummaryContext';
import { activeTenant } from '../tenant/activeTenant';
import { formatRole } from '../utils/format';
import { tenantStorage } from '../utils/tenantStorage';
import type { IconComponent } from '../components/ui/icon';
import { primary, slate, surface } from '../theme/tokens';
import { BrandLogo } from '../components/BrandLogo';

/**
 * The sidebar's menu on its slate ground. The current page is a filled
 * brand-blue pill — the same blue as the Search and Get started buttons on the
 * public site — and the rest are slate-300, which reads at 12:1 on slate-900.
 */
const SIDEBAR_MENU_THEME: ThemeConfig = {
  components: {
    Menu: {
      itemBg: 'transparent',
      itemColor: slate[300],
      itemHoverColor: surface.base,
      itemHoverBg: slate[800],
      itemActiveBg: slate[800],
      itemSelectedBg: primary[600],
      itemSelectedColor: surface.base,
    },
  },
};

/** Each entry names the permission that earns it a place in the sidebar. */
const NAV_ITEMS: {
  to: string;
  label: string;
  icon: IconComponent;
  end?: boolean;
  permission: Permission;
}[] = [
  { to: '/dashboard', label: 'Overview', icon: AppstoreOutlined, end: true, permission: 'overview.view' },
  // Vacancies sit above Pipeline because that is the order the work happens
  // in: a role is opened, then its candidates move through it.
  // Every member may open it: the backend lists only the vacancies they work
  // on unless their role sees them all.
  { to: '/dashboard/jobs', label: 'Job Vacancies', icon: SolutionOutlined, permission: 'jobs.view' },
  // Templates sit beside vacancies: a job is opened from one.
  {
    to: '/dashboard/pipeline-templates',
    label: 'Pipeline Templates',
    icon: NodeIndexOutlined,
    permission: 'templates.view',
  },
  { to: '/dashboard/pipeline', label: 'Pipeline', icon: FunnelPlotOutlined, permission: 'pipeline.view' },
  { to: '/dashboard/team', label: 'Team', icon: TeamOutlined, permission: 'team.view' },
  {
    to: '/dashboard/profile',
    label: 'Profile Management',
    icon: BankOutlined,
    permission: 'company.profile.view',
  },
  { to: '/dashboard/settings', label: 'Company Settings', icon: SettingOutlined, permission: 'settings.view' },
];

/** Notification dismissals are per-workspace, like everything else cached. */
const NOTIFICATIONS_SEEN = 'notifications.seen';

/** Mock notification list — TODO(sprint2): wire to the notification module. */
const NOTIFICATIONS = [
  { id: 'n-1', icon: CalendarOutlined, text: 'Interview with Malith Jayasuriya starts in 30 minutes', time: 'Just now' },
  { id: 'n-2', icon: UserAddOutlined, text: 'Kasun Silva accepted your invitation', time: '1 hour ago' },
  { id: 'n-3', icon: SolutionOutlined, text: '5 new applications for UX Designer', time: '3 hours ago' },
];

/**
 * Which nav row the current URL selects.
 *
 * <p>The Overview item matches its path exactly, mirroring `NavLink`'s `end`:
 * a prefix match would light it up on every page in the dashboard.</p>
 */
function selectedKeyFor(pathname: string): string[] {
  const match = NAV_ITEMS.filter((item) =>
    // Segment-aware: /dashboard/pipeline must not claim /dashboard/pipeline-templates.
    item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`),
  );
  // Longest path wins, so /dashboard/profile/edit selects Profile Management.
  const best = match.reduce<(typeof NAV_ITEMS)[number] | undefined>(
    (longest, item) => (!longest || item.to.length > longest.to.length ? item : longest),
    undefined,
  );
  return best ? [best.to] : [];
}

function fullNameOf(user: UserResponse | null): string {
  return `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
}

function NotificationsPanel() {
  return (
    <div className={`w-80 ${popoverShell}`}>
      <Typography.Text strong className="block border-b border-slate-100 px-4 py-3">
        Notifications
      </Typography.Text>
      <ul className="m-0 max-h-90 list-none overflow-y-auto p-0">
        {NOTIFICATIONS.map((n) => (
          <li
            key={n.id}
            className="flex gap-3 border-t border-slate-100 px-4 py-3 transition-[background] duration-(--tp-motion-base) ease-standard first:border-t-0 hover:bg-canvas"
          >
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-primary-50 text-primary-600">
              <n.icon aria-hidden className="text-[16px]" />
            </span>
            <div>
              <Typography.Text className="block">{n.text}</Typography.Text>
              <Typography.Text type="secondary" className="text-caption">
                {n.time}
              </Typography.Text>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The account dropdown's body. It reads the session itself rather than taking
 * it as props: the popup is portalled, but portals keep React context, and
 * this lets the Dropdown take a stable module-level render function.
 */
function AccountPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  return (
    <div className={`w-67 ${popoverShell}`}>
      <Flex align="center" gap={12} className="border-b border-slate-100 px-4 py-3.5">
        <Avatar firstName={user?.firstName ?? '?'} lastName={user?.lastName} size="md" />
        <div className="min-w-0">
          <Typography.Text strong ellipsis className="block">
            {fullNameOf(user)}
          </Typography.Text>
          <Typography.Text type="secondary" ellipsis className="block text-caption">
            {user?.email}
          </Typography.Text>
          {user && (
            <div className="mt-1.5">
              <RoleBadge role={user.role} roleName={user.roleName} />
            </div>
          )}
        </div>
      </Flex>
      <Menu
        selectable={false}
        className="border-e-0 bg-transparent p-1.5"
        items={[
          {
            key: 'logout',
            // Ending a session is destructive enough to be labelled
            // and to turn red under the cursor — never a faint
            // unlabelled icon sitting a click away from the avatar.
            danger: true,
            icon: <LogoutOutlined aria-hidden className="text-[16px]" />,
            label: 'Log out',
            onClick: () => void handleLogout(),
          },
        ]}
      />
    </div>
  );
}

// Defined at module scope so the Dropdowns receive stable render functions
// instead of a new component definition on every render of the top bar.
const renderNotificationsPanel = () => <NotificationsPanel />;
const renderAccountPanel = () => <AccountPanel />;

function SidebarContent({ onNavigate }: Readonly<{ onNavigate?: () => void }>) {
  const allow = useCan();
  const { pathname } = useLocation();
  const navItems = NAV_ITEMS.filter((item) => allow(item.permission));

  return (
    // Dark chrome, the slate of the public site's header and hero strip, so
    // the workspace and the job board read as one product. The content area
    // stays light: the sidebar frames the work rather than competing with it.
    // Brand colour is spent on one mark and the active nav row, nowhere else.
    <Flex vertical className="tp-sidebar-inner h-full border-r border-slate-800 bg-slate-900">
      {/* Brand. Exactly the header's height, so this divider and the top bar's
          bottom border form one continuous line across the fold. */}
      {/* Exactly the header height: this divider and the top bar bottom border form
          one unbroken line across the fold. */}
      <Flex align="center" gap={10} className="h-16 shrink-0 border-b border-slate-800 px-6">
        {/* The same logo as the public header. */}
        <BrandLogo tone="dark" />
      </Flex>

      {/* Primary navigation — only what this role may actually open. */}
      <div className="min-h-0 flex-1 overflow-y-auto pt-4">
        {/* Aligned to where the menu icons start: Menu itemMarginInline (8) plus the
            item inline padding (16). Section label and icon share a left edge. */}
        {/* slate-400, not 500: 500 falls below 4.5:1 on slate-900. */}
        <Typography.Text className="block px-6 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          Menu
        </Typography.Text>
        <ConfigProvider theme={SIDEBAR_MENU_THEME}>
          <Menu
            mode="inline"
            selectedKeys={selectedKeyFor(pathname)}
            items={navItems.map((item) => ({
              key: item.to,
              icon: <item.icon aria-hidden className="text-[20px]" />,
              label: (
                <Link to={item.to} onClick={onNavigate}>
                  {item.label}
                </Link>
              ),
            }))}
          />
        </ConfigProvider>
      </div>

      {/* Pinned to the bottom edge. Rendered through a Menu as well, rather
          than as a hand-styled link, so its icon gap and left padding are
          structurally identical to the rows above instead of two numbers that
          drift apart later. */}
      <div className="shrink-0 border-t border-slate-800 py-2">
        <ConfigProvider theme={SIDEBAR_MENU_THEME}>
          <Menu
            mode="inline"
            selectable={false}
            items={[
              {
                key: 'back-to-site',
                icon: <ArrowLeftOutlined aria-hidden className="text-[20px]" />,
                label: (
                  <Link to="/" onClick={onNavigate}>
                    Back to site
                  </Link>
                ),
              },
            ]}
          />
        </ConfigProvider>
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
  const { user } = useAuth();
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

  const fullName = fullNameOf(user);

  return (
    <Layout className="min-h-screen">
      {/* Mobile drawer — the same sidebar, so the two never diverge. */}
      <Drawer
        placement="left"
        width={288}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        closable={false}
        styles={{ body: { padding: 0 }, section: { background: slate[900] } }}
        rootClassName="lg:hidden"
      >
        <SidebarContent onNavigate={() => setSidebarOpen(false)} />
      </Drawer>

      {/* Static sidebar */}
      <Layout.Sider width={256} theme="light" className="fixed inset-y-0 left-0 z-30 hidden bg-slate-900 lg:block">
        <SidebarContent />
      </Layout.Sider>

      {/* Matches Sider width exactly, so content never slides under the rail. */}
      <Layout className="lg:pl-64">
        {/* Top bar. One flex row with a single centre axis — every child is a
            flex item with no vertical margin of its own, which is what stops
            the bell or the org tag sitting a pixel proud of the search box. */}
        <Layout.Header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/92 px-4 shadow-xs backdrop-blur-[10px] sm:px-6">
          <Button
            type="text"
            shape="circle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            className="inline-flex lg:hidden"
            icon={<MenuOutlined aria-hidden className="text-[20px]" />}
          />

          {/* Search leads: it is the highest-frequency action in a recruiter's
              day, so it gets the largest target and the left anchor.
              Decorative until the search API lands. */}
          {/* Flexible but capped: wide enough to read a candidate full name back,
              narrow enough that the action cluster keeps the right edge. */}
          <div className="tp-topbar-search hidden min-w-0 flex-[0_1_420px] sm:block">
            {/* TODO(sprint2): wire to global search once it exists. */}
            <Input
              ref={searchRef}
              type="search"
              size="large"
              placeholder="Search jobs, candidates, people…"
              aria-label="Search"
              aria-keyshortcuts="Control+K Meta+K"
              prefix={<SearchOutlined aria-hidden className="text-[18px] text-slate-400" />}
              // Discoverability for the shortcut the effect above implements.
              suffix={
                // The shortcut hint is a Tag, reset to read as a keycap rather than a label.
                <Tag
                  aria-hidden="true"
                  className="m-0 hidden rounded-[6px] border-slate-200 bg-surface px-[7px] py-px text-[11px] font-semibold leading-[18px] text-slate-400 lg:inline-block"
                >
                  {shortcutHint}
                </Tag>
              }
            />
          </div>

          {/* Hard spacer, so the action cluster is pinned to the right edge
              regardless of how wide the search grows. */}
          <div className="flex-1" />

          <Space size={8} align="center">
            {/* Workspace context, not navigation — a Tag reads deliberately
                lighter than the profile block beside it, so in an agency
                juggling tenants the two identities never compete. */}
            {/* Context, not navigation. Deliberately lighter than the profile block beside
                it so the workspace identity and the personal identity never compete. */}
            <Link
              to="/dashboard/profile"
              title="View company profile"
              className="group hidden no-underline md:inline-flex"
              aria-label={`Current workspace: ${company.name}. View company profile`}
            >
              <Tag className="m-0 inline-flex h-8 items-center rounded-pill border-slate-200 px-2.5 transition-[background,border-color] duration-(--tp-motion-base) ease-standard group-hover:border-primary-100 group-hover:bg-primary-50">
                <Flex align="center" gap={7}>
                  {company.logoUrl ? (
                    <CompanyLogo src={company.logoUrl} name={company.name} size="sm" style={{ width: 18, height: 18, borderRadius: 5 }} />
                  ) : (
                    <BankOutlined aria-hidden className="text-[14px] text-slate-500" />
                  )}
                  <span className="max-w-42 truncate text-small font-semibold text-slate-700 group-hover:text-primary-700">
                    {company.name}
                  </span>
                </Flex>
              </Tag>
            </Link>

            {/* Notifications */}
            <Dropdown
              trigger={['click']}
              onOpenChange={openNotifications}
              placement="bottomRight"
              popupRender={renderNotificationsPanel}
            >
              <Button
                type="text"
                shape="circle"
                aria-label="Notifications"
                className="text-slate-600 hover:text-slate-900"
                icon={
                  <Badge dot={unread} offset={[-1, 2]}>
                    <BellOutlined aria-hidden className="text-[20px]" />
                  </Badge>
                }
              />
            </Dropdown>

            <Divider type="vertical" className="mx-1 h-6 border-slate-200" />

            {/* Account. The whole block is the trigger — avatar, name, role and
                chevron together — so the hit target matches what reads as one
                control, and the chevron says it opens rather than navigates. */}
            <Dropdown
              trigger={['click']}
              placement="bottomRight"
              popupRender={renderAccountPanel}
            >
              <ProfileTrigger
                firstName={user?.firstName ?? '?'}
                lastName={user?.lastName}
                name={fullName}
                role={user ? formatRole(user.role) : ''}
                aria-label={`Account menu for ${fullName}`}
              />
            </Dropdown>
          </Space>
        </Layout.Header>

        {/* Routed dashboard content */}
        <Layout.Content className={`py-8 ${pageContainer}`}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

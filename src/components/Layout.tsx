import { LogoutOutlined } from '@ant-design/icons';
import { Button as AntButton, Divider, Flex, Grid, Layout as AntLayout, Menu, Tooltip, Typography } from 'antd';
import { Suspense } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useOpenLogin } from '../auth/loginIntent';
import { can } from '../auth/permissions';
import { AccountMenu } from './AccountMenu';
import { LoginModal } from './auth/LoginModal';
import { PageLoader } from './PageLoader';
import { Button } from './ui/Button';
import { pageContainer } from './ui/classes';

/** Shared page chrome: top navigation + content outlet. */
export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const screens = Grid.useBreakpoint();
  const openLogin = useOpenLogin();

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  const items = [
    { key: '/', label: <Link to="/">Browse jobs</Link> },
    // The dashboard is the company workspace; candidates have no tenant, so it
    // isn't shown to them. Asks the permission map rather than naming a role,
    // so this and the route guard can never drift apart.
    ...(user && can(user.role, 'dashboard.view')
      ? [{ key: '/dashboard', label: <Link to="/dashboard">Dashboard</Link> }]
      : []),
  ];
  // The board is `/` and its adverts live under `/jobs/…`; a plain prefix test
  // on `/` would light the item up on every page.
  const selectedKey = pathname === '/' || pathname.startsWith('/jobs/') ? '/' : pathname.startsWith('/dashboard') ? '/dashboard' : null;

  return (
    <AntLayout className="min-h-screen">
      {/* The container below owns the gutters, so the header lines up with
          the page content edge for edge. */}
      <AntLayout.Header className="sticky top-0 z-20 flex items-center gap-4 border-b border-slate-200 bg-white/85 px-0 backdrop-blur-[6px]">
        <Flex align="center" justify="space-between" gap={16} className={pageContainer}>
          <Link to="/" aria-label="TalentPipe home" className="flex flex-none items-center gap-2">
            <span aria-hidden="true" className="tp-brand-mark size-8 font-bold">
              T
            </span>
            {/* On a phone the mark alone carries the brand, so the actions
                beside it keep their full labels instead of overflowing. */}
            {screens.sm && (
              <Typography.Text strong className="whitespace-nowrap text-title">
                TalentPipe
              </Typography.Text>
            )}
          </Link>

          <Flex align="center" gap={screens.sm ? 8 : 4} className="min-w-0">
            {/* Sized to its links once they may not fold; the fixed 180px
                only exists to give the phone fold something to measure. */}
            <Menu
              mode="horizontal"
              selectedKeys={selectedKey ? [selectedKey] : []}
              items={items}
              // From `sm` up every link fits, so none may fold into antd's
              // unlabelled "···". Below it, the fold is the phone's "more" menu.
              disabledOverflow={screens.sm}
              className={`border-b-0 bg-transparent ${screens.sm ? 'flex-none' : 'min-w-12 flex-1'}`}
            />
            {user ? (
              <>
                {/* The person's own pages live behind their name, not in the
                    site navigation beside Browse jobs. */}
                <AccountMenu user={user} />
                <Divider type="vertical" className="mx-1 h-6 border-slate-200" />
                {/* Icon-only by design, so the tooltip and the accessible name
                    both carry the word; it turns red on hover because it ends
                    the session. */}
                {/* Ending the session is the one destructive control in the header. */}
                <Tooltip title="Log out" placement="bottomRight">
                  <AntButton
                    type="text"
                    shape="circle"
                    aria-label="Log out"
                    className="text-slate-600 hover:bg-error-bg hover:text-error-text"
                    icon={<LogoutOutlined aria-hidden className="text-[20px]" />}
                    onClick={() => void handleLogout()}
                  />
                </Tooltip>
              </>
            ) : (
              <>
                {/* Opens the login popup over this page, so a visitor reading
                    an advert does not lose their place to sign in. */}
                <Button variant="ghost" size={screens.sm ? 'md' : 'sm'} onClick={() => openLogin()}>
                  Log in
                </Button>
                <Button variant="primary" size={screens.sm ? 'md' : 'sm'} onClick={() => navigate('/register')}>
                  Get started
                </Button>
              </>
            )}
          </Flex>
        </Flex>
      </AntLayout.Header>

      <AntLayout.Content className={`py-10 ${pageContainer}`}>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </AntLayout.Content>

      <LoginModal />
    </AntLayout>
  );
}

import { Button as AntButton, Divider, Flex, Grid, Layout as AntLayout, Menu, Tooltip, Typography } from 'antd';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { can } from '../auth/permissions';
import { AccountMenu } from './AccountMenu';
import { Icon } from './dashboard/Icon';
import { Button } from './ui/Button';
import { fontSize, fontWeight, slate } from '../theme/tokens';

/** Shared page chrome: top navigation + content outlet. */
export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const screens = Grid.useBreakpoint();

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  const items = [
    { key: '/jobs', label: <Link to="/jobs">Browse jobs</Link> },
    // The dashboard is the company workspace; candidates have no tenant, so it
    // isn't shown to them. Asks the permission map rather than naming a role,
    // so this and the route guard can never drift apart.
    ...(user && can(user.role, 'dashboard.view')
      ? [{ key: '/dashboard', label: <Link to="/dashboard">Dashboard</Link> }]
      : []),
  ];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <AntLayout.Header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          borderBottom: `1px solid ${slate[200]}`,
          background: 'rgb(255 255 255 / 85%)',
          backdropFilter: 'blur(6px)',
          // The container below owns the gutters, so the header lines up with
          // the page content edge for edge.
          paddingInline: 0,
        }}
      >
        <Flex
          align="center"
          justify="space-between"
          gap={16}
          className="tp-page-container"
        >
          <Link
            to="/"
            aria-label="TalentPipe home"
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}
          >
            <span
              aria-hidden="true"
              className="tp-brand-mark"
              style={{ width: 32, height: 32, fontWeight: fontWeight.bold }}
            >
              T
            </span>
            {/* On a phone the mark alone carries the brand, so the actions
                beside it keep their full labels instead of overflowing. */}
            {screens.sm && (
              <Typography.Text strong style={{ fontSize: fontSize.title, whiteSpace: 'nowrap' }}>
                TalentPipe
              </Typography.Text>
            )}
          </Link>

          <Flex align="center" gap={screens.sm ? 8 : 4} style={{ minWidth: 0 }}>
            <Menu
              mode="horizontal"
              selectedKeys={items.filter((i) => pathname.startsWith(i.key)).map((i) => i.key)}
              items={items}
              // From `sm` up every link fits, so none may fold into antd's
              // unlabelled "···". Below it, the fold is the phone's "more" menu.
              disabledOverflow={screens.sm}
              style={{
                // Sized to its links once they may not fold; the fixed 180px
                // only exists to give the phone fold something to measure.
                ...(screens.sm ? { flex: 'none' } : { flex: 1, minWidth: 48 }),
                borderBottom: 0,
                background: 'transparent',
              }}
            />
            {user ? (
              <>
                {/* The person's own pages live behind their name, not in the
                    site navigation beside Browse jobs. */}
                <AccountMenu user={user} />
                <Divider type="vertical" className="tp-topbar-divider" />
                {/* Icon-only by design, so the tooltip and the accessible name
                    both carry the word; it turns red on hover because it ends
                    the session. */}
                <Tooltip title="Log out" placement="bottomRight">
                  <AntButton
                    type="text"
                    shape="circle"
                    aria-label="Log out"
                    className="tp-icon-button tp-logout-button"
                    icon={<Icon name="logout" size={20} />}
                    onClick={() => void handleLogout()}
                  />
                </Tooltip>
              </>
            ) : (
              <>
                <Button variant="ghost" size={screens.sm ? 'md' : 'sm'} onClick={() => navigate('/login')}>
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

      <AntLayout.Content className="tp-page-container" style={{ paddingBlock: 40 }}>
        <Outlet />
      </AntLayout.Content>
    </AntLayout>
  );
}

import { Flex, Layout as AntLayout, Menu, Typography } from 'antd';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { can } from '../auth/permissions';
import { Button } from './ui/Button';

/** Shared page chrome: top navigation + content outlet. */
export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

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
          borderBottom: '1px solid #e2e8f0',
          background: 'rgb(255 255 255 / 85%)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <Flex
          align="center"
          justify="space-between"
          gap={16}
          style={{ width: '100%', maxWidth: 1152, marginInline: 'auto' }}
        >
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="tp-brand-mark" style={{ width: 32, height: 32, fontWeight: 800 }}>
              T
            </span>
            <Typography.Text strong style={{ fontSize: 18 }}>
              TalentPipe
            </Typography.Text>
          </Link>

          <Flex align="center" gap={8}>
            <Menu
              mode="horizontal"
              selectedKeys={items.filter((i) => pathname.startsWith(i.key)).map((i) => i.key)}
              items={items}
              style={{ flex: 1, minWidth: 180, borderBottom: 0, background: 'transparent' }}
            />
            {user ? (
              <Button variant="ghost" onClick={() => void handleLogout()}>
                Log out
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/login')}>
                  Log in
                </Button>
                <Button variant="primary" onClick={() => navigate('/register')}>
                  Get started
                </Button>
              </>
            )}
          </Flex>
        </Flex>
      </AntLayout.Header>

      <AntLayout.Content style={{ maxWidth: 1152, width: '100%', marginInline: 'auto', padding: '40px 16px' }}>
        <Outlet />
      </AntLayout.Content>
    </AntLayout>
  );
}

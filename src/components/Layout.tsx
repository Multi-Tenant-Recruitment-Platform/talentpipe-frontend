import { Flex, Grid, Layout as AntLayout } from 'antd';
import { Suspense } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { can } from '../auth/permissions';
import { AccountMenu } from './AccountMenu';
import { PageLoader } from './PageLoader';
import { Button } from './ui/Button';
import { pageContainer } from './ui/classes';
import { BrandLogo } from './BrandLogo';

/** The job board is the home page; each job's details and application form live under `/jobs/…`. */
const isJobPage = (pathname: string) => pathname === '/' || pathname.startsWith('/jobs/');

/**
 * Pages that run edge to edge — a full-width band right under the header —
 * and so put their own content on the page container instead of Layout's:
 * the job pages.
 */
const isFullBleed = isJobPage;

/** A site link: slate on the dark bar, white with an accent underline at the bar's bottom edge when current. */
const navLinkClass = (isActive: boolean) =>
  `relative flex h-16 items-center px-2 text-body font-medium no-underline transition-colors duration-(--tp-motion-base) after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-pill sm:px-3 sm:after:inset-x-3 ${
    isActive ? 'text-white after:bg-primary-600 hover:text-white' : 'text-slate-300 hover:text-white'
  }`;

/** Shared page chrome: top navigation + content outlet. */
export function Layout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();

  // Each link says when it is current. The board is `/` and its adverts live
  // under `/jobs/…`, which a router match on `/` cannot express — and a plain
  // prefix test on `/` would light the link up on every page.
  const links = [
    { to: '/', label: 'Find jobs', current: isJobPage(pathname) },
    // The dashboard is the company workspace; candidates have no tenant, so it
    // isn't shown to them. Asks the permission map rather than naming a role,
    // so this and the route guard can never drift apart.
    ...(user && can(user.role, 'dashboard.view')
      ? [{ to: '/dashboard', label: 'Dashboard', current: pathname.startsWith('/dashboard') }]
      : []),
  ];
  const fullBleed = isFullBleed(pathname);

  return (
    <AntLayout className="min-h-screen">
      {/* The container below owns the gutters, so the header lines up with
          the page content edge for edge. */}
      <AntLayout.Header
        className={`sticky top-0 z-20 flex items-center gap-4 border-b bg-slate-900 px-0 ${fullBleed ? 'border-slate-800/60' : 'border-slate-800'}`}
      >
        <Flex align="center" justify="space-between" gap={16} className={pageContainer}>
          <Flex align="center" gap={screens.md ? 32 : 8} className="min-w-0">
            <Link to="/" aria-label="TalentPipe home" className="flex flex-none items-center no-underline">
              {/* On a phone the mark alone carries the brand, so the actions
                  beside it keep their full labels instead of overflowing. */}
              <BrandLogo tone="dark" showName={Boolean(screens.sm)} />
            </Link>

            {/* Two short links fit at every width, so there is nothing to fold
                into an unlabelled "more" menu. */}
            <nav aria-label="Main" className="flex min-w-0 items-center">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  aria-current={link.current ? 'page' : undefined}
                  className={navLinkClass(link.current)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </Flex>

          <Flex align="center" gap={screens.sm ? 8 : 4} className="flex-none">
            {user ? (
              // The person's own pages — and Log out — live behind their name,
              // as in the dashboard, not in the site navigation beside Find jobs.
              <AccountMenu user={user} tone="dark" />
            ) : (
              <>
                {/* Navigate to full-screen auth pages */}
                <Button
                  variant="ghost"
                  size={screens.sm ? 'md' : 'sm'}
                  className="text-white hover:bg-slate-800 hover:text-white"
                  onClick={() => navigate('/login')}
                >
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

      <AntLayout.Content className={fullBleed ? 'w-full' : `py-10 ${pageContainer}`}>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </AntLayout.Content>

    </AntLayout>
  );
}

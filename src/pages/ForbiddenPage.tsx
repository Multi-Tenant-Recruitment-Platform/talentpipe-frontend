import { ArrowLeftOutlined, LockOutlined } from '@ant-design/icons';
import { Flex, Result, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { homeRouteFor, type Permission } from '../auth/permissions';
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
  'templates.view': 'Pipeline templates are visible to Company Admins and HR managers.',
  'templates.manage': 'Only a Company Admin can create or change pipeline templates.',
};

/**
 * In-place 403. Rendered inside the dashboard chrome (see RequirePermission)
 * so the sidebar and top bar stay usable and the URL survives — a silent
 * redirect away from a deep link reads as a bug, not as a permission boundary.
 */
export function ForbiddenPage({ requires }: Readonly<{ requires?: Permission }>) {
  const { user } = useAuth();
  const home = homeRouteFor(user?.role);

  return (
    <Result
      className="mx-auto max-w-128"
      icon={
        <span className="inline-flex size-14 items-center justify-center rounded-xl bg-warning-bg text-warning-text">
          <LockOutlined aria-hidden className="text-[28px]" />
        </span>
      }
      title={
        <Typography.Title level={1} className="m-0 text-heading">
          You don&rsquo;t have access to this page
        </Typography.Title>
      }
      subTitle={
        <>
          {(requires && REASONS[requires]) ??
            'Your role doesn’t include this part of the workspace.'}{' '}
          Ask a Company Admin if you need it.{' '}
          {/* The code stays, but as a trailing detail rather than a kicker over
              the heading: it is what someone quotes when asking for help, not
              the first thing they need to read. */}
          <Typography.Text type="secondary">(Error 403)</Typography.Text>
        </>
      }
      extra={
        <Flex vertical align="center" gap={20}>
          {user && (
            <Flex align="center" gap={8} className="rounded-pill bg-slate-50 px-3 py-1.5">
              <Typography.Text type="secondary" className="text-caption">
                Signed in as
              </Typography.Text>
              <RoleBadge role={user.role} />
            </Flex>
          )}
          {/* An anchor, not a Button: this navigates, and nesting one in the
              other is invalid markup. The icon is aria-hidden, so the link's
              accessible name stays exactly its text. */}
          <Link to={home} className="tp-cta-link">
            <ArrowLeftOutlined aria-hidden className="text-[16px]" />
            {home === '/dashboard' ? 'Back to overview' : 'Browse jobs'}
          </Link>
        </Flex>
      }
    />
  );
}

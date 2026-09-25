import { Flex, Result, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { homeRouteFor, type Permission } from '../auth/permissions';
import { Icon } from '../components/dashboard/Icon';
import { RoleBadge } from '../components/dashboard/RoleBadge';
import { fontSize, slate } from '../theme/tokens';
import { status } from '../theme/tokens';

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
export function ForbiddenPage({ requires }: Readonly<{ requires?: Permission }>) {
  const { user } = useAuth();
  const home = homeRouteFor(user?.role);

  return (
    <Result
      style={{ maxWidth: 512, marginInline: 'auto' }}
      icon={
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 16,
            background: status.warningBg,
            color: status.warningText,
          }}
        >
          <Icon name="lock-closed" size={28} />
        </span>
      }
      title={
        <Typography.Title level={1} style={{ fontSize: fontSize.heading, margin: 0 }}>
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
            <Flex
              align="center"
              gap={8}
              style={{ borderRadius: 999, background: slate[50], padding: '6px 12px' }}
            >
              <Typography.Text type="secondary" style={{ fontSize: fontSize.caption }}>
                Signed in as
              </Typography.Text>
              <RoleBadge role={user.role} />
            </Flex>
          )}
          {/* An anchor, not a Button: this navigates, and nesting one in the
              other is invalid markup. The icon is aria-hidden, so the link's
              accessible name stays exactly its text. */}
          <Link to={home} className="tp-cta-link">
            <Icon name="arrow-left" size={16} />
            {home === '/dashboard' ? 'Back to overview' : 'Browse jobs'}
          </Link>
        </Flex>
      }
    />
  );
}

import { ArrowLeftOutlined } from '@ant-design/icons';
import { Flex, Typography } from 'antd';
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
  'settings.view': 'Candidate accounts do not have permission to view tenant settings.',
  'settings.edit': 'Only a Company Admin can change company settings.',
  'billing.view': 'Plan and billing are visible to Company Admins only.',
  'pipeline.manage': 'Moving candidates between stages is limited to admins and HR managers.',
};

/**
 * In-place 403. Rendered inside the dashboard chrome (see RequirePermission)
 * so the sidebar and top bar stay usable and the URL survives.
 * Styled to match the wireframe: a red shield icon with "403" text.
 */
export function ForbiddenPage({ requires }: Readonly<{ requires?: Permission }>) {
  const { user } = useAuth();
  const home = homeRouteFor(user?.role);

  const reason =
    (requires && REASONS[requires]) ??
    'Your role doesn\u2019t include this part of the workspace.';

  return (
    <div className="mx-auto flex max-w-128 flex-col items-center justify-center py-16 text-center">
      {/* Red shield icon matching wireframe */}
      <div className="mb-6 flex flex-col items-center">
        <div
          className="relative flex size-28 items-center justify-center"
          aria-hidden="true"
        >
          {/* Shield SVG */}
          <svg
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="size-full drop-shadow-sm"
          >
            <path
              d="M40 6L12 18v20c0 16.5 11.9 31.9 28 36 16.1-4.1 28-19.5 28-36V18L40 6z"
              fill="#FEE2E2"
              stroke="#F87171"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </svg>
          {/* "403" text centered on the shield */}
          <span className="absolute text-[22px] font-extrabold text-red-500 leading-none">
            403
          </span>
        </div>
      </div>

      <Typography.Title level={1} className="!m-0 !text-[1.35rem] !font-bold text-slate-900">
        403 Forbidden - Access Restricted:
      </Typography.Title>

      <Typography.Paragraph className="mb-0 mt-2 max-w-sm text-slate-500">
        {reason} Ask a Company Admin if you need it.
      </Typography.Paragraph>

      <Flex vertical align="center" gap={16} className="mt-7">
        {user && (
          <Flex align="center" gap={8} className="rounded-pill bg-slate-50 px-3 py-1.5">
            <Typography.Text type="secondary" className="text-caption">
              Signed in as
            </Typography.Text>
            <RoleBadge role={user.role} />
          </Flex>
        )}

        {/* Return to Dashboard button — matches wireframe blue CTA */}
        <Link
          to={home}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 no-underline"
        >
          <ArrowLeftOutlined aria-hidden className="text-[13px]" />
          {home === '/dashboard' ? 'Return to Dashboard' : 'Browse jobs'}
        </Link>
      </Flex>
    </div>
  );
}

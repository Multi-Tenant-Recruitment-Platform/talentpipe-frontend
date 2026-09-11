import type { ReactNode } from 'react';
import type { Permission } from '../auth/permissions';
import { useCan } from '../auth/useCan';
import { ForbiddenPage } from '../pages/ForbiddenPage';

/**
 * Per-page permission gate, used inside the dashboard's routed outlet.
 *
 * <p>Deliberately renders the 403 <em>in place</em> rather than redirecting:
 * an interviewer who follows a colleague's link to /dashboard/team keeps the
 * URL, sees why they can't be there, and still has the sidebar to navigate
 * out. A silent bounce to /dashboard looks like a broken link.</p>
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const allow = useCan();
  return allow(permission) ? <>{children}</> : <ForbiddenPage requires={permission} />;
}

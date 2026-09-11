import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { can, homeRouteFor, type Permission } from '../auth/permissions';
import { ForbiddenPage } from '../pages/ForbiddenPage';

/**
 * Auth guard for private areas. Waits for the initial session restore before
 * deciding, so a hard reload on /dashboard doesn't bounce a valid session to
 * the login page.
 *
 * <p>{@code requires} is an allow-list: the route names the permission it
 * demands and every role that lacks it is turned away. An allow-list is the
 * safe default — a role added to the backend tomorrow is locked out until
 * someone grants it access here, rather than silently inheriting the whole
 * dashboard.</p>
 */
export function ProtectedRoute({
  children,
  requires,
  redirectTo,
}: Readonly<{
  children: ReactNode;
  /** Permission the area demands. Omit for "any authenticated user". */
  requires?: Permission;
  /** Where a role that may never enter this area is sent instead of a 403. */
  redirectTo?: string;
}>) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
        Loading session…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requires && !can(user.role, requires)) {
    // A role with no business in this area at all — a candidate typing
    // /dashboard — is sent somewhere that is theirs; a 403 with a button they
    // cannot use would be worse. Anyone else falls through to a real 403.
    const home = redirectTo ?? homeRouteFor(user.role);
    if (home !== location.pathname) {
      return <Navigate to={home} replace />;
    }
    return <ForbiddenPage requires={requires} />;
  }

  return <>{children}</>;
}

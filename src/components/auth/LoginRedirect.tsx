import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import type { LoginIntent } from '../../auth/loginIntent';
import { homeRouteFor } from '../../auth/permissions';
import { PageLoader } from '../PageLoader';

/**
 * `/login` is no longer a page: it opens the login popup over the job board.
 *
 * <p>The route stays so that everything already sending people here — the
 * protected-route redirect, the registration, reset-password and invitation
 * pages, any bookmark — keeps working. Their route state becomes the popup's
 * intent unchanged. Someone already signed in goes straight on.</p>
 */
export function LoginRedirect() {
  const { user, initializing } = useAuth();
  const intent = (useLocation().state ?? {}) as LoginIntent;

  if (initializing) {
    return <PageLoader />;
  }
  if (user) {
    return <Navigate to={intent.from ?? homeRouteFor(user.role)} replace />;
  }
  return <Navigate to="/" replace state={{ login: intent }} />;
}

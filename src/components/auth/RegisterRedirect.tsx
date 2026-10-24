import { Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { homeRouteFor } from '../../auth/permissions';
import type { RegisterStep } from '../../auth/registerIntent';
import { PageLoader } from '../PageLoader';

/**
 * `/register` and `/register-candidate` are no longer pages: each opens the
 * registration popup over the job board, at its own form. The routes stay so
 * existing links and bookmarks keep working. Someone already signed in has
 * nothing to register, so they go straight on.
 */
export function RegisterRedirect({ step }: Readonly<{ step: Exclude<RegisterStep, 'choose'> }>) {
  const { user, initializing } = useAuth();

  if (initializing) {
    return <PageLoader />;
  }
  if (user) {
    return <Navigate to={homeRouteFor(user)} replace />;
  }
  return <Navigate to="/" replace state={{ register: { step } }} />;
}

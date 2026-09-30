import { Link } from 'react-router-dom';
import { EmptyState } from '../dashboard/EmptyState';
import { Icon } from '../dashboard/Icon';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';

export function BackLink({ to, children }: Readonly<{ to: string; children: string }>) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-indigo-700 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
    >
      <Icon name="arrow-left" className="h-4 w-4" />
      {children}
    </Link>
  );
}

export function JobLoading() {
  return (
    <div aria-busy="true" className="animate-pulse space-y-4">
      <span className="sr-only" role="status">
        Loading job…
      </span>
      <div className="h-8 w-2/3 rounded bg-slate-200" />
      <div className="h-4 w-1/3 rounded bg-slate-100" />
      <div className="h-32 rounded-xl bg-slate-100" />
    </div>
  );
}

export function JobLoadError({ message, onRetry }: Readonly<{ message: string; onRetry: () => void }>) {
  return (
    <Alert tone="error">
      <p>{message}</p>
      <Button size="sm" className="mt-3" onClick={onRetry}>
        Try again
      </Button>
    </Alert>
  );
}

export function JobUnavailable() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white">
      <EmptyState
        icon="briefcase"
        title="This job is not available."
        description="It may have been closed or removed. Browse the other open positions instead."
        action={<BackLink to="/jobs">All jobs</BackLink>}
      />
    </div>
  );
}

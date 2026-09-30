import type { JobSummary } from '../../api/types';
import type { JobsStatus } from '../../jobs/usePublicJobs';
import { EmptyState } from '../dashboard/EmptyState';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { JobCard } from './JobCard';

const SKELETON_COUNT = 6;
const GRID = 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3';

function JobCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-slate-200" />
          <div className="h-3 w-1/3 rounded bg-slate-100" />
        </div>
        <div className="mt-4 h-5 w-3/4 rounded bg-slate-200" />
        <div className="mt-3 flex gap-2">
          <div className="h-5 w-16 rounded-full bg-slate-100" />
          <div className="h-5 w-14 rounded-full bg-slate-100" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full rounded bg-slate-100" />
          <div className="h-3 w-5/6 rounded bg-slate-100" />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
        <div className="h-3 w-28 rounded bg-slate-100" />
        <div className="h-9 w-24 rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}

/**
 * Renders a set of vacancies in whatever state they are in. It knows nothing
 * about where the jobs came from, so search/filter results can be passed in
 * as-is, with their own empty message.
 */
export function JobList({
  status,
  jobs,
  error,
  onRetry,
  emptyTitle = 'No job vacancies are currently available.',
  emptyDescription = 'New roles are published regularly. Please check back soon.',
}: Readonly<{
  status: JobsStatus;
  jobs: JobSummary[];
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
}>) {
  if (status === 'loading') {
    return (
      <div aria-busy="true">
        <span className="sr-only" role="status">
          Loading job vacancies…
        </span>
        <div className={GRID}>
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <Alert tone="error">
        <p>{error ?? 'We could not load job vacancies.'}</p>
        {onRetry && (
          <Button size="sm" className="mt-3" onClick={onRetry}>
            Try again
          </Button>
        )}
      </Alert>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white">
        <EmptyState icon="briefcase" title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <ul className={GRID}>
      {jobs.map((job) => (
        <li key={job.id} className="min-w-0">
          <JobCard job={job} />
        </li>
      ))}
    </ul>
  );
}

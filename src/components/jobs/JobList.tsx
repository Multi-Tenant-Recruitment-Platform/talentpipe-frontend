import { SolutionOutlined } from '@ant-design/icons';
import { Card, Skeleton } from 'antd';
import type { JobSummary } from '../../api/types';
import type { JobsStatus } from '../../jobs/usePublicJobs';
import { EmptyState } from '../dashboard/EmptyState';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { JobCard } from './JobCard';

const SKELETON_COUNT = 6;

/** The board's grid. Grid items default to min-width: auto, so `min-w-0` keeps one long title from widening its column. */
const grid = 'm-0 grid list-none gap-4 p-0 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0';

/** Shaped like the card it stands in for — a tinted panel, then a footer — so the list does not jump when the jobs land. */
function JobCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-surface p-1.5 shadow-sm">
      <div className="rounded-xl bg-slate-100 p-4">
        <Skeleton active title={{ width: '70%' }} paragraph={{ rows: 3, width: ['40%', '90%', '60%'] }} />
      </div>
      <div className="flex items-center justify-between px-3 pt-3.5 pb-2.5">
        <Skeleton.Input active size="small" />
        <Skeleton.Button active shape="round" />
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
        <div className={grid}>
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
        <p className="m-0">{error ?? 'We could not load job vacancies.'}</p>
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
      <Card>
        <EmptyState icon={SolutionOutlined} title={emptyTitle} description={emptyDescription} />
      </Card>
    );
  }

  return (
    <ul className={grid}>
      {jobs.map((job) => (
        <li key={job.id}>
          <JobCard job={job} />
        </li>
      ))}
    </ul>
  );
}

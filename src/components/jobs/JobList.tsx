import { Skeleton } from 'antd';
import type { JobSummary } from '../../api/types';
import type { JobsStatus } from '../../jobs/usePublicJobs';
import { space } from '../../theme/tokens';
import { EmptyState } from '../dashboard/EmptyState';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { JobCard } from './JobCard';

const SKELETON_COUNT = 6;

function JobCardSkeleton() {
  return (
    <div className="tp-job-panel tp-job-panel-body">
      <Skeleton active avatar={{ shape: 'square', size: 48 }} paragraph={{ rows: 3 }} />
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
        <div className="tp-job-grid">
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
        <p style={{ margin: 0 }}>{error ?? 'We could not load job vacancies.'}</p>
        {onRetry && (
          <Button size="sm" style={{ marginTop: space[1.5] }} onClick={onRetry}>
            Try again
          </Button>
        )}
      </Alert>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="tp-job-panel-empty">
        <EmptyState icon="briefcase" title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <ul className="tp-job-grid">
      {jobs.map((job) => (
        <li key={job.id}>
          <JobCard job={job} />
        </li>
      ))}
    </ul>
  );
}

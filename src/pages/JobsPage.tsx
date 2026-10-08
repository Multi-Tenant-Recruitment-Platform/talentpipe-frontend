import { Flex } from 'antd';
import { Icon } from '../components/dashboard/Icon';
import { JobList } from '../components/jobs/JobList';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { usePublicJobs } from '../jobs/usePublicJobs';
import { space } from '../theme/tokens';

function countLabel(shown: number, total: number) {
  const noun = total === 1 ? 'open position' : 'open positions';
  return shown < total ? `Showing ${shown} of ${total} ${noun}` : `${total} ${noun}`;
}

/** Public job board (PB-017): published vacancies, open to everyone. */
export function JobsPage() {
  const { status, error, jobs, total, hasMore, loadingMore, loadMoreError, loadMore, retry } = usePublicJobs();

  return (
    <section>
      <header className="tp-jobs-hero">
        <div className="tp-jobs-hero-inner">
          <p className="tp-jobs-eyebrow">
            <Icon name="sparkles" size={14} />
            Careers on TalentPipe
          </p>
          <h1>Explore Job Opportunities</h1>
          <p className="tp-jobs-hero-lede">
            Discover roles from companies hiring on TalentPipe. Open any job to see the full description, requirements
            and skills.
          </p>
          {status === 'ready' && total !== null && total > 0 && (
            <p className="tp-jobs-count">
              <Icon name="briefcase" size={16} />
              {countLabel(jobs.length, total)}
            </p>
          )}
        </div>
      </header>

      {/* Search & filter controls (PB-017 sub-task 4) go here; they pass their
          results and a "No matching jobs found" message to JobList below. */}

      <div style={{ marginTop: space[5] }}>
        <JobList status={status} jobs={jobs} error={error} onRetry={retry} />
      </div>

      {status === 'ready' && hasMore && (
        <Flex vertical align="center" gap={space[1.5]} style={{ marginTop: space[5] }}>
          {loadMoreError && <Alert tone="error">{loadMoreError}</Alert>}
          <Button onClick={() => void loadMore()} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more jobs'}
          </Button>
        </Flex>
      )}
    </section>
  );
}

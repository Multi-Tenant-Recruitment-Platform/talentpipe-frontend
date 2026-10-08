import { Typography } from 'antd';
import { Icon } from '../components/dashboard/Icon';
import { JobList } from '../components/jobs/JobList';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { usePublicJobs } from '../jobs/usePublicJobs';
import { fontSize, space } from '../theme/tokens';

function countLabel(shown: number, total: number) {
  const noun = total === 1 ? 'open position' : 'open positions';
  return shown < total ? `Showing ${shown} of ${total} ${noun}` : `${total} ${noun}`;
}

/** Public job board (PB-017): published vacancies, open to everyone. */
export function JobsPage() {
  const { status, error, jobs, total, hasMore, loadingMore, loadMoreError, loadMore, retry } = usePublicJobs();

  return (
    <section>
      <header style={{ maxWidth: 672 }}>
        <p className="tp-job-eyebrow">Careers on TalentPipe</p>
        <Typography.Title level={1} style={{ fontSize: fontSize.display, margin: 0 }}>
          Explore Job Opportunities
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ fontSize: fontSize.lead, margin: `${space[1]}px 0 0` }}>
          Discover roles from companies hiring on TalentPipe. Open any job to see the full description, requirements
          and skills.
        </Typography.Paragraph>
        {status === 'ready' && total !== null && total > 0 && (
          <p className="tp-jobs-count">
            <Icon name="briefcase" size={16} />
            {countLabel(jobs.length, total)}
          </p>
        )}
      </header>

      {/* Search & filter controls (PB-017 sub-task 4) go here; they pass their
          results and a "No matching jobs found" message to JobList below. */}

      <div style={{ marginTop: space[4] }}>
        <JobList status={status} jobs={jobs} error={error} onRetry={retry} />
      </div>

      {status === 'ready' && hasMore && (
        <div className="tp-jobs-more">
          {loadMoreError && <Alert tone="error">{loadMoreError}</Alert>}
          <Button onClick={() => void loadMore()} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more jobs'}
          </Button>
        </div>
      )}
    </section>
  );
}

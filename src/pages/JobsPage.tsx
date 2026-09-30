import { JobList } from '../components/jobs/JobList';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { usePublicJobs } from '../jobs/usePublicJobs';

function countLabel(shown: number, total: number) {
  const noun = total === 1 ? 'open position' : 'open positions';
  return shown < total ? `Showing ${shown} of ${total} ${noun}` : `${total} ${noun}`;
}

/** Public job board (PB-017): published vacancies, open to everyone. */
export function JobsPage() {
  const { status, error, jobs, total, hasMore, loadingMore, loadMoreError, loadMore, retry } = usePublicJobs();

  return (
    <section>
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Explore Job Opportunities</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Browse roles published by companies hiring on TalentPipe and find your next opportunity.
        </p>
        {status === 'ready' && total !== null && total > 0 && (
          <p className="mt-4 text-sm font-medium text-slate-500">{countLabel(jobs.length, total)}</p>
        )}
      </header>

      {/* Search & filter controls (PB-017 sub-task 4) go here; they pass their
          results and a "No matching jobs found" message to JobList below. */}

      <div className="mt-8">
        <JobList status={status} jobs={jobs} error={error} onRetry={retry} />
      </div>

      {status === 'ready' && hasMore && (
        <div className="mt-8 flex flex-col items-center gap-3">
          {loadMoreError && <Alert tone="error">{loadMoreError}</Alert>}
          <Button onClick={() => void loadMore()} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more jobs'}
          </Button>
        </div>
      )}
    </section>
  );
}

import { Icon } from '../components/dashboard/Icon';
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
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-10 text-white shadow-lg shadow-indigo-600/20 sm:px-10 sm:py-14">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-1/3 h-56 w-56 rounded-full bg-violet-300/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white ring-1 ring-inset ring-white/25">
            <Icon name="sparkles" className="h-3.5 w-3.5" />
            Careers on TalentPipe
          </p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Explore Job Opportunities</h1>
          <p className="mt-3 text-base leading-relaxed text-indigo-100 sm:text-lg">
            Discover roles from companies hiring on TalentPipe. Open any job to see the full description, requirements
            and skills.
          </p>
          {status === 'ready' && total !== null && total > 0 && (
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-indigo-700 shadow-sm">
              <Icon name="briefcase" className="h-4 w-4" />
              {countLabel(jobs.length, total)}
            </p>
          )}
        </div>
      </header>

      {/* Search & filter controls (PB-017 sub-task 4) go here; they pass their
          results and a "No matching jobs found" message to JobList below. */}

      <div className="mt-10">
        <JobList status={status} jobs={jobs} error={error} onRetry={retry} />
      </div>

      {status === 'ready' && hasMore && (
        <div className="mt-10 flex flex-col items-center gap-3">
          {loadMoreError && <Alert tone="error">{loadMoreError}</Alert>}
          <Button onClick={() => void loadMore()} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more jobs'}
          </Button>
        </div>
      )}
    </section>
  );
}

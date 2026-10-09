import { Flex, Segmented } from 'antd';
import { useMemo, useState } from 'react';
import type { PublicJobSearch } from '../api/publicJobs';
import { JobList } from '../components/jobs/JobList';
import { JobFilterBar, JobSearchBar } from '../components/jobs/JobSearch';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { NO_FILTERS, filterJobs, hasActiveFilters, type JobFilters, type JobSort } from '../jobs/jobFilters';
import { usePublicJobs } from '../jobs/usePublicJobs';
import { space } from '../theme/tokens';

const SORT_OPTIONS: { label: string; value: JobSort }[] = [
  { label: 'Most relevant', value: 'relevant' },
  { label: 'Newest', value: 'newest' },
];

const NO_SEARCH: Required<PublicJobSearch> = { keyword: '', location: '' };

const jobsNoun = (count: number) => (count === 1 ? 'job' : 'jobs');

/** The total comes from the API, not from how many rows happen to be loaded. */
function resultLabel(matching: number, loaded: number, total: number, searching: boolean, refining: boolean) {
  if (refining) return `${matching} matching ${jobsNoun(matching)}`;
  if (loaded < total) return `Showing ${loaded} of ${total} jobs`;
  return `${total} ${jobsNoun(total)} ${searching ? 'found' : 'available'}`;
}

/**
 * Public job board (PB-017): published vacancies, open to everyone.
 *
 * <p>The board is for finding a job, not reading one: search and filters on
 * top, then compact cards to scan. Reading a job, and applying for it, happen
 * on the job's own page behind "View Job".</p>
 *
 * <p>Two kinds of narrowing, kept apart because they run in different places.
 * The search — what and where — goes to the backend and covers every
 * published vacancy. The filter tick boxes and the sort have no backend parameter
 * yet, so they work over the vacancies loaded so far, and the page says so
 * when there are more to load.</p>
 */
export function JobsPage() {
  const [search, setSearch] = useState(NO_SEARCH);
  const [filters, setFilters] = useState<JobFilters>(NO_FILTERS);
  // Bumped by "Clear all" to remount the search bar, which owns the text being typed.
  const [searchKey, setSearchKey] = useState(0);
  const { status, error, jobs, total, hasMore, loadingMore, loadMoreError, loadMore, retry } = usePublicJobs(search);

  const visible = useMemo(() => filterJobs(jobs, filters), [jobs, filters]);
  const searching = Boolean(search.keyword || search.location);
  const refining = hasActiveFilters(filters);
  const ready = status === 'ready';
  // An empty board has nothing to filter; an empty search result still needs its "Clear all".
  const showFilters = status !== 'error' && !(ready && jobs.length === 0 && !searching);

  const clearAll = () => {
    setSearch(NO_SEARCH);
    setFilters({ ...NO_FILTERS, sort: filters.sort });
    setSearchKey((key) => key + 1);
  };

  return (
    <section>
      <header className="tp-jobs-hero">
        <div className="tp-jobs-hero-content">
          <span className="tp-jobs-hero-eyebrow">Your next chapter starts here</span>
          <h1>Find your next opportunity</h1>
          <p className="tp-jobs-hero-lede">Discover roles from companies building the future.</p>
        </div>
        <span aria-hidden="true" className="tp-jobs-hero-orb tp-jobs-hero-orb-one" />
        <span aria-hidden="true" className="tp-jobs-hero-orb tp-jobs-hero-orb-two" />
      </header>

      <div className="tp-jobs-search-panel">
        <div className="tp-jobs-search-intro">
          <span className="tp-jobs-section-eyebrow">Find your fit</span>
          <h2>Search open roles</h2>
          <p>Start with a keyword or location, then refine your results below.</p>
        </div>
        <JobSearchBar
          key={searchKey}
          keyword={search.keyword}
          location={search.location}
          onSearch={(keyword, location) => setSearch({ keyword, location })}
        />
      </div>

      <div className="tp-jobs-results-shell">
        {showFilters && (
          <aside className="tp-jobs-sidebar">
            <JobFilterBar
              filters={filters}
              onChange={setFilters}
              // Counts over a partly loaded list would understate every choice.
              jobs={ready && !hasMore ? jobs : undefined}
              canClear={searching || refining}
              onClear={clearAll}
            />
          </aside>
        )}

        <main className="tp-jobs-results">
          {ready && (jobs.length > 0 || searching) && (
            <div className="tp-jobs-toolbar">
              <div>
                <p role="status" className="tp-jobs-count">
                  {resultLabel(visible.length, jobs.length, total ?? jobs.length, searching, refining)}
                </p>
                {refining && hasMore && (
                  <p className="tp-jobs-count-note">Filters cover the {jobs.length} jobs loaded so far. Load more to check the rest.</p>
                )}
              </div>
              <div className="tp-jobs-sort">
                <span aria-hidden="true" className="tp-jobs-sort-label">
                  Sort by
                </span>
                <Segmented<JobSort>
                  aria-label="Sort jobs"
                  options={SORT_OPTIONS}
                  value={filters.sort}
                  onChange={(sort) => setFilters({ ...filters, sort })}
                />
              </div>
            </div>
          )}

          <div className="tp-jobs-layout">
            <JobList
              status={status}
              jobs={visible}
              error={error}
              onRetry={retry}
              {...((searching || refining) && {
                emptyTitle: 'No matching jobs found',
                emptyDescription: 'Try different keywords, or remove a filter.',
              })}
            />
          </div>

          {ready && hasMore && (
            <Flex vertical align="center" gap={space[1.5]} style={{ marginTop: space[4] }}>
              {loadMoreError && <Alert tone="error">{loadMoreError}</Alert>}
              <Button onClick={() => void loadMore()} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more jobs'}
              </Button>
            </Flex>
          )}
        </main>
      </div>
    </section>
  );
}

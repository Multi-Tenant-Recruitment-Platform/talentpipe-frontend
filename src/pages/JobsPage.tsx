import { FilterOutlined, SlidersOutlined } from '@ant-design/icons';
import { Drawer, Flex, Select } from 'antd';
import { useMemo, useState } from 'react';
import type { PublicJobSearch } from '../api/publicJobs';
import { JobList } from '../components/jobs/JobList';
import { JobFilterBar, JobSearchBar } from '../components/jobs/JobSearch';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { pageContainer } from '../components/ui/classes';
import {
  NO_FILTERS,
  activeFilterCount,
  filterJobs,
  hasActiveFilters,
  type JobFilters,
  type JobSort,
} from '../jobs/jobFilters';
import { usePublicJobs } from '../jobs/usePublicJobs';
import { space } from '../theme/tokens';

const SORT_OPTIONS: { label: string; value: JobSort }[] = [
  { label: 'Most relevant', value: 'relevant' },
  { label: 'Most recent', value: 'newest' },
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
 * <p>The board is for finding a job, not reading one: a hero whose one
 * focal point is a white search bar, the filters beside the results, then
 * compact cards to scan. Reading a job, and applying for it, happen on the
 * job's own page behind "Details".</p>
 *
 * <p>Two kinds of narrowing, kept apart because they run in different places.
 * The search — what and where — goes to the backend and covers every
 * published vacancy. The selects, the salary range, the tick boxes and the
 * sort have no backend parameter yet, so they work over the vacancies loaded
 * so far, and the page says so when there are more to load.</p>
 *
 * <p>The page owns its full width (see Layout), so the hero can run edge to
 * edge — continuous with the dark header above it — while its contents sit on
 * the shared page container.</p>
 */
export function JobsPage() {
  const [search, setSearch] = useState(NO_SEARCH);
  const [filters, setFilters] = useState<JobFilters>({ ...NO_FILTERS, sort: 'newest' });
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Bumped by "Clear all" to remount the search bar, which owns the text being typed.
  const [searchKey, setSearchKey] = useState(0);
  const { status, error, jobs, total, hasMore, loadingMore, loadMoreError, loadMore, retry } = usePublicJobs(search);

  const visible = useMemo(() => filterJobs(jobs, filters), [jobs, filters]);
  const searching = Boolean(search.keyword || search.location);
  const refining = hasActiveFilters(filters);
  const ready = status === 'ready';
  const hasResults = ready && (jobs.length > 0 || searching);
  // An empty board has nothing to filter; an empty search result still needs its "Clear all".
  const showFilters = status !== 'error' && !(ready && jobs.length === 0 && !searching);
  const activeCount = activeFilterCount(filters);
  const shownTotal = refining ? visible.length : (total ?? jobs.length);

  const clearAll = () => {
    setSearch(NO_SEARCH);
    setFilters({ ...NO_FILTERS, sort: filters.sort });
    setSearchKey((key) => key + 1);
  };

  const filterBar = (collapsible: boolean) => (
    <JobFilterBar
      filters={filters}
      onChange={setFilters}
      // Counts over a partly loaded list would understate every choice.
      jobs={ready && !hasMore ? jobs : undefined}
      canClear={searching || refining}
      onClear={clearAll}
      collapsible={collapsible}
    />
  );

  return (
    <section className="public-job-board">
      <div className="board-hero"><div className={`${pageContainer} board-hero-inner`}>
        <img className="board-illustration" src="/hero-illustration.jpg" alt="" aria-hidden="true" />
        <div className="board-hero-copy">
          <p className="board-eyebrow">Find your next opportunity</p>
          <h1>Great jobs. Amazing companies.</h1>
          <p className="board-intro">Discover career opportunities at forward-thinking companies<br className="hidden sm:block" /> and take the next step in your journey.</p>
        </div>

        <div className="board-search">
          <JobSearchBar
            compact
            key={searchKey}
            keyword={search.keyword}
            location={search.location}
            onSearch={(keyword, location) => setSearch({ keyword, location })}
            filters={filters}
            onChange={setFilters}
            jobs={jobs}
          />
        </div>
      </div></div>

      <div className={`${pageContainer} board-results`}>
        <div>

          <div className="min-w-0">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h2 className="m-0 text-heading leading-tight font-bold tracking-heading text-slate-900">
                    {hasResults ? `${shownTotal} open position${shownTotal === 1 ? '' : 's'}` : 'Open positions'}
                  </h2>

                </div>
                {hasResults && (
                  <>
                    <p role="status" className="m-0 mt-1 text-small text-slate-500">
                      {resultLabel(visible.length, jobs.length, total ?? jobs.length, searching, refining)}
                    </p>
                    {refining && hasMore && (
                      <p className="m-0 mt-0.5 text-small text-slate-500">
                        Filters cover the {jobs.length} jobs loaded so far. Load more to check the rest.
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {showFilters && (
                  <Button
                    size="sm"
                    className="board-filter-button"
                    icon={<FilterOutlined aria-hidden />}
                    onClick={() => setDrawerOpen(true)}
                  >
                    {activeCount > 0 ? `Filters (${activeCount})` : 'Filters'}
                  </Button>
                )}
                {hasResults && (
                  <div className="flex items-center gap-1">
                    <span aria-hidden="true" className="text-small text-slate-500">
                      Sort by:
                    </span>
                    <Select<JobSort>
                      variant="borderless"
                      aria-label="Sort jobs"
                      value={filters.sort}
                      options={SORT_OPTIONS}
                      onChange={(sort) => setFilters({ ...filters, sort })}
                      popupMatchSelectWidth={false}
                      classNames={{ content: 'font-semibold text-slate-900', suffix: 'text-slate-500' }}
                    />
                    <SlidersOutlined aria-hidden className="text-[16px] text-slate-500" />
                  </div>
                )}
              </div>
            </div>

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

            {ready && hasMore && (
              <Flex vertical align="center" gap={space[1.5]} className="mt-8">
                {loadMoreError && <Alert tone="error">{loadMoreError}</Alert>}
                <Button onClick={() => void loadMore()} disabled={loadingMore}>
                  {loadingMore ? 'Loading…' : 'Load more jobs'}
                </Button>
              </Flex>
            )}

          </div>
        </div>
      </div>

      <Drawer
        title="Filter jobs"
        placement="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        size={320}
      >
        {filterBar(false)}
      </Drawer>
    </section>
  );
}

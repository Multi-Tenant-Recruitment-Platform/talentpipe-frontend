import { FilterOutlined, SlidersOutlined } from '@ant-design/icons';
import { Drawer, Flex, Select } from 'antd';
import { useMemo, useState } from 'react';
import { HeroBand } from '../components/jobs/HeroBand';
import { JobList } from '../components/jobs/JobList';
import { JobPromoCard } from '../components/jobs/JobPromoCard';
import { JobFilterBar, JobSearchBar, QuickFilters } from '../components/jobs/JobSearch';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { pageContainer } from '../components/ui/classes';
import { NO_FILTERS, activeFilterCount, hasActiveFilters, type JobFilters, type JobSort } from '../jobs/jobFilters';
import { usePublicJobFacets, usePublicJobs } from '../jobs/usePublicJobs';
import { space } from '../theme/tokens';

const SORT_OPTIONS: { label: string; value: JobSort }[] = [
  { label: 'Most relevant', value: 'relevant' },
  { label: 'Newest', value: 'newest' },
];

/** What was typed into the search bar, applied when it is submitted. */
const NO_SEARCH = { keyword: '', location: '' };

const jobsNoun = (count: number) => (count === 1 ? 'job' : 'jobs');

/** The total comes from the API, not from how many rows happen to be loaded. */
function resultLabel(loaded: number, total: number, searching: boolean, refining: boolean) {
  if (loaded < total) return `Showing ${loaded} of ${total} jobs`;
  if (refining) return `${total} matching ${jobsNoun(total)}`;
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
 * <p>Everything that narrows the list — what and where, the industry, the tick
 * boxes, experience, the salary range — and the sort go to the backend, which
 * searches every published vacancy. The search bar's words apply when it is
 * submitted; every other choice applies as it is made, and the list on screen
 * stays put, dimmed, until the new answer lands. The filter counts come from
 * `/public/jobs/filters` and describe the whole board.</p>
 *
 * <p>The page owns its full width (see Layout), so the hero can run edge to
 * edge — continuous with the dark header above it — while its contents sit on
 * the shared page container.</p>
 */
export function JobsPage() {
  const [search, setSearch] = useState(NO_SEARCH);
  const [filters, setFilters] = useState<JobFilters>(NO_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Bumped by "Clear all" to remount the search bar, which owns the text being typed.
  const [searchKey, setSearchKey] = useState(0);
  // One object per change, so the hook fetches once per change and not per render.
  const query = useMemo(() => ({ ...filters, ...search }), [filters, search]);
  const { status, refreshing, error, jobs, total, hasMore, loadingMore, loadMoreError, loadMore, retry } =
    usePublicJobs(query);
  const facets = usePublicJobFacets();

  const searching = Boolean(search.keyword || search.location);
  const refining = hasActiveFilters(filters);
  const ready = status === 'ready';
  const hasResults = ready && (jobs.length > 0 || searching);
  // An empty board has nothing to filter; an empty search result still needs its "Clear all".
  const showFilters = status !== 'error' && !(ready && jobs.length === 0 && !searching);
  const activeCount = activeFilterCount(filters);
  const shownTotal = total ?? jobs.length;

  const clearAll = () => {
    setSearch(NO_SEARCH);
    setFilters({ ...NO_FILTERS, sort: filters.sort });
    setSearchKey((key) => key + 1);
  };

  const filterBar = (collapsible: boolean) => (
    <JobFilterBar
      filters={filters}
      onChange={setFilters}
      facets={facets}
      canClear={searching || refining}
      onClear={clearAll}
      collapsible={collapsible}
    />
  );

  return (
    <section>
      {/* A compact search strip: no headline, just the bar and its chips, so
          the first jobs stay above the fold. */}
      <HeroBand className="py-6 lg:py-8">
        {/* The page's one h1, for screen readers and the document outline;
            the search bar itself says what this page is for. */}
        <h1 className="sr-only">Find jobs</h1>

        <div className="mx-auto max-w-6xl">
          <JobSearchBar
            key={searchKey}
            keyword={search.keyword}
            location={search.location}
            onSearch={(keyword, location) => setSearch({ keyword, location })}
            filters={filters}
            onChange={setFilters}
            facets={facets}
          />
        </div>
        <QuickFilters filters={filters} onChange={setFilters} className="mt-4 justify-center" />
      </HeroBand>

      <div className={`${pageContainer} py-8 lg:py-10`}>
        <div className={showFilters ? 'grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start' : ''}>
          {showFilters && (
            <aside className="hidden min-w-0 flex-col gap-6 lg:flex">
              <JobPromoCard />
              {filterBar(true)}
            </aside>
          )}

          <div className="min-w-0">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h2 className="m-0 text-heading leading-tight font-bold tracking-heading text-slate-900">
                    {searching || refining ? 'Matching jobs' : 'Open jobs'}
                  </h2>
                  {hasResults && (
                    <span
                      aria-hidden="true"
                      data-numeric
                      className="rounded-pill border border-slate-200 bg-surface px-3 py-0.5 text-small font-semibold text-slate-700"
                    >
                      {shownTotal}
                    </span>
                  )}
                </div>
                {hasResults && (
                  <>
                    <p role="status" className="m-0 mt-1 text-small text-slate-500">
                      {refreshing ? 'Updating…' : resultLabel(jobs.length, total ?? jobs.length, searching, refining)}
                    </p>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {showFilters && (
                  <Button
                    size="sm"
                    className="lg:hidden"
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

            {/* The previous answer stays while the next is on its way, dimmed
                rather than replaced by skeletons, so a tick box never makes
                the page jump. */}
            <div
              aria-busy={refreshing || undefined}
              className={`transition-opacity duration-(--tp-motion-base) ${refreshing ? 'opacity-55' : ''}`}
            >
              <JobList
                status={status}
                jobs={jobs}
                error={error}
                onRetry={retry}
                {...((searching || refining) && {
                  emptyTitle: 'No matching jobs found',
                  emptyDescription: 'Try different keywords, or remove a filter.',
                })}
              />
            </div>

            {ready && hasMore && (
              <Flex vertical align="center" gap={space[1.5]} className="mt-8">
                {loadMoreError && <Alert tone="error">{loadMoreError}</Alert>}
                <Button onClick={() => void loadMore()} disabled={loadingMore}>
                  {loadingMore ? 'Loading…' : 'Load more jobs'}
                </Button>
              </Flex>
            )}

            {showFilters && <JobPromoCard className="mt-8 lg:hidden" />}
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

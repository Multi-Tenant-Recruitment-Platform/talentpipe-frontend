import { useCallback, useEffect, useState } from 'react';
import { apiErrorMessage } from '../api/client';
import { listPublicJobs, type PublicJobSearch } from '../api/publicJobs';
import type { JobSummary, PageResponse } from '../api/types';

export type JobsStatus = 'loading' | 'error' | 'ready';

const LOAD_ERROR = 'We could not load job vacancies. Please check your connection and try again.';

const nextPageOf = (page: PageResponse<JobSummary>) => (page.page + 1 < page.totalPages ? page.page + 1 : null);

/** What came back for one request, tagged with the request it answers. */
type Settled = {
  key: string;
  error: string | null;
  jobs: JobSummary[];
  total: number | null;
  nextPage: number | null;
};

/**
 * Published vacancies for the public board, loaded a page at a time.
 *
 * <p>`keyword` and `location` are searched by the backend, across every
 * published vacancy rather than only the ones on screen; changing either
 * starts again from the first page.</p>
 */
export function usePublicJobs({ keyword = '', location = '' }: PublicJobSearch = {}) {
  const [settled, setSettled] = useState<Settled | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Names the request on screen. A result is shown only while its key matches,
  // so a new search reads as loading at once and a slow answer to an old one
  // is never mistaken for the current list.
  const key = JSON.stringify([keyword, location, attempt]);

  useEffect(() => {
    let cancelled = false;
    listPublicJobs(0, { keyword, location })
      .then((page) => {
        if (cancelled) return;
        setSettled({ key, error: null, jobs: page.content, total: page.totalElements, nextPage: nextPageOf(page) });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSettled({ key, error: apiErrorMessage(err, LOAD_ERROR), jobs: [], total: null, nextPage: null });
      });
    return () => {
      cancelled = true;
    };
  }, [key, keyword, location]);

  const current = settled?.key === key ? settled : null;
  const nextPage = current?.nextPage ?? null;

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const loadMore = useCallback(async () => {
    if (nextPage === null || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await listPublicJobs(nextPage, { keyword, location });
      setSettled((prev) => {
        // The search changed while this page was on its way; it belongs to a list no longer shown.
        if (!prev || prev.key !== key) return prev;
        // Rows can shift between pages when jobs are published meanwhile.
        const seen = new Set(prev.jobs.map((job) => job.id));
        return {
          ...prev,
          jobs: [...prev.jobs, ...page.content.filter((job) => !seen.has(job.id))],
          total: page.totalElements,
          nextPage: nextPageOf(page),
        };
      });
    } catch (err) {
      setLoadMoreError(apiErrorMessage(err, 'We could not load more jobs. Please try again.'));
    } finally {
      setLoadingMore(false);
    }
  }, [nextPage, loadingMore, keyword, location, key]);

  let status: JobsStatus = 'loading';
  if (current) status = current.error ? 'error' : 'ready';

  return {
    status,
    error: current?.error ?? null,
    jobs: current?.jobs ?? [],
    total: current?.total ?? null,
    hasMore: nextPage !== null,
    loadingMore,
    loadMoreError,
    loadMore,
    retry,
  };
}

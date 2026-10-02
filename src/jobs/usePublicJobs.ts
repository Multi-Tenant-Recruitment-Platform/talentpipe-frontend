import { useCallback, useEffect, useState } from 'react';
import { apiErrorMessage } from '../api/client';
import { listPublicJobs } from '../api/publicJobs';
import type { JobSummary, PageResponse } from '../api/types';

export type JobsStatus = 'loading' | 'error' | 'ready';

const LOAD_ERROR = 'We could not load job vacancies. Please check your connection and try again.';

const nextPageOf = (page: PageResponse<JobSummary>) => (page.page + 1 < page.totalPages ? page.page + 1 : null);

/** Published vacancies for the public board, loaded a page at a time. */
export function usePublicJobs() {
  const [status, setStatus] = useState<JobsStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listPublicJobs(0)
      .then((page) => {
        if (cancelled) return;
        setJobs(page.content);
        setTotal(page.totalElements);
        setNextPage(nextPageOf(page));
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(apiErrorMessage(err, LOAD_ERROR));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setStatus('loading');
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  const loadMore = useCallback(async () => {
    if (nextPage === null || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await listPublicJobs(nextPage);
      // Rows can shift between pages when jobs are published meanwhile.
      setJobs((current) => {
        const seen = new Set(current.map((job) => job.id));
        return [...current, ...page.content.filter((job) => !seen.has(job.id))];
      });
      setTotal(page.totalElements);
      setNextPage(nextPageOf(page));
    } catch (err) {
      setLoadMoreError(apiErrorMessage(err, 'We could not load more jobs. Please try again.'));
    } finally {
      setLoadingMore(false);
    }
  }, [nextPage, loadingMore]);

  return {
    status,
    error,
    jobs,
    total,
    hasMore: nextPage !== null,
    loadingMore,
    loadMoreError,
    loadMore,
    retry,
  };
}

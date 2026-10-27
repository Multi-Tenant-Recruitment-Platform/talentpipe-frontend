import { useCallback, useEffect, useState } from 'react';
import { apiErrorMessage } from '../api/client';
import { getPublicJobFilters, listPublicJobs, type PublicJobQuery } from '../api/publicJobs';
import type { JobFilterOptions, JobSummary, PageResponse } from '../api/types';
import { toBoardParams } from './jobFilters';

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
 * <p>The whole query — the search and every filter — is answered by the
 * backend, across every published vacancy rather than only the ones on
 * screen; changing any part of it starts again from the first page. Pass a
 * memoised query: a new object with the same content would fetch again.</p>
 *
 * <p>A change keeps the previous answer on screen, marked {@code refreshing},
 * until the new one lands — ticking a filter dims the list for a moment
 * instead of blanking it into skeletons. Only the very first load reads as
 * loading.</p>
 */
export function usePublicJobs(query: PublicJobQuery = {}) {
  const [settled, setSettled] = useState<Settled | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Names the request on screen. A result counts as current only while its
  // key matches, so a slow answer to an old query is never mistaken for the
  // current list. Built from the parameters actually sent, so two queries
  // that ask the same thing share it.
  const key = JSON.stringify([toBoardParams(query), attempt]);

  useEffect(() => {
    let cancelled = false;
    listPublicJobs(0, query)
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
  }, [key, query]);

  const current = settled?.key === key ? settled : null;
  // The previous answer, shown while the next one is on its way.
  const shown = current ?? (settled && !settled.error ? settled : null);
  const refreshing = current === null && shown !== null;
  const nextPage = current?.nextPage ?? null;

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const loadMore = useCallback(async () => {
    if (nextPage === null || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await listPublicJobs(nextPage, query);
      setSettled((prev) => {
        // The query changed while this page was on its way; it belongs to a list no longer shown.
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
  }, [nextPage, loadingMore, query, key]);

  let status: JobsStatus = 'loading';
  if (shown) status = shown.error ? 'error' : 'ready';

  return {
    status,
    refreshing,
    error: current?.error ?? null,
    jobs: shown?.jobs ?? [],
    total: shown?.total ?? null,
    hasMore: nextPage !== null,
    loadingMore,
    loadMoreError,
    loadMore,
    retry,
  };
}

/**
 * What the board can be filtered by: the industries, job types, workplaces
 * and salary spans of every published job, with how many hold each. Loaded
 * once; a failure leaves the filters without counts rather than breaking the
 * board.
 */
export function usePublicJobFacets(): JobFilterOptions | null {
  const [facets, setFacets] = useState<JobFilterOptions | null>(null);
  useEffect(() => {
    let cancelled = false;
    getPublicJobFilters()
      .then((answer) => {
        if (!cancelled) setFacets(answer);
      })
      .catch(() => {
        // The board works without counts; nothing to tell the visitor.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return facets;
}

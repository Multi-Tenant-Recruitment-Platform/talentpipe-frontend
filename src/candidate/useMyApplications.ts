import { useCallback, useEffect, useRef, useState } from 'react';
import { listMyApplications } from '../api/applications';
import { apiErrorMessage } from '../api/client';
import { getPublicJob } from '../api/publicJobs';
import type { JobSummary } from '../api/types';
import { toAppliedJobs, type AppliedJob } from './myApplications';

/** How often statuses are re-checked while the page is on screen. */
export const REFRESH_INTERVAL_MS = 60_000;

const LOAD_ERROR = 'We could not load your applications. Check your connection and try again.';

type MyApplicationsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; jobs: AppliedJob[] };

/**
 * Fetches the applications and pairs each with its advert. Each advert is
 * looked up once and remembered in `adverts`; a failed lookup is not
 * remembered, so the next refresh tries it again, and it is not an error —
 * the row still shows, just without the company.
 */
async function fetchAppliedJobs(adverts: Map<string, JobSummary | null>): Promise<AppliedJob[]> {
  const applications = await listMyApplications();
  const unknown = [...new Set(applications.map((a) => a.jobId))].filter((id) => !adverts.has(id));
  const found = await Promise.allSettled(unknown.map((id) => getPublicJob(id)));
  found.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      adverts.set(unknown[i], result.value);
    }
  });
  return toAppliedJobs(applications, adverts);
}

/**
 * The candidate's applications, kept current while the page is open.
 *
 * <p>Statuses are re-fetched when the tab comes back into view and once a
 * minute while it is visible, so a status the company changes shows up without
 * a reload. Only the first load shows a skeleton or an error; a failed
 * background refresh keeps the list already on screen.</p>
 */
export function useMyApplications() {
  const [state, setState] = useState<MyApplicationsState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const adverts = useRef(new Map<string, JobSummary | null>());

  useEffect(() => {
    let cancelled = false;
    let hasList = false;

    const load = (background: boolean) =>
      fetchAppliedJobs(adverts.current)
        .then((jobs) => {
          if (!cancelled) {
            hasList = true;
            setState({ status: 'ready', jobs });
          }
        })
        .catch((err: unknown) => {
          if (!cancelled && !(background && hasList)) {
            setState({ status: 'error', message: apiErrorMessage(err, LOAD_ERROR) });
          }
        });

    void load(false);

    const refresh = () => {
      if (document.visibilityState === 'visible') {
        void load(true);
      }
    };
    const timer = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}

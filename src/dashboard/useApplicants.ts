import { useCallback, useEffect, useRef, useState } from 'react';
import { applicantsApi, type ApplicantQuery } from '../api/applicants';
import type { ApplicantCounts, ApplicantPage } from '../api/types';
import { describeApplicantError } from './applicantErrors';
import { newArrivals, summaryChanged } from './applicants';

/** How often the summary is checked while the page is on screen. */
export const POLL_INTERVAL_MS = 15_000;

export type ApplicantsState =
  | { status: 'loading' }
  | { status: 'error'; message: string; noAccess: boolean }
  | { status: 'ready'; page: ApplicantPage };

/**
 * A vacancy's applicants for one query, kept current while the page is open.
 *
 * <p>Polls the cheap summary — every {@link POLL_INTERVAL_MS} while the tab is
 * visible, and at once when it comes back — never the whole list. The counts
 * on screen follow the summary straight away. The list itself reloads quietly
 * when something changed but nobody new arrived (a score landed, a status
 * moved); when new applicants did arrive it waits, and {@link newCount} says
 * how many, so rows never jump under the recruiter's cursor. They load them
 * with {@link showNew}.</p>
 *
 * <p>Only the first load shows a skeleton or an error; a failed background
 * check keeps what is already on screen and tries again on the next tick.</p>
 */
export function useApplicants(jobId: string, query: ApplicantQuery) {
  const [state, setState] = useState<ApplicantsState>({ status: 'loading' });
  const [counts, setCounts] = useState<ApplicantCounts | null>(null);
  const [newCount, setNewCount] = useState(0);
  const [reload, setReload] = useState(0);
  // What the list on screen was loaded at, to tell whether the server has moved on.
  const shown = useRef<{ counts: ApplicantCounts; lastChangedAt: string | null } | null>(null);
  const busy = useRef(false);

  const { band, q, sort, direction, page, size } = query;

  useEffect(() => {
    const controller = new AbortController();
    busy.current = true;
    applicantsApi
      .list(jobId, { band, q, sort, direction, page, size }, controller.signal)
      .then((result) => {
        shown.current = { counts: result.counts, lastChangedAt: result.lastChangedAt };
        setCounts(result.counts);
        setNewCount(0);
        setState({ status: 'ready', page: result });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const plan = describeApplicantError(err);
        setState((current) =>
          // A failed reload keeps the list already on screen, unless the failure is final.
          current.status === 'ready' && !plan.noAccess
            ? current
            : { status: 'error', message: plan.message, noAccess: plan.noAccess },
        );
      })
      .finally(() => {
        busy.current = false;
      });
    return () => controller.abort();
  }, [jobId, band, q, sort, direction, page, size, reload]);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      if (document.visibilityState !== 'visible' || busy.current || !shown.current) return;
      busy.current = true;
      applicantsApi
        .summary(jobId)
        .then((latest) => {
          if (cancelled || !shown.current || !summaryChanged(shown.current, latest)) return;
          setCounts(latest.counts);
          const arrived = newArrivals(shown.current.counts, latest.counts);
          if (arrived > 0) {
            setNewCount(arrived);
          } else {
            setReload((n) => n + 1);
          }
        })
        .catch(() => {
          // A missed check is not an error: the next tick tries again.
        })
        .finally(() => {
          busy.current = false;
        });
    };
    const timer = window.setInterval(check, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', check);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, [jobId]);

  /** Loads the applicants who arrived since the list was shown. */
  const showNew = useCallback(() => setReload((n) => n + 1), []);

  /** After an error: start over with a skeleton. */
  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setReload((n) => n + 1);
  }, []);

  return { state, counts, newCount, showNew, retry };
}

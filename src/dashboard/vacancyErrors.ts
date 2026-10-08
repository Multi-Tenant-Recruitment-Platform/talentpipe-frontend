import axios from 'axios';
import { apiErrorMessage } from '../api/client';
import type { AlertTone } from '../components/ui/Alert';

/**
 * Turns a failed vacancy request into something a recruiter can act on.
 *
 * <p>The same job `teamErrors.ts` does for the roster: the backend's
 * GlobalExceptionHandler flattens every 403 to "Access denied" and every
 * unmatched route to "Resource not found", and neither says what happened to
 * *this vacancy* or what to do next. Validation (400) and business-rule (422)
 * answers are the exception — those messages are written for people and are
 * passed through.</p>
 */

export type VacancyRequestKind =
  | 'list'
  | 'load'
  | 'create'
  | 'save'
  | 'publish'
  | 'close'
  | 'archive';

export interface VacancyErrorPlan {
  tone: AlertTone;
  message: string;
  /** True when what is on screen is provably stale and must be re-fetched. */
  refetch: boolean;
  /** The vacancy is gone — or was never in this workspace. */
  notFound: boolean;
}

const NOUN: Record<VacancyRequestKind, string> = {
  list: 'loading your vacancies',
  load: 'loading this vacancy',
  create: 'saving this vacancy',
  save: 'saving your changes',
  publish: 'publishing this vacancy',
  close: 'closing this vacancy',
  archive: 'archiving this vacancy',
};

export function describeVacancyError(err: unknown, kind: VacancyRequestKind): VacancyErrorPlan {
  const plan = (tone: AlertTone, message: string, refetch = false, notFound = false) => ({
    tone,
    message,
    refetch,
    notFound,
  });

  // No response at all — offline, DNS, proxy or timeout. The only case where
  // "try again" is literally the fix.
  if (axios.isAxiosError(err) && !err.response) {
    return plan('error', "We couldn't reach the server. Check your connection and try again.");
  }

  const status = axios.isAxiosError(err) ? err.response?.status : undefined;

  switch (status) {
    case 400:
    case 422:
      // Business rules (incomplete vacancy, passed deadline, illegal move) are
      // refused with a sentence meant for the person who tried. A 422 on a
      // lifecycle move also means the list is out of date — someone else moved
      // it first — so it re-syncs.
      return plan(
        'error',
        apiErrorMessage(err, 'Check the details and try again.'),
        status === 422 && kind !== 'create' && kind !== 'save',
      );

    case 403:
      return plan(
        'error',
        'Your role no longer allows managing vacancies. Sign out and back in if you think this is wrong.',
        true,
      );

    case 404:
      // On the list itself, a 404 can only mean the route is missing — the
      // server has no jobs module — not that some vacancy vanished.
      return kind === 'list'
        ? plan(
            'error',
            "Vacancies couldn't be loaded — this server doesn't offer the jobs API yet.",
          )
        : plan(
            'warning',
            'This vacancy no longer exists. It may have been removed in another session.',
            true,
            true,
          );

    case 409:
      return kind === 'save'
        ? plan(
            'warning',
            'Someone else saved changes to this vacancy after you opened it. Copy anything you need, then reload the page to see their version before editing again.',
          )
        : plan(
            'warning',
            'This vacancy changed since you opened it. The latest version is now showing.',
            true,
          );

    default:
      return plan('error', `Something went wrong ${NOUN[kind]}. Try again in a moment.`);
  }
}

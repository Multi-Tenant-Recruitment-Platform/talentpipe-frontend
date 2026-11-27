import { useCallback, useEffect, useState } from 'react';
import { applicantsApi, type ApplicantVacancyStatus } from '../api/applicants';
import type { ApplicantVacancy } from '../api/types';
import { describeApplicantError } from './applicantErrors';

export type ApplicantVacanciesState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; vacancies: ApplicantVacancy[] };

/** The vacancies whose applicants the signed-in member may review, live or closed. */
export function useApplicantVacancies(status: ApplicantVacancyStatus) {
  const [state, setState] = useState<ApplicantVacanciesState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  // Switching tabs shows the skeleton at once, not the other tab's cards.
  const [loadedFor, setLoadedFor] = useState(status);
  if (loadedFor !== status) {
    setLoadedFor(status);
    setState({ status: 'loading' });
  }

  useEffect(() => {
    const controller = new AbortController();
    applicantsApi
      .vacancies(status, controller.signal)
      .then((vacancies) => setState({ status: 'ready', vacancies }))
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setState({ status: 'error', message: describeApplicantError(err).message });
        }
      });
    return () => controller.abort();
  }, [status, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}

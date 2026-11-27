import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { applicantsApi } from '../api/applicants';
import type { ApplicantReview } from '../api/types';
import { describeApplicantError } from './applicantErrors';

export type ApplicantReviewState =
  | { status: 'loading' }
  | { status: 'error'; message: string; notFound: boolean }
  | { status: 'ready'; review: ApplicantReview };

/**
 * One application in full, for the applicant panel. Moving to the next
 * applicant aborts the request for the one before, so a slow answer can never
 * paint the wrong person.
 */
export function useApplicantReview(applicationId: string) {
  const [state, setState] = useState<ApplicantReviewState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  // The id the state belongs to: a new id shows loading at once, before its answer arrives.
  const [loadedFor, setLoadedFor] = useState(applicationId);
  if (loadedFor !== applicationId) {
    setLoadedFor(applicationId);
    setState({ status: 'loading' });
  }

  useEffect(() => {
    const controller = new AbortController();
    applicantsApi
      .review(applicationId, controller.signal)
      .then((review) => setState({ status: 'ready', review }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const notFound = axios.isAxiosError(err) && err.response?.status === 404;
        setState({
          status: 'error',
          notFound,
          message: notFound
            ? "This application isn't available. It may belong to a vacancy you don't work on."
            : describeApplicantError(err).message,
        });
      });
    return () => controller.abort();
  }, [applicationId, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  /** Shows the application as a decision just returned it, without another request. */
  const replace = useCallback((review: ApplicantReview) => setState({ status: 'ready', review }), []);

  return { state, retry, replace };
}

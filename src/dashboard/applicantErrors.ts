import axios from 'axios';
import { apiErrorMessage } from '../api/client';

/**
 * Turns a failed applicant-list request into words a recruiter can act on.
 *
 * <p>Like `vacancyErrors.ts`: a 404 here is not "the vacancy is gone" — the
 * page already loaded it — but "you may not see its applicants": the server
 * answers 404 for a vacancy the caller doesn't work on, without permission to
 * see every applicant, so as not to confirm what it hides. Validation (400)
 * messages are written for people and are passed through.</p>
 */
export interface ApplicantErrorPlan {
  message: string;
  /** Not this person's to see: a dead end, so no retry is offered. */
  noAccess: boolean;
}

export function describeApplicantError(err: unknown): ApplicantErrorPlan {
  if (axios.isAxiosError(err) && !err.response) {
    return { message: "We couldn't reach the server. Check your connection and try again.", noAccess: false };
  }
  const status = axios.isAxiosError(err) ? err.response?.status : undefined;
  switch (status) {
    case 400:
      return { message: apiErrorMessage(err, 'That filter could not be applied.'), noAccess: false };
    case 403:
    case 404:
      return {
        message:
          "You can see the applicants of vacancies you work on. Ask a recruiter to add you to this vacancy's hiring team.",
        noAccess: true,
      };
    default:
      return { message: 'Something went wrong loading the applicants. Try again in a moment.', noAccess: false };
  }
}

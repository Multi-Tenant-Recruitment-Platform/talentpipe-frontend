import axios from 'axios';
import { apiErrorMessage } from '../api/client';
import type { AlertTone } from '../components/ui/Alert';

/**
 * Turns a failed company-profile request into something an admin can act on.
 *
 * <p>Same reasoning as `teamErrors.ts`: the backend's GlobalExceptionHandler
 * flattens every 403 to the literal string "Access denied", which tells the
 * user neither what happened nor what to do. This maps status codes to copy
 * that does, and says when the screen on the admin's monitor is provably out
 * of date.</p>
 */

export type CompanyAction = 'load' | 'save';

export interface CompanyErrorPlan {
  tone: AlertTone;
  message: string;
  /** True when what is on screen is known to be stale and must be re-fetched. */
  refetch: boolean;
}

export function describeCompanyError(err: unknown, action: CompanyAction): CompanyErrorPlan {
  const status = axios.isAxiosError(err) ? err.response?.status : undefined;
  const saving = action === 'save';

  // No response at all — offline, DNS, CORS or a timeout. The only case where
  // "try again" is literally the fix, and the only one where an unsaved form
  // is certainly still unsaved.
  if (axios.isAxiosError(err) && !err.response) {
    return {
      tone: 'error',
      refetch: false,
      message: saving
        ? "We couldn't reach the server, so nothing was saved. Your changes are still here — check your connection and try again."
        : "We couldn't reach the server. Check your connection and try again.",
    };
  }

  switch (status) {
    case 400:
    case 422:
      // The backend rejected a specific value; its message names the field.
      return { tone: 'error', refetch: false, message: apiErrorMessage(err, 'Check the details and try again.') };

    case 403:
      // The session's role changed under them, so what is on screen — and what
      // this page let them type — is no longer trustworthy.
      return {
        tone: 'error',
        refetch: true,
        message:
          'Your permissions changed — only a company admin can edit the company profile. Sign out and back in if you think this is wrong.',
      };

    case 409:
      // Someone else saved between this page loading and this Save.
      return {
        tone: 'warning',
        refetch: true,
        message:
          'Someone else updated the company profile while you were editing, so your changes were not applied. We have loaded their version — please re-apply your edits on top of it.',
      };

    case 413:
      return {
        tone: 'error',
        refetch: false,
        message: 'That is more text than we can store. Shorten the description and try again.',
      };

    default:
      return {
        tone: 'error',
        refetch: false,
        message: saving
          ? 'Something went wrong saving the company profile, so nothing was changed. Try again in a moment.'
          : 'We could not load your company profile right now.',
      };
  }
}

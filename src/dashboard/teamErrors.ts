import axios from 'axios';
import { apiErrorMessage } from '../api/client';
import type { AlertTone } from '../components/ui/Alert';

/**
 * Turns a failed team request into something an admin can act on.
 *
 * <p>`apiErrorMessage` alone is not enough here. The backend's
 * GlobalExceptionHandler flattens every 403 to the literal string
 * "Access denied", and a 404 on resend/revoke carries only "Invitation not
 * found" — neither tells the admin what happened or what to do next. This maps
 * status codes to copy that does.</p>
 */

export type TeamAction = 'invite' | 'resend' | 'revoke';

export interface TeamErrorPlan {
  tone: AlertTone;
  message: string;
  /** Invite errors belong inside the modal; it covers the page-level alert. */
  placement: 'page' | 'modal';
  /** True when the screen is provably stale and must re-sync. */
  refetch: boolean;
  /** Where to send focus once the message is shown. */
  focus?: 'email';
}

const ACTION_NOUN: Record<TeamAction, string> = {
  invite: 'sending that invitation',
  resend: 're-sending that invitation',
  revoke: 'revoking that invitation',
};

const ACTION_VERB: Record<TeamAction, string> = {
  invite: 'invite teammates',
  resend: 'manage invitations',
  revoke: 'manage invitations',
};

/** Terminates a backend message so a sentence can be appended to it cleanly. */
function endSentence(message: string): string {
  return /[.!?]$/.test(message.trim()) ? message.trim() : `${message.trim()}.`;
}

export function describeTeamError(err: unknown, action: TeamAction): TeamErrorPlan {
  const status = axios.isAxiosError(err) ? err.response?.status : undefined;
  const inModal = action === 'invite';
  const placement: TeamErrorPlan['placement'] = inModal ? 'modal' : 'page';

  // No response at all — offline, DNS, CORS or a timeout. Distinct from any
  // server answer, and the only case where "try again" is literally the fix.
  if (axios.isAxiosError(err) && !err.response) {
    return {
      tone: 'error',
      placement,
      refetch: false,
      message: "We couldn't reach the server. Check your connection and try again.",
    };
  }

  switch (status) {
    case 400:
    case 422:
      return {
        tone: 'error',
        placement,
        refetch: false,
        message: apiErrorMessage(err, 'Check the details and try again.'),
      };

    case 403:
      // The session's role changed under them, so the list is untrustworthy too.
      return {
        tone: 'error',
        placement: 'page',
        refetch: true,
        message: `Your permissions changed — only a company admin can ${ACTION_VERB[action]}. Sign out and back in if you think this is wrong.`,
      };

    case 404:
      // Only reachable for resend/revoke, and it means exactly one thing: this
      // person is no longer a pending invitation in this workspace. We cannot
      // tell which of the three causes it was, so the copy names them without
      // claiming to know.
      return action === 'revoke'
        ? {
            // The user's goal — this invitation should not exist — is already
            // satisfied, so this is information, not a failure.
            tone: 'info',
            placement: 'page',
            refetch: true,
            message:
              'That invitation was already revoked or accepted, so there was nothing to remove. We have refreshed the list.',
          }
        : {
            // Here the goal (send another email) genuinely did not happen.
            tone: 'warning',
            placement: 'page',
            refetch: true,
            message:
              'That invitation is no longer pending — they may have already accepted it, or it was revoked from another session. We have refreshed the list.',
          };

    case 409:
      return {
        tone: 'warning',
        placement: 'modal',
        refetch: false,
        focus: 'email',
        // The backend message is a bare clause with no full stop, so it needs
        // terminating before the advice is appended or the two run together.
        message: `${endSentence(apiErrorMessage(err, 'Someone with that email is already in this workspace'))} If they were invited before, close this and re-send from the roster instead.`,
      };

    default:
      return {
        tone: 'error',
        placement,
        refetch: false,
        message: `Something went wrong ${ACTION_NOUN[action]}. Try again in a moment.`,
      };
  }
}

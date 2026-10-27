import axios from 'axios';
import { apiErrorMessage } from '../api/client';
import { apiErrorCode, apiErrorStatus } from '../api/errors';
import type { AlertTone } from '../components/ui/Alert';

/**
 * Turns a failed role request into copy a person can act on.
 *
 * <p>The role endpoints answer with codes, and most of their 422 messages are
 * already written for people ("You can only give out permissions you have
 * yourself. You don't have: Publish vacancies.") — those are shown as they
 * come. What this adds is the routing: a taken name belongs on the name field,
 * a stale version needs a reload rather than a retry, and a role that has
 * gone needs the list, not the form.</p>
 */

export type RoleAction = 'load' | 'create' | 'save' | 'duplicate' | 'delete' | 'assign';

export interface RoleErrorPlan {
  tone: AlertTone;
  message: string;
  /** 409 CONFLICT: the name belongs to another role; show it on the field. */
  nameTaken?: boolean;
  /** 409 CONCURRENT_UPDATE: someone saved first; offer to load their version. */
  stale?: boolean;
  /** 404: the role (or member) is gone. */
  notFound?: boolean;
  /** Worth re-fetching what is on screen. */
  refetch?: boolean;
  /** Retrying the same request could succeed. */
  retry?: boolean;
}

const DOING: Record<RoleAction, string> = {
  load: 'loading roles',
  create: 'creating that role',
  save: 'saving the role',
  duplicate: 'copying that role',
  delete: 'deleting that role',
  assign: 'changing that role',
};

export function describeRoleError(err: unknown, action: RoleAction): RoleErrorPlan {
  if (axios.isAxiosError(err) && !err.response) {
    return {
      tone: 'error',
      retry: true,
      message: "We couldn't reach the server. Check your connection and try again.",
    };
  }

  const status = apiErrorStatus(err);
  const code = apiErrorCode(err);

  if (code === 'CONCURRENT_UPDATE') {
    return {
      tone: 'warning',
      stale: true,
      message: apiErrorMessage(err, 'Someone else changed this role after you opened it. Load their version, then edit again.'),
    };
  }

  switch (status) {
    case 400:
    case 422:
      return { tone: 'error', message: apiErrorMessage(err, 'Check the details and try again.') };
    case 403:
      return {
        tone: 'error',
        refetch: true,
        message:
          'Your permissions have changed, so this is no longer something you can do. Reload the page to see what you can do now.',
      };
    case 404:
      return {
        tone: 'warning',
        notFound: true,
        refetch: true,
        message:
          action === 'assign'
            ? 'That person or role is no longer in this workspace. We have refreshed the list.'
            : 'That role no longer exists — someone may have deleted it. We have refreshed the list.',
      };
    case 409:
      return { tone: 'error', nameTaken: true, message: apiErrorMessage(err, 'Another role already has this name.') };
    default:
      return { tone: 'error', retry: true, message: `Something went wrong ${DOING[action]}. Try again in a moment.` };
  }
}

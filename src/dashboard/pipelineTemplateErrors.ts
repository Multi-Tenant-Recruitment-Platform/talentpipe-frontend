import axios from 'axios';
import { apiErrorMessage } from '../api/client';
import type { AlertTone } from '../components/ui/Alert';
import { MESSAGES } from './pipelineTemplate';

/**
 * Turns a failed template request into something an admin can act on — the
 * same job `vacancyErrors.ts` does for vacancies.
 */

export type TemplateRequestKind = 'list' | 'load' | 'create' | 'save' | 'archive' | 'duplicate' | 'delete';

export interface TemplateErrorPlan {
  tone: AlertTone;
  message: string;
  /** The template is gone — or was never in this workspace. */
  notFound: boolean;
  /** A 409: the name belongs on the Name field, not in a banner. */
  nameTaken: boolean;
  /**
   * The backend's own sentence on a 400 or 422 — field errors joined as
   * `field: reason; …`, or a single rule such as "Manual threshold must be
   * lower than auto threshold". The form places it on a field when it can.
   */
  validation: string | null;
  /** The server has no pipeline template API at all. Retrying won't help. */
  unavailable: boolean;
}

/** Shown when the backend answers without the pipeline template module. */
export const UNAVAILABLE =
  "This server doesn't support pipeline templates yet. The backend needs the pipeline template module (the Pipeline-Template-Creation branch) before templates can be loaded or saved.";

/** Spring's generic answer for a path no controller handles. */
function isMissingRoute(err: unknown): boolean {
  return /^resource not found\.?$/i.test(apiErrorMessage(err, '').trim());
}

const NOUN: Record<TemplateRequestKind, string> = {
  list: 'loading your pipeline templates',
  load: 'loading this template',
  create: 'saving this template',
  save: 'saving your changes',
  archive: 'archiving this template',
  duplicate: 'duplicating this template',
  delete: 'deleting this template',
};

export function describeTemplateError(err: unknown, kind: TemplateRequestKind): TemplateErrorPlan {
  const plan = (tone: AlertTone, message: string, extra: Partial<TemplateErrorPlan> = {}) => ({
    tone,
    message,
    notFound: false,
    nameTaken: false,
    validation: null,
    unavailable: false,
    ...extra,
  });

  if (axios.isAxiosError(err) && !err.response) {
    return plan('error', "We couldn't reach the server. Check your connection and try again.");
  }

  const status = axios.isAxiosError(err) ? err.response?.status : undefined;

  switch (status) {
    case 400:
    case 422: {
      // Written for people by the backend's validator — passed through.
      const message = apiErrorMessage(err, '');
      return plan('error', message || 'Check the details and try again.', { validation: message || null });
    }

    case 403:
      return plan(
        'error',
        'Your role no longer allows managing pipeline templates. Sign out and back in if you think this is wrong.',
      );

    case 404:
      // Two different 404s. A missing template answers "Pipeline template not
      // found" (ResourceNotFoundException). A backend without the pipeline
      // module answers Spring's generic "Resource not found" for every path —
      // and a list or create can only ever 404 that way. Calling the second
      // "this template no longer exists" sent people looking for a deletion
      // that never happened.
      return kind === 'list' || kind === 'create' || isMissingRoute(err)
        ? plan('error', UNAVAILABLE, { unavailable: true })
        : plan('warning', 'This template no longer exists. It may have been removed in another session.', {
            notFound: true,
          });

    case 409:
      return plan('error', MESSAGES.nameTaken, { nameTaken: true });

    default:
      return plan('error', `Something went wrong ${NOUN[kind]}. Try again in a moment.`);
  }
}

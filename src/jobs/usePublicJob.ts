import { useCallback, useEffect, useState } from 'react';
import { apiErrorMessage } from '../api/client';
import { getPublicJob } from '../api/publicJobs';
import type { JobDetail } from '../api/types';

export type PublicJobState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; job: JobDetail | null };

/** One published vacancy, by the name in its link. `job: null` means it does not exist or is not public. Key the caller by jobKey. */
export function usePublicJob(jobKey: string) {
  const [state, setState] = useState<PublicJobState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getPublicJob(jobKey)
      .then((job) => {
        if (!cancelled) setState({ status: 'ready', job });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: 'error', message: apiErrorMessage(err, 'We could not load this job. Please try again.') });
      });
    return () => {
      cancelled = true;
    };
  }, [jobKey, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiErrorMessage } from '../api/client';
import { jobsApi } from '../api/jobs';
import type { IdealMatchingResponse } from '../api/types';

interface IdealMatchingController {
  profile: IdealMatchingResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * One vacancy's ideal candidate, for the vacancy page, the edit form and a
 * duplicate. Re-read when the vacancy is saved: an edit carries the profile.
 *
 * @param vacancyId `null` reads nothing — a new vacancy has no profile yet
 */
export function useIdealMatching(vacancyId: string | null, vacancyVersion?: number): IdealMatchingController {
  const [profile, setProfile] = useState<IdealMatchingResponse | null>(null);
  const [answeredId, setAnsweredId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);
  // Set on every mount: StrictMode mounts twice, and a flag set once would drop every answer.
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!vacancyId) {
      return;
    }
    const ticket = ++latest.current;
    const current = () => mounted.current && ticket === latest.current;
    try {
      const answer = await jobsApi.idealMatching(vacancyId);
      if (current()) {
        setProfile(answer);
        setError(null);
      }
    } catch (err: unknown) {
      if (current()) {
        setError(apiErrorMessage(err, 'We could not load the ideal candidate.'));
      }
    } finally {
      if (current()) {
        setAnsweredId(vacancyId);
      }
    }
  }, [vacancyId]);

  useEffect(() => {
    void refresh();
    // The version is the signal that the vacancy was saved.
  }, [refresh, vacancyVersion]);

  return { profile, loading: vacancyId !== null && answeredId !== vacancyId, error, refresh };
}

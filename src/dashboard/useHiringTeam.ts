import { useCallback, useEffect, useRef, useState } from 'react';
import { apiErrorMessage } from '../api/client';
import { jobsApi } from '../api/jobs';
import type { HiringTeamResponse } from '../api/types';

interface HiringTeamController {
  team: HiringTeamResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Puts the server's answer to a change on screen. */
  replace: (team: HiringTeamResponse) => void;
}

/**
 * Who works on one vacancy (ADR-11): its recruiter, its hiring manager and
 * the rest of its hiring team. Any member who can open the vacancy may read
 * this; changing it is the page's job.
 *
 * <p>Re-read when the vacancy itself changes — a saved edit may have named a
 * new recruiter or hiring manager.</p>
 */
export function useHiringTeam(vacancyId: string, vacancyVersion: number): HiringTeamController {
  const [team, setTeam] = useState<HiringTeamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  const refresh = useCallback(async () => {
    const ticket = ++latest.current;
    try {
      const answer = await jobsApi.hiringTeam(vacancyId);
      if (ticket === latest.current) {
        setTeam(answer);
        setError(null);
      }
    } catch (err: unknown) {
      if (ticket === latest.current) {
        setError(apiErrorMessage(err, 'We could not load the hiring team.'));
      }
    } finally {
      if (ticket === latest.current) {
        setLoading(false);
      }
    }
  }, [vacancyId]);

  useEffect(() => {
    void refresh();
    // The version is the signal that the vacancy was saved.
  }, [refresh, vacancyVersion]);

  return { team, loading, error, refresh, replace: setTeam };
}

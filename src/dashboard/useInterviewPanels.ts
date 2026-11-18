import { useCallback, useEffect, useRef, useState } from 'react';
import { apiErrorMessage } from '../api/client';
import { jobsApi } from '../api/jobs';
import type { InterviewPanelResponse } from '../api/types';

interface InterviewPanelsController {
  panels: InterviewPanelResponse[] | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Puts the server's answer to a change on screen. */
  replace: (panels: InterviewPanelResponse[]) => void;
}

/**
 * One vacancy's interview rounds and who runs each, for the detail page, the
 * edit form and a duplicate. Re-read when the vacancy is saved, as its hiring
 * team is: an edit may have changed the panels with it.
 *
 * @param vacancyId `null` reads nothing — a new vacancy has no panels yet
 */
export function useInterviewPanels(vacancyId: string | null, vacancyVersion?: number): InterviewPanelsController {
  const [panels, setPanels] = useState<InterviewPanelResponse[] | null>(null);
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
      const answer = await jobsApi.interviewPanels(vacancyId);
      if (current()) {
        setPanels(answer);
        setError(null);
      }
    } catch (err: unknown) {
      if (current()) {
        setError(apiErrorMessage(err, 'We could not load the interview panels.'));
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

  return {
    panels,
    loading: vacancyId !== null && answeredId !== vacancyId,
    error,
    refresh,
    replace: setPanels,
  };
}

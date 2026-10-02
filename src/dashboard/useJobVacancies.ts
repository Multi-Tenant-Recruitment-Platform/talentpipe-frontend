import { useCallback, useEffect, useRef, useState } from 'react';
import { jobsApi } from '../api/jobs';
import type { JobVacancyResponse } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { describeVacancyError } from './vacancyErrors';

/**
 * Vacancy data, read from the Job module (`/api/v1/jobs`).
 *
 * <p>Two hooks rather than one store: the list page needs every vacancy, the
 * detail and edit pages need one, fresh. Writes are not here — each page calls
 * {@link jobsApi} for the action it performs and hands the response back
 * through `replace`, so the screen shows what the server stored rather than
 * what the client hoped it would.</p>
 *
 * <p>Both re-fetch when the signed-in identity changes, so signing into a
 * second workspace on the same device never leaves the first one's vacancies
 * on screen.</p>
 */

/**
 * Drops responses that arrive after a newer request or after unmount. Without
 * it, a slow first load could land after a fast refresh and overwrite it.
 */
function useLatest() {
  const latest = useRef(0);
  const mounted = useRef(false);
  // Set on mount as well as cleared on unmount: StrictMode mounts, unmounts and
  // mounts again, and a flag only ever cleared would stay false for good.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return useCallback(() => {
    const ticket = ++latest.current;
    return () => mounted.current && ticket === latest.current;
  }, []);
}

export interface JobVacancyListController {
  vacancies: JobVacancyResponse[];
  /** True until the first answer arrives. A refresh keeps the old rows on screen. */
  loading: boolean;
  /** A sentence for the person, or null. */
  error: string | null;
  refresh: () => Promise<void>;
  /** Swaps in the server's copy of one vacancy after an action. */
  replace: (vacancy: JobVacancyResponse) => void;
}

export function useJobVacancyList(): JobVacancyListController {
  const { user } = useAuth();
  const begin = useLatest();
  const [vacancies, setVacancies] = useState<JobVacancyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const current = begin();
    try {
      const list = await jobsApi.list();
      if (current()) {
        setVacancies(list);
        setError(null);
      }
    } catch (err: unknown) {
      if (current()) {
        setError(describeVacancyError(err, 'list').message);
      }
    } finally {
      if (current()) {
        setLoading(false);
      }
    }
  }, [begin]);

  useEffect(() => {
    void refresh();
  }, [refresh, user?.id]);

  const replace = useCallback((vacancy: JobVacancyResponse) => {
    setVacancies((list) => list.map((entry) => (entry.id === vacancy.id ? vacancy : entry)));
  }, []);

  return { vacancies, loading, error, refresh, replace };
}

export interface JobVacancyController {
  vacancy: JobVacancyResponse | null;
  loading: boolean;
  error: string | null;
  /** The id does not exist in this workspace. Distinct from a failed load. */
  notFound: boolean;
  refresh: () => Promise<void>;
  replace: (vacancy: JobVacancyResponse) => void;
}

/** One vacancy by id. A null id loads nothing and reports nothing. */
export function useJobVacancy(id: string | null | undefined): JobVacancyController {
  const { user } = useAuth();
  const begin = useLatest();
  const [vacancy, setVacancy] = useState<JobVacancyResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    const current = begin();
    try {
      const found = await jobsApi.get(id);
      if (current()) {
        setVacancy(found);
        setError(null);
        setNotFound(false);
      }
    } catch (err: unknown) {
      if (current()) {
        const plan = describeVacancyError(err, 'load');
        setNotFound(plan.notFound);
        setError(plan.notFound ? null : plan.message);
      }
    } finally {
      if (current()) {
        setLoading(false);
      }
    }
  }, [id, begin]);

  useEffect(() => {
    setLoading(Boolean(id));
    void refresh();
  }, [refresh, user?.id, id]);

  return { vacancy, loading, error, notFound, refresh, replace: setVacancy };
}

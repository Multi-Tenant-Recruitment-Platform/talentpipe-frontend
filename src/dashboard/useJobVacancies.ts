import { useCallback, useState } from 'react';
import type { JobVacancyResponse, VacancyStatus } from '../api/types';
import { activeTenant } from '../tenant/activeTenant';
import { tenantStorage } from '../utils/tenantStorage';
import { toVacancyRequest, type JobVacancyFormValues } from './jobVacancy';

/**
 * The vacancy store, standing in for the Job module.
 *
 * <p>TODO(sprint2): replace the three storage calls below with `jobsApi.list`
 * and `jobsApi.create` from `src/api/jobs.ts`, which already carry the agreed
 * request and response shapes. Nothing outside this file knows where a vacancy
 * is kept — the pages await a promise and render what comes back, which is
 * exactly what they will do against the real endpoint.</p>
 *
 * <p>Storage is per workspace, through {@link tenantStorage}: signing into a
 * second company on the same device must not surface the first one's drafts.
 * That is the same guarantee the backend's tenant scoping will give, so the
 * demo cannot teach a habit the real thing then breaks.</p>
 */

const STORAGE_KEY = 'jobVacancies';

const store = () => tenantStorage(activeTenant.get());

/**
 * What is on disk, or nothing.
 *
 * <p>`localStorage` is outside the app's control — a half-written entry, or one
 * left by an older shape of this record, is a real possibility rather than a
 * defensive fiction. A corrupt entry reads as an empty workspace instead of
 * taking the page down with it.</p>
 */
function readStored(): JobVacancyResponse[] {
  const raw = store().get(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as JobVacancyResponse[]) : [];
  } catch {
    return [];
  }
}

function writeStored(vacancies: JobVacancyResponse[]): void {
  store().set(STORAGE_KEY, JSON.stringify(vacancies));
}

export interface JobVacancyController {
  /** Newest first: the vacancy someone just filed is the one they look for. */
  vacancies: JobVacancyResponse[];
  create: (values: JobVacancyFormValues, status: VacancyStatus) => Promise<JobVacancyResponse>;
  refresh: () => void;
}

export function useJobVacancies(): JobVacancyController {
  // Read once, during the first render. There is deliberately no loading state
  // and no skeleton: this read is synchronous, so a "still loading" branch
  // could never render, and shipping UI that cannot run is worse than shipping
  // none. Both arrive with the request that actually takes time.
  const [vacancies, setVacancies] = useState<JobVacancyResponse[]>(readStored);

  const refresh = useCallback(() => {
    setVacancies(readStored());
  }, []);

  /**
   * Async on purpose, though the write is synchronous today: the call sites
   * await it and hold a submitting state, so swapping in `jobsApi.create`
   * changes this function and nothing above it. No artificial delay — a fake
   * spinner would be theatre, and the real one arrives with the real request.
   */
  const create = useCallback(
    async (values: JobVacancyFormValues, status: VacancyStatus) => {
      const now = new Date().toISOString();
      const vacancy: JobVacancyResponse = {
        ...toVacancyRequest(values, status),
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
      const next = [vacancy, ...readStored()];
      writeStored(next);
      setVacancies(next);
      return vacancy;
    },
    [],
  );

  return { vacancies, create, refresh };
}

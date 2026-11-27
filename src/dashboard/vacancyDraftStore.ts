import { activeTenant } from '../tenant/activeTenant';
import { tenantStorage } from '../utils/tenantStorage';
import { EMPTY_VACANCY_VALUES, VACANCY_STEP_IDS, type JobVacancyFormValues } from './jobVacancy';

/**
 * The browser's copy of a vacancy being written.
 *
 * <p>A new vacancy cannot be saved on the server until it has a pipeline
 * template, and the template is the sixth step. Until then this copy is the
 * draft: written as the form changes, offered back when the form opens again,
 * and dropped once the vacancy is published or the work is discarded.</p>
 *
 * <p>Kept per workspace through {@link tenantStorage}, so signing in as
 * another company on the same device never offers this one's work. Storage
 * that is full, blocked or corrupt reads as "nothing stored" — losing the
 * convenience is acceptable, breaking the form is not.</p>
 */

export interface StoredVacancyDraft {
  values: JobVacancyFormValues;
  /** The step that was open, one of {@link VACANCY_STEP_IDS}. */
  step: string;
  /** ISO timestamp of the write. */
  savedAt: string;
}

const PREFIX = 'vacancyDraft.';

/** The key of a new vacancy, before the server knows it. */
export const NEW_VACANCY_DRAFT = 'new';

/** The key of a copy of another vacancy, before the server knows it. */
export const duplicateDraftKey = (sourceId: string) => `dup.${sourceId}`;

const store = () => tenantStorage(activeTenant.get());

function isStored(value: unknown): value is StoredVacancyDraft {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<StoredVacancyDraft>;
  return (
    typeof candidate.values === 'object' &&
    candidate.values !== null &&
    typeof candidate.step === 'string' &&
    typeof candidate.savedAt === 'string'
  );
}

export const vacancyDraftStore = {
  read(key: string): StoredVacancyDraft | null {
    try {
      const raw = store().get(PREFIX + key);
      if (!raw) {
        return null;
      }
      const parsed: unknown = JSON.parse(raw);
      if (!isStored(parsed)) {
        return null;
      }
      return {
        // Over the empty form, so a copy written before a field existed still opens.
        values: { ...EMPTY_VACANCY_VALUES, ...parsed.values },
        step: VACANCY_STEP_IDS.includes(parsed.step) ? parsed.step : VACANCY_STEP_IDS[0],
        savedAt: parsed.savedAt,
      };
    } catch {
      return null;
    }
  },

  write(key: string, values: JobVacancyFormValues, step: string, now: Date = new Date()): void {
    try {
      store().set(PREFIX + key, JSON.stringify({ values, step, savedAt: now.toISOString() }));
    } catch {
      // Quota or privacy mode: the server draft, where there is one, still holds the work.
    }
  },

  clear(key: string): void {
    try {
      store().remove(PREFIX + key);
    } catch {
      // Nothing to do; an entry that cannot be removed cannot be read either.
    }
  },
};

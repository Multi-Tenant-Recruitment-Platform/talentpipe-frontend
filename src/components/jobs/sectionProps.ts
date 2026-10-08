import type {
  JobVacancyField,
  JobVacancyFieldErrors,
  JobVacancyFormValues,
} from '../../dashboard/jobVacancy';

/**
 * What every section of the vacancy form receives.
 *
 * <p>One shape rather than per-section props: the sections are six views onto
 * one record, and a setter typed against the field keeps a wrong value from
 * reaching the wrong field at compile time.</p>
 */
export interface VacancySectionProps {
  values: JobVacancyFormValues;
  errors: JobVacancyFieldErrors;
  set: <K extends JobVacancyField>(field: K, value: JobVacancyFormValues[K]) => void;
}

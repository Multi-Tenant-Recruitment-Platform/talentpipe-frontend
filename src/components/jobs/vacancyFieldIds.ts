import type { JobVacancyField } from '../../dashboard/jobVacancy';

/**
 * The ids that tie a vacancy field's label, control and error together.
 *
 * <p>Their own module rather than exports from `VacancyField.tsx`: a file that
 * exports both a component and plain helpers loses fast refresh, and these are
 * imported by every section plus the page that focuses a failed field.</p>
 */

export const vacancyFieldId = (field: JobVacancyField) => `vacancy-${field}`;
export const vacancyErrorId = (field: JobVacancyField) => `vacancy-${field}-error`;
export const vacancyGroupId = (field: JobVacancyField) => `vacancy-${field}-group`;
export const vacancyLabelId = (field: JobVacancyField) => `vacancy-${field}-label`;

/**
 * The attributes a control needs to be wired to its own label and error.
 * Spread onto the input; {@link VacancyField} renders the rest.
 */
export function fieldAria(field: JobVacancyField, error?: string) {
  return {
    id: vacancyFieldId(field),
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? vacancyErrorId(field) : undefined,
  } as const;
}

/** The id of a vacancy's ⋮ trigger — where focus returns after an action on it. */
export const moreButtonId = (vacancyId: string) => `vacancy-more-${vacancyId}`;

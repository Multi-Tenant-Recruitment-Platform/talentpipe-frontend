import type { VacancyStatus } from '../../api/types';
import { VACANCY_STATUS_LABEL } from '../../dashboard/jobVacancy';
import { Icon } from '../dashboard/Icon';

/**
 * Where a vacancy is in its life, as a tag.
 *
 * <p>Colour carries meaning on exactly one of the four: published is the
 * success green the rest of the product uses for "this is live". A draft is
 * not a warning — it is simply not out yet — and closed and archived are
 * finished, not failing, so all three stay slate and are told apart by shape
 * and weight instead: a hollow dot, a filled one, a lock, a receding outline.
 * Amber is kept for deadlines, where there is something to do about it.</p>
 *
 * <p>Every variant carries its word, so nothing here depends on telling two
 * colours apart.</p>
 */
export function VacancyStatusTag({ value }: Readonly<{ value: VacancyStatus }>) {
  return (
    <span className="tp-vacancy-status" data-status={value}>
      {value === 'CLOSED' ? (
        <Icon name="lock-closed" size={12} />
      ) : (
        <span aria-hidden="true" className="tp-vacancy-status-dot" />
      )}
      {VACANCY_STATUS_LABEL[value]}
    </span>
  );
}

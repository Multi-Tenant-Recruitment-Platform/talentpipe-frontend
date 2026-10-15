import { Link } from 'react-router-dom';
import type { JobVacancyResponse } from '../../api/types';
import {
  deadlineSignal,
  employmentTypeLabel,
  vacancyCompleteness,
  workplaceTypeLabel,
  type VacancyAction,
} from '../../dashboard/jobVacancy';
import { formatDate, formatRelativeTime } from '../../utils/format';
import { VacancyActions } from './VacancyActions';
import { VacancyStatusTag } from './VacancyStatusTag';

const TERM = 'text-caption font-medium text-slate-500';
const FIGURE = 'block text-body tabular-nums';

/**
 * One vacancy in the list: who it is, where it stands, what can be done.
 *
 * <p>Three zones on a grid rather than table columns. A recruiter reads a row
 * left to right as a sentence — this role, in this state, closing then, so do
 * this — and the zones stack in that same order as the screen narrows, where a
 * table would have to start hiding columns and lose the sentence.</p>
 *
 * <p>The title is a real link to the vacancy's page. The previous list made the
 * whole row clickable and focusable instead, which put a second, unlabelled
 * tab stop in front of every action on it.</p>
 */
export function VacancyRow({
  vacancy,
  busy,
  flash,
  listSearch,
  onAction,
}: Readonly<{
  vacancy: JobVacancyResponse;
  busy: boolean;
  /** Just changed — draw the eye to it once. */
  flash: boolean;
  /** The list's query string, so the detail page's Back returns to this view. */
  listSearch: string;
  onAction: (action: VacancyAction) => void;
}>) {
  const titleId = `vacancy-${vacancy.id}-title`;
  const meta = [
    vacancy.department,
    vacancy.location,
    workplaceTypeLabel(vacancy.workplaceType),
    employmentTypeLabel(vacancy.employmentType),
  ].filter(Boolean);
  const signal = deadlineSignal(vacancy);
  const completeness = vacancy.status === 'DRAFT' ? vacancyCompleteness(vacancy) : null;

  return (
    <li className="tp-vacancy-row" data-flash={flash || undefined}>
      <article aria-labelledby={titleId} className="tp-vacancy-row-grid">
        <div className="tp-vacancy-row-identity">
          <h2 id={titleId} className="tp-vacancy-row-title">
            <Link to={`/dashboard/jobs/${vacancy.id}`} state={{ listSearch }}>
              {vacancy.title || 'Untitled vacancy'}
            </Link>
          </h2>
          <p className="m-0 mt-0.5 truncate text-small text-slate-500">
            {meta.length > 0 ? meta.join(' · ') : 'No details yet'}
          </p>
          <p className="m-0 mt-0.5 text-caption text-slate-500">
            Updated <time dateTime={vacancy.updatedAt}>{formatRelativeTime(vacancy.updatedAt)}</time>
          </p>
        </div>

        <dl className="tp-vacancy-row-state">
          <div>
            <dt className="sr-only">Status</dt>
            <dd>
              <VacancyStatusTag value={vacancy.status} />
            </dd>
          </div>
          <div>
            <dt className={TERM}>Deadline</dt>
            <dd>
              {vacancy.applicationDeadline ? (
                <time dateTime={vacancy.applicationDeadline} className={`${FIGURE} text-slate-900`}>
                  {formatDate(vacancy.applicationDeadline)}
                </time>
              ) : (
                <span className={`${FIGURE} text-slate-400`}>—</span>
              )}
              {signal && (
                <span className="tp-deadline-signal" data-tone={signal.tone}>
                  {signal.label}
                </span>
              )}
            </dd>
          </div>
          <div>
            {completeness ? (
              <>
                <dt className={TERM}>Completeness</dt>
                <dd>
                  <span className={`${FIGURE} text-slate-900`}>
                    {completeness.filled} of {completeness.total}
                  </span>
                  <span className="block text-caption text-slate-500">required fields</span>
                </dd>
              </>
            ) : (
              <>
                <dt className={TERM}>Applicants</dt>
                <dd>
                  {vacancy.applicantCount === null ? (
                    <>
                      <span aria-hidden="true" className={`${FIGURE} text-slate-400`}>
                        —
                      </span>
                      <span className="sr-only">Not connected yet</span>
                    </>
                  ) : (
                    <span className={`${FIGURE} text-slate-900`}>{vacancy.applicantCount}</span>
                  )}
                </dd>
              </>
            )}
          </div>
        </dl>

        <div className="tp-vacancy-row-actions">
          <VacancyActions vacancy={vacancy} context="list" busy={busy} onAction={onAction} />
        </div>
      </article>
    </li>
  );
}

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
          <p className="tp-vacancy-row-meta">
            {meta.length > 0 ? meta.join(' · ') : 'No details yet'}
          </p>
          <p className="tp-vacancy-row-updated">
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
            <dt className="tp-vacancy-row-term">Deadline</dt>
            <dd>
              {vacancy.applicationDeadline ? (
                <time dateTime={vacancy.applicationDeadline} className="tp-vacancy-row-figure">
                  {formatDate(vacancy.applicationDeadline)}
                </time>
              ) : (
                <span className="tp-vacancy-row-figure tp-vacancy-row-muted">—</span>
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
                <dt className="tp-vacancy-row-term">Completeness</dt>
                <dd>
                  <span className="tp-vacancy-row-figure">
                    {completeness.filled} of {completeness.total}
                  </span>
                  <span className="tp-vacancy-row-sub">required fields</span>
                </dd>
              </>
            ) : (
              <>
                <dt className="tp-vacancy-row-term">Applicants</dt>
                <dd>
                  {vacancy.applicantCount === null ? (
                    <>
                      <span aria-hidden="true" className="tp-vacancy-row-figure tp-vacancy-row-muted">
                        —
                      </span>
                      <span className="sr-only">Not connected yet</span>
                    </>
                  ) : (
                    <span className="tp-vacancy-row-figure">{vacancy.applicantCount}</span>
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

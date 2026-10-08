import { Card, Typography } from 'antd';
import type { JobVacancyResponse, VacancyStatus } from '../../api/types';
import { VACANCY_STATUS_LABEL } from '../../dashboard/jobVacancy';
import { fontSize, space } from '../../theme/tokens';
import { formatDate, formatRelativeTime } from '../../utils/format';
import { Icon } from '../dashboard/Icon';

const ORDER: VacancyStatus[] = ['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'];

const VISIBILITY: Record<VacancyStatus, string> = {
  DRAFT: 'Only your team can see this vacancy.',
  PUBLISHED: 'Visible on the candidate portal and accepting applications.',
  CLOSED: 'No longer accepting applications. Your team can still see it.',
  ARCHIVED: 'Out of your active lists, kept for reporting.',
};

/** When the vacancy entered each state, if it has. */
function enteredAt(vacancy: JobVacancyResponse, status: VacancyStatus): string | null {
  switch (status) {
    case 'DRAFT':
      return vacancy.createdAt;
    case 'PUBLISHED':
      return vacancy.publishedAt;
    case 'CLOSED':
      return vacancy.closedAt;
    case 'ARCHIVED':
      return vacancy.archivedAt;
  }
}

/**
 * Created straight as PUBLISHED, never saved as a draft. The server stamps
 * both times in the same request, a moment apart, so "the same instant" means
 * within a few seconds rather than byte-for-byte equal.
 */
function publishedOnCreate(vacancy: JobVacancyResponse): boolean {
  if (!vacancy.publishedAt) {
    return false;
  }
  return Math.abs(Date.parse(vacancy.publishedAt) - Date.parse(vacancy.createdAt)) < 5_000;
}

/**
 * Where this vacancy is in its life, and what that means for who can see it.
 *
 * <p>The stepper teaches the state machine without a word of explanation:
 * four stages, one current, the ones behind it dated. A vacancy published
 * straight from the form never sat as a draft — that step reads "Skipped"
 * rather than inventing a date for it.</p>
 *
 * <p>Applications get one honest line rather than a row of zeroes. There is no
 * applications module yet, and "0 applicants" would claim something nobody
 * knows.</p>
 */
export function VacancyLifecycleCard({ vacancy }: Readonly<{ vacancy: JobVacancyResponse }>) {
  const current = ORDER.indexOf(vacancy.status);

  return (
    <Card className="tp-vacancy-side" styles={{ body: { padding: space[3] } }}>
      <h2 className="tp-legend" style={{ margin: 0 }}>
        Lifecycle
      </h2>

      <ol className="tp-lifecycle" aria-label="Vacancy lifecycle">
        {ORDER.map((status, index) => {
          const state = index < current ? 'done' : index === current ? 'current' : 'upcoming';
          const at = enteredAt(vacancy, status);
          const skipped = state === 'done' && status === 'DRAFT' && publishedOnCreate(vacancy);
          return (
            <li
              key={status}
              className="tp-lifecycle-step"
              data-state={state}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <span aria-hidden="true" className="tp-lifecycle-mark">
                {state === 'done' ? <Icon name="check" size={12} /> : null}
              </span>
              <span className="tp-lifecycle-text">
                <span className="tp-lifecycle-name">{VACANCY_STATUS_LABEL[status]}</span>
                <span className="tp-lifecycle-date">
                  {state === 'upcoming'
                    ? ' '
                    : skipped
                      ? 'Skipped'
                      : at
                        ? <time dateTime={at}>{formatDate(at)}</time>
                        : 'Now'}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      <Typography.Paragraph style={{ marginTop: space[2], marginBottom: 0 }}>
        {VISIBILITY[vacancy.status]}
      </Typography.Paragraph>

      <dl className="tp-vacancy-side-facts">
        <div>
          <dt>Created</dt>
          <dd>
            <time dateTime={vacancy.createdAt}>{formatDate(vacancy.createdAt)}</time>
          </dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>
            <time dateTime={vacancy.updatedAt}>{formatRelativeTime(vacancy.updatedAt)}</time>
          </dd>
        </div>
        <div>
          <dt>Applications</dt>
          <dd>
            {vacancy.applicantCount === null ? (
              <Typography.Text type="secondary" style={{ fontSize: fontSize.small }}>
                Not connected yet — they&apos;ll appear here once candidates can apply.
              </Typography.Text>
            ) : (
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{vacancy.applicantCount}</span>
            )}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

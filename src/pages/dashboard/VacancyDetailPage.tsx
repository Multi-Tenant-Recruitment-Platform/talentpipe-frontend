import { Card, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useCan } from '../../auth/useCan';
import { EmptyState } from '../../components/dashboard/EmptyState';
import { ErrorState, RowsSkeleton } from '../../components/dashboard/ErrorState';
import { Icon } from '../../components/dashboard/Icon';
import { useVacancyLifecycle } from '../../components/jobs/useVacancyLifecycle';
import { VacancyActions } from '../../components/jobs/VacancyActions';
import { VacancyDetailsBody } from '../../components/jobs/VacancyDetailsBody';
import { VacancyLifecycleCard } from '../../components/jobs/VacancyLifecycleCard';
import { VacancyNotice, type VacancyNoticeValue } from '../../components/jobs/VacancyNotice';
import { VacancyStatusTag } from '../../components/jobs/VacancyStatusTag';
import { Alert } from '../../components/ui/Alert';
import {
  deadlineSignal,
  employmentTypeLabel,
  joinLabels,
  publishBlockers,
  workplaceTypeLabel,
  type VacancyAction,
} from '../../dashboard/jobVacancy';
import { useJobVacancy } from '../../dashboard/useJobVacancies';
import { space } from '../../theme/tokens';
import { formatDate } from '../../utils/format';

const NOTICE_ID = 'vacancy-detail-notice';

/**
 * One vacancy, read back in full, with everything that can be done to it.
 *
 * <p>A page rather than the drawer it replaces: a vacancy now has a life —
 * published, closed, archived — and actions that change it, and a page has a
 * URL that can be shared, reloaded and returned to with Back. It is also where
 * the candidate pipeline for this role will attach when that module exists;
 * there are deliberately no empty Candidates or Pipeline tabs until then.</p>
 */
export function VacancyDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const allow = useCan();
  const canManage = allow('jobs.manage');
  const { vacancy, loading, error, notFound, refresh, replace } = useJobVacancy(id);

  const state = location.state as { notice?: VacancyNoticeValue; listSearch?: string } | null;
  const [notice, setNotice] = useState<VacancyNoticeValue | null>(state?.notice ?? null);
  // Kept from the list's link, so Back returns to the same filtered view.
  const [listSearch] = useState(state?.listSearch ?? '');
  const noticeRef = useRef<HTMLDivElement>(null);

  // A notice handed over by the page before is shown once, then cleared from
  // history — otherwise a reload would announce the same save a second time.
  useEffect(() => {
    if (state?.notice) {
      navigate(location.pathname, { replace: true, state: { listSearch: state.listSearch } });
    }
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (notice) {
      noticeRef.current?.focus();
    }
  }, [notice]);

  const lifecycle = useVacancyLifecycle({
    onChanged: (updated) => replace(updated),
    onNotice: setNotice,
    onStale: () => void refresh(),
    fallbackFocusId: NOTICE_ID,
  });

  const backTo = `/dashboard/jobs${listSearch}`;
  const backLink = (
    <Link to={backTo} className="tp-back-link">
      <Icon name="arrow-left" size={16} />
      Back to vacancies
    </Link>
  );

  if (loading) {
    return (
      <section>
        {backLink}
        <Card style={{ marginTop: space[2] }}>
          <RowsSkeleton rows={5} label="Loading vacancy…" />
        </Card>
      </section>
    );
  }

  if (notFound || error || !vacancy) {
    return (
      <section>
        {backLink}
        <Card style={{ marginTop: space[2] }}>
          {notFound ? (
            <EmptyState
              icon="briefcase"
              title="This vacancy doesn't exist or was removed"
              description="It may have been deleted, or it belongs to another workspace."
              action={
                <Link to={backTo} className="tp-cta-link">
                  Back to vacancies
                </Link>
              }
            />
          ) : (
            <ErrorState
              title="We couldn't load this vacancy"
              description={error ?? 'Try again in a moment.'}
              onRetry={() => void refresh()}
            />
          )}
        </Card>
      </section>
    );
  }

  function onAction(action: VacancyAction) {
    if (!vacancy) {
      return;
    }
    switch (action) {
      case 'view':
        return;
      case 'edit':
        navigate(`/dashboard/jobs/${vacancy.id}/edit`);
        return;
      case 'duplicate':
        navigate(`/dashboard/jobs/new?from=${encodeURIComponent(vacancy.id)}`);
        return;
      default:
        lifecycle.request(action, vacancy);
    }
  }

  const meta = [
    vacancy.department,
    vacancy.location,
    workplaceTypeLabel(vacancy.workplaceType),
    employmentTypeLabel(vacancy.employmentType),
  ].filter(Boolean);
  const signal = deadlineSignal(vacancy);
  const blockers = vacancy.status === 'DRAFT' ? publishBlockers(vacancy) : [];

  return (
    <section>
      {backLink}

      <header className="tp-vacancy-detail-header">
        <div style={{ minWidth: 0 }}>
          <div className="tp-vacancy-detail-title-row">
            <Typography.Title level={1} className="tp-vacancy-detail-title">
              {vacancy.title || 'Untitled vacancy'}
            </Typography.Title>
            <VacancyStatusTag value={vacancy.status} />
          </div>
          {meta.length > 0 && <p className="tp-vacancy-row-meta">{meta.join(' · ')}</p>}
          {vacancy.applicationDeadline && (
            <p className="tp-vacancy-detail-deadline">
              Applications close{' '}
              <time dateTime={vacancy.applicationDeadline}>{formatDate(vacancy.applicationDeadline)}</time>
              {signal && (
                <span className="tp-deadline-signal" data-tone={signal.tone}>
                  {signal.label}
                </span>
              )}
            </p>
          )}
        </div>

        {canManage && (
          <VacancyActions
            vacancy={vacancy}
            context="detail"
            busy={lifecycle.busyId === vacancy.id}
            onAction={onAction}
          />
        )}
      </header>

      {notice && (
        <VacancyNotice
          ref={noticeRef}
          id={NOTICE_ID}
          notice={notice}
          onDismiss={() => setNotice(null)}
          onShowArchived={() => navigate('/dashboard/jobs?status=archived')}
        />
      )}

      {blockers.length > 0 && canManage && (
        <Alert tone="info" style={{ marginBottom: space[3] }}>
          This draft needs a little more before it can be published:{' '}
          {blockers.map((blocker, i) => (
            <span key={blocker.section.id}>
              {i > 0 && (i === blockers.length - 1 ? ' and ' : ', ')}
              <Link to={`/dashboard/jobs/${vacancy.id}/edit#${blocker.section.id}`}>
                {blocker.section.title}
              </Link>{' '}
              ({joinLabels(blocker.fields).toLowerCase()})
            </span>
          ))}
          .
        </Alert>
      )}

      <div className="tp-vacancy-detail-layout">
        <Card styles={{ body: { padding: space[3] } }} className="tp-vacancy-detail-main">
          <VacancyDetailsBody vacancy={vacancy} />
        </Card>
        <aside aria-label="Vacancy status">
          <VacancyLifecycleCard vacancy={vacancy} />
          {/* TODO(applications): the Candidates and Pipeline views for this
              role attach here once the applications module exists. No empty
              tabs before then — a tab with nothing behind it is a dead end. */}
        </aside>
      </div>

      {lifecycle.dialogs}
    </section>
  );
}

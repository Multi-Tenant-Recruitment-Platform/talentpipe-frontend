import { Card } from 'antd';
import { useEffect, useMemo, useRef } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { jobsApi } from '../../api/jobs';
import { EmptyState } from '../../components/dashboard/EmptyState';
import { ErrorState, RowsSkeleton } from '../../components/dashboard/ErrorState';
import { VacancyForm } from '../../components/jobs/VacancyForm';
import type { VacancyNoticeValue } from '../../components/jobs/VacancyNotice';
import { Alert } from '../../components/ui/Alert';
import {
  canEditVacancy,
  toFormValues,
  toVacancyUpdate,
  VACANCY_STATUS_LABEL,
  type JobVacancyFormValues,
} from '../../dashboard/jobVacancy';
import { useJobVacancy } from '../../dashboard/useJobVacancies';
import { space } from '../../theme/tokens';

/**
 * Change a vacancy's content (PB-019).
 *
 * <p>A draft keeps the create form's two exits — save it, or publish it. A live
 * vacancy has one, Save changes, validated in full: a published advert must
 * never be saved into a state it could not have been published in.</p>
 *
 * <p>Every save sends the `version` it was made against, and the server's
 * answer becomes the new one. Without that, two recruiters editing the same
 * vacancy would each silently overwrite the other; with it, the second save is
 * refused and told why.</p>
 */
export function EditJobVacancyPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { vacancy, loading, error, notFound, refresh } = useJobVacancy(id);

  // The version the next save is made against. A ref, not state: it moves on
  // after every save, and re-rendering the form for it would reset nothing
  // useful and risk resetting something that is.
  const version = useRef<number | null>(null);
  useEffect(() => {
    if (vacancy && version.current === null) {
      version.current = vacancy.version;
    }
  }, [vacancy]);

  const initialValues = useMemo(() => (vacancy ? toFormValues(vacancy) : null), [vacancy]);
  const initialNotice = (location.state as { notice?: VacancyNoticeValue } | null)?.notice ?? null;
  const detailPath = `/dashboard/jobs/${id}`;

  async function save(values: JobVacancyFormValues) {
    const saved = await jobsApi.update(id, toVacancyUpdate(values, version.current ?? 0));
    version.current = saved.version;
    return saved;
  }

  async function saveDraft(values: JobVacancyFormValues) {
    await save(values);
  }

  async function publish(values: JobVacancyFormValues) {
    // Two requests: store the content, then make the move. If the second is
    // refused, the first has still kept the work — and the version has moved
    // on, so trying again does not trip over our own save.
    await save(values);
    const published = await jobsApi.publish(id);
    navigate(detailPath, {
      replace: true,
      state: {
        notice: {
          tone: 'success',
          text: `${published.title || 'Your vacancy'} is live on the candidate portal.`,
        },
      },
    });
  }

  async function saveChanges(values: JobVacancyFormValues) {
    await save(values);
    navigate(detailPath, {
      state: {
        notice: { tone: 'success', text: "Changes saved. They're live on the candidate portal." },
      },
    });
  }

  if (loading) {
    return (
      <Card>
        <RowsSkeleton rows={5} label="Loading vacancy…" />
      </Card>
    );
  }

  if (notFound || error || !vacancy || !initialValues) {
    return (
      <Card>
        {notFound ? (
          <EmptyState
            icon="briefcase"
            title="This vacancy doesn't exist or was removed"
            description="It may have been deleted, or it belongs to another workspace."
            action={
              <Link to="/dashboard/jobs" className="tp-cta-link">
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
    );
  }

  // Closed and archived adverts are the record of what candidates applied to.
  // Say so on the page they can act from, rather than opening a form whose
  // every save would be refused.
  if (!canEditVacancy(vacancy.status)) {
    return (
      <Navigate
        to={detailPath}
        replace
        state={{
          notice: {
            tone: 'info',
            text: `${VACANCY_STATUS_LABEL[vacancy.status]} vacancies can't be edited. Duplicate it to reuse the details.`,
          },
        }}
      />
    );
  }

  const live = vacancy.status === 'PUBLISHED';

  return (
    <VacancyForm
      key={vacancy.id}
      mode={live ? 'edit-published' : 'edit-draft'}
      initialValues={initialValues}
      initialNotice={initialNotice}
      banner={
        live ? (
          <Alert tone="info" style={{ marginBottom: space[2.5] }}>
            This vacancy is live. Saved changes appear on the candidate portal straight away.
          </Alert>
        ) : undefined
      }
      exitTo={detailPath}
      exitLabel="Back to vacancy"
      onSaveDraft={live ? undefined : saveDraft}
      onPublish={live ? undefined : publish}
      onSaveChanges={live ? saveChanges : undefined}
    />
  );
}

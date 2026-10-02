import { Card } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { jobsApi } from '../../api/jobs';
import { EmptyState } from '../../components/dashboard/EmptyState';
import { ErrorState, RowsSkeleton } from '../../components/dashboard/ErrorState';
import { VacancyForm } from '../../components/jobs/VacancyForm';
import { Alert } from '../../components/ui/Alert';
import {
  duplicateValues,
  EMPTY_VACANCY_VALUES,
  toVacancyRequest,
  type JobVacancyFormValues,
} from '../../dashboard/jobVacancy';
import { useJobVacancy } from '../../dashboard/useJobVacancies';
import { space } from '../../theme/tokens';

/**
 * Open a role (PB-011), from scratch or as a copy of another (PB-021).
 *
 * <p>`?from=<id>` makes it a duplicate: the same form, prefilled from that
 * vacancy, and nothing stored until the recruiter saves or publishes. Creating
 * a record the moment Duplicate is clicked would leave an orphan copy behind
 * every time someone changed their mind.</p>
 *
 * <p>Both outcomes leave this page. A saved draft continues on its own edit
 * page, so the next save updates it instead of filing a second one; a published
 * vacancy lands on its detail page, which is the proof it went live.</p>
 */
export function CreateJobVacancyPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fromId = params.get('from');
  const source = useJobVacancy(fromId);

  async function saveDraft(values: JobVacancyFormValues) {
    const created = await jobsApi.create(toVacancyRequest(values, 'DRAFT'));
    navigate(`/dashboard/jobs/${created.id}/edit`, {
      replace: true,
      state: {
        notice: {
          tone: 'success',
          text: 'Draft saved. Only your team can see it until you publish.',
        },
      },
    });
  }

  async function publish(values: JobVacancyFormValues) {
    const created = await jobsApi.create(toVacancyRequest(values, 'PUBLISHED'));
    navigate(`/dashboard/jobs/${created.id}`, {
      replace: true,
      state: {
        notice: {
          tone: 'success',
          text: `${created.title || 'Your vacancy'} is live on the candidate portal.`,
        },
      },
    });
  }

  if (!fromId) {
    return (
      <VacancyForm
        mode="create"
        initialValues={EMPTY_VACANCY_VALUES}
        exitTo="/dashboard/jobs"
        exitLabel="Back to vacancies"
        onSaveDraft={saveDraft}
        onPublish={publish}
      />
    );
  }

  if (source.loading) {
    return (
      <Card>
        <RowsSkeleton rows={4} label="Loading the vacancy to copy…" />
      </Card>
    );
  }

  if (source.notFound || source.error || !source.vacancy) {
    return (
      <Card>
        {source.notFound ? (
          <EmptyState
            icon="document-duplicate"
            title="That vacancy can't be copied"
            description="It no longer exists, or it belongs to another workspace. You can still start a new vacancy from scratch."
            action={
              <Link to="/dashboard/jobs/new" className="tp-cta-link">
                Start from scratch
              </Link>
            }
          />
        ) : (
          <ErrorState
            title="We couldn't load the vacancy to copy"
            description={source.error ?? 'Try again in a moment.'}
            onRetry={() => void source.refresh()}
          />
        )}
      </Card>
    );
  }

  const original = source.vacancy;
  return (
    <VacancyForm
      // Keyed by the source, so copying a different vacancy starts a fresh form.
      key={original.id}
      mode="duplicate"
      initialValues={duplicateValues(original)}
      banner={
        <Alert tone="info" style={{ marginBottom: space[2.5] }}>
          Copied from <strong>{original.title || 'Untitled vacancy'}</strong>. Set a new deadline
          and review the details before publishing.
        </Alert>
      }
      exitTo={`/dashboard/jobs/${original.id}`}
      exitLabel="Back to original"
      onSaveDraft={saveDraft}
      onPublish={publish}
    />
  );
}

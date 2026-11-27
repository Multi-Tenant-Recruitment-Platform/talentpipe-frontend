import { CopyOutlined } from '@ant-design/icons';
import { Card } from 'antd';
import { useLayoutEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { jobsApi } from '../../api/jobs';
import { EmptyState } from '../../components/dashboard/EmptyState';
import { ErrorState, RowsSkeleton } from '../../components/dashboard/ErrorState';
import { VacancyForm } from '../../components/jobs/VacancyForm';
import { Alert } from '../../components/ui/Alert';
import { useAuth } from '../../auth/AuthContext';
import {
  duplicatePanels,
  duplicateValues,
  EMPTY_VACANCY_VALUES,
  toVacancyRequest,
  toVacancyUpdate,
  type JobVacancyFormValues,
} from '../../dashboard/jobVacancy';
import { EMPTY_MATCHING, toMatchingDraft } from '../../dashboard/idealMatching';
import { useIdealMatching } from '../../dashboard/useIdealMatching';
import { useInterviewPanels } from '../../dashboard/useInterviewPanels';
import { useJobVacancy } from '../../dashboard/useJobVacancies';
import { duplicateDraftKey, NEW_VACANCY_DRAFT } from '../../dashboard/vacancyDraftStore';

/**
 * Open a role (PB-011), from scratch or as a copy of another (PB-021).
 *
 * <p>`?from=<id>` makes it a duplicate: the same form, prefilled from that
 * vacancy, and nothing stored until the recruiter saves or publishes. Creating
 * a record the moment Duplicate is clicked would leave an orphan copy behind
 * every time someone changed their mind.</p>
 *
 * <p>The form auto-saves. Its first server save files the vacancy as a draft,
 * and every later one updates that same draft, against the version the last
 * answered — without leaving the page, so the recruiter stays on the step they
 * were on. The draft's id goes into the address (`?draft=<id>`), so a reload
 * opens it on its edit page instead of starting a second vacancy. Publishing
 * lands on the vacancy's page, which is the proof it went live.</p>
 *
 * <p>A duplicate also starts with the original's interview panels, minus
 * anyone who can no longer sit on one. If they can't be read, the copy simply
 * starts without them.</p>
 */
export function CreateJobVacancyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const fromId = params.get('from');
  const draftParam = params.get('draft');
  const source = useJobVacancy(fromId);
  const sourcePanels = useInterviewPanels(fromId);
  const sourceMatching = useIdealMatching(fromId);
  const { user } = useAuth();
  // Whoever files it is recorded as its creator.
  const creator = user ? `${`${user.firstName} ${user.lastName}`.trim()} (you)` : null;

  // The draft this page has filed, once it has one, and the version to update it against.
  const draft = useRef<{ id: string; version: number } | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const routeRef = useRef(location);
  useLayoutEffect(() => {
    routeRef.current = location;
  }, [location]);

  async function saveDraft(values: JobVacancyFormValues) {
    if (draft.current) {
      const saved = await jobsApi.update(draft.current.id, toVacancyUpdate(values, draft.current.version));
      draft.current.version = saved.version;
      return saved;
    }
    const created = await jobsApi.create(toVacancyRequest(values, 'DRAFT'));
    draft.current = { id: created.id, version: created.version };
    setDraftId(created.id);
    // Same route, so the form stays as it is; only the address learns the id.
    const route = routeRef.current;
    const search = new URLSearchParams(route.search);
    search.set('draft', created.id);
    navigate({ search: `?${search.toString()}`, hash: route.hash }, { replace: true, state: route.state });
    return created;
  }

  async function publish(values: JobVacancyFormValues) {
    let published;
    if (draft.current) {
      // Already filed: store the last changes, then make the move.
      await saveDraft(values);
      published = await jobsApi.publish(draft.current.id);
    } else {
      published = await jobsApi.create(toVacancyRequest(values, 'PUBLISHED'));
    }
    navigate(`/dashboard/jobs/${published.id}`, {
      replace: true,
      state: {
        notice: {
          tone: 'success',
          text: `${published.title || 'Your vacancy'} is live on the candidate portal.`,
        },
      },
    });
  }

  // A reload of a draft this page filed earlier: it is edited on its own page now.
  if (draftParam && draftParam !== draftId) {
    return <Navigate to={{ pathname: `/dashboard/jobs/${draftParam}/edit`, hash: location.hash }} replace />;
  }

  if (!fromId) {
    return (
      <VacancyForm
        mode="create"
        initialValues={EMPTY_VACANCY_VALUES}
        storageKey={draftId ?? NEW_VACANCY_DRAFT}
        exitTo="/dashboard/jobs"
        exitLabel="Back to vacancies"
        creator={creator}
        onSaveDraft={saveDraft}
        onPublish={publish}
      />
    );
  }

  if (source.loading || sourcePanels.loading || sourceMatching.loading) {
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
            icon={CopyOutlined}
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
      storageKey={draftId ?? duplicateDraftKey(original.id)}
      initialValues={{
        ...duplicateValues(original),
        interviewPanels: sourcePanels.panels ? duplicatePanels(sourcePanels.panels) : null,
        // The original's ideal candidate comes along; unreadable, the copy starts without one.
        idealMatching: sourceMatching.profile ? toMatchingDraft(sourceMatching.profile) : EMPTY_MATCHING,
      }}
      banner={
        <Alert tone="info" className="mb-5">
          Copied from <strong>{original.title || 'Untitled vacancy'}</strong>. Set a new deadline
          and review the details before publishing.
        </Alert>
      }
      exitTo={`/dashboard/jobs/${original.id}`}
      exitLabel="Back to original"
      creator={creator}
      onSaveDraft={saveDraft}
      onPublish={publish}
    />
  );
}

import { NodeIndexOutlined } from '@ant-design/icons';
import { Card } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { pipelineTemplatesApi } from '../../api/pipelineTemplates';
import type { VacancyNoticeValue } from '../../components/jobs/VacancyNotice';
import { EmptyState } from '../../components/dashboard/EmptyState';
import { ErrorState, RowsSkeleton } from '../../components/dashboard/ErrorState';
import { TemplateForm } from '../../components/pipelines/TemplateForm';
import { Alert } from '../../components/ui/Alert';
import { toFormValues, toTemplateRequest, type TemplateFormValues } from '../../dashboard/pipelineTemplate';
import { usePipelineTemplate, useTakenTemplateNames } from '../../dashboard/usePipelineTemplates';

/**
 * Change a template (PT-7). Jobs already created from it keep their own copy,
 * and the banner says so before the admin changes anything — that is the
 * question an edit to a shared template raises.
 */
export function EditPipelineTemplatePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // "Copy saved as …" after a duplicate lands here. Shown once, then cleared
  // from history so a reload doesn't repeat it.
  const [arrival] = useState(
    () => (location.state as { notice?: VacancyNoticeValue } | null)?.notice ?? null,
  );
  useEffect(() => {
    if (arrival) {
      navigate(location.pathname, { replace: true, state: null });
    }
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { template, loading, error, notFound, refresh } = usePipelineTemplate(id);
  const takenNames = useTakenTemplateNames(id);
  const initialValues = useMemo(() => (template ? toFormValues(template) : null), [template]);
  const detailPath = `/dashboard/pipeline-templates/${id}`;

  async function save(values: TemplateFormValues) {
    await pipelineTemplatesApi.update(id, toTemplateRequest(values));
    navigate(detailPath, {
      replace: true,
      state: { notice: { tone: 'success', text: 'Changes saved. New jobs will use this version.' } },
    });
  }

  if (loading) {
    return (
      <Card>
        <RowsSkeleton rows={5} label="Loading template…" />
      </Card>
    );
  }

  if (notFound || error || !template || !initialValues) {
    return (
      <Card>
        {notFound ? (
          <EmptyState
            icon={NodeIndexOutlined}
            title="Template not found"
            description="It may have been removed, or it belongs to another workspace."
            action={
              <Link to="/dashboard/pipeline-templates" className="tp-cta-link">
                Back to templates
              </Link>
            }
          />
        ) : (
          <ErrorState
            title="We couldn't load this template"
            description={error ?? 'Try again in a moment.'}
            onRetry={() => void refresh()}
          />
        )}
      </Card>
    );
  }

  // Archived templates are kept as the record jobs point back to; they are
  // read, not changed.
  if (template.status === 'ARCHIVED') {
    return (
      <Navigate
        to={detailPath}
        replace
        state={{ notice: { tone: 'info', text: "Archived templates can't be edited." } }}
      />
    );
  }

  return (
    <TemplateForm
      key={template.id}
      mode="edit"
      initialValues={initialValues}
      takenNames={takenNames}
      banner={
        <>
          {arrival && (
            <Alert tone={arrival.tone} className="mb-3">
              {arrival.text}
            </Alert>
          )}
          <Alert tone="info" className="mb-5">
            Changes apply to jobs created after you save. Jobs already using this template keep their own copy.
          </Alert>
        </>
      }
      exitTo={detailPath}
      exitLabel="Back to template"
      onSubmit={save}
    />
  );
}

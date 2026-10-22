import { ArrowLeftOutlined, CheckCircleOutlined, MinusCircleOutlined, NodeIndexOutlined } from '@ant-design/icons';
import { Card, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useCan } from '../../auth/useCan';
import { EmptyState } from '../../components/dashboard/EmptyState';
import { ErrorState, RowsSkeleton } from '../../components/dashboard/ErrorState';
import { bannerActions, pageBanner } from '../../components/dashboard/PageHeader';
import { HeroBackdrop } from '../../components/jobs/HeroBand';
import { VacancyNotice, type VacancyNoticeValue } from '../../components/jobs/VacancyNotice';
import { ScoreBandBar } from '../../components/pipelines/ScoreBandBar';
import { StageTrack } from '../../components/pipelines/StageTrack';
import { TemplateActions } from '../../components/pipelines/TemplateActions';
import { ArchivedTag } from '../../components/pipelines/TemplateStatusTag';
import { useTemplateLifecycle } from '../../components/pipelines/useTemplateLifecycle';
import { Alert } from '../../components/ui/Alert';
import { stageShape } from '../../dashboard/pipelineTemplate';
import { usePipelineTemplate } from '../../dashboard/usePipelineTemplates';
import { space } from '../../theme/tokens';
import { formatDate, formatRelativeTime } from '../../utils/format';

const NOTICE_ID = 'template-detail-notice';

/**
 * One template, read back in full (PT-6, PT-9): the stages in order with each
 * round's benchmark, the screening rule, and the matching setting.
 *
 * <p>Everyone who may see templates lands here — it is how a job creator reads
 * one, and where an admin lands after saving. Only an admin gets actions:
 * Edit and Archive while it is active, Duplicate and Delete in any state.</p>
 */
export function PipelineTemplateDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const allow = useCan();
  const canManage = allow('templates.manage');
  const { template, loading, error, notFound, refresh, replace } = usePipelineTemplate(id);

  const state = location.state as { notice?: VacancyNoticeValue; listSearch?: string } | null;
  const [notice, setNotice] = useState<VacancyNoticeValue | null>(state?.notice ?? null);
  const [listSearch] = useState(state?.listSearch ?? '');
  const noticeRef = useRef<HTMLDivElement>(null);

  // A notice handed over by the page before is shown once, then cleared from
  // history, so a reload doesn't announce the same save twice.
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

  const lifecycle = useTemplateLifecycle({
    onArchived: (archived) => {
      replace(archived);
      setNotice({ tone: 'success', text: `“${archived.name}” archived. It can no longer be chosen for new jobs.` });
    },
    onDuplicated: (copy) =>
      navigate(`/dashboard/pipeline-templates/${copy.id}/edit`, {
        state: { notice: { tone: 'success', text: `Copy saved as “${copy.name}”. Rename it and adjust what's different.` } },
      }),
    // The page it was on no longer exists; the list is where the outcome makes sense.
    onDeleted: (target) =>
      navigate(`/dashboard/pipeline-templates${listSearch}`, {
        replace: true,
        state: { notice: { tone: 'success', text: `“${target.name}” deleted.` } },
      }),
    onError: (message) => setNotice({ tone: 'error', text: message }),
    fallbackFocusId: NOTICE_ID,
  });

  const backTo = `/dashboard/pipeline-templates${listSearch}`;
  const backLink = (
    <Link
      to={backTo}
      className="mb-4 inline-flex items-center gap-1.5 text-small font-medium text-slate-600 no-underline hover:text-primary-700"
    >
      <ArrowLeftOutlined aria-hidden className="text-[16px]" />
      Back to templates
    </Link>
  );

  if (loading) {
    return (
      <section>
        {backLink}
        <Card className="mt-4">
          <RowsSkeleton rows={5} label="Loading template…" />
        </Card>
      </section>
    );
  }

  if (notFound || error || !template) {
    return (
      <section>
        {backLink}
        <Card className="mt-4">
          {notFound ? (
            <EmptyState
              icon={NodeIndexOutlined}
              title="Template not found"
              description="It may have been removed, or it belongs to another workspace."
              action={
                <Link to={backTo} className="tp-cta-link">
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
      </section>
    );
  }

  const archived = template.status === 'ARCHIVED';
  const shape = stageShape(template);
  const { defaultAutoThreshold: auto, defaultManualThreshold: manual } = template;

  return (
    <section>
      <header className={pageBanner}>
        <HeroBackdrop />
        <Link
          to={backTo}
          className="group mb-5 inline-flex items-center gap-1.5 text-small font-medium text-slate-300 no-underline hover:text-white"
        >
          <ArrowLeftOutlined
            aria-hidden
            className="text-[14px] transition-transform duration-(--tp-motion-base) group-hover:-translate-x-0.5"
          />
          Back to templates
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <Typography.Title level={1} className="m-0 text-heading tracking-heading text-white">
                {template.name}
              </Typography.Title>
              {archived && <ArchivedTag />}
            </div>
            <p className="m-0 mt-1 text-small text-slate-300">
              {shape.stageCount} stages · {shape.interviewRounds}{' '}
              {shape.interviewRounds === 1 ? 'interview round' : 'interview rounds'} · Last updated{' '}
              <Tooltip title={dayjs(template.updatedAt).format('D MMM YYYY, HH:mm')}>
                <time dateTime={template.updatedAt}>{formatRelativeTime(template.updatedAt)}</time>
              </Tooltip>
            </p>
          </div>
          {canManage && (
            <div className={bannerActions}>
              <TemplateActions
                template={template}
                context="detail"
                busy={lifecycle.busyId === template.id}
                onAction={(action) =>
                  action === 'edit'
                    ? navigate(`/dashboard/pipeline-templates/${template.id}/edit`)
                    : lifecycle.run(action, template)
                }
              />
            </div>
          )}
        </div>
      </header>

      {notice && (
        <VacancyNotice
          ref={noticeRef}
          id={NOTICE_ID}
          notice={notice}
          onDismiss={() => setNotice(null)}
          onShowArchived={() => navigate('/dashboard/pipeline-templates?archived=1')}
        />
      )}

      {archived && (
        <Alert tone="info" className="mb-6">
          Archived{template.archivedAt ? ` on ${formatDate(template.archivedAt)}` : ''} · can't be chosen for new jobs.
          Jobs already using it are unaffected.
        </Alert>
      )}

      <div className="grid items-start gap-6 *:min-w-0 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card styles={{ body: { padding: space[3] } }}>
          {template.description && (
            <Typography.Paragraph className="m-0 mb-6 text-body text-slate-700">{template.description}</Typography.Paragraph>
          )}
          <Typography.Title level={2} className="m-0 mb-4 text-title">
            Stages
          </Typography.Title>
          <StageTrack stages={template.stages} />
        </Card>

        <aside aria-label="Template settings" className="flex flex-col gap-6">
          <Card styles={{ body: { padding: space[3] } }}>
            <Typography.Title level={2} className="m-0 mb-1 text-title">
              Screening thresholds
            </Typography.Title>
            {shape.includeScreening ? (
              <>
                <p className="m-0 mb-4 text-small text-slate-600">Defaults for new jobs. Each job can adjust them.</p>
                <dl className="m-0 mb-4 grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-caption font-medium text-slate-500">Auto-advance</dt>
                    <dd className="m-0 text-lead font-semibold tabular-nums text-slate-900">{auto}</dd>
                  </div>
                  <div>
                    <dt className="text-caption font-medium text-slate-500">Manual review</dt>
                    <dd className="m-0 text-lead font-semibold tabular-nums text-slate-900">{manual}</dd>
                  </div>
                </dl>
                <ScoreBandBar auto={auto} manual={manual} />
              </>
            ) : (
              <p className="m-0 text-small text-slate-600">
                This pipeline has no screening stage, so applicants go straight to the first interview round.
              </p>
            )}
          </Card>

          <Card styles={{ body: { padding: space[3] } }}>
            <Typography.Title level={2} className="m-0 mb-2 text-title">
              Ideal-person matching
            </Typography.Title>
            <p className="m-0 flex items-center gap-2 font-medium text-slate-900">
              {template.idealMatchingEnabled ? (
                <CheckCircleOutlined aria-hidden className="text-[16px] text-success-text" />
              ) : (
                <MinusCircleOutlined aria-hidden className="text-[16px] text-slate-400" />
              )}
              {template.idealMatchingEnabled ? 'Available' : 'Not available'}
            </p>
            <p className="m-0 mt-1 text-small text-slate-600">
              {template.idealMatchingEnabled
                ? 'Jobs using this template can add an ideal-candidate scorecard.'
                : 'Jobs using this template are screened by the AI score alone.'}
            </p>
          </Card>
        </aside>
      </div>

      {lifecycle.dialog}
    </section>
  );
}

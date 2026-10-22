import { NodeIndexOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Card, Input, Switch, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { PipelineTemplate, PipelineTemplateSummary } from '../../api/types';
import { useCan } from '../../auth/useCan';
import { EmptyState } from '../../components/dashboard/EmptyState';
import { ErrorState, RowsSkeleton } from '../../components/dashboard/ErrorState';
import { PageHeader } from '../../components/dashboard/PageHeader';
import { VacancyNotice, type VacancyNoticeValue } from '../../components/jobs/VacancyNotice';
import { TEMPLATE_SEARCH_ID } from '../../components/pipelines/templateFieldIds';
import { TemplateRow } from '../../components/pipelines/TemplateRow';
import { useTemplateLifecycle, type TemplateAction } from '../../components/pipelines/useTemplateLifecycle';
import { Alert } from '../../components/ui/Alert';
import {
  parseTemplateQuery,
  sortByUpdated,
  toTemplateSearchParams,
  type TemplateQuery,
} from '../../dashboard/pipelineTemplate';
import { usePipelineTemplateList } from '../../dashboard/usePipelineTemplates';

const NOTICE_ID = 'template-list-notice';
const FLASH_MS = 1600;
/** Search runs on the server; this keeps it to one request per pause in typing. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * The company's pipeline templates (PT-6, PT-8, PT-9).
 *
 * <p>An admin creates, edits, duplicates, archives and deletes here. A job creator (HR manager)
 * reads the same list, active templates only — no archived filter, no
 * actions — ready for the job form to pick from next sprint.</p>
 *
 * <p>Search and the archived filter live in the address bar, so a filtered
 * view survives a reload and is where Back from a template returns.</p>
 */
export function PipelineTemplatesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { search } = location;
  const [params, setParams] = useSearchParams();
  const allow = useCan();
  const canManage = allow('templates.manage');

  const query = useMemo(() => parseTemplateQuery(params), [params]);
  // A job creator never asks for archived templates, whatever the URL says.
  const includeArchived = canManage && query.archived;
  const { templates, loading, refreshing, error, refresh, apply, drop } = usePipelineTemplateList(
    query.q,
    includeArchived,
  );
  const rows = useMemo(() => sortByUpdated(templates), [templates]);

  const update = useCallback(
    (next: Partial<TemplateQuery>, replace = false) => {
      setParams(toTemplateSearchParams({ ...query, ...next }), { replace });
    },
    [query, setParams],
  );

  // The box shows what is typed at once; the address bar (and the request)
  // follows after a pause. When the address changes from outside — Back, a
  // link — the box catches up. `pushed` is the last value this page wrote, so
  // its own debounced write never overwrites what has been typed since.
  const [draft, setDraft] = useState(query.q);
  const [pushed, setPushed] = useState(query.q);
  const [syncedQ, setSyncedQ] = useState(query.q);
  if (syncedQ !== query.q) {
    setSyncedQ(query.q);
    if (query.q !== pushed) {
      setDraft(query.q);
    }
  }

  const setSearch = useCallback(
    (q: string, replace: boolean) => {
      setPushed(q);
      update({ q }, replace);
    },
    [update],
  );

  useEffect(() => {
    if (draft === query.q) {
      return;
    }
    const timer = window.setTimeout(() => setSearch(draft, true), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, query.q, setSearch]);

  function clearSearch() {
    setDraft('');
    setSearch('', false);
  }

  // A notice handed over by the page before — "deleted" from the detail page.
  const arrivalNotice = (location.state as { notice?: VacancyNoticeValue } | null)?.notice ?? null;
  const [notice, setNotice] = useState<VacancyNoticeValue | null>(arrivalNotice);
  const [flashId, setFlashId] = useState<string | null>(null);
  const noticeRef = useRef<HTMLDivElement>(null);

  // Shown once, then cleared from history so a reload doesn't repeat it.
  useEffect(() => {
    if (arrivalNotice) {
      navigate({ pathname: location.pathname, search }, { replace: true, state: null });
    }
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!flashId) {
      return;
    }
    const timer = window.setTimeout(() => setFlashId(null), FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [flashId]);

  const lifecycle = useTemplateLifecycle({
    onArchived: (archived: PipelineTemplate) => {
      apply(archived);
      setFlashId(archived.id);
      setNotice({
        tone: 'success',
        text: `“${archived.name}” archived. It can no longer be chosen for new jobs.`,
        showArchived: !includeArchived,
      });
    },
    // The copy is what the admin wants next — straight into its editor, to
    // rename it and change what differs.
    onDuplicated: (copy) =>
      navigate(`/dashboard/pipeline-templates/${copy.id}/edit`, {
        state: { notice: { tone: 'success', text: `Copy saved as “${copy.name}”. Rename it and adjust what's different.` } },
      }),
    onDeleted: (target) => {
      drop(target.id);
      setNotice({ tone: 'success', text: `“${target.name}” deleted.` });
    },
    onError: (message) => setNotice({ tone: 'error', text: message }),
    fallbackFocusId: TEMPLATE_SEARCH_ID,
  });

  function onAction(template: PipelineTemplateSummary, action: TemplateAction) {
    if (action === 'edit') {
      navigate(`/dashboard/pipeline-templates/${template.id}/edit`);
    } else {
      lifecycle.run(action, template);
    }
  }

  // Always offered to an admin, whatever the list's state. If the server has
  // no template API, the form says so plainly on save.
  const createLink = canManage ? (
    <Link to="/dashboard/pipeline-templates/new" className="tp-cta-link">
      <PlusOutlined aria-hidden className="text-[16px]" />
      Create template
    </Link>
  ) : null;

  const filtering = query.q.trim() !== '';
  const firstLoad = loading && templates.length === 0;

  let body;
  if (firstLoad) {
    body = <RowsSkeleton rows={4} label="Loading pipeline templates…" />;
  } else if (error && templates.length === 0) {
    body = (
      <ErrorState
        title="We couldn't load your pipeline templates"
        description={error}
        onRetry={() => void refresh()}
      />
    );
  } else if (rows.length === 0 && filtering) {
    body = (
      <EmptyState
        icon={SearchOutlined}
        title={`No templates match “${query.q.trim()}”`}
        description="Search looks at template names. Try a shorter or different word."
        action={
          <button type="button" className="tp-link-button" onClick={clearSearch}>
            Clear search
          </button>
        }
      />
    );
  } else if (rows.length === 0) {
    body = canManage ? (
      <EmptyState
        icon={NodeIndexOutlined}
        title={includeArchived ? 'No pipeline templates yet' : 'No active pipeline templates'}
        description="A template sets the stages, interview benchmarks and screening thresholds a new job starts with. Create one and every job you open can reuse it."
        action={
          <span className="inline-flex flex-wrap items-center justify-center gap-4">
            <Link to="/dashboard/pipeline-templates/new" className="tp-cta-link">
              <PlusOutlined aria-hidden className="text-[16px]" />
              Create your first template
            </Link>
            {!includeArchived && (
              <button type="button" className="tp-link-button" onClick={() => update({ archived: true })}>
                Show archived
              </button>
            )}
          </span>
        }
      />
    ) : (
      <EmptyState
        icon={NodeIndexOutlined}
        title="No pipeline templates yet"
        description="Your admin hasn't created any templates yet. Once they do, you'll pick one here when you open a job."
      />
    );
  } else {
    body = (
      <ul className="m-0 list-none p-0" aria-label="Pipeline templates">
        {rows.map((template) => (
          <TemplateRow
            key={template.id}
            template={template}
            canManage={canManage}
            busy={lifecycle.busyId === template.id}
            flash={flashId === template.id}
            listSearch={search}
            onAction={(action) => onAction(template, action)}
          />
        ))}
      </ul>
    );
  }

  return (
    <section>
      <PageHeader
        title="Pipeline templates"
        subtitle="Reusable hiring stages, interview benchmarks and screening thresholds. Jobs copy a template when they are created."
      >
        {createLink}
      </PageHeader>

      {error && templates.length > 0 && (
        <Alert tone="error" className="mb-6">
          {error}
        </Alert>
      )}

      {notice && (
        <VacancyNotice
          ref={noticeRef}
          id={NOTICE_ID}
          notice={notice}
          onDismiss={() => setNotice(null)}
          onShowArchived={() => {
            setNotice(null);
            update({ archived: true });
          }}
        />
      )}

      <Card styles={{ body: { padding: 0 } }}>
        <div className="relative border-b border-slate-200 px-4 pt-5 pb-3 sm:px-6">
          {refreshing && !firstLoad && <span aria-hidden="true" className="tp-refresh-bar" />}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1 sm:max-w-md">
              <label htmlFor={TEMPLATE_SEARCH_ID} className="sr-only">
                Search templates by name
              </label>
              <Input
                id={TEMPLATE_SEARCH_ID}
                type="search"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Search by template name…"
                autoComplete="off"
                aria-describedby="template-result-count"
                allowClear
                prefix={<SearchOutlined aria-hidden className="text-[16px] opacity-45" />}
              />
            </div>
            {canManage && (
              <label className="inline-flex cursor-pointer items-center gap-2 text-small font-medium text-slate-700 sm:ms-auto">
                <Switch
                  size="small"
                  checked={query.archived}
                  onChange={(checked) => update({ archived: checked })}
                />
                Show archived
              </label>
            )}
          </div>
          <Typography.Text
            id="template-result-count"
            role="status"
            aria-live="polite"
            type="secondary"
            className="mt-3 block text-caption"
          >
            {firstLoad
              ? 'Loading…'
              : `${rows.length} ${rows.length === 1 ? 'template' : 'templates'}${includeArchived ? ', archived included' : ''}`}
          </Typography.Text>
        </div>
        {body}
      </Card>

      {lifecycle.dialog}
    </section>
  );
}

import { InboxOutlined, PlusOutlined, SearchOutlined, SolutionOutlined } from '@ant-design/icons';
import { Card } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { JobVacancyResponse } from '../../api/types';
import { useCan } from '../../auth/useCan';
import { EmptyState } from '../../components/dashboard/EmptyState';
import { ErrorState, RowsSkeleton } from '../../components/dashboard/ErrorState';
import { PageHeader } from '../../components/dashboard/PageHeader';
import { useVacancyLifecycle } from '../../components/jobs/useVacancyLifecycle';
import { moreButtonId } from '../../components/jobs/vacancyFieldIds';
import { VacancyNotice, type VacancyNoticeValue } from '../../components/jobs/VacancyNotice';
import { VacancyRow } from '../../components/jobs/VacancyRow';
import { VACANCY_SEARCH_ID, VacancyToolbar } from '../../components/jobs/VacancyToolbar';
import { Alert } from '../../components/ui/Alert';
import { useCompanyProfileContext } from '../../dashboard/CompanyProfileContext';
import type { VacancyAction } from '../../dashboard/jobVacancy';
import { useJobVacancyList } from '../../dashboard/useJobVacancies';
import {
  departmentOptions,
  inSegment,
  parseVacancyQuery,
  selectVacancies,
  summarizeVacancies,
  toVacancySearchParams,
  type VacancyQuery,
} from '../../dashboard/vacancyList';

const NOTICE_ID = 'vacancy-list-notice';

/** How long a changed row stays highlighted — long enough to find, short enough to forget. */
const FLASH_MS = 1600;

/**
 * Every vacancy in the workspace, and where each one stands (PB-011, PB-018 → PB-022).
 *
 * <p>Read from `GET /jobs`. There is no seeded example: a fabricated vacancy
 * here would be the one piece of placeholder content a person could mistake for
 * a role their company is actually hiring for.</p>
 *
 * <p>The filters live in the address bar, so a filtered view survives a reload,
 * can be linked to, and is where Back from a vacancy returns.</p>
 */
export function JobVacanciesPage() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const [params, setParams] = useSearchParams();
  const allow = useCan();
  const canManage = allow('jobs.manage');
  // Someone who sees every vacancy may narrow to their own; for everyone else
  // the server already lists only the vacancies they work on.
  const seesAll = allow('jobs.viewAll');
  const profile = useCompanyProfileContext();
  const query = useMemo(() => parseVacancyQuery(params), [params]);
  const mine = seesAll && query.mine;
  const { vacancies, loading, error, refresh, replace } = useJobVacancyList(mine);

  const selection = useMemo(() => selectVacancies(vacancies, query), [vacancies, query]);
  const summary = useMemo(() => summarizeVacancies(vacancies), [vacancies]);
  const departments = useMemo(
    () => departmentOptions(vacancies, profile.saved?.departments ?? []),
    [vacancies, profile.saved],
  );

  const [notice, setNotice] = useState<VacancyNoticeValue | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  // Which row to return focus to once the change has rendered. A ref, not
  // state: it is read once by the effect below and needs no render of its own.
  const focusAfter = useRef<string | null>(null);
  const noticeRef = useRef<HTMLDivElement>(null);

  const update = useCallback(
    (next: Partial<VacancyQuery>) => {
      // Typing in the search box rewrites the entry it is on; anything else is
      // a deliberate step Back should be able to undo.
      const typing = Object.keys(next).every((key) => key === 'query');
      setParams(toVacancySearchParams({ ...query, ...next }), { replace: typing });
    },
    [query, setParams],
  );

  const lifecycle = useVacancyLifecycle({
    onChanged: (updated: JobVacancyResponse) => {
      replace(updated);
      setFlashId(updated.id);
      focusAfter.current = updated.id;
    },
    onNotice: setNotice,
    onStale: () => void refresh(),
    fallbackFocusId: VACANCY_SEARCH_ID,
  });

  useEffect(() => {
    if (!flashId) {
      return;
    }
    const timer = window.setTimeout(() => setFlashId(null), FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [flashId]);

  // Focus returns to the row that was acted on. If the action moved it out of
  // the current view — archived while looking at Closed — the notice saying
  // where it went is the next best place, never the top of the document.
  useEffect(() => {
    const id = focusAfter.current;
    if (!id) {
      return;
    }
    focusAfter.current = null;
    const trigger = document.getElementById(moreButtonId(id));
    if (trigger) {
      trigger.focus();
    } else {
      noticeRef.current?.focus();
    }
  }, [selection.visible, notice]);

  function onAction(vacancy: JobVacancyResponse, action: VacancyAction) {
    switch (action) {
      case 'view':
        navigate(`/dashboard/jobs/${vacancy.id}`, { state: { listSearch: search } });
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

  const createButton = canManage ? (
    <Link to="/dashboard/jobs/new" className="tp-cta-link">
      <PlusOutlined aria-hidden className="text-[16px]" />
      Create vacancy
    </Link>
  ) : null;

  const firstLoad = loading && vacancies.length === 0;
  const segmentTotal = vacancies.filter((v) => inSegment(v, query.segment)).length;

  const summaryParts = [
    summary.live > 0 && {
      key: 'live',
      text: `${summary.live} live`,
      apply: () => update({ segment: 'PUBLISHED' }),
    },
    summary.drafts > 0 && {
      key: 'drafts',
      text: `${summary.drafts} ${summary.drafts === 1 ? 'draft' : 'drafts'}`,
      apply: () => update({ segment: 'DRAFT' }),
    },
    summary.closingThisWeek > 0 && {
      key: 'closing',
      text: `${summary.closingThisWeek} closing this week`,
      apply: () => update({ segment: 'PUBLISHED', sort: 'deadline' }),
    },
  ].filter(Boolean) as { key: string; text: string; apply: () => void }[];

  let body;
  if (firstLoad) {
    body = (
      <Card>
        <RowsSkeleton rows={4} label="Loading vacancies…" />
      </Card>
    );
  } else if (error && vacancies.length === 0) {
    body = (
      <Card>
        <ErrorState
          title="We couldn't load your vacancies"
          description={error}
          onRetry={() => void refresh()}
        />
      </Card>
    );
  } else if (vacancies.length === 0 && mine) {
    body = (
      <Card>
        <EmptyState
          icon={SolutionOutlined}
          title="Nothing is assigned to you yet"
          description="Vacancies appear here when you are their recruiter or hiring manager, or someone adds you to their hiring team."
          action={
            <button type="button" className="tp-link-button" onClick={() => update({ mine: false })}>
              Show every vacancy
            </button>
          }
        />
      </Card>
    );
  } else if (vacancies.length === 0 && !seesAll) {
    body = (
      <Card>
        <EmptyState
          icon={SolutionOutlined}
          title="No vacancies to show you yet"
          description="You see the vacancies you work on — as their recruiter or hiring manager, or on their hiring team. Ask whoever runs hiring to add you to one."
          action={createButton ?? undefined}
        />
      </Card>
    );
  } else if (vacancies.length === 0) {
    body = (
      <Card>
        <EmptyState
          icon={SolutionOutlined}
          title="No vacancies yet"
          description="Create your first one to start collecting applications. It takes about five minutes, and you can save a draft at any point."
          action={createButton ?? undefined}
        />
      </Card>
    );
  } else {
    body = (
      <Card styles={{ body: { padding: 0 } }}>
        <div className="border-b border-slate-200 px-6 pt-5 pb-3">
          <VacancyToolbar
            query={query}
            onChange={update}
            counts={selection.counts}
            departments={departments}
            visibleCount={selection.visible.length}
            totalCount={segmentTotal}
            filtersActive={selection.filtersActive}
            onClearFilters={() => update({ query: '', department: '' })}
            onMineChange={seesAll ? (next) => update({ mine: next }) : undefined}
          />
        </div>

        {selection.visible.length > 0 ? (
          <ul className="m-0 list-none p-0" aria-label="Vacancies">
            {selection.visible.map((vacancy) => (
              <VacancyRow
                key={vacancy.id}
                vacancy={vacancy}
                busy={lifecycle.busyId === vacancy.id}
                flash={flashId === vacancy.id}
                listSearch={search}
                onAction={(action) => onAction(vacancy, action)}
              />
            ))}
          </ul>
        ) : selection.filtersActive ? (
          <EmptyState
            icon={SearchOutlined}
            title={
              query.query.trim()
                ? `No vacancies match “${query.query.trim()}”`
                : 'No vacancies match these filters'
            }
            description="Try a different title, skill or department — or clear the filters to see them all."
            action={
              <button
                type="button"
                className="tp-link-button"
                onClick={() => update({ query: '', department: '' })}
              >
                Clear filters
              </button>
            }
          />
        ) : query.segment === 'ARCHIVED' ? (
          <EmptyState
            icon={InboxOutlined}
            title="Nothing archived"
            description="Closed vacancies you archive are kept here for reporting."
          />
        ) : (
          <EmptyState
            icon={SolutionOutlined}
            title="Nothing in this view"
            description="No vacancies are in this state right now."
            action={
              <button type="button" className="tp-link-button" onClick={() => update({ segment: 'all' })}>
                Show all vacancies
              </button>
            }
          />
        )}
      </Card>
    );
  }

  return (
    <section>
      <PageHeader
        title="Job vacancies"
        subtitle={
          seesAll
            ? 'Every role this workspace is hiring for, from first draft to archive.'
            : 'The roles you work on — as recruiter, hiring manager or on the hiring team.'
        }
      >
        {vacancies.length > 0 && createButton}
      </PageHeader>

      {summaryParts.length > 0 && (
        <p className="tp-vacancy-summary m-0 -mt-4 mb-6 text-small text-slate-600">
          {summaryParts.map((part, i) => (
            <span key={part.key}>
              {i > 0 && <span aria-hidden="true"> · </span>}
              <button type="button" className="tp-link-button" onClick={part.apply}>
                {part.text}
              </button>
            </span>
          ))}
        </p>
      )}

      {/* A failed refresh keeps the rows that loaded; it does not blank them. */}
      {error && vacancies.length > 0 && (
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
            update({ segment: 'ARCHIVED' });
          }}
        />
      )}

      {body}

      {lifecycle.dialogs}
    </section>
  );
}

import { ArrowUpOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
import { Card, Flex, Typography } from 'antd';
import { useCallback, useMemo, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ApplicantBand, ApplicantQuery, ApplicantSort } from '../../api/applicants';
import type { ApplicantRow, VacancyStatus } from '../../api/types';
import {
  parseApplicantQuery,
  thresholdsSentence,
  writeApplicantQuery,
} from '../../dashboard/applicants';
import { useApplicants } from '../../dashboard/useApplicants';
import { space } from '../../theme/tokens';
import { EmptyState } from '../dashboard/EmptyState';
import { ErrorState, RowsSkeleton } from '../dashboard/ErrorState';
import { Button } from '../ui/Button';
import { ApplicantFilters } from './ApplicantFilters';
import { ApplicantStats } from './ApplicantStats';
import { ApplicantsTable } from './ApplicantsTable';

/**
 * The applicants of one vacancy, on its page: the figures, the filters and
 * the ranked list.
 *
 * <p>The filter, search, sort and page live in the URL (`?band=manual&q=…`),
 * so a refresh, Back and a shared link all land on the same view. The list
 * and the figures keep themselves current (see `useApplicants`); newly
 * arrived applicants are announced and loaded on request, so rows never move
 * under the recruiter's cursor.</p>
 */
export function ApplicantsSection({
  jobId,
  vacancyStatus,
  showHeading = true,
  linkTo,
  selectedId,
  renderDetail,
}: Readonly<{
  jobId: string;
  vacancyStatus: VacancyStatus;
  /** False where the page's own header already names the list; the heading is then kept for screen readers only. */
  showHeading?: boolean;
  /** Where a candidate links to, given the row and the list's current search (its filters). */
  linkTo?: (row: ApplicantRow, search: string) => string;
  /** The application whose panel is open. */
  selectedId?: string;
  /**
   * What opens over the list — the applicant panel — given the rows in the
   * order shown, and a way to reload them after a decision changes one.
   */
  renderDetail?: (rows: ApplicantRow[], reload: () => void) => ReactNode;
}>) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const query = useMemo(() => parseApplicantQuery(params), [params]);
  const { state, counts, newCount, showNew, retry } = useApplicants(jobId, query);

  const update = useCallback(
    (change: Partial<ApplicantQuery>) => {
      // Any change but paging starts again from the first page.
      const next = { ...query, ...change, page: change.page ?? 0 };
      setParams(writeApplicantQuery(params, next), { replace: true });
    },
    [params, query, setParams],
  );

  const onQueryChange = useCallback((q: string) => update({ q }), [update]);
  // Carried into an applicant's link, so closing the panel returns to the same filtered view.
  const searchString = params.toString() ? `?${params.toString()}` : '';

  const heading = (
    <Typography.Title
      level={2}
      id="applicants-heading"
      className={showHeading ? 'm-0 text-section text-slate-900' : 'sr-only'}
    >
      Applicants
    </Typography.Title>
  );

  if (state.status === 'loading') {
    return (
      <section aria-labelledby="applicants-heading" className={showHeading ? 'mt-6' : undefined}>
        <Card styles={{ body: { padding: space[3] } }}>
          {heading}
          <div className="mt-4">
            <RowsSkeleton rows={5} label="Loading applicants…" />
          </div>
        </Card>
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section aria-labelledby="applicants-heading" className={showHeading ? 'mt-6' : undefined}>
        <Card styles={{ body: { padding: space[3] } }}>
          {heading}
          {state.noAccess ? (
            <EmptyState icon={TeamOutlined} title="Applicants aren't shown to you" description={state.message} />
          ) : (
            <ErrorState
              title="We couldn't load the applicants"
              description={state.message}
              onRetry={retry}
            />
          )}
        </Card>
      </section>
    );
  }

  const { page } = state;
  // The polled figures run ahead of the list: they include arrivals not loaded yet.
  const shownCounts = counts ?? page.counts;

  const empty =
    page.counts.all === 0 ? (
      <EmptyState
        icon={TeamOutlined}
        title="No applicants yet"
        description={
          vacancyStatus === 'PUBLISHED'
            ? 'Applications appear here as candidates apply, ranked by their AI score.'
            : 'Publish this vacancy to start receiving applications.'
        }
      />
    ) : (
      <EmptyState
        icon={SearchOutlined}
        title="No applicants match"
        description="Try another filter or search."
        action={
          <Button variant="secondary" onClick={() => update({ band: 'all', q: '' })}>
            Clear filters
          </Button>
        }
      />
    );

  return (
    <section aria-labelledby="applicants-heading" className={showHeading ? 'mt-6' : undefined}>
      <Flex vertical gap={16}>
        <div>
          {heading}
          <Typography.Paragraph type="secondary" className="m-0 mt-1 text-small">
            Ranked by review status, then AI score. {thresholdsSentence(page.thresholds)}
            {page.blindMode && ' Blind mode is on: names and emails are hidden.'}
          </Typography.Paragraph>
        </div>

        <ApplicantStats counts={shownCounts} />

        <Card styles={{ body: { padding: space[3] } }}>
          <Flex vertical gap={16}>
            <ApplicantFilters
              band={query.band}
              onBandChange={(band: ApplicantBand) => update({ band })}
              counts={shownCounts}
              query={query.q}
              onQueryChange={onQueryChange}
              sort={query.sort}
              onSortChange={(sort: ApplicantSort) => update({ sort })}
              blindMode={page.blindMode}
            />

            {/* Announced politely: arrivals never move focus or the rows on screen. */}
            <div aria-live="polite">
              {newCount > 0 && (
                <Button variant="secondary" size="sm" onClick={showNew}>
                  <ArrowUpOutlined aria-hidden />
                  {newCount === 1 ? '1 new applicant' : `${newCount} new applicants`} — Show
                </Button>
              )}
            </div>

            <ApplicantsTable
              rows={page.content}
              thresholds={page.thresholds}
              total={page.totalElements}
              page={query.page}
              pageSize={query.size}
              onPageChange={(next) => update({ page: next })}
              loading={false}
              empty={empty}
              linkTo={linkTo ? (row) => linkTo(row, searchString) : undefined}
              onOpen={linkTo ? (row) => navigate(linkTo(row, searchString)) : undefined}
              selectedId={selectedId}
            />
          </Flex>
        </Card>
      </Flex>
      {renderDetail?.(page.content, showNew)}
    </section>
  );
}

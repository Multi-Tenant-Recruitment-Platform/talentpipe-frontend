import { Table } from 'antd';
import { Link } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import type { HTMLAttributes, ReactNode } from 'react';
import type { ApplicantRow, ApplicantThresholds } from '../../api/types';
import {
  REVIEW_STATUS,
  TONE_CLASS,
  scorePlaceholder,
  scoreTone,
  stageLabel,
} from '../../dashboard/applicants';
import { formatDate, formatRelativeTime } from '../../utils/format';

/** The AI matching score as a badge, "88 / 100", tinted by which threshold it reached. */
export function ScoreBadge({
  row,
  thresholds,
}: Readonly<{ row: Pick<ApplicantRow, 'score' | 'scoreStatus' | 'reviewStatus'>; thresholds: ApplicantThresholds }>) {
  if (row.score === null) {
    return (
      <span className={`inline-flex rounded-pill px-2.5 py-0.5 text-caption font-medium ${TONE_CLASS.neutral}`}>
        {scorePlaceholder(row)}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex rounded-pill px-2.5 py-0.5 text-caption font-semibold tabular-nums ${TONE_CLASS[scoreTone(row.score, thresholds)]}`}
      aria-label={`AI score ${row.score} out of 100`}
    >
      {row.score} / 100
    </span>
  );
}

/** The review status as a tag: its word and its tint, never the tint alone. */
export function ReviewStatusTag({ status }: Readonly<{ status: ApplicantRow['reviewStatus'] }>) {
  const { label, tone } = REVIEW_STATUS[status];
  return (
    <span className={`inline-flex whitespace-nowrap rounded-pill px-2.5 py-0.5 text-caption font-medium ${TONE_CLASS[tone]}`}>
      {label}
    </span>
  );
}

/**
 * A vacancy's applicants, one page, in the server's order.
 *
 * <p>The order is the server's — advanced, then manual review, then pending,
 * then rejected, highest score first within each — so paging and the counts
 * agree; the table never re-sorts. Responsive by hiding the stage column on
 * narrow screens rather than rendering a second card list (see
 * `TeamRosterTable` for why), with the stage echoed under the name there.</p>
 */
export function ApplicantsTable({
  rows,
  thresholds,
  total,
  page,
  pageSize,
  onPageChange,
  loading,
  empty,
  linkTo,
  onOpen,
  selectedId,
}: Readonly<{
  rows: ApplicantRow[];
  thresholds: ApplicantThresholds;
  total: number;
  /** 0-based. */
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loading: boolean;
  empty: ReactNode;
  /** Where a candidate's name links to — their application. Absent: names are plain text. */
  linkTo?: (row: ApplicantRow) => string;
  /** A click anywhere on the row opens it too; the name's link is what keyboards reach. */
  onOpen?: (row: ApplicantRow) => void;
  /** The application whose panel is open, highlighted in the list. */
  selectedId?: string;
}>) {
  const columns: ColumnsType<ApplicantRow> = [
    {
      key: 'rank',
      title: <span className="sr-only">Rank</span>,
      width: 56,
      render: (_, _row, index) => (
        <span className="tabular-nums text-slate-500">{page * pageSize + index + 1}</span>
      ),
    },
    {
      key: 'candidate',
      title: 'Candidate',
      render: (_, row) => (
        <div className="min-w-0">
          {linkTo ? (
            <Link
              to={linkTo(row)}
              aria-current={row.applicationId === selectedId ? 'true' : undefined}
              className="block truncate font-semibold text-slate-800 no-underline hover:text-primary-700"
              // The row's own click would open it a second time.
              onClick={(e) => e.stopPropagation()}
            >
              {row.candidateName}
            </Link>
          ) : (
            <span className="block truncate font-semibold text-slate-800">{row.candidateName}</span>
          )}
          {/* The stage column is hidden on narrow screens; it is echoed here instead. */}
          <span className="block truncate text-caption text-slate-500 md:hidden">{stageLabel(row)}</span>
        </div>
      ),
    },
    {
      key: 'applied',
      title: 'Applied',
      render: (_, row) => (
        <time dateTime={row.appliedAt} title={formatDate(row.appliedAt)} className="whitespace-nowrap text-slate-600">
          {formatRelativeTime(row.appliedAt)}
        </time>
      ),
    },
    {
      key: 'score',
      title: 'AI score',
      render: (_, row) => <ScoreBadge row={row} thresholds={thresholds} />,
    },
    {
      key: 'stage',
      title: 'Current stage',
      className: 'hidden md:table-cell',
      render: (_, row) => <span className="whitespace-nowrap text-slate-600">{stageLabel(row)}</span>,
    },
    {
      key: 'review',
      title: 'Review status',
      render: (_, row) => <ReviewStatusTag status={row.reviewStatus} />,
    },
  ];

  return (
    <Table<ApplicantRow>
      rowKey="applicationId"
      columns={columns}
      dataSource={rows}
      loading={loading}
      scroll={{ x: 'max-content' }}
      locale={{ emptyText: empty }}
      rowClassName={(row) =>
        [onOpen ? 'cursor-pointer' : '', row.applicationId === selectedId ? 'tp-applicant-row-selected' : '']
          .filter(Boolean)
          .join(' ')
      }
      onRow={(row) =>
        ({
          'data-testid': 'applicant-row',
          onClick: onOpen ? () => onOpen(row) : undefined,
        }) as HTMLAttributes<HTMLTableRowElement>
      }
      pagination={
        total > pageSize
          ? {
              current: page + 1,
              pageSize,
              total,
              showSizeChanger: false,
              onChange: (next) => onPageChange(next - 1),
              showTotal: (all, [from, to]) => `${from}–${to} of ${all}`,
            }
          : false
      }
    />
  );
}

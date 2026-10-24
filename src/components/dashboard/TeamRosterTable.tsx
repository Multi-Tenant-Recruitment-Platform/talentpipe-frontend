import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  SendOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { Flex, Skeleton, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { HTMLAttributes, ReactNode, TdHTMLAttributes } from 'react';
import type { RosterRow, SortKey, SortState } from '../../dashboard/teamRoster';
import { formatDate, formatRelativeTime } from '../../utils/format';
import { Button } from '../ui/Button';
import { Avatar } from './Avatar';
import { MemberStatusBadge } from './MemberStatusBadge';
import { RoleBadge } from './RoleBadge';

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

/** Sentinel rows standing in for real ones while the first load runs. */
const SKELETON_ROWS = [0, 1, 2, 3, 4].map((n) => ({ id: `skeleton-${n}` }) as RosterRow);

/**
 * `data-*` keys are not part of React's cell-attribute type, so antd's `onCell`
 * rejects them in an object literal. This widens the return type instead of
 * reaching for `any`.
 */
type CellAttrs = TdHTMLAttributes<HTMLElement> & Record<`data-${string}`, string>;
const cellTestId = (id: string) => (): CellAttrs => ({ 'data-testid': id });

/**
 * antd renders no `<caption>`, and the table needs one: it is the only thing
 * that tells a screen-reader user what the grid they just entered contains.
 */
function TableWithCaption(props: HTMLAttributes<HTMLTableElement>) {
  const { children, ...rest } = props;
  return (
    <table {...rest}>
      <caption className="sr-only">Team members and pending invitations</caption>
      {children}
    </table>
  );
}

/**
 * Hides the placeholder rows as a group. `aria-hidden` belongs here rather than
 * on each `<tr>` — a row can be focusable, and hiding a focusable element from
 * assistive tech is invalid.
 */
function HiddenTbody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} aria-hidden="true" />;
}

const COMPONENTS = { table: TableWithCaption };
const COMPONENTS_LOADING = { table: TableWithCaption, body: { wrapper: HiddenTbody } };

/**
 * The unified roster: every member and every pending invitation in one table.
 *
 * <p>Responsive by hiding columns rather than rendering a second card list.
 * A dual render would put both copies in the DOM — tests do not apply CSS, so
 * every `getByRole` in the suite would match twice — and `display: none`
 * already removes the hidden copy from the accessibility tree, so exactly one
 * copy of each fact is exposed at any viewport. antd's own `responsive` column
 * option cannot be used for this: it consults `matchMedia`, which under test
 * reports every query as unmatched, and the columns would vanish outright.</p>
 *
 * <p>Sorting is display-only here. The order, the status ranking and the search
 * all live in `dashboard/teamRoster.ts`; this table reports the current state
 * through `aria-sort` and hands clicks back. antd's built-in `sorter` would be
 * a second, divergent implementation of the same rules.</p>
 */
export function TeamRosterTable({
  rows,
  sort,
  onSortChange,
  canManage,
  busyId,
  busyAction,
  resentAt,
  onResend,
  onRevoke,
  canChangeRole = () => false,
  onChangeRole,
  firstLoad,
  refreshing,
  empty,
}: Readonly<{
  rows: RosterRow[];
  sort: SortState;
  onSortChange: (key: SortKey) => void;
  canManage: boolean;
  busyId: string | null;
  busyAction: 'resend' | 'revoke' | null;
  resentAt: (userId: string) => string | null;
  onResend: (row: RosterRow) => void;
  onRevoke: (row: RosterRow) => void;
  /** Whether this row's role may be changed from here; nothing offers it by default. */
  canChangeRole?: (row: RosterRow) => boolean;
  onChangeRole?: (row: RosterRow) => void;
  firstLoad: boolean;
  refreshing: boolean;
  empty: ReactNode;
}>) {
  const sortableTitle = (key: SortKey, label: string) => {
    const SortGlyph = sort.key === key && sort.dir === 'desc' ? ArrowDownOutlined : ArrowUpOutlined;
    return (
      <button
        type="button"
        onClick={() => onSortChange(key)}
        className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 uppercase tracking-[0.03em] text-inherit"
      >
        {label}
        <SortGlyph
          aria-hidden
          className={sort.key === key ? 'text-[12px] text-primary-600' : 'text-[12px] opacity-25'}
        />
        <span className="sr-only">Sort by {label.toLowerCase()}</span>
      </button>
    );
  };

  const headerSort = (key: SortKey) => () => ({
    'aria-sort': (sort.key === key ? ARIA_SORT[sort.dir] : 'none') as
      | 'ascending'
      | 'descending'
      | 'none',
  });

  const columns: ColumnsType<RosterRow> = [
    {
      key: 'name',
      title: sortableTitle('name', 'Member'),
      onHeaderCell: headerSort('name'),
      // Keeps the member name as the row's <th scope="row">, so every other
      // cell is announced against the person it belongs to.
      rowScope: 'row',
      render: (_, row) => {
        if (firstLoad) {
          return (
            <Flex align="center" gap={12}>
              <Skeleton.Avatar active size={32} />
              <Skeleton active title={{ width: 128 }} paragraph={false} />
            </Flex>
          );
        }
        const lastResend = resentAt(row.id);
        return (
          <Flex align="center" gap={12}>
            <Avatar firstName={row.firstName} lastName={row.lastName} size="sm" />
            <div className="min-w-0">
              <Flex wrap align="center" gap={8}>
                <Typography.Text strong>{row.fullName}</Typography.Text>
                {row.isSelf && (
                  <span className="rounded-pill bg-primary-50 px-2 py-px text-caption font-semibold uppercase tracking-[0.04em] text-primary-700">
                    You
                  </span>
                )}
              </Flex>
              <Typography.Text type="secondary" className="block text-caption">
                {row.email}
              </Typography.Text>
              {/* Echoes the columns hidden at this breakpoint. The wrapper
                  disappears exactly when they reappear, so nothing is ever
                  announced twice. */}
              {/* The member cell echoes whichever of Role/Joined is currently hidden, so the
                  fact is never missing and never announced twice. */}
              <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 lg:hidden">
                <span className="md:hidden">
                  <RoleBadge role={row.role} roleName={row.roleLabel} />
                </span>
                <Typography.Text type="secondary" className="text-caption">
                  Joined {formatDate(row.createdAt)}
                </Typography.Text>
              </span>
              {lastResend && (
                <Typography.Text type="secondary" className="block text-caption">
                  Re-sent {formatRelativeTime(lastResend)}
                </Typography.Text>
              )}
            </div>
          </Flex>
        );
      },
    },
    {
      key: 'role',
      title: sortableTitle('role', 'Role'),
      onHeaderCell: headerSort('role'),
      // --- Team roster responsive columns ---
      // Columns are hidden, never re-rendered as a second card list: a dual render
      // makes every getByRole query match twice in jsdom. antd's `responsive` column
      // option is not usable here — it reads matchMedia, which the test environment
      // stubs to `matches: false`, which would delete these columns outright.
      className: 'hidden md:table-cell',
      onCell: cellTestId('role-cell'),
      render: (_, row) =>
        firstLoad ? <Skeleton.Button active size="small" /> : <RoleBadge role={row.role} roleName={row.roleLabel} />,
    },
    {
      key: 'status',
      title: sortableTitle('status', 'Status'),
      onHeaderCell: headerSort('status'),
      onCell: cellTestId('status-cell'),
      render: (_, row) =>
        firstLoad ? <Skeleton.Button active size="small" /> : <MemberStatusBadge status={row.status} />,
    },
    {
      key: 'joined',
      title: sortableTitle('joined', 'Joined'),
      onHeaderCell: headerSort('joined'),
      className: 'hidden lg:table-cell',
      render: (_, row) =>
        firstLoad ? (
          <Skeleton active title={{ width: 80 }} paragraph={false} />
        ) : (
          <Typography.Text type="secondary">{formatDate(row.createdAt)}</Typography.Text>
        ),
    },
    {
      key: 'actions',
      title: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (_, row) => {
        if (firstLoad) {
          return null;
        }
        const busy = busyId === row.id;
        const resendLabel = resentAt(row.id) ? 'Resend again' : 'Resend';
        const invitation = canManage && (row.canResend || row.canRevoke);
        const changeRole = Boolean(onChangeRole) && canChangeRole(row);
        if (!invitation && !changeRole) {
          // Deliberately not a disabled button: removing an active member has
          // no API yet, and a role change is offered only where it can happen,
          // so a greyed-out control would promise something that cannot.
          return (
            <span aria-hidden="true" className="opacity-35">
              —
            </span>
          );
        }
        return (
          <Flex align="center" justify="flex-end" gap={8}>
            {changeRole && (
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => onChangeRole?.(row)}
                icon={<SwapOutlined aria-hidden className="text-[14px]" />}
                aria-label={`Change role for ${row.fullName}`}
              >
                Change role
              </Button>
            )}
            {invitation && row.canResend && (
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => onResend(row)}
                icon={<SendOutlined aria-hidden className="text-[14px]" />}
              >
                {busy && busyAction === 'resend' ? 'Resending…' : resendLabel}
              </Button>
            )}
            {invitation && row.canRevoke && (
              <Button
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={() => onRevoke(row)}
                icon={<DeleteOutlined aria-hidden className="text-[14px]" />}
              >
                {busy && busyAction === 'revoke' ? 'Revoking…' : 'Revoke'}
              </Button>
            )}
          </Flex>
        );
      },
    },
  ];

  return (
    <div className="relative">
      {/* Background refresh: rows stay put and a thin bar carries the signal,
          so an invite or revoke never blinks the whole table into skeletons. */}
      {refreshing && <div aria-hidden="true" className="tp-refresh-bar" />}
      {firstLoad && <output className="sr-only">Loading your team…</output>}

      <Table<RosterRow>
        rowKey="id"
        columns={columns}
        dataSource={firstLoad ? SKELETON_ROWS : rows}
        components={firstLoad ? COMPONENTS_LOADING : COMPONENTS}
        // The roster is never paged: the toolbar reports "Showing X of Y" over
        // the whole filtered set, and the selection logic holds no page state.
        pagination={false}
        // `x` only — a vertical scroll would split the header into its own
        // table element, and the header is where aria-sort lives.
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: empty }}
        onRow={(row) =>
          firstLoad
            ? ({ 'data-testid': 'roster-skeleton' } as HTMLAttributes<HTMLTableRowElement>)
            : ({
                'data-testid': 'roster-row',
                'aria-busy': busyId === row.id || undefined,
                style: {
                  opacity: busyId === row.id ? 0.6 : undefined,
                  background: row.isSelf ? '#eef2ff80' : undefined,
                },
              } as HTMLAttributes<HTMLTableRowElement>)
        }
      />
    </div>
  );
}

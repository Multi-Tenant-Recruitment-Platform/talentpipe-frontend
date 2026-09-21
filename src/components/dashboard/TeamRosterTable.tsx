import { Flex, Skeleton, Table, Typography, theme } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { HTMLAttributes, ReactNode, TdHTMLAttributes } from 'react';
import type { RosterRow, SortKey, SortState } from '../../dashboard/teamRoster';
import { formatDate, formatRelativeTime } from '../../utils/format';
import { Button } from '../ui/Button';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
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
  firstLoad: boolean;
  refreshing: boolean;
  empty: ReactNode;
}>) {
  const { token } = theme.useToken();

  const sortableTitle = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => onSortChange(key)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        border: 0,
        padding: 0,
        background: 'transparent',
        font: 'inherit',
        color: 'inherit',
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        cursor: 'pointer',
      }}
    >
      {label}
      {/* No chevron exists in the icon set; a rotated arrow-left is the
          established stand-in elsewhere in the dashboard. */}
      <Icon
        name="arrow-left"
        size={12}
        style={{
          transform: sort.key === key && sort.dir === 'desc' ? 'rotate(-90deg)' : 'rotate(90deg)',
          opacity: sort.key === key ? 1 : 0.25,
          color: sort.key === key ? token.colorPrimary : undefined,
        }}
      />
      <span className="sr-only">Sort by {label.toLowerCase()}</span>
    </button>
  );

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
            <div style={{ minWidth: 0 }}>
              <Flex wrap align="center" gap={8}>
                <Typography.Text strong>{row.fullName}</Typography.Text>
                {row.isSelf && (
                  <span
                    style={{
                      borderRadius: 999,
                      background: '#e0e7ff',
                      color: '#4338ca',
                      padding: '1px 8px',
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    You
                  </span>
                )}
              </Flex>
              <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                {row.email}
              </Typography.Text>
              {/* Echoes the columns hidden at this breakpoint. The wrapper
                  disappears exactly when they reappear, so nothing is ever
                  announced twice. */}
              <span className="tp-row-echo">
                <span className="tp-row-echo-role">
                  <RoleBadge role={row.role} />
                </span>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Joined {formatDate(row.createdAt)}
                </Typography.Text>
              </span>
              {lastResend && (
                <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
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
      className: 'tp-col-md',
      onCell: cellTestId('role-cell'),
      render: (_, row) =>
        firstLoad ? <Skeleton.Button active size="small" /> : <RoleBadge role={row.role} />,
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
      className: 'tp-col-lg',
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
        if (!canManage || (!row.canResend && !row.canRevoke)) {
          // Deliberately not a disabled button: there is no API to change a
          // role or remove an active member, so offering one would promise
          // something the product cannot do.
          return (
            <span aria-hidden="true" style={{ opacity: 0.35 }}>
              —
            </span>
          );
        }
        return (
          <Flex align="center" justify="flex-end" gap={8}>
            {row.canResend && (
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => onResend(row)}>
                <Icon name="send" size={14} />
                {busy && busyAction === 'resend' ? 'Resending…' : resendLabel}
              </Button>
            )}
            {row.canRevoke && (
              <Button size="sm" variant="danger" disabled={busy} onClick={() => onRevoke(row)}>
                <Icon name="trash" size={14} />
                {busy && busyAction === 'revoke' ? 'Revoking…' : 'Revoke'}
              </Button>
            )}
          </Flex>
        );
      },
    },
  ];

  return (
    <div style={{ position: 'relative' }}>
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

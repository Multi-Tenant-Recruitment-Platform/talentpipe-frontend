import type { ReactNode } from 'react';
import type { RosterRow, SortKey, SortState } from '../../dashboard/teamRoster';
import { formatDate, formatRelativeTime } from '../../utils/format';
import { Button } from '../ui/Button';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { MemberStatusBadge } from './MemberStatusBadge';
import { RoleBadge } from './RoleBadge';

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: 'name', label: 'Member' },
  { key: 'role', label: 'Role', className: 'hidden md:table-cell' },
  { key: 'status', label: 'Status' },
  { key: 'joined', label: 'Joined', className: 'hidden lg:table-cell' },
];

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

/**
 * The unified roster: every member and every pending invitation in one table.
 *
 * <p>Responsive by hiding columns rather than rendering a second card list.
 * A dual render would put both copies in the DOM — jsdom does not apply
 * Tailwind, so every `getByRole` in the test suite would match twice — and
 * `display: none` already removes the hidden copy from the accessibility tree,
 * so exactly one copy of each fact is exposed at any viewport.</p>
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
}: {
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
}) {
  const showEmpty = !firstLoad && rows.length === 0;

  return (
    <div className="relative">
      {/* Background refresh: rows stay put and a thin bar carries the signal,
          so an invite or revoke never blinks the whole table into skeletons. */}
      {refreshing && (
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-indigo-500" />
      )}
      {firstLoad && (
        <p role="status" className="sr-only">
          Loading your team…
        </p>
      )}

      <table className="min-w-full divide-y divide-slate-100 text-left">
        <caption className="sr-only">Team members and pending invitations</caption>
        <thead className="bg-slate-50/70">
          <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {COLUMNS.map(({ key, label, className }) => {
              const active = sort.key === key;
              return (
                <th
                  key={key}
                  scope="col"
                  className={`px-6 py-3.5 ${className ?? ''}`}
                  aria-sort={active ? ARIA_SORT[sort.dir] : 'none'}
                >
                  <button
                    type="button"
                    onClick={() => onSortChange(key)}
                    className="group inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    {label}
                    {/* No chevron exists in the icon set; a rotated arrow-left
                        is the established stand-in elsewhere in the dashboard. */}
                    <Icon
                      name="arrow-left"
                      className={`h-3 w-3 transition ${
                        active
                          ? `text-indigo-600 ${sort.dir === 'asc' ? 'rotate-90' : '-rotate-90'}`
                          : 'rotate-90 opacity-0 group-hover:opacity-40'
                      }`}
                    />
                    <span className="sr-only">Sort by {label.toLowerCase()}</span>
                  </button>
                </th>
              );
            })}
            <th scope="col" className="px-6 py-3.5 text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100" aria-busy={refreshing || undefined}>
          {firstLoad &&
            [0, 1, 2, 3, 4].map((row) => (
              <tr key={`skeleton-${row}`} aria-hidden="true" data-testid="roster-skeleton">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-200" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-32 animate-pulse rounded bg-slate-200" />
                      <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
                    </div>
                  </div>
                </td>
                <td className="hidden px-6 py-4 md:table-cell">
                  <div className="h-5 w-24 animate-pulse rounded-full bg-slate-100" />
                </td>
                <td className="px-6 py-4">
                  <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
                </td>
                <td className="hidden px-6 py-4 lg:table-cell">
                  <div className="h-3.5 w-20 animate-pulse rounded bg-slate-100" />
                </td>
                <td className="px-6 py-4" />
              </tr>
            ))}

          {showEmpty && (
            <tr>
              <td colSpan={5}>{empty}</td>
            </tr>
          )}

          {!firstLoad &&
            rows.map((row) => {
              const busy = busyId === row.id;
              const lastResend = resentAt(row.id);
              return (
                <tr
                  key={row.id}
                  data-testid="roster-row"
                  aria-busy={busy || undefined}
                  className={`transition-colors ${busy ? 'opacity-60' : ''} ${
                    row.isSelf ? 'bg-indigo-50/40' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <th scope="row" className="px-6 py-4 font-normal">
                    <div className="flex items-center gap-3">
                      <Avatar firstName={row.firstName} lastName={row.lastName} size="sm" />
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                          {row.fullName}
                          {row.isSelf && (
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                              You
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-slate-500">{row.email}</p>
                        {/* Echoes the columns hidden at this breakpoint. The
                            wrapper disappears exactly when they reappear, so
                            nothing is ever announced twice. */}
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 lg:hidden">
                          <span className="md:hidden">
                            <RoleBadge role={row.role} />
                          </span>
                          <span className="text-xs text-slate-500">
                            Joined {formatDate(row.createdAt)}
                          </span>
                        </p>
                        {lastResend && (
                          <p className="mt-1 text-xs text-slate-400">
                            Re-sent {formatRelativeTime(lastResend)}
                          </p>
                        )}
                      </div>
                    </div>
                  </th>

                  <td className="hidden px-6 py-4 md:table-cell" data-testid="role-cell">
                    <RoleBadge role={row.role} />
                  </td>
                  <td className="px-6 py-4" data-testid="status-cell">
                    <MemberStatusBadge status={row.status} />
                  </td>
                  <td className="hidden px-6 py-4 text-sm text-slate-500 lg:table-cell">
                    {formatDate(row.createdAt)}
                  </td>

                  <td className="px-6 py-4">
                    {canManage && (row.canResend || row.canRevoke) ? (
                      <div className="flex items-center justify-end gap-2">
                        {row.canResend && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busy}
                            onClick={() => onResend(row)}
                          >
                            <Icon name="send" className="h-3.5 w-3.5" />
                            {busy && busyAction === 'resend'
                              ? 'Resending…'
                              : lastResend
                                ? 'Resend again'
                                : 'Resend'}
                          </Button>
                        )}
                        {row.canRevoke && (
                          <Button size="sm" variant="danger" disabled={busy} onClick={() => onRevoke(row)}>
                            <Icon name="trash" className="h-3.5 w-3.5" />
                            {busy && busyAction === 'revoke' ? 'Revoking…' : 'Revoke'}
                          </Button>
                        )}
                      </div>
                    ) : (
                      // Deliberately not a disabled button: there is no API to
                      // change a role or remove an active member, so offering
                      // one would promise something the product cannot do.
                      <span aria-hidden="true" className="block text-right text-sm text-slate-300">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

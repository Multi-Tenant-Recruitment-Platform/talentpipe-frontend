import { useDeferredValue, useMemo, useState } from 'react';
import type { UserResponse } from '../api/types';
import type { BadgeTone } from '../components/dashboard/Badge';
import { formatRole } from '../utils/format';

/**
 * Derivation layer for the team roster.
 *
 * <p>`GET /team` returns a flat, unfiltered array with no query support, so
 * every bit of searching, filtering and sorting is done here. Kept pure and
 * DOM-free so the rules that decide whether a person is visible — the part
 * that was previously wrong — can be tested directly.</p>
 */

export type Segment = 'all' | 'active' | 'pending';
export type SortKey = 'name' | 'role' | 'status' | 'joined';
export interface SortState {
  key: SortKey;
  dir: 'asc' | 'desc';
}

export interface StatusMeta {
  label: string;
  tone: BadgeTone;
  /** Which segment tab this status belongs to. */
  segment: Segment | 'other';
  /** Explains why a row offers no actions; rendered as help text on the badge. */
  hint?: string;
}

/**
 * Every status the backend's UserStatus enum can produce.
 *
 * <p>The previous page recognised only ACTIVE and INVITED and dropped the rest,
 * so a disabled or unverified colleague silently vanished from the admin's
 * view. Anything not listed here still renders — see {@link statusMeta}.</p>
 */
export const MEMBER_STATUS_META: Record<string, StatusMeta> = {
  ACTIVE: { label: 'Active', tone: 'emerald', segment: 'active' },
  INVITED: {
    label: 'Invited',
    tone: 'amber',
    segment: 'pending',
    hint: 'Invitation link expires 7 days after it was sent.',
  },
  PENDING_VERIFICATION: {
    label: 'Unverified',
    tone: 'sky',
    segment: 'other',
    hint: 'Signed up but has not confirmed their email yet, so they cannot sign in.',
  },
  DISABLED: {
    label: 'Disabled',
    tone: 'slate',
    segment: 'other',
    hint: 'This account cannot sign in. Re-enabling is not available yet.',
  },
};

/** Falls back to a readable label so a future status is never invisible. */
export function statusMeta(status: string): StatusMeta {
  return (
    MEMBER_STATUS_META[status] ?? {
      label: formatRole(status), // title-cases an unknown SCREAMING_CASE value
      tone: 'slate',
      segment: 'other',
    }
  );
}

/** Status sort order. Alphabetical would put Active before Invited, which is meaningless. */
const STATUS_RANK = ['INVITED', 'PENDING_VERIFICATION', 'ACTIVE', 'DISABLED'];

export interface RosterRow {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: string;
  roleLabel: string;
  status: string;
  statusLabel: string;
  statusTone: BadgeTone;
  statusHint?: string;
  createdAt: string;
  segment: Segment | 'other';
  /** The signed-in admin's own row. */
  isSelf: boolean;
  /** Both actions exist only for INVITED rows — anything else is a guaranteed 404. */
  canResend: boolean;
  canRevoke: boolean;
  /** Precomputed lowercase haystack, so typing does not re-derive it per keystroke. */
  search: string;
}

export function toRosterRows(members: UserResponse[], selfId: string | undefined): RosterRow[] {
  return members.map((member) => {
    const meta = statusMeta(member.status);
    const fullName = `${member.firstName} ${member.lastName}`.trim();
    const roleLabel = formatRole(member.role);
    const isInvited = member.status === 'INVITED';

    return {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      fullName,
      email: member.email,
      role: member.role,
      roleLabel,
      status: member.status,
      statusLabel: meta.label,
      statusTone: meta.tone,
      statusHint: meta.hint,
      createdAt: member.createdAt,
      segment: meta.segment,
      isSelf: Boolean(selfId) && member.id === selfId,
      canResend: isInvited,
      canRevoke: isInvited,
      // Formatted role included so "hr manager" finds an HR_MANAGER row.
      search: `${fullName} ${member.email} ${roleLabel} ${meta.label}`.toLowerCase(),
    };
  });
}

export interface RosterQuery {
  segment: Segment;
  roleFilter: string;
  query: string;
  sort: SortState;
}

export interface RosterSelection {
  visible: RosterRow[];
  /** Counts after search + role filter, before the segment filter. */
  segmentCounts: Record<Segment, number>;
  /** Rows in neither Active nor Pending — disabled or unverified. */
  otherCount: number;
  roleOptions: string[];
}

function compare(a: RosterRow, b: RosterRow, key: SortKey): number {
  switch (key) {
    case 'name':
      return a.fullName.localeCompare(b.fullName);
    case 'role':
      return a.roleLabel.localeCompare(b.roleLabel);
    case 'status':
      return STATUS_RANK.indexOf(a.status) - STATUS_RANK.indexOf(b.status);
    case 'joined':
      // Compare the ISO timestamps, never the formatted strings — "Feb" sorts
      // before "Jan" lexically.
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  }
}

export function selectRoster(rows: RosterRow[], q: RosterQuery): RosterSelection {
  const needle = q.query.trim().toLowerCase();

  const matched = rows.filter(
    (row) =>
      (q.roleFilter === 'ALL' || row.role === q.roleFilter) &&
      (needle === '' || row.search.includes(needle)),
  );

  // Counted before the segment filter so "Pending 2" says what clicking it shows.
  const segmentCounts: Record<Segment, number> = {
    all: matched.length,
    active: matched.filter((row) => row.segment === 'active').length,
    pending: matched.filter((row) => row.segment === 'pending').length,
  };

  // 'all' applies NO status predicate. That is the guarantee that nobody
  // disappears, whatever status the backend invents next.
  const visible =
    q.segment === 'all' ? matched : matched.filter((row) => row.segment === q.segment);

  const sorted = [...visible].sort((a, b) => {
    const primary = compare(a, b, q.sort.key);
    if (primary !== 0) {
      return q.sort.dir === 'asc' ? primary : -primary;
    }
    // Stable tiebreak: a freshly seeded tenant can share a createdAt second.
    return a.fullName.localeCompare(b.fullName) || a.id.localeCompare(b.id);
  });

  return {
    visible: sorted,
    segmentCounts,
    otherCount: matched.filter((row) => row.segment === 'other').length,
    // Derived, never hardcoded: an unexpected role stays filterable.
    // Sorted with localeCompare rather than a bare .sort(): the default
    // comparator comes from UTF-16 code units, which is not alphabetical
    // order for anything outside plain ASCII — the same reason the tiebreak
    // above uses it.
    roleOptions: Array.from(new Set(rows.map((row) => row.role))).sort((a, b) =>
      a.localeCompare(b),
    ),
  };
}

const DEFAULT_SORT: SortState = { key: 'joined', dir: 'asc' };

/** Owns the filter state and the memoised selection for one roster view. */
export function useTeamRoster(members: UserResponse[], selfId: string | undefined) {
  const [segment, setSegment] = useState<Segment>('all');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);

  const rows = useMemo(() => toRosterRows(members, selfId), [members, selfId]);

  // Keeps typing responsive without a timer — React yields the stale result
  // while the filtered list recomputes.
  const deferredQuery = useDeferredValue(query);

  const selection = useMemo(
    () => selectRoster(rows, { segment, roleFilter, query: deferredQuery, sort }),
    [rows, segment, roleFilter, deferredQuery, sort],
  );

  /** Re-clicking the active column flips direction; a new column starts ascending. */
  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    );
  }

  function clearFilters() {
    setSegment('all');
    setRoleFilter('ALL');
    setQuery('');
  }

  const filtersActive = segment !== 'all' || roleFilter !== 'ALL' || query.trim() !== '';

  return {
    rows,
    ...selection,
    segment,
    setSegment,
    roleFilter,
    setRoleFilter,
    query,
    setQuery,
    sort,
    toggleSort,
    clearFilters,
    filtersActive,
  };
}

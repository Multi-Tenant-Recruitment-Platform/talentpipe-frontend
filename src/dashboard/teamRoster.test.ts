import { describe, expect, it } from 'vitest';
import type { UserResponse } from '../api/types';
import { selectRoster, statusMeta, toRosterRows, type SortState } from './teamRoster';

function member(overrides: Partial<UserResponse> = {}): UserResponse {
  return {
    id: 'u-1',
    tenantId: 't-1',
    tenantName: 'Acme',
    role: 'HR_MANAGER',
    email: 'someone@acme.test',
    firstName: 'Ada',
    lastName: 'Lovelace',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const SELF = member({ id: 'u-1', firstName: 'Ada', lastName: 'Lovelace', role: 'COMPANY_ADMIN' });
const ACTIVE = member({ id: 'u-2', firstName: 'Kasun', lastName: 'Silva', email: 'kasun@acme.test' });
const INVITED = member({
  id: 'u-3',
  firstName: 'Amaya',
  lastName: 'Rathnayake',
  email: 'amaya@acme.test',
  role: 'INTERVIEWER',
  status: 'INVITED',
});
const DISABLED = member({ id: 'u-4', firstName: 'Nimal', lastName: 'Perera', status: 'DISABLED' });
const UNVERIFIED = member({ id: 'u-5', firstName: 'Sithara', lastName: 'Fernando', status: 'PENDING_VERIFICATION' });

const ALL = [SELF, ACTIVE, INVITED, DISABLED, UNVERIFIED];
const SORT: SortState = { key: 'joined', dir: 'asc' };
const BASE = { segment: 'all' as const, roleFilter: 'ALL', query: '', sort: SORT };

const rowsOf = (members: UserResponse[] = ALL) => toRosterRows(members, 'u-1');

describe('toRosterRows', () => {
  it('marks only the signed-in admin as self', () => {
    const rows = rowsOf();
    expect(rows.filter((r) => r.isSelf).map((r) => r.id)).toEqual(['u-1']);
  });

  it('offers resend and revoke only for pending invitations', () => {
    // Firing either at anything else is a guaranteed 404 from the backend.
    const actionable = rowsOf().filter((r) => r.canResend || r.canRevoke);
    expect(actionable.map((r) => r.status)).toEqual(['INVITED']);
  });

  it('keeps an unknown future status visible with a readable label', () => {
    const [row] = toRosterRows([member({ status: 'ARCHIVED' })], 'u-1');
    expect(row.statusLabel).toBe('Archived');
    expect(row.segment).toBe('other');
    expect(row.canResend).toBe(false);
  });
});

describe('statusMeta', () => {
  it('covers every status the backend enum can produce', () => {
    expect(statusMeta('ACTIVE').label).toBe('Active');
    expect(statusMeta('INVITED').label).toBe('Invited');
    expect(statusMeta('PENDING_VERIFICATION').label).toBe('Unverified');
    expect(statusMeta('DISABLED').label).toBe('Disabled');
  });
});

describe('segments', () => {
  it('shows every status under "all" — nobody may disappear', () => {
    // The defect this whole layer exists to prevent: disabled and unverified
    // accounts used to be filtered out of every view.
    const visible = selectRoster(rowsOf(), BASE).visible;
    expect(visible).toHaveLength(5);
    expect(visible.map((r) => r.status)).toContain('DISABLED');
    expect(visible.map((r) => r.status)).toContain('PENDING_VERIFICATION');
  });

  it('excludes disabled and unverified from active and pending, and counts them', () => {
    const active = selectRoster(rowsOf(), { ...BASE, segment: 'active' });
    expect(active.visible.map((r) => r.id)).toEqual(['u-1', 'u-2']);
    expect(active.otherCount).toBe(2);

    const pending = selectRoster(rowsOf(), { ...BASE, segment: 'pending' });
    expect(pending.visible.map((r) => r.id)).toEqual(['u-3']);
  });

  it('counts segments after search but before the segment filter', () => {
    // So "Pending 1" tells you what clicking Pending would actually show.
    const result = selectRoster(rowsOf(), { ...BASE, segment: 'active', query: 'a' });
    expect(result.segmentCounts.pending).toBe(
      selectRoster(rowsOf(), { ...BASE, segment: 'pending', query: 'a' }).visible.length,
    );
  });
});

describe('search and filter', () => {
  it.each([
    ['first name', 'kasun', ['u-2']],
    ['last name', 'rathnayake', ['u-3']],
    ['email fragment', 'amaya@', ['u-3']],
    ['formatted role', 'interviewer', ['u-3']],
    ['padded and mixed case', '  KASUN  ', ['u-2']],
  ])('matches on %s', (_label, query, expected) => {
    expect(selectRoster(rowsOf(), { ...BASE, query }).visible.map((r) => r.id)).toEqual(expected);
  });

  it('composes the role filter with a segment', () => {
    const result = selectRoster(rowsOf(), { ...BASE, segment: 'pending', roleFilter: 'INTERVIEWER' });
    expect(result.visible.map((r) => r.id)).toEqual(['u-3']);
  });

  it('derives role options from the data so an unexpected role stays filterable', () => {
    const rows = toRosterRows([...ALL, member({ id: 'u-9', role: 'SUPER_ADMIN' })], 'u-1');
    expect(selectRoster(rows, BASE).roleOptions).toContain('SUPER_ADMIN');
  });
});

describe('sorting', () => {
  it('does not mutate the input array', () => {
    const rows = rowsOf();
    const before = rows.map((r) => r.id);
    selectRoster(rows, { ...BASE, sort: { key: 'name', dir: 'desc' } });
    expect(rows.map((r) => r.id)).toEqual(before);
  });

  it('sorts by name in both directions', () => {
    const asc = selectRoster(rowsOf(), { ...BASE, sort: { key: 'name', dir: 'asc' } });
    const desc = selectRoster(rowsOf(), { ...BASE, sort: { key: 'name', dir: 'desc' } });
    expect(asc.visible[0].fullName).toBe('Ada Lovelace');
    expect(desc.visible.map((r) => r.id)).toEqual([...asc.visible].reverse().map((r) => r.id));
  });

  it('sorts joined by timestamp, not by the formatted label', () => {
    // "Feb" sorts before "Jan" lexically, so a display-string sort is wrong.
    const rows = toRosterRows(
      [
        member({ id: 'jan', createdAt: '2026-01-05T00:00:00Z' }),
        member({ id: 'feb', createdAt: '2026-02-01T00:00:00Z' }),
      ],
      'u-1',
    );
    const asc = selectRoster(rows, { ...BASE, sort: { key: 'joined', dir: 'asc' } });
    expect(asc.visible.map((r) => r.id)).toEqual(['jan', 'feb']);
  });

  it('sorts status by lifecycle rank, not alphabetically', () => {
    // Alphabetically Active < Disabled < Invited, which tells the admin nothing.
    const result = selectRoster(rowsOf(), { ...BASE, sort: { key: 'status', dir: 'asc' } });
    expect(result.visible[0].status).toBe('INVITED');
    expect(result.visible[result.visible.length - 1].status).toBe('DISABLED');
  });

  it('breaks createdAt ties deterministically by name', () => {
    const rows = toRosterRows(
      [
        member({ id: 'b', firstName: 'Zoe', lastName: 'Zimmer' }),
        member({ id: 'a', firstName: 'Alan', lastName: 'Turing' }),
      ],
      'u-1',
    );
    const ids = selectRoster(rows, BASE).visible.map((r) => r.id);
    expect(ids).toEqual(['a', 'b']);
  });
});

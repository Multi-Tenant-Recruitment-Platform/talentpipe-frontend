import { describe, expect, it } from 'vitest';
import { formatDate, formatRelativeTime, formatRole } from './format';

describe('formatDate', () => {
  it('renders a valid ISO timestamp', () => {
    expect(formatDate('2026-08-12T10:00:00Z')).toMatch(/2026/);
  });

  it.each([['empty', ''], ['malformed', 'nonsense'], ['null', null], ['undefined', undefined]])(
    'returns a dash for %s input rather than the words "Invalid Date"',
    (_label, value) => {
      // createdAt is typed `string` with no runtime guarantee, and
      // new Date('').toLocaleDateString() renders literally "Invalid Date".
      expect(formatDate(value)).toBe('—');
    },
  );
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-08-12T12:00:00Z');

  it.each([
    ['seconds ago', '2026-08-12T11:59:30Z', 'just now'],
    ['a future skew', '2026-08-12T12:00:30Z', 'just now'],
    ['one hour', '2026-08-12T11:00:00Z', '1 hour ago'],
    ['minutes', '2026-08-12T11:30:00Z', '30 minutes ago'],
    ['days', '2026-08-09T12:00:00Z', '3 days ago'],
  ])('formats %s', (_label, iso, expected) => {
    expect(formatRelativeTime(iso, now)).toBe(expected);
  });

  it('falls back to an absolute date beyond a month', () => {
    expect(formatRelativeTime('2026-01-01T12:00:00Z', now)).toMatch(/^on /);
  });

  it('guards invalid input', () => {
    expect(formatRelativeTime('nonsense', now)).toBe('—');
  });
});

describe('formatRole', () => {
  it('renders the known roles', () => {
    expect(formatRole('COMPANY_ADMIN')).toBe('Company Admin');
    expect(formatRole('HR_MANAGER')).toBe('HR Manager');
  });

  it('title-cases an unknown role', () => {
    expect(formatRole('REGIONAL_LEAD')).toBe('Regional Lead');
  });
});

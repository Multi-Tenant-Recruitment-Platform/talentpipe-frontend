/** Shared display formatting helpers. */

/** Shown wherever a value is missing or unparseable, instead of "Invalid Date". */
const EM_DASH = '—';

/** Parses an ISO timestamp, returning null rather than an Invalid Date. */
function parseIso(iso: string | null | undefined): Date | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Short, locale-aware date — e.g. "12 Aug 2026".
 *
 * <p>Guarded because `createdAt` is typed `string` with no runtime guarantee:
 * `new Date('').toLocaleDateString()` renders the literal text "Invalid Date"
 * straight into the table.</p>
 */
export function formatDate(iso: string | null | undefined): string {
  const date = parseIso(iso);
  return date
    ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : EM_DASH;
}

/**
 * Coarse relative time — "just now", "2 hours ago", "3 days ago".
 *
 * <p>Deliberately coarse: it labels an event that already happened, so it is
 * rendered once and never ticks. Nothing here needs a timer.</p>
 */
export function formatRelativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  const date = parseIso(iso);
  if (!date) {
    return EM_DASH;
  }

  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  // A clock skew between devices can put a past event slightly in the future;
  // "in -3 seconds" would be nonsense, so clamp to the present.
  if (seconds < 60) {
    return 'just now';
  }

  const units: [limit: number, per: number, name: string][] = [
    [3600, 60, 'minute'],
    [86400, 3600, 'hour'],
    [2592000, 86400, 'day'],
  ];
  for (const [limit, per, name] of units) {
    if (seconds < limit) {
      const value = Math.floor(seconds / per);
      return `${value} ${name}${value === 1 ? '' : 's'} ago`;
    }
  }
  return `on ${formatDate(iso)}`;
}

/** COMPANY_ADMIN → "Company Admin", HR_MANAGER → "HR Manager", etc. */
export function formatRole(role: string): string {
  switch (role) {
    case 'COMPANY_ADMIN':
      return 'Company Admin';
    case 'HR_MANAGER':
      return 'HR Manager';
    case 'INTERVIEWER':
      return 'Interviewer';
    case 'CANDIDATE':
      return 'Candidate';
    default:
      return role
        .toLowerCase()
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
  }
}

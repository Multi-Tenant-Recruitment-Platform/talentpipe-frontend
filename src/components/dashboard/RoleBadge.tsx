import { formatRole } from '../../utils/format';
import { Badge, type BadgeTone } from './Badge';

/**
 * Tone per role, ordered by authority: the primary brand tone for the admin,
 * violet for HR, sky for interviewers, neutral slate for candidates.
 */
export const ROLE_BADGE_TONE: Record<string, BadgeTone> = {
  COMPANY_ADMIN: 'indigo',
  HR_MANAGER: 'violet',
  INTERVIEWER: 'sky',
  CANDIDATE: 'slate',
};

/** The one place a role is rendered as a pill — sidebar, team table and 403. */
export function RoleBadge({ role }: { role: string }) {
  return <Badge tone={ROLE_BADGE_TONE[role] ?? 'slate'}>{formatRole(role)}</Badge>;
}

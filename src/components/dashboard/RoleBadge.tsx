import { formatRole } from '../../utils/format';
import { Badge, type BadgeTone } from './Badge';

/**
 * Only the role that can change the workspace carries the accent. The rest are
 * neutral: the label already says "HR Manager", and giving each role its own
 * hue would spend four colours restating four words — while implying a
 * ranking between HR and Interviewer that the product does not have.
 */
export const ROLE_BADGE_TONE: Record<string, BadgeTone> = {
  COMPANY_ADMIN: 'accent',
  HR_MANAGER: 'neutral',
  INTERVIEWER: 'neutral',
  CANDIDATE: 'neutral',
};

/** The one place a role is rendered as a pill — sidebar, team table and 403. */
export function RoleBadge({ role }: Readonly<{ role: string }>) {
  return <Badge tone={ROLE_BADGE_TONE[role] ?? 'neutral'}>{formatRole(role)}</Badge>;
}

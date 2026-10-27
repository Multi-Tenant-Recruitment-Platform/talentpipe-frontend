import { roleLabelFor } from '../../auth/permissions';
import { Badge, type BadgeTone } from './Badge';

/**
 * Only the role that can change the workspace carries the accent. The rest are
 * neutral: the label already says "HR Manager", and giving each role its own
 * hue would spend four colours restating four words — while implying a
 * ranking between HR and Interviewer that the product does not have.
 */
const ROLE_BADGE_TONE: Record<string, BadgeTone> = {
  COMPANY_ADMIN: 'accent',
  HR_MANAGER: 'neutral',
  INTERVIEWER: 'neutral',
  CANDIDATE: 'neutral',
};

/**
 * The one place a role is rendered as a pill — sidebar, team table and 403.
 *
 * <p>Labelled with the company's own name for the role when there is one
 * ("Hiring Coordinator"), and toned by the fixed role underneath it: the Owner
 * (COMPANY_ADMIN) keeps the accent, every other role is neutral, a custom one
 * included.</p>
 */
export function RoleBadge({ role, roleName }: Readonly<{ role: string; roleName?: string | null }>) {
  return <Badge tone={ROLE_BADGE_TONE[role] ?? 'neutral'}>{roleLabelFor({ role, roleName })}</Badge>;
}

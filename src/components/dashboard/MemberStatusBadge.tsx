import { statusMeta } from '../../dashboard/teamRoster';
import { Badge } from './Badge';

/**
 * The one place an account status is rendered as a pill — the counterpart to
 * {@link RoleBadge}.
 *
 * <p>The status is always conveyed as text, never by colour alone. Where a
 * status explains why a row offers no actions, that reason is attached as help
 * text rather than left for the admin to guess.</p>
 */
export function MemberStatusBadge({ status }: Readonly<{ status: string }>) {
  const meta = statusMeta(status);
  return (
    <span className="inline-flex" title={meta.hint}>
      <Badge tone={meta.tone}>{meta.label}</Badge>
      {meta.hint && <span className="sr-only"> — {meta.hint}</span>}
    </span>
  );
}

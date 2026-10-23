import { DeleteOutlined, EditOutlined, PlusOutlined, SwapOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { PermissionDefinition, PermissionGroup, RoleAuditAction, RoleAuditEvent } from '../../api/types';
import { diffPermissions, parseRoleSnapshot, permissionLabel } from '../../dashboard/roleEditor';
import type { IconComponent } from '../ui/icon';

const LOOK: Record<RoleAuditAction, { icon: IconComponent; tone: string }> = {
  ROLE_CREATED: { icon: PlusOutlined, tone: 'bg-success-bg text-success-text' },
  ROLE_UPDATED: { icon: EditOutlined, tone: 'bg-primary-50 text-primary-700' },
  ROLE_DELETED: { icon: DeleteOutlined, tone: 'bg-error-bg text-error-text' },
  MEMBER_ROLE_CHANGED: { icon: SwapOutlined, tone: 'bg-slate-100 text-slate-700' },
};

const strong = (text: ReactNode) => <strong className="font-semibold text-slate-900">{text}</strong>;

function Chips({ keys, kind, index }: Readonly<{ keys: string[]; kind: 'gained' | 'lost' | 'held'; index: ReadonlyMap<string, PermissionDefinition> }>) {
  if (keys.length === 0) {
    return null;
  }
  const tone = {
    gained: 'bg-success-bg text-success-text',
    lost: 'bg-error-bg text-error-text',
    held: 'bg-slate-100 text-slate-700',
  }[kind];
  const prefix = { gained: '+ ', lost: '− ', held: '' }[kind];
  const spoken = { gained: 'Added', lost: 'Removed', held: 'Granted' }[kind];
  return (
    <ul aria-label={spoken} className="m-0 flex list-none flex-wrap gap-1.5 p-0">
      {keys.map((key) => (
        <li key={key} className={`rounded-pill px-2.5 py-0.5 text-caption font-medium ${tone}`}>
          <span aria-hidden="true">{prefix}</span>
          {permissionLabel(key, index)}
        </li>
      ))}
    </ul>
  );
}

/**
 * One line of the access log, written as a sentence about people rather than
 * as a database row: "Nimal moved Amaya from Recruiter to Hiring Coordinator."
 *
 * <p>An edit shows what it changed — a rename, and the permissions added and
 * removed — worked out from the before and after the server records, so the
 * log answers "what did that change do?" without opening anything.</p>
 */
export function RoleActivityEntry({
  event,
  nameOf,
  roleExists,
  catalogue,
  index,
}: Readonly<{
  event: RoleAuditEvent;
  /** A member's display name ("You" for the signed-in member). */
  nameOf: (userId: string | null) => string;
  roleExists: (roleId: string | null) => boolean;
  catalogue: readonly PermissionGroup[];
  index: ReadonlyMap<string, PermissionDefinition>;
}>) {
  const { icon: Glyph, tone } = LOOK[event.action] ?? LOOK.ROLE_UPDATED;
  const actor = strong(nameOf(event.actorUserId));
  const roleName = event.roleName ?? 'a role';
  const role =
    event.roleId && roleExists(event.roleId) ? (
      <Link to={`/dashboard/team/roles/${event.roleId}`} className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-primary-500">
        {roleName}
      </Link>
    ) : (
      strong(roleName)
    );

  let sentence: ReactNode;
  let details: ReactNode = null;
  const before = parseRoleSnapshot(event.previousValue);
  const after = parseRoleSnapshot(event.newValue);

  switch (event.action) {
    case 'ROLE_CREATED':
      sentence = (
        <>
          {actor} created the role {role}
        </>
      );
      if (after) {
        details = after.permissions.length > 0 ? <Chips keys={after.permissions} kind="held" index={index} /> : (
          <p className="m-0 text-caption text-slate-500">With no permissions yet.</p>
        );
      }
      break;
    case 'ROLE_UPDATED': {
      sentence = (
        <>
          {actor} changed {role}
        </>
      );
      if (before && after) {
        const diff = diffPermissions(before.permissions, after.permissions, catalogue);
        details = (
          <div className="flex flex-col gap-2">
            {before.name !== after.name && (
              <p className="m-0 text-caption text-slate-600">
                Renamed from <span className="font-medium text-slate-800">{before.name}</span> to{' '}
                <span className="font-medium text-slate-800">{after.name}</span>
              </p>
            )}
            {(diff.gained.length > 0 || diff.lost.length > 0) && (
              <div className="flex flex-wrap gap-1.5">
                <Chips keys={diff.gained} kind="gained" index={index} />
                <Chips keys={diff.lost} kind="lost" index={index} />
              </div>
            )}
          </div>
        );
      }
      break;
    }
    case 'ROLE_DELETED':
      sentence = (
        <>
          {actor} deleted the role {strong(roleName)}
        </>
      );
      if (event.newValue && !after) {
        const moved = /^(\d+)/.exec(event.newValue)?.[1];
        details = (
          <p className="m-0 text-caption text-slate-500">
            {moved ? `${moved === '1' ? 'Its member was' : `Its ${moved} members were`} moved to another role.` : event.newValue}
          </p>
        );
      }
      break;
    case 'MEMBER_ROLE_CHANGED': {
      const target = strong(nameOf(event.targetUserId));
      sentence = event.previousValue ? (
        <>
          {actor} moved {target} from {strong(event.previousValue)} to {role}
        </>
      ) : (
        <>
          {actor} gave {target} the role {role}
        </>
      );
      break;
    }
    default:
      sentence = (
        <>
          {actor} changed {role}
        </>
      );
  }

  const at = new Date(event.occurredAt);
  const time = at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return (
    <li className="group relative flex gap-4 pb-6 last:pb-0">
      {/* The rail joining one entry to the next; the last one has none. */}
      <span aria-hidden="true" className="absolute start-4 top-9 bottom-0 w-px bg-slate-200 group-last:hidden" />
      <span className={`relative inline-flex size-8 shrink-0 items-center justify-center rounded-pill ${tone}`}>
        <Glyph aria-hidden className="text-[13px]" />
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="m-0 text-small text-slate-700">{sentence}</p>
          <Tooltip title={at.toLocaleString()}>
            <time dateTime={event.occurredAt} className="shrink-0 text-caption tabular-nums text-slate-500">
              {time}
            </time>
          </Tooltip>
        </div>
        {details && <div className="mt-2">{details}</div>}
      </div>
    </li>
  );
}

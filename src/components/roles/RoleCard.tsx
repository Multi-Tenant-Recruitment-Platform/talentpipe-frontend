import { CopyOutlined, CrownOutlined, DeleteOutlined, LockOutlined, SafetyCertificateOutlined, ToolOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { PermissionGroup, RoleResponse, UserResponse } from '../../api/types';
import { allPermissions } from '../../dashboard/roleEditor';
import { Avatar } from '../dashboard/Avatar';
import { Badge } from '../dashboard/Badge';
import { Button } from '../ui/Button';
import { PermissionCoverage } from './PermissionCoverage';

const STACK_MAX = 4;

/** The faces of the first few people who hold a role, then how many more. */
export function MemberStack({ members, total }: Readonly<{ members: UserResponse[]; total: number }>) {
  if (total === 0) {
    return <span className="text-caption text-slate-500">No one yet</span>;
  }
  const shown = members.slice(0, STACK_MAX);
  return (
    <span className="inline-flex items-center gap-2">
      {shown.length > 0 && (
        <span aria-hidden="true" className="flex -space-x-2">
          {shown.map((member) => (
            <Avatar
              key={member.id}
              firstName={member.firstName}
              lastName={member.lastName}
              size="sm"
              style={{ boxShadow: '0 0 0 2px var(--tp-surface)' }}
            />
          ))}
        </span>
      )}
      <span className="text-caption font-medium text-slate-600">
        {total === 1 ? '1 person' : `${total} people`}
      </span>
    </span>
  );
}

/** The mark beside a role's name: what kind of role it is, before the words say so. */
export function RoleMark({ role }: Readonly<{ role: RoleResponse }>) {
  if (role.locked) {
    return (
      <span className="tp-brand-mark size-10 shrink-0 rounded-xl">
        <CrownOutlined aria-hidden className="text-[18px]" />
      </span>
    );
  }
  const Glyph = role.systemRole ? SafetyCertificateOutlined : ToolOutlined;
  return (
    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
      <Glyph aria-hidden className="text-[18px]" />
    </span>
  );
}

/** "Default" for the three every workspace starts with, "Custom" for the company's own. */
export function RoleKindBadge({ role }: Readonly<{ role: RoleResponse }>) {
  if (role.locked) {
    return (
      <Badge tone="accent">
        <LockOutlined aria-hidden className="me-1 text-[11px]" />
        Full access
      </Badge>
    );
  }
  return <Badge>{role.systemRole ? 'Default' : 'Custom'}</Badge>;
}

/**
 * One role on the roles page: its name, what it is for, the shape of what it
 * may do, and who holds it.
 *
 * <p>The whole card opens the role, through a link on the name stretched over
 * the card — one link per card, so a screen reader's list of links is a list
 * of roles, and the Duplicate and Delete buttons sit above it as their own
 * targets rather than nested inside an anchor.</p>
 */
export function RoleCard({
  role,
  catalogue,
  members,
  canManage,
  busy,
  onDuplicate,
  onDelete,
}: Readonly<{
  role: RoleResponse;
  catalogue: readonly PermissionGroup[];
  /** The people on the team list who hold this role. */
  members: UserResponse[];
  canManage: boolean;
  busy: boolean;
  onDuplicate: (role: RoleResponse) => void;
  onDelete: (role: RoleResponse) => void;
}>) {
  const total = allPermissions(catalogue).length;
  const held = new Set(role.permissions);
  const count = role.locked ? total : role.permissions.length;

  return (
    <article
      aria-busy={busy || undefined}
      className={`group relative flex h-full flex-col rounded-2xl border border-slate-200 bg-surface p-5 shadow-xs transition-[border-color,box-shadow,transform] duration-(--tp-motion-base) ease-standard focus-within:shadow-focus hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md motion-reduce:hover:translate-y-0 ${
        busy ? 'opacity-60' : ''
      }`}
    >
      <header className="flex items-start gap-3">
        <RoleMark role={role} />
        <div className="min-w-0 flex-1">
          <h3 className="m-0 text-lead font-semibold tracking-heading text-slate-900">
            <Link
              to={`/dashboard/team/roles/${role.id}`}
              className="text-inherit no-underline after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none"
            >
              {role.name}
            </Link>
          </h3>
          <p className="m-0 mt-0.5 text-caption text-slate-500">
            {count === 1 ? '1 permission' : `${count} permissions`}
            {total > 0 && ` of ${total}`}
          </p>
        </div>
        <RoleKindBadge role={role} />
      </header>

      <p className="m-0 mt-3 line-clamp-2 min-h-10 text-small text-slate-600">
        {role.description ?? <span className="text-slate-400">No description yet.</span>}
      </p>

      {catalogue.length > 0 && (
        <div className="mt-4 rounded-xl bg-canvas px-3.5 py-3">
          <PermissionCoverage
            permissions={role.locked ? new Set(allPermissions(catalogue).map((p) => p.key)) : held}
            catalogue={catalogue}
            compact
          />
        </div>
      )}

      <footer className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <MemberStack members={members} total={role.memberCount} />
        {canManage && (
          // Above the stretched link, so these stay their own targets.
          <span className="relative z-1 ms-auto flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => onDuplicate(role)}
              icon={<CopyOutlined aria-hidden className="text-[14px]" />}
              aria-label={`Duplicate ${role.name}`}
            >
              Duplicate
            </Button>
            {role.deletable && (
              <Button
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={() => onDelete(role)}
                icon={<DeleteOutlined aria-hidden className="text-[14px]" />}
                aria-label={`Delete ${role.name}`}
              >
                Delete
              </Button>
            )}
          </span>
        )}
      </footer>
    </article>
  );
}

import { ArrowRightOutlined, MinusOutlined, PlusOutlined, SwapOutlined } from '@ant-design/icons';
import { Flex, Modal, Select, Typography } from 'antd';
import { useMemo, useState } from 'react';
import type { PermissionGroup, RoleResponse } from '../../api/types';
import type { RosterRow } from '../../dashboard/teamRoster';
import { diffPermissions, permissionIndex, permissionLabel, type RoleChoice } from '../../dashboard/roleEditor';
import { Avatar } from '../dashboard/Avatar';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';

/** Every key, for the Owner role, whose list is "everything" whatever it says. */
function effective(role: RoleResponse | undefined, catalogue: readonly PermissionGroup[]): string[] {
  if (!role) {
    return [];
  }
  return role.locked ? catalogue.flatMap((group) => group.permissions.map((p) => p.key)) : role.permissions;
}

/**
 * Moving one member to another role.
 *
 * <p>A role change is a change of what someone can do, so before it is made
 * the dialog says exactly that: what they gain and what they lose, in the
 * permissions' own words. Picking the role they already have, or one the
 * signed-in member may not hand out, is not offered — the reason sits beside
 * the option rather than arriving as an error after the click.</p>
 */
export function ChangeRoleDialog({
  member,
  choices,
  catalogue,
  busy,
  error,
  onConfirm,
  onCancel,
}: Readonly<{
  member: RosterRow | null;
  choices: readonly RoleChoice[];
  catalogue: readonly PermissionGroup[];
  busy: boolean;
  error: string | null;
  onConfirm: (member: RosterRow, role: RoleResponse) => void;
  onCancel: () => void;
}>) {
  const [picked, setPicked] = useState<{ memberId: string; roleId: string } | null>(null);
  const index = useMemo(() => permissionIndex(catalogue), [catalogue]);

  if (!member) {
    return null;
  }

  const current = choices.find((choice) => choice.role.id === member.roleId)?.role;
  const targetId = picked?.memberId === member.id ? picked.roleId : undefined;
  const target = choices.find((choice) => choice.role.id === targetId)?.role;
  const diff = target ? diffPermissions(effective(current, catalogue), effective(target, catalogue), catalogue) : null;

  return (
    <Modal
      open
      onCancel={onCancel}
      width={540}
      footer={null}
      keyboard={!busy}
      mask={{ closable: !busy }}
      closable={{ disabled: busy, 'aria-label': 'Close' }}
      title={
        <Flex align="center" gap={12}>
          <span className="tp-brand-mark size-10 rounded-md">
            <SwapOutlined aria-hidden className="text-[18px]" />
          </span>
          <Typography.Title level={2} className="m-0 text-lead">
            Change role
          </Typography.Title>
        </Flex>
      }
    >
      <Flex vertical gap={18} className="pt-2">
        <div className="flex items-center gap-3 rounded-xl bg-canvas px-4 py-3">
          <Avatar firstName={member.firstName} lastName={member.lastName} size="md" />
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate font-semibold text-slate-900">{member.fullName}</p>
            <p className="m-0 truncate text-caption text-slate-500">{member.email}</p>
          </div>
          <span className="shrink-0 text-caption text-slate-500">
            Now <span className="font-semibold text-slate-700">{member.roleLabel}</span>
          </span>
        </div>

        {member.status === 'INVITED' && (
          <p className="m-0 text-small text-slate-600">
            They haven&apos;t accepted their invitation yet, so they will join with the role you choose.
          </p>
        )}

        {error && <Alert tone="error">{error}</Alert>}

        <div>
          <label htmlFor="change-role-target" className="mb-1.5 block font-medium">
            New role
          </label>
          <Select
            id="change-role-target"
            className="w-full"
            value={targetId}
            placeholder="Choose a role"
            disabled={busy}
            onChange={(value: string) => setPicked({ memberId: member.id, roleId: value })}
            options={choices.map(({ role, unavailable }) => {
              const isCurrent = role.id === member.roleId;
              return {
                value: role.id,
                title: role.name,
                disabled: isCurrent || Boolean(unavailable),
                label: (
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate">{role.name}</span>
                    <span className="shrink-0 text-caption text-slate-500">
                      {isCurrent ? 'Current role' : (unavailable ?? '')}
                    </span>
                  </span>
                ),
              };
            })}
          />
        </div>

        {target && diff && (
          <section aria-label="What changes" className="rounded-xl border border-slate-200 p-4">
            <p className="m-0 flex flex-wrap items-center gap-2 text-small font-medium text-slate-700">
              {member.roleLabel}
              <ArrowRightOutlined aria-label="to" className="text-[11px] text-slate-400" />
              <span className="text-slate-900">{target.name}</span>
            </p>
            {diff.gained.length === 0 && diff.lost.length === 0 ? (
              <p className="m-0 mt-2 text-small text-slate-600">What {member.firstName} can do stays exactly the same.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                {diff.gained.length > 0 && (
                  <div>
                    <p className="m-0 mb-1.5 text-caption font-semibold uppercase tracking-caps text-slate-500">Gains</p>
                    <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                      {diff.gained.map((key) => (
                        <li key={key} className="inline-flex items-center gap-1 rounded-pill bg-success-bg px-2.5 py-0.5 text-caption font-medium text-success-text">
                          <PlusOutlined aria-hidden className="text-[10px]" />
                          {permissionLabel(key, index)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {diff.lost.length > 0 && (
                  <div>
                    <p className="m-0 mb-1.5 text-caption font-semibold uppercase tracking-caps text-slate-500">Loses</p>
                    <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                      {diff.lost.map((key) => (
                        <li key={key} className="inline-flex items-center gap-1 rounded-pill bg-error-bg px-2.5 py-0.5 text-caption font-medium text-error-text">
                          <MinusOutlined aria-hidden className="text-[10px]" />
                          {permissionLabel(key, index)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <Flex align="center" justify="flex-end" gap={12}>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={busy || !target}
            onClick={() => target && onConfirm(member, target)}
          >
            {busy ? 'Changing…' : 'Change role'}
          </Button>
        </Flex>
      </Flex>
    </Modal>
  );
}

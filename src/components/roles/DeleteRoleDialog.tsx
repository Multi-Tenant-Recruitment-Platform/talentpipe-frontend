import { DeleteOutlined } from '@ant-design/icons';
import { Flex, Modal, Select, Typography } from 'antd';
import { useMemo, useState } from 'react';
import type { RoleResponse } from '../../api/types';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';

export interface RoleChoice {
  role: RoleResponse;
  /** Why this role cannot be chosen; absent when it can. */
  unavailable?: string;
}

/** Share of permissions two roles have in common — 1 for the same set, 0 for nothing shared. */
function similarity(a: readonly string[], b: readonly string[]): number {
  const left = new Set(a);
  const right = new Set(b);
  const union = new Set([...left, ...right]).size;
  if (union === 0) {
    return 1;
  }
  return [...left].filter((key) => right.has(key)).length / union;
}

/**
 * The role closest to {@code role} in what it allows, among those that can be
 * chosen: the least surprising place for its members to land.
 */
export function closestRole(role: RoleResponse, choices: readonly RoleChoice[]): RoleResponse | null {
  let best: RoleResponse | null = null;
  let bestScore = -1;
  for (const choice of choices) {
    if (choice.unavailable || choice.role.id === role.id) {
      continue;
    }
    const score = choice.role.locked ? -0.5 : similarity(role.permissions, choice.role.permissions);
    if (score > bestScore) {
      best = choice.role;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Deleting a custom role.
 *
 * <p>A role nobody holds is a plain confirmation. A role people hold cannot
 * just disappear — they would be left with no access at all — so the dialog
 * asks where they should go, and the move and the delete happen together on
 * the server. The suggestion is the role closest in what it allows, so the
 * default is the least surprising change for the people being moved, and it is
 * named as a suggestion so it is a choice rather than a quiet decision.</p>
 */
export function DeleteRoleDialog({
  role,
  choices,
  busy,
  error,
  onConfirm,
  onCancel,
}: Readonly<{
  role: RoleResponse | null;
  /** Every other role, with the reason any of them cannot be chosen. */
  choices: readonly RoleChoice[];
  busy: boolean;
  error: string | null;
  onConfirm: (role: RoleResponse, reassignTo: string | undefined) => void;
  onCancel: () => void;
}>) {
  const suggestion = useMemo(() => (role ? closestRole(role, choices) : null), [role, choices]);
  // Keyed by role, so reopening for another role starts from its own suggestion.
  const [picked, setPicked] = useState<{ roleId: string; target: string } | null>(null);
  const target = picked && role && picked.roleId === role.id ? picked.target : suggestion?.id;

  if (!role) {
    return null;
  }

  if (role.memberCount === 0) {
    return (
      <ConfirmDialog
        open
        title={`Delete “${role.name}”?`}
        description="No one has this role, so nobody's access changes. The role is removed for good — you would have to create it again."
        confirmLabel="Delete role"
        busyLabel="Deleting…"
        busy={busy}
        error={error}
        onConfirm={() => onConfirm(role, undefined)}
        onCancel={onCancel}
      />
    );
  }

  const people = role.memberCount === 1 ? '1 person has' : `${role.memberCount} people have`;
  const others = choices.filter((choice) => choice.role.id !== role.id);

  return (
    <Modal
      open
      onCancel={onCancel}
      width={520}
      footer={null}
      keyboard={!busy}
      mask={{ closable: !busy }}
      closable={{ disabled: busy, 'aria-label': 'Close' }}
      title={
        <Flex align="center" gap={12}>
          <span className="inline-flex size-10 items-center justify-center rounded-md bg-error-bg text-error-text">
            <DeleteOutlined aria-hidden className="text-[18px]" />
          </span>
          <Typography.Title level={2} className="m-0 text-lead">
            Delete “{role.name}”?
          </Typography.Title>
        </Flex>
      }
    >
      <Flex vertical gap={16} className="pt-2">
        <Typography.Paragraph className="m-0 text-slate-600">
          {people} this role. Choose the role they move to — they keep working without interruption, with that
          role&apos;s permissions from their next action.
        </Typography.Paragraph>

        {error && <Alert tone="error">{error}</Alert>}

        <div>
          <label htmlFor="delete-role-target" className="mb-1.5 block font-medium">
            Move them to
          </label>
          <Select
            id="delete-role-target"
            className="w-full"
            value={target}
            disabled={busy}
            placeholder="Choose a role"
            onChange={(value: string) => setPicked({ roleId: role.id, target: value })}
            options={others.map(({ role: option, unavailable }) => ({
              value: option.id,
              disabled: Boolean(unavailable),
              title: option.name,
              label: (
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate">{option.name}</span>
                  <span className="shrink-0 text-caption text-slate-500">
                    {unavailable ?? (option.id === suggestion?.id ? 'Closest match' : '')}
                  </span>
                </span>
              ),
            }))}
          />
        </div>

        <Flex align="center" justify="flex-end" gap={12}>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="dangerSolid"
            loading={busy}
            disabled={busy || !target}
            onClick={() => onConfirm(role, target)}
          >
            {busy ? 'Deleting…' : 'Move people and delete'}
          </Button>
        </Flex>
      </Flex>
    </Modal>
  );
}

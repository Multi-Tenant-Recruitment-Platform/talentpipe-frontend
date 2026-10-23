import { CheckCircleFilled, LinkOutlined, LockOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { Checkbox } from 'antd';
import { useMemo } from 'react';
import type { PermissionGroup } from '../../api/types';
import {
  permissionIndex,
  permissionLabel,
  requiredBy,
  toggleGroup,
  togglePermission,
} from '../../dashboard/roleEditor';
import { groupIcon } from './PermissionCoverage';

/** "A", "A and B", "A, B and C". */
function listOf(items: readonly string[]): string {
  if (items.length <= 1) {
    return items[0] ?? '';
  }
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

const fieldKey = (key: string) => `permission-${key.split('.').join('-')}`;
const inputId = (key: string) => fieldKey(key);
const descriptionId = (key: string) => `${fieldKey(key)}-description`;
const hintId = (key: string) => `${fieldKey(key)}-hint`;

/**
 * What a role may do, as the permission catalogue's groups of checkboxes.
 *
 * <p>Every rule the server applies on save is visible before it: a
 * permission that another one needs is ticked with it and held there, with a
 * line naming what needs it; a permission the signed-in member does not hold
 * cannot be ticked, and says why. A permission that would bring others along
 * says that too, before it is ticked — so nothing changes on Save that was
 * not on screen.</p>
 *
 * <p>Read-only, the same list shows ticks and dashes instead of controls, so
 * someone who may only look sees exactly what an editor would.</p>
 */
export function PermissionPicker({
  catalogue,
  selected,
  onChange,
  canGrant,
  readOnly = false,
  disabled = false,
  allGranted = false,
}: Readonly<{
  catalogue: readonly PermissionGroup[];
  selected: ReadonlySet<string>;
  onChange?: (next: Set<string>) => void;
  /** False for a permission the signed-in member may not hand out. */
  canGrant: (key: string) => boolean;
  readOnly?: boolean;
  disabled?: boolean;
  /** The Owner role: everything is held, whatever the list says. */
  allGranted?: boolean;
}>) {
  const index = useMemo(() => permissionIndex(catalogue), [catalogue]);
  const has = (key: string) => allGranted || selected.has(key);

  return (
    <div className="flex flex-col gap-4">
      {catalogue.map((group) => {
        const Glyph = groupIcon(group.key);
        const on = group.permissions.filter((permission) => has(permission.key)).length;
        const grantable = group.permissions.filter((permission) => canGrant(permission.key));
        const allOn = grantable.length > 0 && grantable.every((permission) => has(permission.key));
        const headingId = `permission-group-${group.key.toLowerCase()}`;

        return (
          <section
            key={group.key}
            aria-labelledby={headingId}
            className="overflow-hidden rounded-2xl border border-slate-200"
          >
            <header className="flex items-center gap-3 border-b border-slate-100 bg-canvas px-4 py-3">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface text-primary-600 shadow-xs">
                <Glyph aria-hidden className="text-[15px]" />
              </span>
              <h3 id={headingId} className="m-0 flex-1 text-body font-semibold text-slate-900">
                {group.label}
              </h3>
              <span className="text-caption tabular-nums text-slate-500">
                {on} of {group.permissions.length}
              </span>
              {!readOnly && onChange && grantable.length > 0 && (
                <button
                  type="button"
                  disabled={disabled}
                  className="tp-link-button text-caption text-primary-700 disabled:cursor-default disabled:opacity-50"
                  aria-label={`${allOn ? 'Clear' : 'Select all'} in ${group.label}`}
                  onClick={() => onChange(toggleGroup(selected, group, !allOn, catalogue, canGrant))}
                >
                  {allOn ? 'Clear' : 'Select all'}
                </button>
              )}
            </header>

            <ul className="m-0 list-none divide-y divide-slate-100 p-0">
              {group.permissions.map((permission) => {
                const checked = has(permission.key);
                const holders = allGranted ? [] : requiredBy(permission.key, selected, catalogue);
                const held = holders.length > 0;
                const grantableHere = canGrant(permission.key);
                const brings = permission.requires.filter((key) => !has(key)).map((key) => permissionLabel(key, index));
                const locked = disabled || allGranted || !grantableHere || (checked && held);

                let hint: { icon: typeof LockOutlined; text: string } | null = null;
                if (!readOnly && !allGranted) {
                  if (checked && held) {
                    hint = {
                      icon: LinkOutlined,
                      text: `Included because ${listOf(holders.map((key) => permissionLabel(key, index)))} ${
                        holders.length === 1 ? 'needs' : 'need'
                      } it.`,
                    };
                  } else if (!grantableHere) {
                    hint = { icon: LockOutlined, text: "You don't have this permission, so you can't give it out." };
                  } else if (!checked && brings.length > 0) {
                    hint = { icon: LinkOutlined, text: `Also turns on ${listOf(brings)}.` };
                  }
                }

                return (
                  <li
                    key={permission.key}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors duration-(--tp-motion-base) ${
                      checked && !readOnly ? 'bg-primary-50/40' : ''
                    }`}
                  >
                    {readOnly ? (
                      <>
                        {checked ? (
                          <CheckCircleFilled aria-hidden className="mt-0.5 text-[16px] text-primary-600" />
                        ) : (
                          <MinusCircleOutlined aria-hidden className="mt-0.5 text-[16px] text-slate-300" />
                        )}
                        <div className="min-w-0">
                          <p className={`m-0 font-medium ${checked ? 'text-slate-900' : 'text-slate-500'}`}>
                            {permission.label}
                            <span className="sr-only">{checked ? ' — allowed' : ' — not allowed'}</span>
                          </p>
                          <p className="m-0 mt-0.5 text-small text-slate-500">{permission.description}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Checkbox
                          id={inputId(permission.key)}
                          checked={checked}
                          disabled={locked}
                          aria-describedby={
                            hint ? `${descriptionId(permission.key)} ${hintId(permission.key)}` : descriptionId(permission.key)
                          }
                          onChange={(event) =>
                            onChange?.(togglePermission(selected, permission.key, event.target.checked, catalogue))
                          }
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <label
                            htmlFor={inputId(permission.key)}
                            className={`block font-medium ${locked ? 'cursor-default text-slate-600' : 'cursor-pointer text-slate-900'}`}
                          >
                            {permission.label}
                          </label>
                          <p id={descriptionId(permission.key)} className="m-0 mt-0.5 text-small text-slate-500">
                            {permission.description}
                          </p>
                          {hint && (
                            <p
                              id={hintId(permission.key)}
                              className="m-0 mt-1.5 flex items-center gap-1.5 text-caption font-medium text-slate-600"
                            >
                              <hint.icon aria-hidden className="text-[12px] text-slate-400" />
                              {hint.text}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

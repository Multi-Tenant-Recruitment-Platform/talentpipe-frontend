import type { PermissionGroup } from '../../api/types';
import { groupCoverage } from '../../dashboard/roleEditor';

/**
 * How much of each area a role reaches, as one row of segments per group —
 * a segment per permission, filled when the role holds it.
 *
 * <p>Read at a glance it is the role's shape: an Interviewer is a single lit
 * segment at the bottom, a Recruiter is mostly lit with Team left dark. That
 * comparison is the point of the strip, so every card uses the same rows in
 * the same order whatever the role holds.</p>
 *
 * <p>A real list of terms and definitions: the segments are decoration, and
 * the definition says "2 of 3" in words for anyone who cannot see them.</p>
 */
export function PermissionCoverage({
  permissions,
  catalogue,
  compact = false,
}: Readonly<{
  permissions: ReadonlySet<string>;
  catalogue: readonly PermissionGroup[];
  /** Tighter rows, for the role cards. */
  compact?: boolean;
}>) {
  const rows = groupCoverage(permissions, catalogue);
  return (
    <dl className={`m-0 grid ${compact ? 'gap-1.5' : 'gap-2.5'}`}>
      {rows.map(({ group, held, total }) => (
        <div key={group.key} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] items-center gap-3">
          <dt className="truncate text-caption font-medium text-slate-600">{group.label}</dt>
          <dd className="m-0 flex items-center gap-2">
            <span aria-hidden="true" className="flex flex-1 gap-0.5">
              {group.permissions.map((permission) => (
                <span
                  key={permission.key}
                  className={`h-1.5 flex-1 rounded-pill transition-colors duration-(--tp-motion-base) ${
                    permissions.has(permission.key) ? 'bg-primary-500' : 'bg-slate-200'
                  }`}
                />
              ))}
            </span>
            <span className="w-9 text-end text-caption tabular-nums text-slate-500">
              {held}/{total}
              <span className="sr-only"> permissions</span>
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

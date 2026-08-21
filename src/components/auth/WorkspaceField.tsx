import { normalizeSubdomainInput, ROOT_DOMAIN, type TenantHost } from '../../tenant/subdomain';
import { Badge } from '../dashboard/Badge';
import { Icon } from '../dashboard/Icon';

const FRAME_BASE =
  'mt-1.5 flex items-center overflow-hidden rounded-lg border bg-white shadow-sm transition-colors focus-within:ring-4';
const FRAME_INVALID = 'border-red-300 focus-within:border-red-500 focus-within:ring-red-500/15';
const FRAME_VALID =
  'border-slate-300 hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-indigo-500/15';

const HINT = 'Your company’s TalentPipe address — it’s in your invitation email.';

/** Read-only chip: the host already fixes the workspace, so there is nothing to type. */
function DetectedWorkspace({ subdomain }: Readonly<{ subdomain: string | null }>) {
  return (
    <div>
      <span className="block text-sm font-medium text-slate-700">Workspace</span>
      <div className="mt-1.5 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm">
          <Icon name="building" className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">
          <span className="font-semibold text-slate-900">{subdomain}</span>
          <span className="text-slate-400">.{ROOT_DOMAIN}</span>
        </span>
        <Badge tone="indigo">Detected</Badge>
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        You’re signing in from this workspace’s address.
      </p>
    </div>
  );
}

/** Editable workspace input, shown when the host does not name a tenant. */
function WorkspaceInput({
  value,
  error,
  onChange,
}: Readonly<{ value: string; error: string | null; onChange: (next: string) => void }>) {
  return (
    <div>
      <label htmlFor="subdomain" className="block text-sm font-medium text-slate-700">
        Workspace
      </label>
      <div className={`${FRAME_BASE} ${error ? FRAME_INVALID : FRAME_VALID}`}>
        <span className="flex h-full items-center pl-3.5 text-slate-400" aria-hidden="true">
          <Icon name="building" className="h-4 w-4" />
        </span>
        <input
          id="subdomain"
          // Not `required`: the browser's generic bubble would preempt the
          // field-level message the page produces, which can also name a
          // workspace the backend rejected.
          value={value}
          onChange={(e) => onChange(normalizeSubdomainInput(e.target.value))}
          className="min-w-0 flex-1 border-0 bg-transparent px-2.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
          placeholder="acme"
          autoComplete="organization"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby="subdomain-hint"
        />
        <span className="shrink-0 self-stretch border-l border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
          .{ROOT_DOMAIN}
        </span>
      </div>
      <p
        id="subdomain-hint"
        className={`mt-1.5 text-xs ${error ? 'text-red-600' : 'text-slate-500'}`}
      >
        {error ?? HINT}
      </p>
    </div>
  );
}

/**
 * Which company workspace to sign in to — it travels as the
 * X-Tenant-Subdomain header (ADR-1). Candidates have no tenant, so the page
 * renders this only for a company login.
 */
export function WorkspaceField({
  host,
  value,
  error,
  onChange,
}: Readonly<{
  host: TenantHost;
  value: string;
  error: string | null;
  onChange: (next: string) => void;
}>) {
  return host.locked ? (
    <DetectedWorkspace subdomain={host.subdomain} />
  ) : (
    <WorkspaceInput value={value} error={error} onChange={onChange} />
  );
}

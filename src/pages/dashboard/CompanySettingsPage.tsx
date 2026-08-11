import { useCallback, useEffect, useState } from 'react';
import { companyApi } from '../../api/company';
import type { CompanyProfileResponse } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { useCan } from '../../auth/useCan';
import { Badge, type BadgeTone } from '../../components/dashboard/Badge';
import { Card } from '../../components/dashboard/Card';
import { CompanyProfileForm } from '../../components/dashboard/CompanyProfileForm';
import { CompanyProfileView } from '../../components/dashboard/CompanyProfileView';
import { Icon } from '../../components/dashboard/Icon';
import { PageHeader } from '../../components/dashboard/PageHeader';
import { Alert, type AlertTone } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { describeCompanyError } from '../../dashboard/companyErrors';
import {
  EMPTY_FORM_VALUES,
  isDirty,
  toFormValues,
  toUpdateRequest,
  validateCompanyProfile,
  type CompanyField,
  type CompanyFieldErrors,
  type CompanyFormValues,
} from '../../dashboard/companyProfile';
import { useTeamSummary } from '../../dashboard/TeamSummaryContext';
import { planUsage } from '../../data/mockDashboard';
import { resolveTenantHost, ROOT_DOMAIN } from '../../tenant/subdomain';

/**
 * Company profile — the workspace's own details, as candidates and applicants
 * see them (PB-005).
 *
 * <p>Two modes over one record. Looking is the common case, so the default is
 * a read view; editing is an explicit decision with an explicit Save, which is
 * what makes "discard these changes?" a question we are entitled to ask. The
 * previous version was a permanently-live form whose Save only ever set a
 * boolean, so there was never anything to discard — or to persist.</p>
 *
 * <p>Where the data comes from is `src/api/company.ts`'s problem, not this
 * page's: today a per-workspace draft store, tomorrow `GET`/`PATCH /tenant`.</p>
 */

interface PageMessage {
  tone: AlertTone;
  text: string;
}

const STATUS_TONES: Record<string, BadgeTone> = {
  ACTIVE: 'emerald',
  TRIAL: 'amber',
  SUSPENDED: 'red',
};

/** 'ACTIVE' → 'Active'. Keeps an unknown future status readable. */
function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-6" data-testid="profile-skeleton">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-xl bg-slate-200" />
        <div className="space-y-2">
          <div className="h-4 w-48 rounded bg-slate-200" />
          <div className="h-3 w-32 rounded bg-slate-100" />
        </div>
      </div>
      <div className="grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="space-y-2">
            <div className="h-3 w-16 rounded bg-slate-100" />
            <div className="h-4 w-40 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="h-16 rounded bg-slate-100" />
    </div>
  );
}

export function CompanySettingsPage() {
  const { user } = useAuth();
  const allow = useCan();
  const canEdit = allow('settings.edit');
  // Real seat consumption from GET /team — only the tier and the ceiling are
  // still mock, since no billing endpoint exposes them yet.
  const { seatsUsed, loading: seatsLoading } = useTeamSummary();

  const [profile, setProfile] = useState<CompanyProfileResponse | null>(null);
  /** The saved state, and what Cancel restores. */
  const [saved, setSaved] = useState<CompanyFormValues>(EMPTY_FORM_VALUES);
  const [values, setValues] = useState<CompanyFormValues>(EMPTY_FORM_VALUES);
  const [errors, setErrors] = useState<CompanyFieldErrors>({});

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<PageMessage | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [copied, setCopied] = useState(false);

  // Identity the draft store cannot invent, taken from the session. Both go
  // away with the store: the real GET /tenant reads them from the access token.
  const seedName = user?.tenantName ?? null;
  const seedSubdomain = user?.tenantSubdomain ?? resolveTenantHost().subdomain;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await companyApi.get({ name: seedName, subdomain: seedSubdomain });
      const asForm = toFormValues(loaded);
      setProfile(loaded);
      setSaved(asForm);
      // A reload is the authoritative answer, so it replaces the edit buffer
      // too — otherwise a 409 recovery would leave stale text on screen under
      // a banner saying it had been refreshed.
      setValues(asForm);
      setErrors({});
      setLoadError(null);
    } catch (err: unknown) {
      setLoadError(describeCompanyError(err, 'load').message);
    } finally {
      setLoading(false);
    }
  }, [seedName, seedSubdomain]);

  // Re-runs when the signed-in identity changes, so switching workspaces on one
  // device never leaves the previous company's details on screen.
  useEffect(() => {
    void load();
  }, [load, user?.id]);

  const dirty = isDirty(saved, values);

  function handleChange(field: CompanyField, value: string) {
    setMessage(null);
    const next = { ...values, [field]: value };
    setValues(next);
    // Only fields already flagged re-validate as you type. Everything else
    // waits for Save, so nothing turns red while it is still being typed.
    if (errors[field]) {
      const remaining = validateCompanyProfile(next);
      setErrors((current) => ({ ...current, [field]: remaining[field] }));
    }
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await companyApi.update(toUpdateRequest(values), {
        name: seedName,
        subdomain: seedSubdomain,
      });
      const asForm = toFormValues(updated);
      setProfile(updated);
      setSaved(asForm);
      // Adopt the server's copy: it has been normalised ('abc.com' is now
      // 'https://abc.com'), and the read view must show what was stored.
      setValues(asForm);
      setEditing(false);
      setMessage({ tone: 'success', text: 'Company profile updated.' });
    } catch (err: unknown) {
      const plan = describeCompanyError(err, 'save');
      setMessage({ tone: plan.tone, text: plan.message });
      if (plan.refetch) {
        await load();
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  /** Validates; saves only when clean. Returns what stopped it, for focus. */
  function handleSubmit(): CompanyFieldErrors {
    const found = validateCompanyProfile(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setMessage({
        tone: 'error',
        text: 'Some details need fixing before this can be saved — see the highlighted fields.',
      });
      return found;
    }
    void save();
    return {};
  }

  function handleCancel() {
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    setEditing(false);
    setErrors({});
  }

  function discard() {
    setValues(saved);
    setErrors({});
    setEditing(false);
    setConfirmDiscard(false);
    setMessage(null);
  }

  /**
   * The workspace address is not always knowable. `UserResponse` carries it
   * only if the backend sends it — today's does not — and reading it from the
   * host works only on a workspace URL, never on localhost or the apex domain.
   * When it is unknown the card says so, rather than rendering a stray
   * ".talentpipe.io" and a careers link that goes nowhere.
   */
  const subdomain = profile?.subdomain ?? '';
  const careersUrl = subdomain ? `${subdomain}.${ROOT_DOMAIN}/jobs` : null;

  async function handleCopy() {
    if (!careersUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(`https://${careersUrl}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (non-secure context) — the URL is visible anyway.
    }
  }

  const seatsPercent = Math.min(100, Math.round((seatsUsed / planUsage.seatsTotal) * 100));
  const seatsLeft = Math.max(0, planUsage.seatsTotal - seatsUsed);

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Company profile"
        subtitle="Manage your company's details — candidates see these on your careers page and job posts."
      />

      {loadError && (
        <Alert tone="error" className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{loadError}</span>
            <Button size="sm" variant="secondary" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        </Alert>
      )}

      {message && (
        <Alert tone={message.tone} onDismiss={() => setMessage(null)} className="mb-6">
          {message.text}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card
          title="Company profile"
          subtitle={editing ? 'Editing — nothing is saved until you choose Save' : 'Details shown to candidates'}
          className="lg:col-span-2"
          action={!canEdit && !loading ? <Badge tone="slate">Read only</Badge> : undefined}
        >
          {loading && <ProfileSkeleton />}

          {!loading && editing && (
            <CompanyProfileForm
              values={values}
              errors={errors}
              dirty={dirty}
              saving={saving}
              onChange={handleChange}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          )}

          {!loading && !editing && (
            <>
              <CompanyProfileView
                values={saved}
                subdomain={subdomain}
                updatedAt={profile?.updatedAt ?? null}
                canEdit={canEdit}
                onEdit={() => {
                  setMessage(null);
                  setErrors({});
                  setValues(saved);
                  setEditing(true);
                }}
              />
              {!canEdit && (
                <p className="mt-5 border-t border-slate-100 pt-5 text-xs text-slate-500">
                  Your role can view this profile but not change it. Ask a Company Admin to update it.
                </p>
              )}
            </>
          )}
        </Card>

        {/* Workspace + plan */}
        <div className="space-y-6">
          <Card title="Workspace" subtitle="Your tenant identity on TalentPipe">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Subdomain</p>
                {subdomain ? (
                  <>
                    <div className="mt-1.5 flex items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="truncate text-sm font-semibold text-slate-800">{subdomain}</span>
                      <span className="text-sm text-slate-400">.{ROOT_DOMAIN}</span>
                    </div>
                    {/* Says it before they hunt for the field and conclude it is a bug. */}
                    <p className="mt-1.5 text-xs text-slate-400">
                      Fixed for the life of the workspace — every invitation and saved link points at it.
                    </p>
                  </>
                ) : (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Not available on this address. Sign in on your company's own TalentPipe URL to see
                    it.
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Status</p>
                <Badge tone={STATUS_TONES[profile?.status ?? ''] ?? 'slate'}>
                  {statusLabel(profile?.status ?? 'Unknown')}
                </Badge>
              </div>
              {/* Without a subdomain there is no link to give them, and a Copy
                  button that copies nothing is worse than no button. */}
              {careersUrl && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Careers page</p>
                  <div className="mt-1.5 flex items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2">
                    <span className="inline-flex min-w-0 items-center gap-2 text-sm text-slate-700">
                      <Icon name="link" className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate">{careersUrl}</span>
                    </span>
                    <Button
                      size="sm"
                      variant={copied ? 'ghost' : 'secondary'}
                      onClick={() => void handleCopy()}
                      className={copied ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700' : ''}
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">Share this link — it's where candidates apply.</p>
                </div>
              )}
            </div>
          </Card>

          {allow('billing.view') && (
            <Card title="Plan & usage" subtitle="Current subscription">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Icon name="sparkles" className="h-4 w-4 text-violet-500" />
                  {planUsage.tier} plan
                </span>
                <Badge tone="indigo">Monthly</Badge>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-slate-500">Team seats</span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {seatsLoading ? '—' : `${seatsUsed} / ${planUsage.seatsTotal}`}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-500"
                    style={{ width: `${seatsPercent}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  {seatsLeft} {seatsLeft === 1 ? 'seat' : 'seats'} left — invite HR managers and interviewers anytime.
                </p>
              </div>
              <Button variant="secondary" className="mt-4 w-full" title="Billing arrives in a later sprint">
                Manage plan
              </Button>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        tone="danger"
        title="Discard your changes?"
        description="The edits you have made to the company profile will be lost. This can't be undone."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onConfirm={discard}
        onCancel={() => setConfirmDiscard(false)}
      />
    </>
  );
}

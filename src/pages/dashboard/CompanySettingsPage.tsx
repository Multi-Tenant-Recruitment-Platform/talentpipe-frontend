import { Link } from 'react-router-dom';
import { useCan } from '../../auth/useCan';
import { Badge, type BadgeTone } from '../../components/dashboard/Badge';
import { Card } from '../../components/dashboard/Card';
import { CompanyProfilePanel } from '../../components/dashboard/CompanyProfilePanel';
import { Icon } from '../../components/dashboard/Icon';
import { PageHeader } from '../../components/dashboard/PageHeader';
import { Button } from '../../components/ui/Button';
import { useTeamSummary } from '../../dashboard/TeamSummaryContext';
import { useCompanyProfileContext } from '../../dashboard/CompanyProfileContext';
import { planUsage } from '../../data/mockDashboard';
import { ROOT_DOMAIN } from '../../tenant/subdomain';
import { useState } from 'react';

/**
 * Company settings — the administrative home for the workspace: the company
 * profile, the tenant identity, and the plan.
 *
 * <p>The profile section here is the same component the Profile Management
 * page renders, in its compact variant. Settings is where an admin goes to
 * change things; Profile Management is where the profile is presented. Sharing
 * the panel means the two can never drift into disagreeing.</p>
 */

const STATUS_TONES: Record<string, BadgeTone> = {
  ACTIVE: 'emerald',
  TRIAL: 'amber',
  SUSPENDED: 'red',
};

/** 'ACTIVE' → 'Active'. Keeps an unknown future status readable. */
function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

export function CompanySettingsPage() {
  const controller = useCompanyProfileContext();
  const allow = useCan();
  const [copied, setCopied] = useState(false);

  // Real seat consumption from GET /team — only the tier and the ceiling are
  // still mock, since no billing endpoint exposes them yet.
  const { seatsUsed, loading: seatsLoading } = useTeamSummary();
  const seatsPercent = Math.min(100, Math.round((seatsUsed / planUsage.seatsTotal) * 100));
  const seatsLeft = Math.max(0, planUsage.seatsTotal - seatsUsed);

  /**
   * The workspace address is not always knowable. `UserResponse` carries it
   * only if the backend sends it — today's does not — and reading it from the
   * host works only on a workspace URL, never on localhost or the apex domain.
   * When it is unknown the card says so, rather than rendering a stray
   * ".talentpipe.io" and a careers link that goes nowhere.
   */
  const subdomain = controller.profile?.subdomain ?? '';
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

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Company settings"
        subtitle="Manage your company details, workspace identity and plan."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card
            title="Company profile"
            subtitle={
              controller.editing
                ? 'Editing — nothing is saved until you choose Save'
                : 'Details shown to candidates'
            }
            action={
              !controller.canEdit && !controller.loading ? (
                <Badge tone="slate">Read only</Badge>
              ) : undefined
            }
          >
            <CompanyProfilePanel controller={controller} variant="compact" />
          </Card>

          <p className="mt-4 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <Icon name="building" className="h-3.5 w-3.5 text-slate-400" />
            See how this reads to a candidate on
            <Link
              to="/dashboard/profile"
              className="rounded font-medium text-indigo-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Profile Management
            </Link>
            .
          </p>
        </div>

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
                {/* Nothing is known before the profile lands, and a badge
                    reading "Unknown" is a claim about the workspace rather
                    than an admission that we have not looked yet. */}
                {controller.profile ? (
                  <Badge tone={STATUS_TONES[controller.profile.status] ?? 'slate'}>
                    {statusLabel(controller.profile.status)}
                  </Badge>
                ) : (
                  <span className="text-sm text-slate-300">—</span>
                )}
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
    </>
  );
}

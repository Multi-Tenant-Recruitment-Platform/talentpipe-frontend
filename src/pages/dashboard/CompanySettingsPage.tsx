import { Link } from 'react-router-dom';
import { useCan } from '../../auth/useCan';
import { Badge, type BadgeTone } from '../../components/dashboard/Badge';
import { Card } from '../../components/dashboard/Card';
import { Icon } from '../../components/dashboard/Icon';
import { PageHeader } from '../../components/dashboard/PageHeader';
import { Button } from '../../components/ui/Button';
import { useTeamSummary } from '../../dashboard/TeamSummaryContext';
import { useCompanyProfileContext } from '../../dashboard/CompanyProfileContext';
import { planUsage } from '../../data/mockDashboard';

/**
 * Company settings — the workspace identity and the plan.
 *
 * <p>The company profile itself is not repeated here: it lives on Profile
 * Management, and a second copy of the same form on this page was only a
 * second place to look for it. The profile controller is still read, for the
 * name and status the workspace card shows.</p>
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

  // Real seat consumption from GET /team — only the tier and the ceiling are
  // still mock, since no billing endpoint exposes them yet.
  const { seatsUsed, loading: seatsLoading } = useTeamSummary();
  const seatsPercent = Math.min(100, Math.round((seatsUsed / planUsage.seatsTotal) * 100));
  const seatsLeft = Math.max(0, planUsage.seatsTotal - seatsUsed);

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Company settings"
        subtitle="Manage your workspace identity and plan."
      />

      <div className="mx-auto max-w-4xl">
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card title="Workspace" subtitle="Your tenant identity on TalentPipe">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Company</p>
                {controller.profile ? (
                  <span className="truncate text-sm font-semibold text-slate-800">
                    {controller.profile.name}
                  </span>
                ) : (
                  <span className="text-sm text-slate-300">—</span>
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

        {/* The profile moved out of this page; say where it went, so nobody
            concludes it was removed. */}
        <p className="mt-4 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <Icon name="building" className="h-3.5 w-3.5 text-slate-400" />
          Company details are managed on
          <Link
            to="/dashboard/profile"
            className="rounded font-medium text-indigo-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Profile Management
          </Link>
          .
        </p>
      </div>
    </>
  );
}

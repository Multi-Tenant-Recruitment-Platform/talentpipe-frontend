import { useState } from 'react';
import { teamApi } from '../../api/team';
import { useAuth } from '../../auth/AuthContext';
import { useCan } from '../../auth/useCan';
import { Card } from '../../components/dashboard/Card';
import { EmptyState } from '../../components/dashboard/EmptyState';
import { Icon } from '../../components/dashboard/Icon';
import { InviteMemberModal, type InviteFormValues } from '../../components/dashboard/InviteMemberModal';
import { PageHeader } from '../../components/dashboard/PageHeader';
import { StatCard } from '../../components/dashboard/StatCard';
import { TeamRosterTable } from '../../components/dashboard/TeamRosterTable';
import { TeamToolbar } from '../../components/dashboard/TeamToolbar';
import { Alert, type AlertTone } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { describeTeamError, type TeamAction } from '../../dashboard/teamErrors';
import { useTeamRoster, type RosterRow } from '../../dashboard/teamRoster';
import { useTeamSummary } from '../../dashboard/TeamSummaryContext';
import { useResendLog } from '../../dashboard/useResendLog';
import { formatRole } from '../../utils/format';

interface PageMessage {
  tone: AlertTone;
  text: string;
}

/**
 * Team & invitations — the company admin's control centre for who can reach
 * the hiring workspace and in what capacity (PB-003 / PB-004).
 *
 * <p>The roster is a single table over every account in the tenant, whatever
 * its status. That is deliberate: the previous version recognised only ACTIVE
 * and INVITED, so a disabled or unverified colleague was filtered out of both
 * of its tables and disappeared from the admin's view entirely.</p>
 *
 * <p>`GET /team` supports no query parameters, so all searching, filtering and
 * sorting happens client-side over the full array — see `teamRoster.ts`.</p>
 */
export function TeamPage() {
  const { user } = useAuth();
  const allow = useCan();
  const { members, loading, error: loadError, refresh } = useTeamSummary();

  const roster = useTeamRoster(members, user?.id);
  const { resentAt, markResent, forget } = useResendLog(
    user?.tenantId ?? null,
    roster.rows.map((row) => row.id),
  );

  const [message, setMessage] = useState<PageMessage | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<{ text: string; tone: AlertTone; focus: 'email' | null } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'resend' | 'revoke' | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<RosterRow | null>(null);

  // `refresh()` flips the shared context back to loading, so without this split
  // every invite and revoke would blink the whole table into skeletons.
  const firstLoad = loading && members.length === 0;
  const refreshing = loading && members.length > 0;

  const canManage = allow('team.invite.manage');
  const canInvite = allow('team.invite');

  const activeCount = roster.rows.filter((row) => row.status === 'ACTIVE').length;
  const hrCount = roster.rows.filter((r) => r.status === 'ACTIVE' && r.role === 'HR_MANAGER').length;
  const interviewerCount = roster.rows.filter(
    (r) => r.status === 'ACTIVE' && r.role === 'INTERVIEWER',
  ).length;
  const pendingCount = roster.rows.filter((row) => row.status === 'INVITED').length;
  const kpi = (value: number) => (firstLoad ? '—' : String(value));

  /** Routes a failure to the right surface and re-syncs when the screen is stale. */
  async function handleFailure(err: unknown, action: TeamAction) {
    const plan = describeTeamError(err, action);
    if (plan.placement === 'modal') {
      setInviteError({ text: plan.message, tone: plan.tone, focus: plan.focus ?? null });
    } else {
      setInviteError(null);
      setMessage({ tone: plan.tone, text: plan.message });
    }
    if (plan.refetch) {
      await refresh();
    }
  }

  async function handleInvite(values: InviteFormValues) {
    setMessage(null);
    setInviteError(null);
    setInviteSubmitting(true);
    try {
      await teamApi.invite(values);
      // Refresh before closing so the new row is already on screen when the
      // dialog disappears — no gap where nothing seems to have happened.
      await refresh();
      setInviteOpen(false);
      setMessage({
        tone: 'success',
        text: `Invitation sent to ${values.email}. They'll join as ${formatRole(values.role)} once they accept — the link expires in 7 days.`,
      });
    } catch (err: unknown) {
      await handleFailure(err, 'invite');
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function handleResend(row: RosterRow) {
    setMessage(null);
    setBusyId(row.id);
    setBusyAction('resend');
    try {
      await teamApi.resend(row.id);
      markResent(row.id);
      setMessage({
        tone: 'success',
        text: `Invitation re-sent to ${row.email}. The new link is valid for 7 days; any earlier link has stopped working.`,
      });
      // Deliberately no refresh: the response is 204 and nothing on the row
      // changes, so a re-fetch would return an identical array.
    } catch (err: unknown) {
      forget(row.id);
      await handleFailure(err, 'resend');
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  }

  async function handleRevokeConfirmed() {
    const row = pendingRevoke;
    if (!row) {
      return;
    }
    setMessage(null);
    setBusyId(row.id);
    setBusyAction('revoke');
    try {
      await teamApi.revoke(row.id);
      setPendingRevoke(null);
      await refresh();
      setMessage({
        tone: 'success',
        text: `Invitation for ${row.email} revoked. That link no longer works.`,
      });
    } catch (err: unknown) {
      setPendingRevoke(null);
      await handleFailure(err, 'revoke');
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  }

  const inviteButton = canInvite ? (
    <Button variant="primary" onClick={() => setInviteOpen(true)}>
      <Icon name="user-plus" className="h-4 w-4" />
      Invite member
    </Button>
  ) : null;

  // The table is only ever truly empty because the filters excluded everyone —
  // GET /team always returns the caller, so a zero-length array means the load
  // failed rather than that the workspace is empty.
  const empty = (
    <EmptyState
      icon="search"
      tone="slate"
      title={roster.query.trim() ? `No one matches “${roster.query.trim()}”` : 'No one matches these filters'}
      description="Try a different name, email or role — or clear the filters to see everyone."
      action={
        <Button variant="ghost" onClick={roster.clearFilters}>
          Clear filters
        </Button>
      }
    />
  );

  // Being the only member is not an empty table — the admin's own row is
  // right there. Prompting underneath is honest; hiding their row to show a
  // "nobody here" illustration would not be.
  const soloAdmin = !firstLoad && !roster.filtersActive && roster.rows.filter((r) => !r.isSelf).length === 0;

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Team & invitations"
        subtitle="Manage who can access your hiring workspace and what they can do."
      >
        {inviteButton}
      </PageHeader>

      {/* Load and action failures keep separate slots: a rejected invite must
          not blank a roster that loaded perfectly well. */}
      {loadError && (
        <Alert tone="error" className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{loadError}</span>
            <Button size="sm" variant="secondary" onClick={() => void refresh()}>
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

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Workspace access" value={kpi(activeCount)} icon="users" tone="indigo" />
        <StatCard label="HR Managers" value={kpi(hrCount)} icon="briefcase" tone="violet" />
        <StatCard label="Interviewers" value={kpi(interviewerCount)} icon="identification" tone="emerald" />
        <StatCard label="Pending invites" value={kpi(pendingCount)} icon="envelope" tone="amber" />
      </div>

      {/* Disabled and unverified accounts live outside Active and Pending, so
          say where they went rather than letting them look deleted. */}
      {roster.otherCount > 0 && roster.segment !== 'all' && (
        <Alert tone="info" className="mt-6">
          {roster.otherCount === 1
            ? '1 account is disabled or awaiting email verification.'
            : `${roster.otherCount} accounts are disabled or awaiting email verification.`}{' '}
          <button
            type="button"
            onClick={() => roster.setSegment('all')}
            className="font-semibold underline underline-offset-2 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Show all
          </button>{' '}
          to see them.
        </Alert>
      )}

      <Card className="mt-6" bodyClassName="px-6 pb-2 pt-5">
        <TeamToolbar
          segment={roster.segment}
          onSegmentChange={roster.setSegment}
          segmentCounts={roster.segmentCounts}
          roleFilter={roster.roleFilter}
          roleOptions={roster.roleOptions}
          onRoleFilterChange={roster.setRoleFilter}
          query={roster.query}
          onQueryChange={roster.setQuery}
          visibleCount={roster.visible.length}
          totalCount={roster.rows.length}
          filtersActive={roster.filtersActive}
          onClearFilters={roster.clearFilters}
          disabled={firstLoad}
        />

        <div className="-mx-6 overflow-x-auto">
          <TeamRosterTable
            rows={roster.visible}
            sort={roster.sort}
            onSortChange={roster.toggleSort}
            canManage={canManage}
            busyId={busyId}
            busyAction={busyAction}
            resentAt={resentAt}
            onResend={(row) => void handleResend(row)}
            onRevoke={setPendingRevoke}
            firstLoad={firstLoad}
            refreshing={refreshing}
            empty={empty}
          />
        </div>

        {soloAdmin && (
          <div className="-mx-6 border-t border-slate-100">
            <EmptyState
              icon="users"
              title="You're the only person here"
              description="Invite an HR manager or an interviewer to start sharing the hiring work."
              action={inviteButton}
            />
          </div>
        )}
      </Card>

      {/* Mounted only while open, so each invite starts from a clean form. */}
      {canInvite && inviteOpen && (
        <InviteMemberModal
          open
          onClose={() => {
            setInviteOpen(false);
            setInviteError(null);
          }}
          onInvite={(values) => void handleInvite(values)}
          submitting={inviteSubmitting}
          error={inviteError?.text ?? null}
          errorTone={inviteError?.tone ?? 'error'}
          focusField={inviteError?.focus ?? null}
        />
      )}

      <ConfirmDialog
        open={pendingRevoke !== null}
        title="Revoke this invitation?"
        description={
          <>
            <span className="font-medium text-slate-900">{pendingRevoke?.fullName}</span> (
            {pendingRevoke?.email}) will be removed from your workspace and their invitation link will
            stop working immediately. This can&apos;t be undone — you&apos;d have to invite them again.
          </>
        }
        confirmLabel="Revoke invitation"
        busyLabel="Revoking…"
        busy={busyAction === 'revoke'}
        onConfirm={() => void handleRevokeConfirmed()}
        onCancel={() => setPendingRevoke(null)}
      />
    </>
  );
}

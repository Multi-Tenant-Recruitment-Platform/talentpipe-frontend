import { useState } from 'react';
import { apiErrorMessage } from '../../api/client';
import { teamApi } from '../../api/team';
import { useAuth } from '../../auth/AuthContext';
import { useCan } from '../../auth/useCan';
import { Avatar } from '../../components/dashboard/Avatar';
import { Badge } from '../../components/dashboard/Badge';
import { Card } from '../../components/dashboard/Card';
import { Icon } from '../../components/dashboard/Icon';
import { InviteMemberModal, type InviteFormValues } from '../../components/dashboard/InviteMemberModal';
import { PageHeader } from '../../components/dashboard/PageHeader';
import { RoleBadge } from '../../components/dashboard/RoleBadge';
import { StatCard } from '../../components/dashboard/StatCard';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { useTeamSummary } from '../../dashboard/TeamSummaryContext';
import { formatRole } from '../../utils/format';

/** Renders an ISO timestamp as a short, locale-aware date. */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Team & invitations: the company admin's control centre for bringing HR
 * managers and interviewers onto the platform (PB-003 / PB-004).
 *
 * <p>Backed by the real invitations API. The tenant is never sent — the
 * backend derives it from the access token — so this page cannot address
 * another company's workspace even if asked to.</p>
 */
export function TeamPage() {
  const { user } = useAuth();
  const allow = useCan();

  // Roster comes from the shared provider, so navigating between dashboard
  // pages no longer re-fetches the same list the sidebar already holds.
  const { members, loading, error: loadError, refresh } = useTeamSummary();

  // Action failures are separate from load failures: a failed invite must not
  // blank the table that loaded fine.
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resentIds, setResentIds] = useState<Set<string>>(new Set());

  const error = actionError ?? loadError;

  // The signed-in admin is already in this list; everyone else is a teammate.
  const others = members.filter((member) => member.id !== user?.id);
  const activeMembers = others.filter((member) => member.status === 'ACTIVE');
  const pendingInvites = others.filter((member) => member.status === 'INVITED');

  const hrCount = activeMembers.filter((m) => m.role === 'HR_MANAGER').length;
  const interviewerCount = activeMembers.filter((m) => m.role === 'INTERVIEWER').length;
  // The signed-in admin is rendered as the first row, so they count too.
  const memberCount = activeMembers.length + (user ? 1 : 0);

  async function handleInvite(values: InviteFormValues) {
    setActionError(null);
    try {
      await teamApi.invite({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        role: values.role,
      });
      setInviteOpen(false);
      setNotice(`Invitation sent to ${values.email} as ${formatRole(values.role)}.`);
      await refresh();
    } catch (err: unknown) {
      setActionError(apiErrorMessage(err, 'We could not send that invitation.'));
    }
  }

  async function handleResend(userId: string) {
    setBusyId(userId);
    setActionError(null);
    try {
      await teamApi.resend(userId);
      setResentIds((current) => new Set(current).add(userId));
    } catch (err: unknown) {
      setActionError(apiErrorMessage(err, 'We could not re-send that invitation.'));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRevoke(userId: string) {
    setBusyId(userId);
    setActionError(null);
    try {
      await teamApi.revoke(userId);
      await refresh();
    } catch (err: unknown) {
      setActionError(apiErrorMessage(err, 'We could not revoke that invitation.'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Team & invitations"
        subtitle="Manage who can access your hiring workspace and what they can do."
      >
        {allow('team.invite') && (
          <Button variant="primary" onClick={() => setInviteOpen(true)}>
            <Icon name="user-plus" className="h-4 w-4" />
            Invite member
          </Button>
        )}
      </PageHeader>

      {notice && (
        <Alert tone="success" onDismiss={() => setNotice(null)} className="mb-6">
          {notice}
        </Alert>
      )}

      {error && (
        <Alert tone="error" className="mb-6">
          {error}
        </Alert>
      )}

      <div className="grid gap-5 sm:grid-cols-3">
        <StatCard label="HR Managers" value={String(hrCount)} icon="briefcase" tone="indigo" />
        <StatCard label="Interviewers" value={String(interviewerCount)} icon="identification" tone="violet" />
        <StatCard label="Pending invites" value={String(pendingInvites.length)} icon="envelope" tone="amber" />
      </div>

      {/* Members */}
      <Card
        title="Members"
        subtitle={
          loading
            ? 'Loading…'
            : `${memberCount} ${memberCount === 1 ? 'person has' : 'people have'} workspace access`
        }
        className="mt-6"
        bodyClassName="overflow-x-auto"
      >
        <table className="min-w-full divide-y divide-slate-100 text-left">
          <thead className="bg-slate-50/70">
            <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th scope="col" className="px-6 py-3.5">Member</th>
              <th scope="col" className="px-6 py-3.5">Role</th>
              <th scope="col" className="px-6 py-3.5">Status</th>
              <th scope="col" className="px-6 py-3.5">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* The signed-in admin always leads the list. */}
            {user && (
              <tr className="bg-indigo-50/40">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar firstName={user.firstName} lastName={user.lastName} size="sm" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {user.firstName} {user.lastName}
                        <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                          You
                        </span>
                      </p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-6 py-4"><Badge tone="emerald">Active</Badge></td>
                <td className="px-6 py-4 text-sm text-slate-500">Owner</td>
              </tr>
            )}
            {activeMembers.map((member) => (
              <tr key={member.id} className="transition-colors hover:bg-slate-50/70">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar firstName={member.firstName} lastName={member.lastName} size="sm" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <RoleBadge role={member.role} />
                </td>
                <td className="px-6 py-4"><Badge tone="emerald">Active</Badge></td>
                <td className="px-6 py-4 text-sm text-slate-500">{formatDate(member.createdAt)}</td>
              </tr>
            ))}
            {/* Skeleton rows: the table previously rendered empty while
                loading, which read as "no teammates" until the fetch landed. */}
            {loading &&
              [0, 1, 2].map((row) => (
                <tr key={`skeleton-${row}`} aria-hidden="true">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-200" />
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-32 animate-pulse rounded bg-slate-200" />
                        <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><div className="h-5 w-24 animate-pulse rounded-full bg-slate-100" /></td>
                  <td className="px-6 py-4"><div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" /></td>
                  <td className="px-6 py-4"><div className="h-3.5 w-20 animate-pulse rounded bg-slate-100" /></td>
                </tr>
              ))}
            {!loading && activeMembers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <Icon name="users" className="h-6 w-6" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-slate-900">No teammates yet</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Invite an HR manager or interviewer to get started.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Pending invitations */}
      <Card
        title="Pending invitations"
        subtitle="People who haven't accepted yet — invitations expire after 7 days"
        className="mt-6"
        bodyClassName={pendingInvites.length === 0 ? 'p-10 text-center' : 'divide-y divide-slate-100'}
      >
        {pendingInvites.length === 0 ? (
          <div>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Icon name="check" className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-900">All caught up</p>
            <p className="mt-1 text-sm text-slate-500">No outstanding invitations right now.</p>
          </div>
        ) : (
          pendingInvites.map((invite) => {
            const resent = resentIds.has(invite.id);
            const busy = busyId === invite.id;
            return (
              <div
                key={invite.id}
                className="flex flex-wrap items-center gap-4 px-6 py-4 transition-colors first:pt-5 last:pb-5 hover:bg-slate-50/70"
              >
                <Avatar firstName={invite.firstName} lastName={invite.lastName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {invite.firstName} {invite.lastName}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {invite.email} · invited {formatDate(invite.createdAt)}
                  </p>
                </div>
                <RoleBadge role={invite.role} />
                {allow('team.invite.manage') && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={resent ? 'ghost' : 'secondary'}
                      onClick={() => void handleResend(invite.id)}
                      disabled={resent || busy}
                      className={resent ? 'cursor-default bg-emerald-50 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700' : ''}
                    >
                      <Icon name={resent ? 'check' : 'send'} className="h-3.5 w-3.5" />
                      {resent ? 'Sent' : 'Resend'}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => void handleRevoke(invite.id)}
                      disabled={busy}
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" />
                      Revoke
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </Card>

      {allow('team.invite') && (
        <InviteMemberModal
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          onInvite={(values) => void handleInvite(values)}
        />
      )}
    </>
  );
}

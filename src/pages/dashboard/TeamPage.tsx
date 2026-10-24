import {
  IdcardOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SolutionOutlined,
  TeamOutlined,
  ToolOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { Col, Divider, Flex, Row, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { teamApi } from '../../api/team';
import type { InviteUserRequest, RoleResponse } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { useCan } from '../../auth/useCan';
import { Card } from '../../components/dashboard/Card';
import { EmptyState } from '../../components/dashboard/EmptyState';
import {
  InviteMemberModal,
  type InviteFormValues,
  type InviteRoleOption,
} from '../../components/dashboard/InviteMemberModal';
import { PageHeader } from '../../components/dashboard/PageHeader';
import { StatCard } from '../../components/dashboard/StatCard';
import { TeamRosterTable } from '../../components/dashboard/TeamRosterTable';
import { TeamSectionNav } from '../../components/dashboard/TeamSectionNav';
import { TeamToolbar } from '../../components/dashboard/TeamToolbar';
import { ChangeRoleDialog } from '../../components/roles/ChangeRoleDialog';
import { Alert, type AlertTone } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { heldPermissions, isWorkspaceOwner, roleUnavailableReason, type RoleChoice } from '../../dashboard/roleEditor';
import { describeRoleError } from '../../dashboard/roleErrors';
import { describeTeamError, type TeamAction } from '../../dashboard/teamErrors';
import { useTeamRoster, type RosterRow } from '../../dashboard/teamRoster';
import { useTeamSummary } from '../../dashboard/TeamSummaryContext';
import { useResendLog } from '../../dashboard/useResendLog';
import { usePermissionCatalogue, useWorkspaceRoles } from '../../dashboard/useWorkspaceRoles';

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
 *
 * <p>With company roles (ADR-9) invitations offer the workspace's own roles,
 * and someone who may manage members can move a person to another role from
 * their row. On a server older than roles neither is offered and the page
 * keeps the two fixed roles it always had.</p>
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
  const [pendingChange, setPendingChange] = useState<RosterRow | null>(null);
  const [changeBusy, setChangeBusy] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);

  const workspaceRoles = useWorkspaceRoles();
  const roles = workspaceRoles.roles;
  const catalogue = usePermissionCatalogue(roles.length > 0);
  const held = useMemo(() => heldPermissions(user, catalogue.groups), [user, catalogue.groups]);
  const actorIsOwner = isWorkspaceOwner(user, roles);
  const choices: RoleChoice[] = useMemo(
    () => roles.map((role) => ({ role, unavailable: roleUnavailableReason(role, held, actorIsOwner) })),
    [roles, held, actorIsOwner],
  );

  // `refresh()` flips the shared context back to loading, so without this split
  // every invite and revoke would blink the whole table into skeletons.
  const firstLoad = loading && members.length === 0;
  const refreshing = loading && members.length > 0;

  const canManage = allow('team.invite.manage');
  const canInvite = allow('team.invite');
  const rolesKnown = roles.length > 0;
  const canMoveMembers = allow('team.manage') && rolesKnown;

  /** Someone who can do more than you can is not yours to move — the server's rule, shown early. */
  function canChangeRole(row: RosterRow): boolean {
    if (!canMoveMembers || row.isSelf) {
      return false;
    }
    const current = choices.find((choice) => choice.role.id === row.roleId);
    return !current?.unavailable;
  }

  // Owner is never offered: invitations can't make someone an Owner.
  const inviteRoles: InviteRoleOption[] = choices
    .filter(({ role }) => !role.locked)
    .map(({ role, unavailable }) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissionCount: role.permissions.length,
      unavailable,
      suggested: role.systemRole === 'RECRUITER',
    }));

  const activeCount = roster.rows.filter((row) => row.status === 'ACTIVE').length;
  const hrCount = roster.rows.filter((r) => r.status === 'ACTIVE' && r.role === 'HR_MANAGER').length;
  const interviewerCount = roster.rows.filter(
    (r) => r.status === 'ACTIVE' && r.role === 'INTERVIEWER',
  ).length;
  const pendingCount = roster.rows.filter((row) => row.status === 'INVITED').length;
  const kpi = (value: number) => (firstLoad ? '—' : String(value));
  const customCount = roles.filter((role) => role.systemRole === null).length;

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
    const request: InviteUserRequest = values.roleId
      ? { firstName: values.firstName, lastName: values.lastName, email: values.email, roleId: values.roleId }
      : { firstName: values.firstName, lastName: values.lastName, email: values.email, role: values.role };
    try {
      await teamApi.invite(request);
      // Refresh before closing so the new row is already on screen when the
      // dialog disappears — no gap where nothing seems to have happened.
      await refresh();
      setInviteOpen(false);
      setMessage({
        tone: 'success',
        text: `Invitation sent to ${values.email}. They'll join as ${values.roleLabel} once they accept — the link expires in 7 days.`,
      });
    } catch (err: unknown) {
      await handleFailure(err, 'invite');
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function handleChangeRole(row: RosterRow, role: RoleResponse) {
    setMessage(null);
    setChangeError(null);
    setChangeBusy(true);
    try {
      await teamApi.changeRole(row.id, role.id);
      // Both lists change: the member's row, and the two roles' member counts.
      await Promise.all([refresh(), workspaceRoles.refresh()]);
      setPendingChange(null);
      setMessage({
        tone: 'success',
        text:
          row.status === 'INVITED'
            ? `${row.fullName} will join as ${role.name}.`
            : `${row.fullName} is now ${role.name}. Their access changed straight away.`,
      });
    } catch (err: unknown) {
      const plan = describeRoleError(err, 'assign');
      if (plan.notFound || plan.refetch) {
        setPendingChange(null);
        setMessage({ tone: plan.tone, text: plan.message });
        await Promise.all([refresh(), workspaceRoles.refresh()]);
      } else {
        setChangeError(plan.message);
      }
    } finally {
      setChangeBusy(false);
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
    <Button
      variant="primary"
      onClick={() => setInviteOpen(true)}
      icon={<UserAddOutlined aria-hidden className="text-[16px]" />}
    >
      Invite member
    </Button>
  ) : null;

  // The table is only ever truly empty because the filters excluded everyone —
  // GET /team always returns the caller, so a zero-length array means the load
  // failed rather than that the workspace is empty.
  const empty = (
    <EmptyState
      icon={SearchOutlined}
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
        title="Team & invitations"
        subtitle="Manage who can access your hiring workspace and what they can do."
      >
        {inviteButton}
      </PageHeader>

      <TeamSectionNav counts={{ members: firstLoad ? undefined : roster.rows.length, roles: roles.length || undefined }} />

      {/* Load and action failures keep separate slots: a rejected invite must
          not blank a roster that loaded perfectly well. */}
      {loadError && (
        <Alert tone="error" className="mb-6">
          <Flex wrap align="center" justify="space-between" gap={12}>
            <span>{loadError}</span>
            <Button size="sm" variant="secondary" onClick={() => void refresh()}>
              Try again
            </Button>
          </Flex>
        </Alert>
      )}

      {message && (
        <Alert tone={message.tone} onDismiss={() => setMessage(null)} className="mb-6">
          {message.text}
        </Alert>
      )}

      <Row gutter={[20, 20]}>
        <Col xs={12} xl={6}>
          <StatCard label="Workspace access" value={kpi(activeCount)} icon={TeamOutlined} />
        </Col>
        {/* With company roles a count per fixed role says little — a custom
            role holds people too — so the tiles count the roles instead. */}
        {rolesKnown ? (
          <>
            <Col xs={12} xl={6}>
              <StatCard label="Roles" value={String(roles.length)} icon={SafetyCertificateOutlined} />
            </Col>
            <Col xs={12} xl={6}>
              <StatCard label="Custom roles" value={String(customCount)} icon={ToolOutlined} />
            </Col>
          </>
        ) : (
          <>
            <Col xs={12} xl={6}>
              <StatCard label="HR Managers" value={kpi(hrCount)} icon={SolutionOutlined} />
            </Col>
            <Col xs={12} xl={6}>
              <StatCard label="Interviewers" value={kpi(interviewerCount)} icon={IdcardOutlined} />
            </Col>
          </>
        )}
        <Col xs={12} xl={6}>
          <StatCard label="Pending invites" value={kpi(pendingCount)} icon={MailOutlined} />
        </Col>
      </Row>

      {/* Disabled and unverified accounts live outside Active and Pending, so
          say where they went rather than letting them look deleted. */}
      {roster.otherCount > 0 && roster.segment !== 'all' && (
        <Alert tone="info" className="mt-6">
          {roster.otherCount === 1
            ? '1 account is disabled or awaiting email verification.'
            : `${roster.otherCount} accounts are disabled or awaiting email verification.`}{' '}
          <button type="button" onClick={() => roster.setSegment('all')} className="tp-link-button">
            Show all
          </button>{' '}
          to see them.
        </Alert>
      )}

      <div className="mt-6">
        <Card bodyClassName="tp-roster-body px-0 pt-5 pb-2">
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
            canChangeRole={canChangeRole}
            onChangeRole={(row) => {
              setChangeError(null);
              setPendingChange(row);
            }}
            firstLoad={firstLoad}
            refreshing={refreshing}
            empty={empty}
          />

          {soloAdmin && (
            <>
              <Divider className="my-0" />
              <EmptyState
                icon={TeamOutlined}
                title="You're the only person here"
                description={
                  rolesKnown
                    ? 'Invite a teammate with one of your roles to start sharing the hiring work.'
                    : 'Invite an HR manager or an interviewer to start sharing the hiring work.'
                }
                action={inviteButton}
              />
            </>
          )}
        </Card>
      </div>

      {/* Mounted only while open, so each invite starts from a clean form. */}
      {canInvite && inviteOpen && (
        <InviteMemberModal
          open
          roles={inviteRoles}
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

      <ChangeRoleDialog
        member={pendingChange}
        choices={choices}
        catalogue={catalogue.groups}
        busy={changeBusy}
        error={changeError}
        onConfirm={(row, role) => void handleChangeRole(row, role)}
        onCancel={() => setPendingChange(null)}
      />

      <ConfirmDialog
        open={pendingRevoke !== null}
        title="Revoke this invitation?"
        description={
          <>
            <Typography.Text strong>{pendingRevoke?.fullName}</Typography.Text> ({pendingRevoke?.email})
            will be removed from your workspace and their invitation link will stop working
            immediately. This can&apos;t be undone — you&apos;d have to invite them again.
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

import { PlusOutlined, ToolOutlined } from '@ant-design/icons';
import { Skeleton, Tooltip } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { rolesApi } from '../../api/roles';
import type { RoleResponse, UserResponse } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { useCan } from '../../auth/useCan';
import { ErrorState } from '../../components/dashboard/ErrorState';
import { PageHeader } from '../../components/dashboard/PageHeader';
import { TeamSectionNav } from '../../components/dashboard/TeamSectionNav';
import { VacancyNotice, type VacancyNoticeValue } from '../../components/jobs/VacancyNotice';
import { DeleteRoleDialog, type RoleChoice } from '../../components/roles/DeleteRoleDialog';
import { RoleCard } from '../../components/roles/RoleCard';
import { Button } from '../../components/ui/Button';
import {
  heldPermissions,
  isWorkspaceOwner,
  MAX_CUSTOM_ROLES,
  roleUnavailableReason,
} from '../../dashboard/roleEditor';
import { describeRoleError } from '../../dashboard/roleErrors';
import { useTeamSummary } from '../../dashboard/TeamSummaryContext';
import { usePermissionCatalogue, useWorkspaceRoles } from '../../dashboard/useWorkspaceRoles';

const NOTICE_ID = 'roles-notice';

function CardSkeleton() {
  return (
    <div aria-hidden="true" className="rounded-2xl border border-slate-200 bg-surface p-5">
      <Skeleton avatar={{ shape: 'square' }} active title={{ width: '50%' }} paragraph={{ rows: 4 }} />
    </div>
  );
}

/**
 * Roles & permissions: what each kind of member may do in this workspace
 * (ADR-9).
 *
 * <p>The three defaults come first and are labelled as such, then the
 * company's own roles. Each card shows the role's shape — which areas it
 * reaches — so two roles can be compared without opening either, and who
 * holds it, because that is who a change will affect.</p>
 *
 * <p>Duplicating is the quick way to a new role, so it lands straight in the
 * copy's editor with a note to rename it, rather than leaving an anonymous
 * "(copy)" in the list for someone to find later.</p>
 */
export function RolesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const allow = useCan();
  const canManage = allow('roles.manage');
  const { roles, loading, error, refresh, drop } = useWorkspaceRoles();
  const catalogue = usePermissionCatalogue();
  const { members, refresh: refreshTeam } = useTeamSummary();

  const [notice, setNotice] = useState<VacancyNoticeValue | null>(
    () => (location.state as { notice?: VacancyNoticeValue } | null)?.notice ?? null,
  );
  const noticeRef = useRef<HTMLDivElement>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<RoleResponse | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // A notice handed over by the page before is shown once, then cleared from
  // history, so a reload doesn't announce the same change twice.
  useEffect(() => {
    if ((location.state as { notice?: unknown } | null)?.notice) {
      navigate(location.pathname, { replace: true, state: null });
    }
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (notice) {
      noticeRef.current?.focus();
    }
  }, [notice]);

  const byRole = useMemo(() => {
    const map = new Map<string, UserResponse[]>();
    for (const member of members) {
      if (member.roleId) {
        map.set(member.roleId, [...(map.get(member.roleId) ?? []), member]);
      }
    }
    return map;
  }, [members]);

  const held = useMemo(() => heldPermissions(user, catalogue.groups), [user, catalogue.groups]);
  const actorIsOwner = isWorkspaceOwner(user, roles);
  const choices: RoleChoice[] = useMemo(
    () => roles.map((role) => ({ role, unavailable: roleUnavailableReason(role, held, actorIsOwner) })),
    [roles, held, actorIsOwner],
  );

  const defaults = roles.filter((role) => role.systemRole !== null);
  const custom = roles.filter((role) => role.systemRole === null);
  const atLimit = custom.length >= MAX_CUSTOM_ROLES;
  const firstLoad = (loading && roles.length === 0) || catalogue.loading;

  async function duplicate(role: RoleResponse) {
    setNotice(null);
    setBusyId(role.id);
    try {
      const copy = await rolesApi.duplicate(role.id);
      navigate(`/dashboard/team/roles/${copy.id}`, {
        state: {
          notice: {
            tone: 'success',
            text: `Copied ${role.name} as “${copy.name}”. Give it a name of its own and adjust what it can do.`,
          },
        },
      });
    } catch (err: unknown) {
      const plan = describeRoleError(err, 'duplicate');
      setNotice({ tone: plan.tone, text: plan.message });
      if (plan.refetch) {
        await refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete(role: RoleResponse, reassignTo: string | undefined) {
    setDeleteError(null);
    setBusyId(role.id);
    try {
      await rolesApi.remove(role.id, reassignTo);
      setPendingDelete(null);
      drop(role.id);
      const target = roles.find((candidate) => candidate.id === reassignTo);
      setNotice({
        tone: 'success',
        text: target
          ? `“${role.name}” deleted. ${role.memberCount === 1 ? 'Its member is' : `Its ${role.memberCount} members are`} now ${target.name}.`
          : `“${role.name}” deleted.`,
      });
      // Members moved, and the target role's count changed with them.
      await Promise.all([refresh(), refreshTeam()]);
    } catch (err: unknown) {
      const plan = describeRoleError(err, 'delete');
      if (plan.notFound) {
        setPendingDelete(null);
        setNotice({ tone: plan.tone, text: plan.message });
        await refresh();
      } else {
        setDeleteError(plan.message);
      }
    } finally {
      setBusyId(null);
    }
  }

  const newRole = canManage ? (
    <Tooltip title={atLimit ? `A workspace can have up to ${MAX_CUSTOM_ROLES} custom roles.` : undefined}>
      <span>
        <Button
          variant="primary"
          disabled={atLimit}
          onClick={() => navigate('/dashboard/team/roles/new')}
          icon={<PlusOutlined aria-hidden className="text-[16px]" />}
        >
          New role
        </Button>
      </span>
    </Tooltip>
  ) : null;

  const loadError = error ?? catalogue.error;

  const grid = (list: RoleResponse[]) => (
    <ul className="m-0 grid list-none gap-5 p-0 md:grid-cols-2 2xl:grid-cols-3">
      {list.map((role) => (
        <li key={role.id}>
          <RoleCard
            role={role}
            catalogue={catalogue.groups}
            members={byRole.get(role.id) ?? []}
            canManage={canManage}
            busy={busyId === role.id}
            onDuplicate={(chosen) => void duplicate(chosen)}
            onDelete={(chosen) => {
              setDeleteError(null);
              setPendingDelete(chosen);
            }}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <PageHeader
        title="Roles & permissions"
        subtitle="Decide what each person in your workspace can see and do. Changes apply as soon as they are saved."
      >
        {newRole}
      </PageHeader>

      <TeamSectionNav counts={{ members: members.length || undefined, roles: roles.length || undefined }} />

      {notice && (
        <VacancyNotice ref={noticeRef} id={NOTICE_ID} notice={notice} onDismiss={() => setNotice(null)} />
      )}

      {loadError && !firstLoad && roles.length === 0 ? (
        <ErrorState
          title="We couldn't load your roles"
          description={loadError}
          onRetry={() => {
            void refresh();
            void catalogue.refresh();
          }}
        />
      ) : (
        <>
          <section aria-labelledby="roles-defaults">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id="roles-defaults" className="tp-legend m-0">
                Default roles
              </h2>
              <p className="m-0 text-caption text-slate-500">Every workspace starts with these. Owner can&apos;t be changed.</p>
            </div>
            {firstLoad ? (
              <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : (
              grid(defaults)
            )}
          </section>

          <section aria-labelledby="roles-custom" className="mt-8">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id="roles-custom" className="tp-legend m-0">
                Your roles
              </h2>
              {!firstLoad && (
                <p className="m-0 text-caption tabular-nums text-slate-500">
                  {custom.length} of {MAX_CUSTOM_ROLES}
                </p>
              )}
            </div>
            {!firstLoad && custom.length > 0 && grid(custom)}
            {!firstLoad && custom.length === 0 && (
              <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-slate-300 bg-canvas p-6 sm:flex-row sm:items-center">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface text-primary-600 shadow-xs">
                  <ToolOutlined aria-hidden className="text-[20px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 font-semibold text-slate-900">Shape a role around how your team works</p>
                  <p className="m-0 mt-0.5 text-small text-slate-600">
                    For example, a Hiring Coordinator who organises interviews and moves applicants on, but can&apos;t
                    publish vacancies. Start from scratch, or duplicate a default role and adjust it.
                  </p>
                </div>
                {newRole}
              </div>
            )}
          </section>
        </>
      )}

      <DeleteRoleDialog
        role={pendingDelete}
        choices={choices}
        busy={pendingDelete !== null && busyId === pendingDelete.id}
        error={deleteError}
        onConfirm={(role, reassignTo) => void confirmDelete(role, reassignTo)}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

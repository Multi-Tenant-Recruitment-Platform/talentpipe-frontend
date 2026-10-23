import {
  ArrowLeftOutlined,
  CopyOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  LockOutlined,
  MinusOutlined,
  PlusOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Flex, Input, Select, Skeleton, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { rolesApi } from '../../api/roles';
import type { RoleResponse } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { useCan } from '../../auth/useCan';
import { Avatar } from '../../components/dashboard/Avatar';
import { Card } from '../../components/dashboard/Card';
import { ErrorState } from '../../components/dashboard/ErrorState';
import { PageHeader } from '../../components/dashboard/PageHeader';
import { TeamSectionNav } from '../../components/dashboard/TeamSectionNav';
import { VacancyNotice, type VacancyNoticeValue } from '../../components/jobs/VacancyNotice';
import { DeleteRoleDialog, type RoleChoice } from '../../components/roles/DeleteRoleDialog';
import { PermissionCoverage } from '../../components/roles/PermissionCoverage';
import { PermissionPicker } from '../../components/roles/PermissionPicker';
import { RoleKindBadge, RoleMark } from '../../components/roles/RoleCard';
import { Alert, type AlertTone } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FieldError } from '../../components/ui/FieldError';
import {
  allPermissions,
  diffPermissions,
  EMPTY_ROLE_VALUES,
  heldPermissions,
  isRoleDirty,
  isWorkspaceOwner,
  missingFrom,
  permissionIndex,
  permissionLabel,
  ROLE_DESCRIPTION_MAX,
  ROLE_MESSAGES,
  ROLE_NAME_MAX,
  roleUnavailableReason,
  toRoleFormValues,
  toRoleRequest,
  validateRole,
  type RoleErrors,
  type RoleField,
  type RoleFormValues,
} from '../../dashboard/roleEditor';
import { describeRoleError } from '../../dashboard/roleErrors';
import { useTeamSummary } from '../../dashboard/TeamSummaryContext';
import { usePermissionCatalogue, useWorkspaceRoles } from '../../dashboard/useWorkspaceRoles';

type EditorMode = 'create' | 'edit';

interface FormNotice {
  tone: AlertTone;
  text: string;
  action?: { label: string; run: () => void };
}

const FIELD_ID: Record<RoleField, string> = { name: 'role-name', description: 'role-description' };
const BLANK_START = '__blank__';
const NOTICE_ID = 'role-editor-notice';
const PEOPLE_SHOWN = 6;

/** Loads one role for the editor, and reloads it on demand (after a stale save). */
function useRole(id: string | undefined) {
  const [role, setRole] = useState<RoleResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async (): Promise<RoleResponse | null> => {
    if (!id) {
      return null;
    }
    setLoading(true);
    try {
      const loaded = await rolesApi.get(id);
      setRole(loaded);
      setError(null);
      setNotFound(false);
      return loaded;
    } catch (err: unknown) {
      const plan = describeRoleError(err, 'load');
      setNotFound(Boolean(plan.notFound));
      setError(plan.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return { role, setRole, loading, error, notFound, load };
}

/** A permission chip in the changes list: what a save would add or take away. */
function ChangeChip({ kind, children }: Readonly<{ kind: 'gained' | 'lost'; children: ReactNode }>) {
  const Glyph = kind === 'gained' ? PlusOutlined : MinusOutlined;
  return (
    <li
      className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-caption font-medium ${
        kind === 'gained' ? 'bg-success-bg text-success-text' : 'bg-error-bg text-error-text'
      }`}
    >
      <Glyph aria-hidden className="text-[10px]" />
      <span className="sr-only">{kind === 'gained' ? 'Adds' : 'Removes'} </span>
      {children}
    </li>
  );
}

/**
 * Creating, editing and reading one role (ADR-9).
 *
 * <p>One page for all three, because they are the same picture: the role's
 * name, what it is for, and the permissions it grants. What changes is
 * whether the controls are live. Someone who may only view roles, the Owner
 * role (which always holds everything) and a role that can do things the
 * signed-in member cannot (which the server would refuse to let them touch)
 * all read the same list as ticks and dashes, with a line saying why.</p>
 *
 * <p>The aside is the role as it will be once saved — how far it reaches, what
 * this edit adds and removes, and the people it will change things for — so
 * the consequence of Save is in view before it is pressed.</p>
 *
 * <p>Saves carry the version the editor loaded. When someone else saved first
 * the server answers 409, and the editor offers their version rather than a
 * retry that could only fail the same way.</p>
 */
export function RoleEditorPage({ mode }: Readonly<{ mode: EditorMode }>) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const allow = useCan();
  const canManage = allow('roles.manage');

  const catalogue = usePermissionCatalogue();
  const workspace = useWorkspaceRoles();
  const { members, refresh: refreshTeam } = useTeamSummary();
  const loaded = useRole(mode === 'edit' ? id : undefined);
  const role = loaded.role;

  const [initial, setInitial] = useState<RoleFormValues>(EMPTY_ROLE_VALUES);
  const [values, setValues] = useState<RoleFormValues>(EMPTY_ROLE_VALUES);
  const [startFrom, setStartFrom] = useState(BLANK_START);
  const [touched, setTouched] = useState<ReadonlySet<RoleField>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [serverErrors, setServerErrors] = useState<RoleErrors>({});
  const [formNotice, setFormNotice] = useState<FormNotice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);

  const [notice, setNotice] = useState<VacancyNoticeValue | null>(
    () => (location.state as { notice?: VacancyNoticeValue } | null)?.notice ?? null,
  );
  const noticeRef = useRef<HTMLDivElement>(null);
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

  // The form follows the role whenever a new copy of it arrives: first load,
  // a save, or loading someone else's newer version.
  useEffect(() => {
    if (role) {
      const next = toRoleFormValues(role);
      setInitial(next);
      setValues(next);
      setTouched(new Set());
      setShowAll(false);
      setServerErrors({});
    }
  }, [role]);

  /* --- What the signed-in member may do here ------------------------------ */

  const groups = catalogue.groups;
  const index = useMemo(() => permissionIndex(groups), [groups]);
  const total = allPermissions(groups).length;
  const held = useMemo(() => heldPermissions(user, groups), [user, groups]);
  const actorIsOwner = isWorkspaceOwner(user, workspace.roles);
  const beyondMe = role ? missingFrom(role.permissions, held) : [];

  let readOnlyReason: ReactNode = null;
  if (!canManage) {
    readOnlyReason = "You can see this role, but changing roles isn't part of yours.";
  } else if (role?.locked) {
    readOnlyReason =
      'The Owner role always holds every permission, so it can’t be edited — that way a workspace can never lock everyone out.';
  } else if (beyondMe.length > 0) {
    readOnlyReason = (
      <>
        This role can do things yours can&apos;t ({beyondMe.map((key) => permissionLabel(key, index)).join(', ')}), so
        only someone who holds those permissions can change it.
      </>
    );
  }
  const readOnly = mode === 'edit' && readOnlyReason !== null;

  /* --- Validation ---------------------------------------------------------- */

  const takenNames = useMemo(
    () => workspace.roles.filter((existing) => existing.id !== role?.id).map((existing) => existing.name),
    [workspace.roles, role?.id],
  );
  const errors: RoleErrors = useMemo(
    () => ({ ...validateRole(values, takenNames), ...serverErrors }),
    [values, takenNames, serverErrors],
  );
  const visibleErrors: RoleErrors = {};
  for (const field of Object.keys(errors) as RoleField[]) {
    if (showAll || touched.has(field) || serverErrors[field]) {
      visibleErrors[field] = errors[field];
    }
  }
  const issueCount = Object.keys(errors).length;
  const dirty = isRoleDirty(values, initial);
  const changes = diffPermissions(initial.permissions, values.permissions, groups);

  function change(next: Partial<RoleFormValues>) {
    const cleared = { ...serverErrors };
    for (const field of Object.keys(next) as (keyof RoleFormValues)[]) {
      if (field === 'name' || field === 'description') {
        delete cleared[field];
      }
    }
    setServerErrors(cleared);
    setValues((current) => ({ ...current, ...next }));
    setFormNotice(null);
  }

  function touch(field: RoleField) {
    setTouched((current) => (current.has(field) ? current : new Set(current).add(field)));
  }

  /* --- Leaving with unsaved work ------------------------------------------- */

  useEffect(() => {
    if (!dirty || submitting) {
      return undefined;
    }
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, submitting]);

  function leave() {
    if (dirty && !readOnly) {
      setConfirmLeave(true);
    } else {
      navigate('/dashboard/team/roles');
    }
  }

  /* --- Save ---------------------------------------------------------------- */

  const focusAfterSave = useRef<RoleField | null>(null);
  useEffect(() => {
    if (!submitting && focusAfterSave.current) {
      document.getElementById(FIELD_ID[focusAfterSave.current])?.focus();
      focusAfterSave.current = null;
    }
  }, [submitting]);

  async function reloadLatest() {
    setFormNotice(null);
    const latest = await loaded.load();
    if (latest) {
      workspace.apply(latest);
      setNotice({ tone: 'info', text: 'This is the latest version of the role. Make your changes again from here.' });
    }
  }

  async function save() {
    if (submitting || readOnly) {
      return;
    }
    if (issueCount > 0) {
      setShowAll(true);
      const first = (['name', 'description'] as RoleField[]).find((field) => errors[field]);
      if (first) {
        document.getElementById(FIELD_ID[first])?.focus();
      }
      return;
    }
    setSubmitting(true);
    setFormNotice(null);
    setNotice(null);
    try {
      if (mode === 'create') {
        const created = await rolesApi.create(toRoleRequest(values, groups));
        workspace.apply(created);
        navigate(`/dashboard/team/roles/${created.id}`, {
          replace: true,
          state: {
            notice: {
              tone: 'success',
              text: `“${created.name}” created. Invite people with it, or move someone to it from Members.`,
            },
          },
        });
        return;
      }
      if (!role) {
        return;
      }
      const saved = await rolesApi.update(role.id, toRoleRequest(values, groups, role.version));
      loaded.setRole(saved);
      workspace.apply(saved);
      setNotice({
        tone: 'success',
        text:
          saved.memberCount > 0
            ? `Saved. ${saved.memberCount === 1 ? 'The person' : `The ${saved.memberCount} people`} with this role can do exactly this from now on.`
            : 'Saved.',
      });
      if (saved.name !== role.name) {
        // Names on the roster come from the role.
        void refreshTeam();
      }
    } catch (err: unknown) {
      const plan = describeRoleError(err, mode === 'create' ? 'create' : 'save');
      if (plan.nameTaken) {
        setServerErrors({ name: ROLE_MESSAGES.nameTaken });
        focusAfterSave.current = 'name';
      } else if (plan.stale) {
        setFormNotice({
          tone: 'warning',
          text: plan.message,
          action: { label: 'Load their version', run: () => void reloadLatest() },
        });
      } else {
        setFormNotice({
          tone: plan.tone,
          text: plan.message,
          action: plan.retry ? { label: 'Try again', run: () => void save() } : undefined,
        });
        if (plan.refetch) {
          void workspace.refresh();
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  /* --- Duplicate and delete ------------------------------------------------ */

  async function duplicate() {
    if (!role) {
      return;
    }
    setDuplicating(true);
    setNotice(null);
    try {
      const copy = await rolesApi.duplicate(role.id);
      workspace.apply(copy);
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
    } finally {
      setDuplicating(false);
    }
  }

  const choices: RoleChoice[] = useMemo(
    () =>
      workspace.roles.map((candidate) => ({
        role: candidate,
        unavailable: roleUnavailableReason(candidate, held, actorIsOwner),
      })),
    [workspace.roles, held, actorIsOwner],
  );

  async function confirmDelete(target: RoleResponse, reassignTo: string | undefined) {
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await rolesApi.remove(target.id, reassignTo);
      void refreshTeam();
      const moved = workspace.roles.find((candidate) => candidate.id === reassignTo);
      navigate('/dashboard/team/roles', {
        replace: true,
        state: {
          notice: {
            tone: 'success',
            text: moved
              ? `“${target.name}” deleted. ${target.memberCount === 1 ? 'Its member is' : `Its ${target.memberCount} members are`} now ${moved.name}.`
              : `“${target.name}” deleted.`,
          },
        },
      });
    } catch (err: unknown) {
      setDeleteError(describeRoleError(err, 'delete').message);
      setDeleteBusy(false);
    }
  }

  /* --- Render -------------------------------------------------------------- */

  const firstLoad = catalogue.loading || (mode === 'edit' && loaded.loading && !role);

  if (mode === 'edit' && !role && !loaded.loading && (loaded.notFound || loaded.error)) {
    return (
      <>
        <PageHeader title="Role" />
        <TeamSectionNav />
        <ErrorState
          title={loaded.notFound ? 'This role no longer exists' : "We couldn't load this role"}
          description={loaded.notFound ? 'Someone may have deleted it. Its members were moved to another role.' : (loaded.error ?? '')}
          onRetry={loaded.notFound ? undefined : () => void loaded.load()}
          action={
            <Link to="/dashboard/team/roles" className="tp-link-button">
              Back to roles
            </Link>
          }
        />
      </>
    );
  }

  const title = mode === 'create' ? 'New role' : (role?.name ?? 'Role');
  const subtitle =
    mode === 'create'
      ? 'Name the role, then choose what the people who hold it can see and do.'
      : (role?.description ?? 'What the people who hold this role can see and do.');
  const holders = role ? members.filter((member) => member.roleId === role.id) : [];
  const shownPermissions = role?.locked ? new Set(allPermissions(groups).map((p) => p.key)) : values.permissions;
  const count = role?.locked ? total : values.permissions.size;

  let saveStatus = dirty ? 'Unsaved changes' : 'No unsaved changes';
  if (mode === 'create') {
    saveStatus = `${values.permissions.size} of ${total} permissions chosen`;
  }
  let saveLabel = mode === 'create' ? 'Create role' : 'Save changes';
  if (submitting) {
    saveLabel = 'Saving…';
  }

  const below = (field: RoleField, hint: string) =>
    visibleErrors[field] ? (
      <FieldError id={`${FIELD_ID[field]}-error`}>{visibleErrors[field]}</FieldError>
    ) : (
      <Typography.Text id={`${FIELD_ID[field]}-hint`} type="secondary" className="mt-1.5 block pe-20 text-caption">
        {hint}
      </Typography.Text>
    );

  const aria = (field: RoleField) => ({
    id: FIELD_ID[field],
    'aria-invalid': visibleErrors[field] ? true : undefined,
    'aria-describedby': visibleErrors[field] ? `${FIELD_ID[field]}-error` : `${FIELD_ID[field]}-hint`,
  });

  return (
    <section>
      <PageHeader title={title} subtitle={subtitle}>
        <Button
          variant="ghost"
          onClick={leave}
          icon={<ArrowLeftOutlined aria-hidden className="text-[14px]" />}
        >
          Back to roles
        </Button>
        {mode === 'edit' && canManage && role && (
          <Button
            variant="secondary"
            loading={duplicating}
            disabled={duplicating || submitting}
            onClick={() => void duplicate()}
            icon={<CopyOutlined aria-hidden className="text-[14px]" />}
          >
            Duplicate
          </Button>
        )}
      </PageHeader>

      <TeamSectionNav />

      {notice && (
        <VacancyNotice ref={noticeRef} id={NOTICE_ID} notice={notice} onDismiss={() => setNotice(null)} />
      )}

      {firstLoad ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <output className="sr-only">Loading the role…</output>
          <div aria-hidden="true" className="flex flex-col gap-5">
            <Card>
              <Skeleton active paragraph={{ rows: 3 }} />
            </Card>
            <Card>
              <Skeleton active paragraph={{ rows: 8 }} />
            </Card>
          </div>
          <div aria-hidden="true">
            <Card>
              <Skeleton active paragraph={{ rows: 5 }} />
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid items-start gap-6 *:min-w-0 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
          <form
            noValidate
            aria-label={mode === 'create' ? 'New role' : `Role ${role?.name ?? ''}`}
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            {readOnly && (
              <Alert tone="info" className="mb-5">
                <span className="inline-flex items-start gap-2">
                  <LockOutlined aria-hidden className="mt-1 text-[13px]" />
                  <span>{readOnlyReason}</span>
                </span>
              </Alert>
            )}
            {catalogue.error && (
              <Alert tone="error" className="mb-5">
                <Flex wrap align="center" justify="space-between" gap={12}>
                  <span>{catalogue.error}</span>
                  <Button size="sm" variant="secondary" onClick={() => void catalogue.refresh()}>
                    Try again
                  </Button>
                </Flex>
              </Alert>
            )}

            <Flex vertical gap={20}>
              {!readOnly && (
                <Card title="Details" subtitle="How the role appears on the team list and in invitations.">
                  <Flex vertical gap={20}>
                    <div>
                      <label htmlFor={FIELD_ID.name} className="mb-1.5 block font-medium">
                        Role name{' '}
                        <span aria-hidden="true" className="font-normal text-slate-400">
                          *
                        </span>
                        <span className="sr-only"> (required)</span>
                      </label>
                      <Input
                        {...aria('name')}
                        value={values.name}
                        maxLength={ROLE_NAME_MAX}
                        showCount
                        disabled={submitting}
                        autoComplete="off"
                        placeholder="e.g. Hiring Coordinator"
                        status={visibleErrors.name ? 'error' : undefined}
                        onChange={(event) => change({ name: event.target.value })}
                        onBlur={() => touch('name')}
                      />
                      {below('name', 'Must be different from your other roles.')}
                    </div>
                    <div>
                      <label htmlFor={FIELD_ID.description} className="mb-1.5 block font-medium">
                        What it&apos;s for
                      </label>
                      <Input.TextArea
                        {...aria('description')}
                        value={values.description}
                        maxLength={ROLE_DESCRIPTION_MAX}
                        showCount
                        autoSize={{ minRows: 2, maxRows: 5 }}
                        disabled={submitting}
                        placeholder="e.g. Organises interviews and keeps applicants moving, without publishing vacancies."
                        status={visibleErrors.description ? 'error' : undefined}
                        onChange={(event) => change({ description: event.target.value })}
                        onBlur={() => touch('description')}
                      />
                      {below('description', 'Optional. Helps whoever invites someone choose the right role.')}
                    </div>
                  </Flex>
                </Card>
              )}

              <Card
                title={readOnly ? 'What this role can do' : 'Permissions'}
                subtitle={
                  readOnly
                    ? undefined
                    : 'Tick what people with this role may do. Anything a permission depends on is included with it.'
                }
              >
                {mode === 'create' && workspace.roles.length > 0 && (
                  <div className="mb-5 flex flex-col gap-2 rounded-xl bg-canvas p-4 sm:flex-row sm:items-center">
                    <label htmlFor="role-start-from" className="shrink-0 font-medium">
                      Start from
                    </label>
                    <Select
                      id="role-start-from"
                      className="min-w-0 flex-1"
                      value={startFrom}
                      disabled={submitting}
                      onChange={(next: string) => {
                        setStartFrom(next);
                        const source = workspace.roles.find((candidate) => candidate.id === next);
                        const keys = source?.locked
                          ? allPermissions(groups).map((permission) => permission.key)
                          : (source?.permissions ?? []);
                        // Only what this member may hand out; the rest would be refused on save.
                        change({ permissions: new Set(keys.filter((key) => held.has(key))) });
                      }}
                      options={[
                        { value: BLANK_START, label: 'Nothing — choose each permission' },
                        ...workspace.roles.map((candidate) => ({
                          value: candidate.id,
                          label: `The permissions of ${candidate.name}`,
                        })),
                      ]}
                    />
                  </div>
                )}

                <PermissionPicker
                  catalogue={groups}
                  selected={values.permissions}
                  onChange={(next) => change({ permissions: next })}
                  canGrant={(key) => held.has(key)}
                  readOnly={readOnly}
                  disabled={submitting}
                  allGranted={Boolean(role?.locked)}
                />
              </Card>
            </Flex>

            {formNotice && (
              <Alert tone={formNotice.tone} onDismiss={() => setFormNotice(null)} className="mt-5">
                <Flex wrap align="center" justify="space-between" gap={12}>
                  <span>{formNotice.text}</span>
                  {formNotice.action && (
                    <Button size="sm" variant="secondary" onClick={formNotice.action.run} disabled={submitting}>
                      {formNotice.action.label}
                    </Button>
                  )}
                </Flex>
              </Alert>
            )}

            {!readOnly && (
              <div className="sticky bottom-0 z-15 mt-5 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white/92 px-4 py-3 shadow-md backdrop-blur-[10px]">
                <div className="max-sm:basis-full" aria-live="polite">
                  {Object.keys(visibleErrors).length > 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-small font-medium text-error-text">
                      <WarningOutlined aria-hidden className="text-[14px]" />
                      {issueCount === 1 ? '1 issue to fix' : `${issueCount} issues to fix`}
                    </span>
                  ) : (
                    <Typography.Text type="secondary" className="text-small">
                      {saveStatus}
                    </Typography.Text>
                  )}
                </div>
                <div className="ms-auto flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={leave} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={submitting}
                    disabled={submitting || (mode === 'edit' && !dirty)}
                  >
                    {saveLabel}
                  </Button>
                </div>
              </div>
            )}
          </form>

          <aside aria-label="Role summary" className="flex flex-col gap-5 lg:sticky lg:top-6">
            <Card>
              <div className="flex items-center gap-3">
                {role ? (
                  <RoleMark role={role} />
                ) : (
                  <span className="tp-brand-mark size-10 shrink-0 rounded-xl">
                    <PlusOutlined aria-hidden className="text-[18px]" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate font-semibold text-slate-900">
                    {values.name.trim() || (mode === 'create' ? 'Untitled role' : title)}
                  </p>
                  <p className="m-0 text-caption tabular-nums text-slate-500">
                    {count} of {total} permissions
                  </p>
                </div>
                {role && <RoleKindBadge role={role} />}
              </div>
              <div className="mt-4 border-t border-slate-100 pt-4">
                <PermissionCoverage permissions={shownPermissions} catalogue={groups} />
              </div>
            </Card>

            {mode === 'edit' && dirty && !readOnly && (
              <Card title="Unsaved changes">
                {changes.gained.length === 0 && changes.lost.length === 0 ? (
                  <p className="m-0 text-small text-slate-600">The name or description changed; permissions are the same.</p>
                ) : (
                  <ul aria-label="Permission changes" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                    {changes.gained.map((key) => (
                      <ChangeChip key={key} kind="gained">
                        {permissionLabel(key, index)}
                      </ChangeChip>
                    ))}
                    {changes.lost.map((key) => (
                      <ChangeChip key={key} kind="lost">
                        {permissionLabel(key, index)}
                      </ChangeChip>
                    ))}
                  </ul>
                )}
              </Card>
            )}

            {mode === 'edit' && role && (
              <Card title="Who has this role" subtitle={role.memberCount === 1 ? '1 person' : `${role.memberCount} people`}>
                {holders.length > 0 ? (
                  <ul className="m-0 flex list-none flex-col gap-3 p-0">
                    {holders.slice(0, PEOPLE_SHOWN).map((member) => (
                      <li key={member.id} className="flex items-center gap-3">
                        <Avatar firstName={member.firstName} lastName={member.lastName} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-small font-medium text-slate-900">
                            {member.firstName} {member.lastName}
                            {member.id === user?.id && <span className="text-slate-500"> (you)</span>}
                          </span>
                          <span className="block truncate text-caption text-slate-500">{member.email}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 text-small text-slate-600">
                    {role.memberCount === 0
                      ? 'No one holds this role yet. Choose it when you invite someone, or move a member to it.'
                      : 'They are not on the team list you can see.'}
                  </p>
                )}
                {holders.length > PEOPLE_SHOWN && (
                  <p className="m-0 mt-3 text-caption text-slate-500">and {holders.length - PEOPLE_SHOWN} more</p>
                )}
                {!readOnly && role.memberCount > 0 && (
                  <p className="m-0 mt-4 flex items-start gap-2 rounded-lg bg-canvas px-3 py-2.5 text-caption text-slate-600">
                    <InfoCircleOutlined aria-hidden className="mt-0.5 text-[12px] text-slate-400" />
                    Saving changes what they can do straight away.
                  </p>
                )}
                <Link to="/dashboard/team" className="tp-link-button mt-4 inline-block text-small text-primary-700">
                  Manage members
                </Link>
              </Card>
            )}

            {mode === 'edit' && role?.deletable && canManage && beyondMe.length === 0 && (
              <Card title="Delete role" subtitle="Its members move to a role you choose.">
                <Button
                  variant="danger"
                  onClick={() => {
                    setDeleteError(null);
                    setDeleteOpen(true);
                  }}
                  icon={<DeleteOutlined aria-hidden className="text-[14px]" />}
                >
                  Delete this role
                </Button>
              </Card>
            )}
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={confirmLeave}
        title={mode === 'edit' ? 'Discard your changes?' : 'Discard this role?'}
        description={
          mode === 'edit'
            ? 'Changes you have made since opening this role will not be kept.'
            : 'Nothing you have entered will be kept.'
        }
        confirmLabel={mode === 'edit' ? 'Discard changes' : 'Discard'}
        cancelLabel="Keep editing"
        fallbackFocusId={FIELD_ID.name}
        onConfirm={() => {
          setConfirmLeave(false);
          navigate('/dashboard/team/roles');
        }}
        onCancel={() => setConfirmLeave(false)}
      />

      <DeleteRoleDialog
        role={deleteOpen ? role : null}
        choices={choices}
        busy={deleteBusy}
        error={deleteError}
        onConfirm={(target, reassignTo) => void confirmDelete(target, reassignTo)}
        onCancel={() => setDeleteOpen(false)}
      />
    </section>
  );
}

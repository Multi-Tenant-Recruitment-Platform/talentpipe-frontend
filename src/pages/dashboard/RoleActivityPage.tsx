import { HistoryOutlined } from '@ant-design/icons';
import { Radio } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { rolesApi } from '../../api/roles';
import type { RoleAuditEvent } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/dashboard/Card';
import { EmptyState } from '../../components/dashboard/EmptyState';
import { ErrorState, RowsSkeleton } from '../../components/dashboard/ErrorState';
import { PageHeader } from '../../components/dashboard/PageHeader';
import { TeamSectionNav } from '../../components/dashboard/TeamSectionNav';
import { RoleActivityEntry } from '../../components/roles/RoleActivityEntry';
import { Button } from '../../components/ui/Button';
import { permissionIndex } from '../../dashboard/roleEditor';
import { describeRoleError } from '../../dashboard/roleErrors';
import { useTeamSummary } from '../../dashboard/TeamSummaryContext';
import { usePermissionCatalogue, useWorkspaceRoles } from '../../dashboard/useWorkspaceRoles';
import { formatDate } from '../../utils/format';

const PAGE_SIZE = 50;

type Filter = 'all' | 'roles' | 'members';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'roles', label: 'Role changes' },
  { id: 'members', label: 'People moved' },
];

const matches = (filter: Filter, event: RoleAuditEvent) =>
  filter === 'all' || (filter === 'members') === (event.action === 'MEMBER_ROLE_CHANGED');

/** "Today", "Yesterday", or the date — the heading over a day's entries. */
function dayLabel(iso: string, now: Date): string {
  const day = new Date(iso);
  const startOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(day)) / 86_400_000);
  if (diff === 0) {
    return 'Today';
  }
  if (diff === 1) {
    return 'Yesterday';
  }
  return day.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * The access log: every change to a role, and every time someone moved to
 * another one, newest first (ADR-9).
 *
 * <p>It exists for the question an Owner asks after the fact — "who gave
 * Amaya publishing rights, and when?" — so each entry is a sentence naming the
 * people involved, grouped by day, and an edit spells out what it added and
 * removed.</p>
 *
 * <p>Pages of fifty, fetched as asked for; the filter narrows what is loaded,
 * and says so when the older pages might hold more.</p>
 */
export function RoleActivityPage() {
  const { user } = useAuth();
  const { members } = useTeamSummary();
  const { roles } = useWorkspaceRoles();
  const catalogue = usePermissionCatalogue();
  const index = useMemo(() => permissionIndex(catalogue.groups), [catalogue.groups]);

  const [events, setEvents] = useState<RoleAuditEvent[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const load = useCallback(async (pageToLoad: number) => {
    if (pageToLoad === 0) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const result = await rolesApi.audit(pageToLoad, PAGE_SIZE);
      if (!mounted.current) {
        return;
      }
      setEvents((current) => (pageToLoad === 0 ? result.content : [...current, ...result.content]));
      setPage(pageToLoad);
      setTotalPages(result.totalPages);
      setError(null);
    } catch (err: unknown) {
      if (mounted.current) {
        setError(describeRoleError(err, 'load').message);
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    void load(0);
  }, [load, user?.id]);

  const names = useMemo(
    () => new Map(members.map((member) => [member.id, `${member.firstName} ${member.lastName}`.trim()])),
    [members],
  );
  const nameOf = useCallback(
    (userId: string | null) => {
      if (!userId) {
        return 'TalentPipe';
      }
      if (userId === user?.id) {
        return 'You';
      }
      return names.get(userId) ?? 'A former member';
    },
    [names, user?.id],
  );
  const roleIds = useMemo(() => new Set(roles.map((role) => role.id)), [roles]);

  const visible = events.filter((event) => matches(filter, event));
  const counts: Record<Filter, number> = {
    all: events.length,
    roles: events.filter((event) => matches('roles', event)).length,
    members: events.filter((event) => matches('members', event)).length,
  };
  const hasMore = page + 1 < totalPages;

  const days = useMemo(() => {
    const now = new Date();
    const grouped: { label: string; key: string; events: RoleAuditEvent[] }[] = [];
    for (const event of visible) {
      const label = dayLabel(event.occurredAt, now);
      const last = grouped[grouped.length - 1];
      if (last?.label === label) {
        last.events.push(event);
      } else {
        grouped.push({ label, key: `${label}-${event.id}`, events: [event] });
      }
    }
    return grouped;
  }, [visible]);

  let body;
  if (loading && events.length === 0) {
    body = <RowsSkeleton rows={6} avatar label="Loading activity…" />;
  } else if (error && events.length === 0) {
    body = <ErrorState title="We couldn't load the activity" description={error} onRetry={() => void load(0)} />;
  } else if (events.length === 0) {
    body = (
      <EmptyState
        icon={HistoryOutlined}
        title="Nothing has changed yet"
        description="When someone creates, edits or deletes a role, or moves a member to another role, it shows up here."
      />
    );
  } else {
    body = (
      <>
        {visible.length === 0 ? (
          <p className="m-0 py-8 text-center text-small text-slate-600">
            Nothing of this kind in the {events.length} most recent entries.
          </p>
        ) : (
          days.map((day) => (
            <section key={day.key} aria-label={day.label} className="mb-7 last:mb-0">
              <h2 className="tp-legend m-0 mb-4">{day.label}</h2>
              <ol className="m-0 list-none p-0">
                {day.events.map((event) => (
                  <RoleActivityEntry
                    key={event.id}
                    event={event}
                    nameOf={nameOf}
                    roleExists={(id) => id !== null && roleIds.has(id)}
                    catalogue={catalogue.groups}
                    index={index}
                  />
                ))}
              </ol>
            </section>
          ))
        )}
        {(hasMore || error) && (
          <div className="mt-6 flex flex-col items-center gap-2 border-t border-slate-100 pt-5">
            {error && <p className="m-0 text-small text-error-text">{error}</p>}
            {hasMore && (
              <Button variant="secondary" loading={loadingMore} disabled={loadingMore} onClick={() => void load(page + 1)}>
                {loadingMore ? 'Loading…' : 'Show older activity'}
              </Button>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Access activity"
        subtitle="Every change to a role, and every time someone moved to a different one — newest first."
      />

      <TeamSectionNav />

      <Card
        title="Activity"
        subtitle={
          events.length > 0
            ? `${events.length} most recent ${events.length === 1 ? 'entry' : 'entries'}, from ${formatDate(events[events.length - 1].occurredAt)}`
            : undefined
        }
        action={
          events.length > 0 ? (
            <fieldset className="m-0 border-0 p-0">
              <legend className="sr-only">Show</legend>
              <Radio.Group
                value={filter}
                onChange={(event) => setFilter(event.target.value as Filter)}
                optionType="button"
                buttonStyle="solid"
                size="small"
                options={FILTERS.map(({ id, label }) => ({
                  value: id,
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      {label}
                      <span className="tabular-nums opacity-75">{counts[id]}</span>
                    </span>
                  ),
                }))}
              />
            </fieldset>
          ) : undefined
        }
      >
        {body}
      </Card>
    </>
  );
}

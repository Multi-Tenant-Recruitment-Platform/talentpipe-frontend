import { EditOutlined, TeamOutlined } from '@ant-design/icons';
import { Card, Flex, Modal, Select, Skeleton, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { apiErrorMessage } from '../../api/client';
import { jobsApi } from '../../api/jobs';
import type { JobVacancyResponse, MemberSummary } from '../../api/types';
import { useCan } from '../../auth/useCan';
import { useHiringTeam } from '../../dashboard/useHiringTeam';
import { useTeamSummary } from '../../dashboard/TeamSummaryContext';
import { space } from '../../theme/tokens';
import { Avatar } from '../dashboard/Avatar';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';

/** The backend's cap on a hiring team. */
const MAX_MEMBERS = 50;

const fullName = (person: { firstName: string; lastName: string }) => `${person.firstName} ${person.lastName}`.trim();

function Person({ person, caption }: Readonly<{ person: MemberSummary; caption?: string }>) {
  const inactive = person.status !== 'ACTIVE';
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar firstName={person.firstName} lastName={person.lastName} size="sm" />
      <span className="min-w-0">
        <span className="block truncate text-small font-medium text-slate-900">{fullName(person)}</span>
        <span className="block truncate text-caption text-slate-500">
          {caption ?? person.roleName ?? person.email}
          {inactive && ' · no longer active'}
        </span>
      </span>
    </span>
  );
}

/** One of the two named seats, filled or not. */
function Seat({ label, person }: Readonly<{ label: string; person: MemberSummary | null }>) {
  return (
    <div>
      <dt className="mb-1.5 text-caption font-semibold uppercase tracking-caps text-slate-500">{label}</dt>
      <dd className="m-0">
        {person ? (
          <Person person={person} />
        ) : (
          <span className="text-small text-slate-500">Not assigned</span>
        )}
      </dd>
    </div>
  );
}

/**
 * Who works on this vacancy: the recruiter and hiring manager the form names,
 * and the rest of the hiring team.
 *
 * <p>Being here is what lets someone whose role does not see every vacancy
 * open this one and its applicants, so the card says that — adding someone is
 * giving them access, not just listing a name.</p>
 *
 * <p>The recruiter and hiring manager are edited with the vacancy, where they
 * are chosen; the card edits only the team, and only for someone who can see
 * the roster to choose from.</p>
 */
export function HiringTeamCard({ vacancy }: Readonly<{ vacancy: JobVacancyResponse }>) {
  const allow = useCan();
  const { activeMembers } = useTeamSummary();
  const { team, loading, error, refresh, replace } = useHiringTeam(vacancy.id, vacancy.version);
  const [editing, setEditing] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canEdit = allow('jobs.manage') && allow('team.view') && vacancy.status !== 'ARCHIVED';
  // The roster to choose from, plus anyone already on the team who has since
  // left it — so they stay visible, and can be taken off.
  const options = useMemo(() => {
    // The recruiter and hiring manager have seats of their own.
    const named = new Set([team?.recruiter?.id, team?.hiringManager?.id]);
    const people = new Map<string, { id: string; firstName: string; lastName: string; roleName?: string | null }>();
    for (const member of activeMembers) {
      people.set(member.id, member);
    }
    for (const member of team?.members ?? []) {
      if (!people.has(member.id)) {
        people.set(member.id, member);
      }
    }
    return [...people.values()]
      .filter((person) => !named.has(person.id))
      .map((person) => ({
        value: person.id,
        label: person.roleName ? `${fullName(person)} · ${person.roleName}` : fullName(person),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [activeMembers, team]);

  function open() {
    setChosen((team?.members ?? []).map((member) => member.id));
    setSaveError(null);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      replace(await jobsApi.replaceHiringTeam(vacancy.id, chosen));
      setEditing(false);
    } catch (err: unknown) {
      setSaveError(apiErrorMessage(err, 'We could not save the hiring team. Try again in a moment.'));
    } finally {
      setSaving(false);
    }
  }

  let body;
  if (loading && !team) {
    body = <Skeleton active avatar paragraph={{ rows: 2 }} />;
  } else if (error && !team) {
    body = (
      <Flex vertical gap={8} align="flex-start">
        <Typography.Text type="secondary" className="text-small">
          {error}
        </Typography.Text>
        <Button size="sm" variant="secondary" onClick={() => void refresh()}>
          Try again
        </Button>
      </Flex>
    );
  } else if (team) {
    body = (
      <>
        <dl className="m-0 grid gap-4">
          <Seat label="Recruiter" person={team.recruiter} />
          <Seat label="Hiring manager" person={team.hiringManager} />
          <div>
            <dt className="mb-1.5 text-caption font-semibold uppercase tracking-caps text-slate-500">
              Hiring team{team.members.length > 0 && ` · ${team.members.length}`}
            </dt>
            <dd className="m-0">
              {team.members.length > 0 ? (
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {team.members.map((member) => (
                    <li key={member.id}>
                      <Person person={member} />
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-small text-slate-500">No one else yet.</span>
              )}
            </dd>
          </div>
        </dl>
        <p className="m-0 mt-4 rounded-lg bg-canvas px-3 py-2.5 text-caption text-slate-600">
          Everyone here can open this vacancy and its applicants, even if their role doesn&apos;t see every vacancy.
        </p>
      </>
    );
  }

  return (
    <Card styles={{ body: { padding: space[3] } }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="tp-legend m-0">Hiring team</h2>
        {canEdit && team && (
          <Button size="sm" variant="ghost" onClick={open} icon={<EditOutlined aria-hidden className="text-[14px]" />}>
            Edit
          </Button>
        )}
      </div>
      {body}

      {editing && (
        <Modal
          open
          width={520}
          footer={null}
          onCancel={() => setEditing(false)}
          keyboard={!saving}
          mask={{ closable: !saving }}
          closable={{ disabled: saving, 'aria-label': 'Close' }}
          title={
            <Flex align="center" gap={12}>
              <span className="tp-brand-mark size-10 rounded-md">
                <TeamOutlined aria-hidden className="text-[18px]" />
              </span>
              <div>
                <Typography.Title level={2} className="m-0 text-lead">
                  Hiring team
                </Typography.Title>
                <Typography.Text type="secondary" className="text-caption">
                  {vacancy.title || 'Untitled vacancy'}
                </Typography.Text>
              </div>
            </Flex>
          }
        >
          <Flex vertical gap={16} className="pt-2">
            <Typography.Paragraph className="m-0 text-slate-600">
              Add the interviewers and colleagues who work on this role. The recruiter and hiring manager are set on
              the vacancy itself.
            </Typography.Paragraph>
            {saveError && <Alert tone="error">{saveError}</Alert>}
            <div>
              <label htmlFor="hiring-team-members" className="mb-1.5 block font-medium">
                People
              </label>
              <Select
                id="hiring-team-members"
                mode="multiple"
                className="w-full"
                value={chosen}
                disabled={saving}
                options={options}
                optionFilterProp="label"
                maxCount={MAX_MEMBERS}
                placeholder="Search your team"
                onChange={(next: string[]) => setChosen(next)}
              />
              <Typography.Text type="secondary" className="mt-1.5 block text-caption">
                Only active members can be added. Up to {MAX_MEMBERS} people.
              </Typography.Text>
            </div>
            <Flex justify="flex-end" gap={12}>
              <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" loading={saving} disabled={saving} onClick={() => void save()}>
                {saving ? 'Saving…' : 'Save team'}
              </Button>
            </Flex>
          </Flex>
        </Modal>
      )}
    </Card>
  );
}

import { EditOutlined, SolutionOutlined } from '@ant-design/icons';
import { Card, Flex, Modal, Skeleton, Typography } from 'antd';
import { useState } from 'react';
import { apiErrorMessage } from '../../api/client';
import { jobsApi } from '../../api/jobs';
import type { InterviewPanelResponse, JobVacancyResponse, MemberSummary } from '../../api/types';
import { useCan } from '../../auth/useCan';
import { panelProblem, toPanelDrafts, type InterviewPanelDraft } from '../../dashboard/jobVacancy';
import { useInterviewPanels } from '../../dashboard/useInterviewPanels';
import { space } from '../../theme/tokens';
import { Avatar } from '../dashboard/Avatar';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { InterviewPanelEditor } from './InterviewPanelEditor';

const fullName = (person: { firstName: string; lastName: string }) => `${person.firstName} ${person.lastName}`.trim();

function Interviewer({ person }: Readonly<{ person: MemberSummary }>) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar firstName={person.firstName} lastName={person.lastName} size="sm" />
      <span className="min-w-0">
        <span className="block truncate text-small font-medium text-slate-900">{fullName(person)}</span>
        <span className="block truncate text-caption text-slate-500">
          {person.roleName ?? person.email}
          {person.status !== 'ACTIVE' && ' · no longer active'}
        </span>
      </span>
    </span>
  );
}

function Round({ panel }: Readonly<{ panel: InterviewPanelResponse }>) {
  const chosen = panel.interviewers.length;
  const count = panel.interviewerCount;
  return (
    <div>
      <dt className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-caption font-semibold uppercase tracking-caps text-slate-500">{panel.name}</span>
        <span className="text-caption text-slate-500">
          {count === null ? 'Not staffed yet' : `${chosen} of ${count}`}
        </span>
      </dt>
      <dd className="m-0">
        {chosen > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {panel.interviewers.map((person) => (
              <li key={person.id}>
                <Interviewer person={person} />
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-small text-slate-500">Nobody chosen yet.</span>
        )}
      </dd>
    </div>
  );
}

/**
 * Who interviews in each round of this vacancy — company-side only; the
 * advert candidates read never mentions it.
 *
 * <p>Edited here as well as in the vacancy form, because a closed vacancy
 * still interviews its applicants and its form is no longer open. A live
 * vacancy's panels must stay complete, so the dialog holds them to that.</p>
 */
export function InterviewPanelsCard({ vacancy }: Readonly<{ vacancy: JobVacancyResponse }>) {
  const allow = useCan();
  const { panels, loading, error, refresh, replace } = useInterviewPanels(vacancy.id, vacancy.version);
  const [editing, setEditing] = useState<InterviewPanelDraft[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);

  const live = vacancy.status === 'PUBLISHED';
  const canEdit = allow('jobs.manage') && vacancy.status !== 'ARCHIVED';

  // A vacancy older than pipeline templates has no rounds, and nothing to show.
  if (!loading && !error && panels?.length === 0) {
    return null;
  }

  function open() {
    setEditing(toPanelDrafts(panels ?? []));
    setSaveError(null);
    setTried(false);
  }

  async function save() {
    if (!editing) {
      return;
    }
    setTried(true);
    if (editing.some((panel) => panelProblem(panel, live) !== null)) {
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      replace(
        await jobsApi.replaceInterviewPanels(
          vacancy.id,
          editing.map((panel) => ({
            stagePosition: panel.stagePosition,
            interviewerCount: panel.interviewerCount,
            interviewerIds: panel.interviewers.map((person) => person.id),
          })),
        ),
      );
      setEditing(null);
    } catch (err: unknown) {
      setSaveError(apiErrorMessage(err, 'We could not save the interview panels. Try again in a moment.'));
    } finally {
      setSaving(false);
    }
  }

  let body;
  if (loading && !panels) {
    body = <Skeleton active avatar paragraph={{ rows: 2 }} />;
  } else if (error && !panels) {
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
  } else if (panels) {
    body = (
      <>
        <dl className="m-0 grid gap-4">
          {panels.map((panel) => (
            <Round key={panel.stageId} panel={panel} />
          ))}
        </dl>
        <p className="m-0 mt-4 rounded-lg bg-canvas px-3 py-2.5 text-caption text-slate-600">
          Everyone on a panel can open this vacancy. Candidates never see who interviews them here.
        </p>
      </>
    );
  }

  return (
    <Card styles={{ body: { padding: space[3] } }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="tp-legend m-0">Interview panels</h2>
        {canEdit && panels && (
          <Button size="sm" variant="ghost" onClick={open} icon={<EditOutlined aria-hidden className="text-[14px]" />}>
            Edit
          </Button>
        )}
      </div>
      {body}

      {editing && (
        <Modal
          open
          width={640}
          footer={null}
          onCancel={() => setEditing(null)}
          keyboard={!saving}
          mask={{ closable: !saving }}
          closable={{ disabled: saving, 'aria-label': 'Close' }}
          title={
            <Flex align="center" gap={12}>
              <span className="tp-brand-mark size-10 rounded-md">
                <SolutionOutlined aria-hidden className="text-[18px]" />
              </span>
              <div>
                <Typography.Title level={2} className="m-0 text-lead">
                  Interview panels
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
              {live
                ? 'This vacancy is live, so every round needs exactly as many interviewers as it asks for.'
                : 'Set how many people interview in each round, then choose them. Anyone in your company can be chosen.'}
            </Typography.Paragraph>
            {saveError && <Alert tone="error">{saveError}</Alert>}
            <InterviewPanelEditor
              panels={editing}
              onChange={setEditing}
              showShortfall={live && tried}
              disabled={saving}
              idPrefix="panel-dialog"
            />
            <Flex justify="flex-end" gap={12}>
              <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" loading={saving} disabled={saving} onClick={() => void save()}>
                {saving ? 'Saving…' : 'Save panels'}
              </Button>
            </Flex>
          </Flex>
        </Modal>
      )}
    </Card>
  );
}

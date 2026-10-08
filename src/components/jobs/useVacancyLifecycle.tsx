import { Typography } from 'antd';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsApi } from '../../api/jobs';
import type { JobVacancyResponse } from '../../api/types';
import { joinLabels, publishBlockers } from '../../dashboard/jobVacancy';
import { describeVacancyError } from '../../dashboard/vacancyErrors';
import { formatDate } from '../../utils/format';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { VacancyNoticeValue } from './VacancyNotice';

/** The three moves that change a vacancy's status. */
export type LifecycleMove = 'publish' | 'close' | 'archive';

const vacancyName = (vacancy: JobVacancyResponse) => vacancy.title || 'Untitled vacancy';

const SUCCESS: Record<LifecycleMove, (name: string) => string> = {
  publish: (name) => `${name} is live on the candidate portal.`,
  close: (name) => `${name} is closed and no longer accepts applications.`,
  archive: (name) => `${name} was archived.`,
};

type Pending = { move: LifecycleMove | 'blocked'; vacancy: JobVacancyResponse };

/**
 * Publish, close and archive — confirmed, guarded and reported the same way
 * wherever they are offered.
 *
 * <p>The list rows and the detail page both offer these moves. Owning them
 * here means the confirmation copy, the busy state and the failure handling
 * cannot drift between the two — the second place a dialog is hand-written is
 * the first place its wording goes stale.</p>
 *
 * <p>Nothing is reported optimistically. The status on screen changes when the
 * server answers with the vacancy as it now stands, and not before: a publish
 * that the backend refused must not have looked, even for a moment, as though
 * candidates could see it.</p>
 */
export function useVacancyLifecycle({
  onChanged,
  onNotice,
  onStale,
  fallbackFocusId,
}: Readonly<{
  /** The server's copy after a successful move. */
  onChanged: (vacancy: JobVacancyResponse, move: LifecycleMove) => void;
  onNotice: (notice: VacancyNoticeValue | null) => void;
  /** Called when a failure proves the screen is out of date. */
  onStale: () => void;
  /** Where focus lands if the control that opened a dialog has gone. */
  fallbackFocusId: string;
}>) {
  const navigate = useNavigate();
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState<{ id: string; move: LifecycleMove } | null>(null);

  const request = useCallback(
    (move: LifecycleMove, vacancy: JobVacancyResponse) => {
      onNotice(null);
      // Refused here rather than at the server: a confirmation for something
      // that cannot succeed only delays the bad news by one click.
      const blocked = move === 'publish' && publishBlockers(vacancy).length > 0;
      setPending({ move: blocked ? 'blocked' : move, vacancy });
    },
    [onNotice],
  );

  async function confirm() {
    if (!pending) {
      return;
    }
    const { move, vacancy } = pending;

    if (move === 'blocked') {
      const first = publishBlockers(vacancy)[0];
      setPending(null);
      navigate(`/dashboard/jobs/${vacancy.id}/edit${first ? `#${first.section.id}` : ''}`);
      return;
    }

    setBusy({ id: vacancy.id, move });
    try {
      const updated = await jobsApi[move](vacancy.id);
      setPending(null);
      onChanged(updated, move);
      onNotice({
        tone: 'success',
        text: SUCCESS[move](vacancyName(updated)),
        showArchived: move === 'archive',
      });
    } catch (err: unknown) {
      setPending(null);
      const plan = describeVacancyError(err, move);
      onNotice({
        tone: plan.tone,
        text: plan.message,
        // A stale screen is fixed by re-fetching, not by repeating the request
        // that just told us it was stale.
        retry: plan.refetch ? undefined : () => request(move, vacancy),
      });
      if (plan.refetch) {
        onStale();
      }
    } finally {
      setBusy(null);
    }
  }

  const dialog = pending ? dialogCopy(pending) : null;

  const dialogs = (
    <ConfirmDialog
      open={dialog !== null}
      title={dialog?.title ?? ''}
      description={dialog?.description ?? ''}
      confirmLabel={dialog?.confirmLabel ?? ''}
      busyLabel={dialog?.busyLabel}
      cancelLabel={dialog?.cancelLabel}
      tone={dialog?.tone}
      busy={busy !== null}
      fallbackFocusId={fallbackFocusId}
      onConfirm={() => void confirm()}
      onCancel={() => setPending(null)}
    />
  );

  return {
    request,
    dialogs,
    busyId: busy?.id ?? null,
    busyMove: busy?.move ?? null,
  };
}

function dialogCopy({ move, vacancy }: Pending) {
  const name = <Typography.Text strong>{vacancyName(vacancy)}</Typography.Text>;

  switch (move) {
    case 'blocked': {
      const blockers = publishBlockers(vacancy);
      const missing = blockers.map(
        (blocker) => `${blocker.section.title} (${joinLabels(blocker.fields).toLowerCase()})`,
      );
      return {
        title: 'Finish this draft first',
        description: (
          <>
            {name} can&apos;t go live yet. Still to do: {joinLabels(missing)}.
          </>
        ),
        confirmLabel: 'Complete draft',
        cancelLabel: 'Not now',
        tone: 'primary' as const,
        busyLabel: undefined,
      };
    }
    case 'publish':
      return {
        title: 'Publish this vacancy?',
        description: (
          <>
            {name} will appear on the candidate portal and start accepting applications
            {vacancy.applicationDeadline ? (
              <>
                {' '}
                until <Typography.Text strong>{formatDate(vacancy.applicationDeadline)}</Typography.Text>
              </>
            ) : null}
            .
          </>
        ),
        confirmLabel: 'Publish vacancy',
        busyLabel: 'Publishing…',
        cancelLabel: 'Cancel',
        tone: 'primary' as const,
      };
    case 'close':
      return {
        title: 'Close this vacancy?',
        description: (
          <>
            {name} will stop accepting new applications immediately. Applications you&apos;ve
            already received stay available.
          </>
        ),
        confirmLabel: 'Close vacancy',
        busyLabel: 'Closing…',
        cancelLabel: 'Keep it open',
        tone: 'danger' as const,
      };
    case 'archive':
      return {
        title: 'Archive this vacancy?',
        description: (
          <>
            {name} will leave your active vacancy lists. Its details and history are kept for
            reporting.
          </>
        ),
        confirmLabel: 'Archive vacancy',
        busyLabel: 'Archiving…',
        cancelLabel: 'Cancel',
        tone: 'danger' as const,
      };
  }
}

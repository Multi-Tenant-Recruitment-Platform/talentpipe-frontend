import { Typography } from 'antd';
import { useState } from 'react';
import { pipelineTemplatesApi } from '../../api/pipelineTemplates';
import type { PipelineTemplate } from '../../api/types';
import { describeTemplateError } from '../../dashboard/pipelineTemplateErrors';
import { ConfirmDialog } from '../ui/ConfirmDialog';

export type TemplateAction = 'edit' | 'duplicate' | 'archive' | 'delete';

interface Target {
  id: string;
  name: string;
}

type Confirming = { kind: 'archive' | 'delete'; target: Target } | null;

/**
 * What an admin can do to a template beyond editing it — archive (PT-8),
 * duplicate and delete — with the confirmations and failures that go with
 * each. Shared by the list and the detail page.
 *
 * <p>Archive and delete ask first, and say different things. Archiving keeps
 * the record and leaves existing jobs alone, so it is a warning. Deleting
 * removes the template and its stages for good, so it is red, says it can't
 * be undone, and points at archive as the reversible way to retire one.</p>
 *
 * <p>Duplicate asks nothing: it only adds a copy, and the copy is the thing
 * the admin is taken to next.</p>
 */
export function useTemplateLifecycle({
  onArchived,
  onDuplicated,
  onDeleted,
  onError,
  fallbackFocusId,
}: {
  onArchived: (template: PipelineTemplate) => void;
  onDuplicated: (copy: PipelineTemplate) => void;
  onDeleted: (target: Target) => void;
  /** A failure outside a dialog — duplicate has none to show it in. */
  onError: (message: string) => void;
  /** Where focus lands when the control that opened a dialog has gone. */
  fallbackFocusId: string;
}) {
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!confirming || busyId) {
      return;
    }
    const { kind, target } = confirming;
    setBusyId(target.id);
    setError(null);
    try {
      if (kind === 'archive') {
        const archived = await pipelineTemplatesApi.archive(target.id);
        setConfirming(null);
        onArchived(archived);
      } else {
        await pipelineTemplatesApi.remove(target.id);
        setConfirming(null);
        onDeleted(target);
      }
    } catch (err: unknown) {
      setError(describeTemplateError(err, kind).message);
    } finally {
      setBusyId(null);
    }
  }

  async function duplicate(target: Target) {
    if (busyId) {
      return;
    }
    setBusyId(target.id);
    try {
      onDuplicated(await pipelineTemplatesApi.duplicate(target.id));
    } catch (err: unknown) {
      onError(describeTemplateError(err, 'duplicate').message);
    } finally {
      setBusyId(null);
    }
  }

  const name = confirming?.target.name ?? '';
  const busy = busyId !== null && confirming !== null;

  const dialog =
    confirming?.kind === 'delete' ? (
      <ConfirmDialog
        open
        tone="danger"
        title={`Delete “${name}” permanently?`}
        description={
          <>
            The template and its stages are removed for good. This can&apos;t be undone. To stop it being used for new
            jobs but keep the record, <Typography.Text strong>archive</Typography.Text> it instead.
          </>
        }
        confirmLabel="Delete template"
        busyLabel="Deleting…"
        busy={busy}
        error={error}
        fallbackFocusId={fallbackFocusId}
        onConfirm={() => void confirm()}
        onCancel={() => setConfirming(null)}
      />
    ) : (
      <ConfirmDialog
        open={confirming !== null}
        tone="warning"
        title={`Archive “${name}”?`}
        description={
          <>
            It will no longer be available for new jobs. Jobs already using this template keep their own copy and
            aren&apos;t affected. Archived templates stay visible under{' '}
            <Typography.Text strong>Show archived</Typography.Text>.
          </>
        }
        confirmLabel="Archive template"
        busyLabel="Archiving…"
        busy={busy}
        error={error}
        fallbackFocusId={fallbackFocusId}
        onConfirm={() => void confirm()}
        onCancel={() => setConfirming(null)}
      />
    );

  return {
    /** Archive or delete (after confirmation), or duplicate (straight away). */
    run: (action: Exclude<TemplateAction, 'edit'>, template: Target) => {
      const target = { id: template.id, name: template.name };
      if (action === 'duplicate') {
        void duplicate(target);
        return;
      }
      setError(null);
      setConfirming({ kind: action, target });
    },
    busyId,
    dialog,
  };
}

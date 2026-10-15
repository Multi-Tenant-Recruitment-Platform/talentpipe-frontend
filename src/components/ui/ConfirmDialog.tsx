import { WarningOutlined } from '@ant-design/icons';
import { Flex, Typography } from 'antd';
import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from './Button';
import { useFocusTrap } from './useFocusTrap';

/**
 * Confirmation step for an irreversible action.
 *
 * <p>Uses `role="alertdialog"` rather than `dialog`: it makes assistive tech
 * announce the description immediately on open, which is the whole point when
 * the next click permanently deletes something.</p>
 *
 * <p>Deliberately not antd's `Modal`, which hard-codes `role="dialog"` with no
 * override, sets no `aria-describedby`, and puts a close "X" in the tab ring —
 * three regressions for a dialog whose entire job is to make the consequence
 * unmissable and to land focus on the safe choice. It also has no equivalent of
 * this trap's `fallbackFocusId`, which matters because the row that opened the
 * dialog no longer exists once a revoke succeeds.</p>
 *
 * <p>Initial focus lands on Cancel — the safe choice — so a stray Enter
 * dismisses rather than destroys.</p>
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  busyLabel,
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
  fallbackFocusId = 'team-search',
  onConfirm,
  onCancel,
}: Readonly<{
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  busyLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
  /**
   * Where focus goes on close when the control that opened the dialog is gone
   * — a revoked invitation's row, a menu item that unmounted. Defaults to the
   * team search box, the first page that needed it.
   */
  fallbackFocusId?: string;
  onConfirm: () => void;
  onCancel: () => void;
}>) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(dialogRef, open, {
    initialFocusRef: cancelRef,
    // After a successful revoke the triggering row no longer exists.
    fallbackFocusId,
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      // Ignored mid-flight: dismissing now would leave the outcome unknown.
      if (event.key === 'Escape' && !busy) {
        onCancel();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, busy, onCancel]);

  if (!open) {
    return null;
  }

  const chip = tone === 'danger' ? 'bg-error-bg text-error-text' : 'bg-primary-50 text-primary-700';

  return (
    // --- ConfirmDialog ---
    // Kept out of antd Modal on purpose: antd hard-codes role="dialog" on the
    // dialog panel, and a destructive confirmation needs role="alertdialog" so
    // assistive tech announces the consequence before the next click. See
    // src/components/ui/ConfirmDialog.tsx.
    <div className="fixed inset-0 z-1000 flex items-center justify-center p-4">
      {/* Not a button: a focusable backdrop is a tab stop that reads as an
          unlabelled control and duplicates Cancel. */}
      <div
        aria-hidden="true"
        onClick={() => !busy && onCancel()}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
      />

      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="relative w-full max-w-md rounded-xl bg-surface p-6 shadow-xl"
      >
        <Flex gap={16}>
          <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${chip}`}>
            <WarningOutlined aria-hidden className="text-[20px]" />
          </span>
          <div className="min-w-0">
            <Typography.Title id="confirm-dialog-title" level={2} className="m-0 text-lead">
              {title}
            </Typography.Title>
            <div id="confirm-dialog-description" className="mt-1.5 leading-[1.6]">
              <Typography.Text type="secondary">{description}</Typography.Text>
            </div>
          </div>
        </Flex>

        <Flex align="center" justify="flex-end" gap={12} className="mt-6">
          <Button ref={cancelRef} type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === 'danger' ? 'dangerSolid' : 'primary'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? (busyLabel ?? confirmLabel) : confirmLabel}
          </Button>
        </Flex>
      </div>
    </div>
  );
}

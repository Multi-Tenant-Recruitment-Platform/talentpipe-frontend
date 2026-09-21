import { Flex, Typography } from 'antd';
import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '../dashboard/Icon';
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
  onConfirm: () => void;
  onCancel: () => void;
}>) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(dialogRef, open, {
    initialFocusRef: cancelRef,
    // After a successful revoke the triggering row no longer exists.
    fallbackFocusId: 'team-search',
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

  const chip =
    tone === 'danger'
      ? { background: '#fee2e2', color: '#dc2626' }
      : { background: '#eef2ff', color: '#4f46e5' };

  return (
    <div className="tp-dialog-overlay">
      {/* Not a button: a focusable backdrop is a tab stop that reads as an
          unlabelled control and duplicates Cancel. */}
      <div aria-hidden="true" onClick={() => !busy && onCancel()} className="tp-dialog-backdrop" />

      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="tp-dialog-panel"
      >
        <Flex gap={16}>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: '50%',
              ...chip,
            }}
          >
            <Icon name="warning" size={20} />
          </span>
          <div style={{ minWidth: 0 }}>
            <Typography.Title id="confirm-dialog-title" level={2} style={{ fontSize: 16, margin: 0 }}>
              {title}
            </Typography.Title>
            <div id="confirm-dialog-description" style={{ marginTop: 6, lineHeight: 1.6 }}>
              <Typography.Text type="secondary">{description}</Typography.Text>
            </div>
          </div>
        </Flex>

        <Flex align="center" justify="flex-end" gap={12} style={{ marginTop: 24 }}>
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

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Not a button: a focusable backdrop is a tab stop that reads as an
          unlabelled control and duplicates Cancel. */}
      <div
        aria-hidden="true"
        onClick={() => !busy && onCancel()}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
      />

      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/5"
      >
        <div className="flex gap-4">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'
            }`}
          >
            <Icon name="warning" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id="confirm-dialog-title" className="text-base font-semibold text-slate-900">
              {title}
            </h2>
            <div id="confirm-dialog-description" className="mt-1.5 text-sm leading-6 text-slate-600">
              {description}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
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
        </div>
      </div>
    </div>
  );
}

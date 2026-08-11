import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

function setup(overrides: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      open
      title="Revoke this invitation?"
      description="This can't be undone."
      confirmLabel="Revoke invitation"
      busyLabel="Revoking…"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onConfirm, onCancel };
}

describe('ConfirmDialog', () => {
  it('renders nothing while closed', () => {
    setup({ open: false });
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('is an alertdialog with a resolvable description', () => {
    setup();
    const dialog = screen.getByRole('alertdialog');
    // alertdialog (not dialog) so the consequence is announced immediately.
    const describedBy = dialog.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent("can't be undone");
  });

  it('places initial focus on Cancel, so a stray Enter is safe', () => {
    setup();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /cancel/i }));
  });

  it('cancels on Escape', async () => {
    const user = userEvent.setup();
    const { onCancel } = setup();
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('ignores Escape while busy, since the outcome is already in flight', async () => {
    const user = userEvent.setup();
    const { onCancel } = setup({ busy: true });
    await user.keyboard('{Escape}');
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('shows the busy label and disables both actions', () => {
    setup({ busy: true });
    expect(screen.getByRole('button', { name: /revoking/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });

  it('traps Tab inside the dialog', async () => {
    const user = userEvent.setup();
    setup();
    const cancel = screen.getByRole('button', { name: /cancel/i });
    const confirm = screen.getByRole('button', { name: /revoke invitation/i });

    await user.tab();
    expect(document.activeElement).toBe(confirm);
    // Wraps rather than walking out into the page behind.
    await user.tab();
    expect(document.activeElement).toBe(cancel);
  });

  it('confirms when the destructive action is pressed', async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup();
    await user.click(screen.getByRole('button', { name: /revoke invitation/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { InvitableRole } from '../../api/types';
import { Alert, type AlertTone } from '../ui/Alert';
import { Button } from '../ui/Button';
import { inputClass } from '../ui/inputClass';
import { useFocusTrap } from '../ui/useFocusTrap';
import { Icon, type IconName } from './Icon';

export interface InviteFormValues {
  firstName: string;
  lastName: string;
  email: string;
  role: InvitableRole;
}

const ROLE_OPTIONS: { id: InvitableRole; label: string; description: string; icon: IconName }[] = [
  {
    id: 'HR_MANAGER',
    label: 'HR Manager',
    description: 'Posts jobs, manages candidates and drives the full pipeline.',
    icon: 'briefcase',
  },
  {
    id: 'INTERVIEWER',
    label: 'Interviewer',
    description: 'Joins interview panels, scores candidates and leaves feedback.',
    icon: 'identification',
  },
];

/**
 * Invitation dialog used by the company admin to bring HR managers and
 * interviewers onto the platform.
 *
 * <p>Failures are rendered <em>inside</em> the dialog. They previously went to
 * a page-level alert that the backdrop covered, and the form cleared itself
 * the instant Send was pressed — so a duplicate-email rejection looked like
 * the form had simply wiped what you typed, with no explanation anywhere.
 * Fields now reset when the dialog opens, not when it submits, so a rejected
 * attempt keeps its values and can be corrected.</p>
 */
export function InviteMemberModal({
  open,
  onClose,
  onInvite,
  submitting = false,
  error = null,
  errorTone = 'error',
  focusField = null,
}: {
  open: boolean;
  onClose: () => void;
  onInvite: (values: InviteFormValues) => void;
  submitting?: boolean;
  error?: string | null;
  errorTone?: AlertTone;
  /** Which field the failure points at, so the fix starts in the right place. */
  focusField?: 'email' | null;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InvitableRole>('HR_MANAGER');

  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useFocusTrap(dialogRef, open, { initialFocusRef: firstFieldRef });

  // Note there is deliberately no reset effect here. The parent unmounts this
  // component when the dialog closes, so the useState initialisers above give
  // every open a clean form. An effect that cleared the fields on `open` would
  // run after the first paint — briefly showing the previous values, and
  // racing anything typed in that window. Crucially, the form is never cleared
  // on submit: a rejected attempt must keep what the admin typed so they can
  // correct one field instead of retyping everything.

  useEffect(() => {
    if (open && focusField === 'email') {
      emailRef.current?.focus();
      emailRef.current?.select();
    }
  }, [open, focusField, error]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      // Ignored mid-flight — the invitation may already have been created.
      if (event.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, submitting, onClose]);

  if (!open) {
    return null;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onInvite({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      role,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Not a button: a focusable backdrop is an unlabelled tab stop that sits
          before the dialog content and duplicates the header's close control. */}
      <div
        aria-hidden="true"
        onClick={() => !submitting && onClose()}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
      />

      {/* A native <dialog> rather than a div with role="dialog", and on the
          panel rather than the overlay — the panel is what the role describes.
          `open` rather than showModal(): the overlay above already provides the
          backdrop and the positioning. p-0/text-inherit undo user-agent styles. */}
      <dialog
        ref={dialogRef}
        open
        aria-modal="true"
        aria-labelledby="invite-member-title"
        className="relative m-0 h-auto max-h-full w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-0 text-inherit shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/5"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
              <Icon name="user-plus" className="h-5 w-5" />
            </span>
            <div>
              <h2 id="invite-member-title" className="text-base font-semibold text-slate-900">
                Invite team member
              </h2>
              <p className="text-xs text-slate-500">
                They&apos;ll get an email with a link to join your workspace. It expires in 7 days.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60"
            aria-label="Close"
          >
            <Icon name="x-mark" className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          {error && <Alert tone={errorTone}>{error}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="invite-first-name" className="block text-sm font-medium text-slate-700">
                First name
              </label>
              <input
                id="invite-first-name"
                ref={firstFieldRef}
                required
                disabled={submitting}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClass}
                placeholder="Amaya"
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="invite-last-name" className="block text-sm font-medium text-slate-700">
                Last name
              </label>
              <input
                id="invite-last-name"
                required
                disabled={submitting}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClass}
                placeholder="Rathnayake"
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label htmlFor="invite-email" className="block text-sm font-medium text-slate-700">
              Work email
            </label>
            <input
              id="invite-email"
              ref={emailRef}
              type="email"
              required
              disabled={submitting}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="name@company.com"
              autoComplete="off"
            />
          </div>

          <fieldset disabled={submitting}>
            <legend className="block text-sm font-medium text-slate-700">Role</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {ROLE_OPTIONS.map((option) => {
                const selected = role === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setRole(option.id)}
                    aria-pressed={selected}
                    className={`rounded-xl border p-3 text-left transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 ${
                      selected
                        ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        selected
                          ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Icon name={option.icon} className="h-4 w-4" />
                    </span>
                    <span className="mt-2 block text-sm font-semibold text-slate-900">{option.label}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              <Icon name="send" className="h-4 w-4" />
              {submitting ? 'Sending…' : 'Send invitation'}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

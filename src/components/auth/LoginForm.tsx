import { ArrowRightOutlined } from '@ant-design/icons';
import { Flex, Input, Typography, type InputRef } from 'antd';
import { useEffect, useId, useState, type FormEvent, type Ref } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, apiErrorMessage } from '../../api/client';
import { apiErrorCode, apiErrorDetails, apiErrorStatus } from '../../api/errors';
import type { UserResponse, WorkspaceChoice, WorkspaceSelection } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import type { LoginIntent } from '../../auth/loginIntent';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { LoginErrorAlert } from './LoginErrorAlert';
import { LoginNotices } from './LoginNotices';
import { PasswordField } from './PasswordField';
import { WorkspacePicker } from './WorkspacePicker';

/** Which part of the sign-in the popup is showing, so it can name itself. */
export type LoginStep = 'credentials' | 'choose';

const CHOICE_EXPIRED =
  'That took a little too long, so we stopped waiting for your choice. Sign in again to pick an account.';

/**
 * What a failed login should say, and whether to offer a resend.
 *
 * <p>The backend deliberately returns the same 401 "Invalid credentials"
 * whether the account doesn't exist or the password is wrong — it never
 * distinguishes them, so an address can't be confirmed by enumerating
 * accounts via the error code. Blaming a field here would require a signal the
 * API intentionally withholds, so this is a single generic error like any
 * other login failure. Only a 403 naming an unverified account is different,
 * because there the resend is both useful and safe — the caller has already
 * proven they know the password.</p>
 *
 * <p>Decided by the error code, not by the words of the message: an invitation
 * that was never accepted answers 403 too, and offering it a verification link
 * would send a link that cannot help. Servers older than the codes are read
 * the old way.</p>
 */
function loginFailure(err: unknown): { message: string; needsVerification: boolean } {
  const code = apiErrorCode(err);
  if (code === 'INVITATION_NOT_ACCEPTED') {
    // What to do, not just what is wrong: the account is waiting on a link
    // the person already has.
    return {
      message:
        "You haven't accepted your invitation yet. Open the link in your invitation email to set a password, then sign in here.",
      needsVerification: false,
    };
  }
  const message = apiErrorMessage(err, 'Login failed. Please try again.');
  const needsVerification = code
    ? code === 'ACCOUNT_NOT_VERIFIED'
    : apiErrorStatus(err) === 403 && message.toLowerCase().includes('not verified');
  return { message, needsVerification };
}

/**
 * Asks for a fresh verification email and never reports what happened: the
 * confirmation the caller sees must look identical whether or not the address
 * is registered, so a failure here has to be indistinguishable from a success.
 */
async function requestVerificationEmail(email: string): Promise<void> {
  try {
    await api.post('/auth/resend-verification', { email });
  } catch {
    // Deliberately ignored — see above.
  }
}

/**
 * Login (PB-007): the form behind the login popup — one form for everyone.
 *
 * <p>Candidates and company users sign in identically, with email and
 * password alone: the backend finds which account the credentials belong to
 * and returns its role, and the popup routes on that. So there is no
 * "candidate or company?" choice to make first — it would only have relabelled
 * the same request, and would have made someone stop to classify themselves
 * before doing the one thing they came to do.</p>
 *
 * <p>When the credentials fit more than one account — the same email in two
 * companies, or a company member who is also a candidate — the backend asks
 * which one (409 WORKSPACE_SELECTION_REQUIRED) and the form becomes a short
 * list of those accounts. Picking one finishes the sign-in without asking for
 * the password again; the choice lapses after two minutes.</p>
 *
 * <p>The form owns the credentials and the submit; the presentation of each
 * region (notices, password, the account list) lives in components/auth so
 * this stays a readable description of the flow. Where to go afterwards is the
 * caller's decision, handed back through `onSuccess`.</p>
 */
export function LoginForm({
  intent,
  emailRef,
  onBusyChange,
  onStepChange,
  onSuccess,
}: Readonly<{
  intent: LoginIntent;
  /** Lets the popup put focus in the email field once it has opened. */
  emailRef?: Ref<InputRef>;
  /** Reports an in-flight sign-in, so the popup can refuse to close mid-request. */
  onBusyChange?: (busy: boolean) => void;
  /** Reports which step is showing, so the popup's heading can follow it. */
  onStepChange?: (step: LoginStep) => void;
  onSuccess: (user: UserResponse) => void;
}>) {
  const { login, selectWorkspace, sessionEndReason } = useAuth();
  const { pathname, search, hash } = useLocation();
  const here = { pathname, search, hash };
  // Generated, not fixed: the popup can open over the registration page, which
  // has its own `email` and `password` fields.
  const fieldId = useId();
  const emailId = `${fieldId}-email`;
  const passwordId = `${fieldId}-password`;

  const [email, setEmail] = useState(intent.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Set when the backend reports the account exists but is unverified (403),
  // which is the only case where offering a resend is useful — and safe,
  // because the caller has already proven they know the password.
  const [needsVerification, setNeedsVerification] = useState(false);
  // The accounts to choose from, once the backend has asked which one.
  const [selection, setSelection] = useState<WorkspaceSelection | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [choiceError, setChoiceError] = useState<string | null>(null);
  const [choiceNeedsVerification, setChoiceNeedsVerification] = useState(false);

  const step: LoginStep = selection ? 'choose' : 'credentials';
  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);

  // The choice is single-use and short-lived on the server; when it lapses,
  // go back to the form and say why rather than letting a click fail later.
  useEffect(() => {
    if (!selection) {
      return undefined;
    }
    const timer = window.setTimeout(() => backToCredentials(CHOICE_EXPIRED), selection.expiresInSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [selection]);

  /** Leaves the account list, keeping the email so only the password is retyped. */
  function backToCredentials(message: string | null = null) {
    setSelection(null);
    setChoiceError(null);
    setChoiceNeedsVerification(false);
    setPassword('');
    setError(message);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setNeedsVerification(false);

    setSubmitting(true);
    onBusyChange?.(true);
    try {
      const loggedIn = await login(email, password);
      onSuccess(loggedIn);
    } catch (err: unknown) {
      const choices = apiErrorCode(err) === 'WORKSPACE_SELECTION_REQUIRED'
        ? apiErrorDetails<WorkspaceSelection>(err)
        : null;
      if (choices && choices.accounts.length > 0) {
        setSelection(choices);
        return;
      }
      const failure = loginFailure(err);
      setError(failure.message);
      setNeedsVerification(failure.needsVerification);
    } finally {
      setSubmitting(false);
      onBusyChange?.(false);
    }
  }

  async function handleChoose(choice: WorkspaceChoice) {
    if (!selection) {
      return;
    }
    setChoiceError(null);
    setChoiceNeedsVerification(false);
    setOpeningId(choice.accountId);
    onBusyChange?.(true);
    try {
      const signedIn = await selectWorkspace(selection.selectionToken, choice.accountId);
      onSuccess(signedIn);
    } catch (err: unknown) {
      if (apiErrorCode(err) === 'INVALID_TOKEN') {
        // Used or expired: the only way on is to sign in again.
        backToCredentials(CHOICE_EXPIRED);
        return;
      }
      // Not verified, invitation pending or locked: this account cannot open
      // yet, but the others still can, so the list stays.
      const failure = loginFailure(err);
      setChoiceError(failure.message);
      setChoiceNeedsVerification(failure.needsVerification);
    } finally {
      setOpeningId(null);
      onBusyChange?.(false);
    }
  }

  /** Requests a fresh verification email; always reports the same neutral result. */
  async function handleResendVerification() {
    setError(null);
    await requestVerificationEmail(email);
    setNeedsVerification(false);
    setNotice(`If ${email} needs verifying, a new link is on its way.`);
  }

  // Offered only for an unverified account; `undefined` hides the affordance.
  const onResend = needsVerification ? () => void handleResendVerification() : undefined;

  if (selection) {
    return (
      <>
        <WorkspacePicker
          email={email}
          accounts={selection.accounts}
          busyAccountId={openingId}
          error={choiceError}
          onResend={
            choiceNeedsVerification
              ? () => {
                  void requestVerificationEmail(email);
                  setChoiceNeedsVerification(false);
                  setChoiceError(`If ${email} needs verifying, a new link is on its way.`);
                }
              : undefined
          }
          onChoose={(choice) => void handleChoose(choice)}
          onBack={() => backToCredentials()}
        />
      </>
    );
  }

  return (
    <>
      <Typography.Paragraph className="m-0 text-center text-slate-600">
        Sign in to your TalentPipe account.
      </Typography.Paragraph>

      <LoginNotices
        sessionEndReason={sessionEndReason}
        registered={intent.registered}
        passwordReset={intent.passwordReset}
        inviteAccepted={intent.inviteAccepted}
      />

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-6">
        <Flex vertical gap={20}>
          {error && <LoginErrorAlert message={error} onResend={onResend} />}
          {notice && <Alert tone="info">{notice}</Alert>}

          <div>
            <label htmlFor={emailId} className="mb-1.5 block text-small font-semibold text-slate-800">
              Email
            </label>
            <Input
              ref={emailRef}
              id={emailId}
              size="large"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>

          <PasswordField id={passwordId} value={password} onChange={setPassword} />

          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            className="mt-1 h-12 w-full rounded-pill text-lead shadow-primary"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
            {!submitting && <ArrowRightOutlined aria-hidden className="text-[14px]" />}
          </Button>
        </Flex>
      </form>

      {/* Swaps this popup for the registration one, over the same page. It
          opens on the job seeker / company choice, so one link serves everyone. */}
      <Typography.Paragraph className="mt-6 mb-0 border-t border-slate-100 pt-5 text-center text-slate-600">
        New to TalentPipe?{' '}
        <Link to={here} replace state={{ register: { step: 'choose' } }} className="font-semibold">
          Create an account
        </Link>
      </Typography.Paragraph>
    </>
  );
}

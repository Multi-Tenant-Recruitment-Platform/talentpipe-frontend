import { ArrowLeftOutlined, LoadingOutlined, RightOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import type { WorkspaceChoice } from '../../api/types';
import { CompanyLogo } from '../dashboard/CompanyLogo';
import { Alert } from '../ui/Alert';

/** What an account is, in the words the person would use for it. */
function describe(choice: WorkspaceChoice): { title: string; detail: string } {
  switch (choice.type) {
    case 'CANDIDATE':
      return { title: 'Job seeker profile', detail: 'Applications, saved CV and talent pool' };
    case 'PLATFORM':
      return { title: 'TalentPipe administration', detail: choice.roleName ?? 'Platform administrator' };
    default:
      return {
        title: choice.workspaceName ?? 'Company workspace',
        detail: choice.roleName ?? 'Member',
      };
  }
}

function ChoiceMark({ choice }: Readonly<{ choice: WorkspaceChoice }>) {
  if (choice.type === 'COMPANY') {
    return <CompanyLogo src={choice.logoUrl ?? null} name={choice.workspaceName ?? 'Company'} size="md" />;
  }
  const Icon = choice.type === 'CANDIDATE' ? UserOutlined : SafetyCertificateOutlined;
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
      <Icon aria-hidden className="text-[18px]" />
    </span>
  );
}

/**
 * The second step of a sign-in whose email and password fit several accounts:
 * the same person in two companies, or a company member who also job-hunts.
 *
 * <p>Each account is a whole button — the logo, the company and the role are
 * one target, and arrow keys are not needed because each is a tab stop in a
 * short list. Nothing is signed in until one is chosen, so going back costs
 * nothing.</p>
 *
 * <p>The choice is short-lived (two minutes) and the copy says so once, plainly,
 * rather than ticking a countdown at someone who is reading.</p>
 */
export function WorkspacePicker({
  email,
  accounts,
  busyAccountId,
  error,
  onResend,
  onChoose,
  onBack,
}: Readonly<{
  email: string;
  accounts: WorkspaceChoice[];
  /** The account being signed in to, if any; every choice is disabled meanwhile. */
  busyAccountId: string | null;
  error: string | null;
  /** Offered when the chosen account is waiting for its email to be verified. */
  onResend?: () => void;
  onChoose: (choice: WorkspaceChoice) => void;
  onBack: () => void;
}>) {
  const busy = busyAccountId !== null;

  return (
    <div className="mt-2">
      <Typography.Paragraph className="m-0 text-center text-slate-600">
        <span className="font-semibold text-slate-800">{email}</span> has more than one account. Which would you
        like to open?
      </Typography.Paragraph>

      {error && (
        <Alert tone="error" className="mt-5">
          <p className="m-0">{error}</p>
          {onResend && (
            <button type="button" onClick={onResend} className="tp-link-button mt-1.5">
              Send me a new verification link
            </button>
          )}
        </Alert>
      )}

      <ul className="m-0 mt-5 flex list-none flex-col gap-2.5 p-0" aria-label="Your accounts">
        {accounts.map((choice) => {
          const { title, detail } = describe(choice);
          const opening = busyAccountId === choice.accountId;
          return (
            <li key={choice.accountId}>
              <button
                type="button"
                disabled={busy}
                aria-busy={opening || undefined}
                onClick={() => onChoose(choice)}
                className="group flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border border-slate-200 bg-surface px-4 py-3.5 text-start transition-[border-color,background-color,box-shadow] duration-(--tp-motion-base) ease-standard hover:border-primary-200 hover:bg-primary-50 focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-default disabled:opacity-60 disabled:hover:border-slate-200 disabled:hover:bg-surface"
              >
                <ChoiceMark choice={choice} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-900">{title}</span>
                  <span className="block truncate text-small text-slate-600">{detail}</span>
                </span>
                {opening ? (
                  <LoadingOutlined aria-label="Signing in" className="text-[16px] text-primary-600" />
                ) : (
                  <RightOutlined
                    aria-hidden
                    className="text-[12px] text-slate-400 transition-transform duration-(--tp-motion-base) group-hover:translate-x-0.5 group-hover:text-primary-600"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="m-0 mt-4 text-center text-caption text-slate-500">
        For your security, this choice expires in two minutes.
      </p>

      <div className="mt-5 border-t border-slate-100 pt-4 text-center">
        <button type="button" onClick={onBack} disabled={busy} className="tp-link-button inline-flex items-center gap-1.5">
          <ArrowLeftOutlined aria-hidden className="text-[12px]" />
          Use a different email
        </button>
      </div>
    </div>
  );
}

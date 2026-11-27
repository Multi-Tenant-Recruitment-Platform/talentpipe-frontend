import { CheckCircleFilled, CloudSyncOutlined, LaptopOutlined, WarningFilled } from '@ant-design/icons';
import type { AutosaveStatus as Status } from '../../dashboard/useVacancyAutosave';

const time = (at: Date) => at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/**
 * Where the vacancy's work is kept right now, in the form's action bar.
 *
 * <p>Auto-save is only reassuring if it is visible. This is the one line that
 * says whether the last change is safe, and where: in this browser while the
 * vacancy cannot be filed yet, or as a draft the team can see. A failed save
 * says so and offers the retry here, where the eye already is.</p>
 */
export function AutosaveStatus({ status, onRetry }: Readonly<{ status: Status; onRetry: () => void }>) {
  // A polite live region: the outcome is announced without interrupting typing.
  return (
    <span role="status" aria-live="polite" className="inline-flex min-w-0 items-center gap-1.5 text-small text-slate-500">
      {status.kind === 'local' && (
        <>
          <LaptopOutlined aria-hidden className="text-[14px]" />
          <span className="truncate">Saved in this browser · {time(status.at)}</span>
        </>
      )}
      {status.kind === 'saving' && (
        <>
          <CloudSyncOutlined aria-hidden className="text-[14px] text-primary-600" />
          <span>Saving draft…</span>
        </>
      )}
      {status.kind === 'saved' && (
        <>
          <CheckCircleFilled aria-hidden className="text-[14px] text-success-text" />
          <span className="truncate">Draft saved · {time(status.at)}</span>
        </>
      )}
      {status.kind === 'error' && (
        <>
          <WarningFilled aria-hidden className="text-[14px] text-error-text" />
          <span className="text-error-text">Couldn't save the draft.</span>
          <button
            type="button"
            onClick={onRetry}
            className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-primary-700 underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:shadow-focus focus-visible:outline-none"
          >
            Retry
          </button>
        </>
      )}
    </span>
  );
}

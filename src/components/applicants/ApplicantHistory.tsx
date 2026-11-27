import { Timeline } from 'antd';
import type { ApplicantHistoryEntry } from '../../api/types';
import { HISTORY_LABEL, TONE_CLASS } from '../../dashboard/applicants';
import { formatDate, formatRelativeTime } from '../../utils/format';

/** The details a history line adds after its label, in plain words. */
function details(entry: ApplicantHistoryEntry): string | null {
  switch (entry.type) {
    case 'AI_SCREENED':
      return entry.score === null ? null : `Scored ${entry.score} / 100`;
    case 'STAGE_CHANGED':
    case 'ADVANCED':
      return entry.toStage ? `Now in ${entry.toStage}` : null;
    case 'SUBMITTED':
      return entry.toStage ? `Entered ${entry.toStage}` : null;
    default:
      return null;
  }
}

/**
 * Everything that has happened to the application, newest first: who did
 * what, when, and why where a reason was given.
 */
export function ApplicantHistory({ history }: Readonly<{ history: ApplicantHistoryEntry[] }>) {
  const newestFirst = [...history].reverse();
  return (
    <Timeline
      items={newestFirst.map((entry, index) => {
        const { label, tone } = HISTORY_LABEL[entry.type];
        const extra = details(entry);
        return {
          key: `${entry.type}-${entry.at}-${index}`,
          dot: <span aria-hidden="true" className={`block size-3 rounded-full ${TONE_CLASS[tone]} ring-4 ring-white`} />,
          children: (
            <div className="pb-1">
              <p className="m-0 font-medium text-slate-800">
                {label}
                <span className="font-normal text-slate-500"> · {entry.actorName ?? 'System'}</span>
              </p>
              {extra && <p className="m-0 text-small text-slate-600">{extra}</p>}
              {entry.reason && <p className="m-0 text-small italic text-slate-600">“{entry.reason}”</p>}
              <time dateTime={entry.at} title={formatDate(entry.at)} className="text-caption text-slate-500">
                {formatRelativeTime(entry.at)}
              </time>
            </div>
          ),
        };
      })}
    />
  );
}

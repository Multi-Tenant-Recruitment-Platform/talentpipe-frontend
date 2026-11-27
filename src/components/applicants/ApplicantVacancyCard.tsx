import { ClockCircleOutlined, RightOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { ApplicantVacancy } from '../../api/types';
import { TONE_CLASS, vacancyApplicantsPath } from '../../dashboard/applicants';
import { deadlineSignal, employmentTypeLabel } from '../../dashboard/jobVacancy';
import { formatRelativeTime } from '../../utils/format';
import { VacancyStatusTag } from '../jobs/VacancyStatusTag';

/**
 * One vacancy on the applicants landing page: what it is, how many applied,
 * how they split, and whether anyone is waiting for a person — the card a
 * recruiter scans to decide where to start. The whole card is one link.
 */
export function ApplicantVacancyCard({ vacancy }: Readonly<{ vacancy: ApplicantVacancy }>) {
  const { counts } = vacancy;
  const meta = [vacancy.department, vacancy.location, employmentTypeLabel(vacancy.employmentType)].filter(Boolean);
  const signal = vacancy.status === 'PUBLISHED' ? deadlineSignal(vacancy) : null;
  const chips = [
    { label: 'Auto-advanced', value: counts.autoAdvanced, tone: TONE_CLASS.success },
    { label: 'Manual review', value: counts.manualReview, tone: TONE_CLASS.warning },
    { label: 'Rejected', value: counts.rejected, tone: TONE_CLASS.error },
  ];

  return (
    <Link
      to={vacancyApplicantsPath(vacancy.id)}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-surface p-5 text-slate-800 no-underline shadow-sm transition-[border-color,box-shadow] duration-(--tp-motion-base) hover:border-primary-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 truncate text-lead font-semibold text-slate-900 group-hover:text-primary-700">
            {vacancy.title || 'Untitled vacancy'}
          </h3>
          {meta.length > 0 && <p className="m-0 mt-1 truncate text-small text-slate-500">{meta.join(' · ')}</p>}
        </div>
        <VacancyStatusTag value={vacancy.status} />
      </div>

      <p className="m-0 mt-5 flex items-baseline gap-2">
        <span className="text-heading font-semibold tabular-nums text-slate-900">{counts.all}</span>
        <span className="text-small text-slate-500">{counts.all === 1 ? 'applicant' : 'applicants'}</span>
      </p>

      <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
        {chips.map((chip) => (
          <li key={chip.label} className={`rounded-pill px-2.5 py-0.5 text-caption font-medium ${chip.tone}`}>
            {chip.label} <span className="tabular-nums">{chip.value}</span>
          </li>
        ))}
      </ul>

      {counts.manualReview > 0 && (
        <p className="m-0 mt-3 text-small font-medium text-warning-text">
          {counts.manualReview === 1 ? '1 applicant is' : `${counts.manualReview} applicants are`} waiting for a
          person to review
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-caption text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <ClockCircleOutlined aria-hidden />
          {vacancy.lastAppliedAt ? `Last applied ${formatRelativeTime(vacancy.lastAppliedAt)}` : 'No applications yet'}
          {signal && <span className="text-slate-400"> · {signal.label}</span>}
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-primary-700">
          Review
          <RightOutlined aria-hidden className="text-[11px] transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

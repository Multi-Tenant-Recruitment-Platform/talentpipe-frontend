import { useState } from 'react';
import type { JobSummary, WorkplaceType } from '../../api/types';
import { employmentTypeLabel, formatExperience, formatSalary, workplaceTypeLabel } from '../../jobs/jobLabels';
import { formatCalendarDate, formatRelativeTime } from '../../utils/format';
import { Icon, type IconName } from '../dashboard/Icon';

/** Company logo, or its initial when there is no logo or it fails to load. Decorative: the name is always shown beside it. */
export function CompanyMark({ name, logoUrl, size = 'md' }: Readonly<{ name: string; logoUrl?: string | null; size?: 'md' | 'lg' }>) {
  const [broken, setBroken] = useState(false);
  const box = size === 'lg' ? 'h-16 w-16 rounded-2xl text-2xl' : 'h-12 w-12 rounded-xl text-lg';

  if (logoUrl && !broken) {
    return (
      <img
        src={logoUrl}
        alt=""
        onError={() => setBroken(true)}
        className={`${box} shrink-0 border border-slate-200 bg-white object-contain p-1`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${box} flex shrink-0 items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white shadow-sm`}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

const WORKPLACE_TONES: Record<WorkplaceType, string> = {
  REMOTE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  HYBRID: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  ON_SITE: 'bg-amber-50 text-amber-800 ring-amber-600/20',
};
const NEUTRAL_TONE = 'bg-slate-50 text-slate-700 ring-slate-500/20';
const BADGE = 'inline-flex max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset';

/** Employment type, workplace type and (when hiring several) the number of openings; renders nothing when none is known. */
export function JobBadges({ job, className = '' }: Readonly<{ job: JobSummary; className?: string }>) {
  const openings = job.openings ?? 0;
  if (!job.employmentType && !job.workplaceType && openings < 2) return null;
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {job.employmentType && (
        <li className={`${BADGE} bg-indigo-50 text-indigo-700 ring-indigo-600/20`}>
          <span className="sr-only">Employment type: </span>
          {employmentTypeLabel(job.employmentType)}
        </li>
      )}
      {job.workplaceType && (
        <li className={`${BADGE} ${WORKPLACE_TONES[job.workplaceType] ?? NEUTRAL_TONE}`}>
          <span className="sr-only">Workplace: </span>
          {workplaceTypeLabel(job.workplaceType)}
        </li>
      )}
      {openings >= 2 && <li className={`${BADGE} ${NEUTRAL_TONE}`}>{openings} openings</li>}
    </ul>
  );
}

export function Deadline({ date, className = '' }: Readonly<{ date: string; className?: string }>) {
  return (
    <p className={`flex min-w-0 items-center gap-1.5 text-sm text-slate-600 ${className}`}>
      <Icon name="calendar" className="h-4 w-4 shrink-0 text-slate-400" />
      <span className="truncate">Apply by {formatCalendarDate(date)}</span>
    </p>
  );
}

/** Where, which team, what it pays and how much experience it asks for, plus the deadline unless the caller shows it elsewhere. */
export function JobMeta({
  job,
  showDeadline = true,
  className = '',
}: Readonly<{ job: JobSummary; showDeadline?: boolean; className?: string }>) {
  const items: { key: string; icon: IconName; label: string; value: string }[] = [];
  const salary = formatSalary(job);
  const experience = formatExperience(job.minimumExperienceYears);
  if (job.location) items.push({ key: 'location', icon: 'map-pin', label: 'Location', value: job.location });
  if (job.department) items.push({ key: 'department', icon: 'building', label: 'Department', value: job.department });
  if (salary) items.push({ key: 'salary', icon: 'banknotes', label: 'Salary', value: salary });
  if (experience) items.push({ key: 'experience', icon: 'briefcase', label: 'Experience', value: experience });
  if (showDeadline && job.applicationDeadline) {
    items.push({
      key: 'deadline',
      icon: 'calendar',
      label: 'Application deadline',
      value: `Apply by ${formatCalendarDate(job.applicationDeadline)}`,
    });
  }
  if (items.length === 0) return null;

  return (
    <ul className={`flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-600 ${className}`}>
      {items.map((item) => (
        <li key={item.key} className="flex min-w-0 max-w-full items-center gap-1.5">
          <Icon name={item.icon} className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="sr-only">{item.label}: </span>
          <span className="truncate">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}

/** Skills as tags; with `max`, the rest collapse into "+N more". `muted` is for nice-to-haves. */
export function SkillTags({
  skills,
  max,
  label = 'Required skills',
  muted = false,
  className = '',
}: Readonly<{ skills: string[]; max?: number; label?: string; muted?: boolean; className?: string }>) {
  const shown = max === undefined ? skills : skills.slice(0, max);
  const hidden = skills.length - shown.length;

  return (
    <ul aria-label={label} className={`flex flex-wrap gap-1.5 ${className}`}>
      {shown.map((skill) => (
        <li
          key={skill}
          title={skill}
          className={`max-w-full truncate rounded-md px-2 py-1 text-xs font-medium ${
            muted ? 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {skill}
        </li>
      ))}
      {hidden > 0 && <li className="px-1 py-1 text-xs font-medium text-slate-500">+{hidden} more</li>}
    </ul>
  );
}

/** "Posted 3 days ago". Renders nothing when the publish date is unknown. */
export function PostedAt({ iso, className = '' }: Readonly<{ iso?: string | null; className?: string }>) {
  if (!iso) return null;
  const when = formatRelativeTime(iso);
  if (when === '—') return null;
  return <p className={`shrink-0 text-xs text-slate-500 ${className}`}>Posted {when}</p>;
}

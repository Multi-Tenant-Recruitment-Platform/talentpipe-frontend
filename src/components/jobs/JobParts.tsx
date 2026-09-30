import { useState } from 'react';
import type { JobSummary } from '../../api/types';
import { formatDate } from '../../utils/format';
import { Icon, type IconName } from '../dashboard/Icon';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-10-31" is a calendar date; parse it as local midnight so it never shifts a day. */
const formatDeadline = (iso: string) => formatDate(DATE_ONLY.test(iso) ? `${iso}T00:00:00` : iso);

/** Company logo, or its initial when there is no logo or it fails to load. Decorative: the name is always shown beside it. */
export function CompanyMark({ name, logoUrl, size = 'md' }: Readonly<{ name: string; logoUrl?: string | null; size?: 'md' | 'lg' }>) {
  const [broken, setBroken] = useState(false);
  const box = size === 'lg' ? 'h-16 w-16 rounded-2xl text-xl' : 'h-11 w-11 rounded-xl text-base';

  if (logoUrl && !broken) {
    return (
      <img
        src={logoUrl}
        alt=""
        onError={() => setBroken(true)}
        className={`${box} shrink-0 border border-slate-200 bg-white object-contain`}
      />
    );
  }
  return (
    <span aria-hidden="true" className={`${box} flex shrink-0 items-center justify-center bg-indigo-50 font-bold text-indigo-600`}>
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

/** Location, category, employment/workplace type and deadline — only the ones the job actually has. */
export function JobMeta({ job, className = '' }: Readonly<{ job: JobSummary; className?: string }>) {
  const items: { key: string; icon: IconName; label: string; value: string }[] = [];
  if (job.location) items.push({ key: 'location', icon: 'map-pin', label: 'Location', value: job.location });
  if (job.category) items.push({ key: 'category', icon: 'briefcase', label: 'Category', value: job.category });
  if (job.employmentType) items.push({ key: 'employment', icon: 'clock', label: 'Employment type', value: job.employmentType });
  if (job.workplaceType) items.push({ key: 'workplace', icon: 'building', label: 'Workplace', value: job.workplaceType });
  if (job.applicationDeadline) {
    items.push({ key: 'deadline', icon: 'calendar', label: 'Application deadline', value: `Apply by ${formatDeadline(job.applicationDeadline)}` });
  }
  if (items.length === 0) return null;

  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-600 ${className}`}>
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

/** Skills as tags; with `max`, the rest collapse into "+N more". */
export function SkillTags({ skills, max, className = '' }: Readonly<{ skills: string[]; max?: number; className?: string }>) {
  const shown = max === undefined ? skills : skills.slice(0, max);
  const hidden = skills.length - shown.length;

  return (
    <ul aria-label="Skills" className={`flex flex-wrap gap-1.5 ${className}`}>
      {shown.map((skill) => (
        <li
          key={skill}
          title={skill}
          className="max-w-full truncate rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
        >
          {skill}
        </li>
      ))}
      {hidden > 0 && (
        <li className="rounded-full px-1 py-1 text-xs font-medium text-slate-500">+{hidden} more</li>
      )}
    </ul>
  );
}

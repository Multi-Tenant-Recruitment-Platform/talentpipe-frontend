import { useState } from 'react';
import type { JobSummary } from '../../api/types';
import { formatCalendarDate } from '../../utils/format';
import { Icon, type IconName } from '../dashboard/Icon';

/** Company logo, or its initial when there is no logo or it fails to load. Decorative: the name is always shown beside it. */
export function CompanyMark({ name, logoUrl, size = 'md' }: Readonly<{ name: string; logoUrl?: string | null; size?: 'md' | 'lg' }>) {
  const [broken, setBroken] = useState(false);
  const className = size === 'lg' ? 'tp-company-mark tp-company-mark-lg' : 'tp-company-mark';

  if (logoUrl && !broken) {
    return <img src={logoUrl} alt="" onError={() => setBroken(true)} className={className} />;
  }
  return (
    <span aria-hidden="true" className={className}>
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

/** Employment and workplace type as badges; renders nothing when neither is known. */
export function JobBadges({ job }: Readonly<{ job: JobSummary }>) {
  if (!job.employmentType && !job.workplaceType) return null;
  return (
    <ul className="tp-job-badges">
      {job.employmentType && (
        <li className="tp-job-badge tp-truncate">
          <span className="sr-only">Employment type: </span>
          {job.employmentType}
        </li>
      )}
      {job.workplaceType && (
        <li className="tp-job-badge tp-job-badge-neutral tp-truncate">
          <span className="sr-only">Workplace: </span>
          {job.workplaceType}
        </li>
      )}
    </ul>
  );
}

export function Deadline({ date }: Readonly<{ date: string }>) {
  return (
    <p className="tp-job-meta-item">
      <Icon name="calendar" size={16} />
      <span className="tp-truncate">Apply by {formatCalendarDate(date)}</span>
    </p>
  );
}

/** Location and category, plus the deadline unless the caller shows it elsewhere. */
export function JobMeta({ job, showDeadline = true }: Readonly<{ job: JobSummary; showDeadline?: boolean }>) {
  const items: { key: string; icon: IconName; label: string; value: string }[] = [];
  if (job.location) items.push({ key: 'location', icon: 'map-pin', label: 'Location', value: job.location });
  if (job.category) items.push({ key: 'category', icon: 'briefcase', label: 'Category', value: job.category });
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
    <ul className="tp-job-meta">
      {items.map((item) => (
        <li key={item.key} className="tp-job-meta-item">
          <Icon name={item.icon} size={16} />
          <span className="sr-only">{item.label}: </span>
          <span className="tp-truncate">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}

/** Skills as tags; with `max`, the rest collapse into "+N more". */
export function SkillTags({ skills, max }: Readonly<{ skills: string[]; max?: number }>) {
  const shown = max === undefined ? skills : skills.slice(0, max);
  const hidden = skills.length - shown.length;

  return (
    <ul aria-label="Skills" className="tp-job-skills">
      {shown.map((skill) => (
        <li key={skill} title={skill} className="tp-job-skill tp-truncate">
          {skill}
        </li>
      ))}
      {hidden > 0 && <li className="tp-job-skill-more">+{hidden} more</li>}
    </ul>
  );
}

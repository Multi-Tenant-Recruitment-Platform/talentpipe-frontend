import { useState, type CSSProperties } from 'react';
import type { JobSummary } from '../../api/types';
import { employmentTypeLabel, formatExperience, formatSalary, workplaceTypeLabel } from '../../jobs/jobLabels';
import { fontSize, fontWeight, radius } from '../../theme/tokens';
import { formatCalendarDate, formatRelativeTime } from '../../utils/format';
import { Icon, type IconName } from '../dashboard/Icon';

const MARK_SIZES = {
  md: { width: 48, height: 48, borderRadius: radius.lg, fontSize: fontSize.title },
  lg: { width: 64, height: 64, borderRadius: radius.xl, fontSize: fontSize.heading },
} as const;

/** Company logo, or its initial when there is no logo or it fails to load. Decorative: the name is always shown beside it. */
export function CompanyMark({ name, logoUrl, size = 'md' }: Readonly<{ name: string; logoUrl?: string | null; size?: 'md' | 'lg' }>) {
  const [broken, setBroken] = useState(false);
  const box = MARK_SIZES[size];

  if (logoUrl && !broken) {
    return <img src={logoUrl} alt="" onError={() => setBroken(true)} className="tp-job-logo" style={box} />;
  }
  return (
    <span aria-hidden="true" className="tp-brand-mark" style={{ ...box, flexShrink: 0, fontWeight: fontWeight.bold }}>
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

/**
 * Employment type, workplace type and (when hiring several) the number of openings; renders nothing when none is known.
 * Only the employment type takes the accent: the palette keeps green and amber for status, and where a job is done is not one.
 */
export function JobBadges({ job, style }: Readonly<{ job: JobSummary; style?: CSSProperties }>) {
  const openings = job.openings ?? 0;
  if (!job.employmentType && !job.workplaceType && openings < 2) return null;
  return (
    <ul className="tp-job-badges" style={style}>
      {job.employmentType && (
        <li className="tp-job-badge" data-tone="primary">
          <span className="sr-only">Employment type: </span>
          {employmentTypeLabel(job.employmentType)}
        </li>
      )}
      {job.workplaceType && (
        <li className="tp-job-badge">
          <span className="sr-only">Workplace: </span>
          {workplaceTypeLabel(job.workplaceType)}
        </li>
      )}
      {openings >= 2 && <li className="tp-job-badge">{openings} openings</li>}
    </ul>
  );
}

export function Deadline({ date }: Readonly<{ date: string }>) {
  return (
    <p className="tp-job-meta-item">
      <Icon name="calendar" size={16} />
      <span>Apply by {formatCalendarDate(date)}</span>
    </p>
  );
}

/** Where, which team, what it pays and how much experience it asks for, plus the deadline unless the caller shows it elsewhere. */
export function JobMeta({
  job,
  showDeadline = true,
  style,
}: Readonly<{ job: JobSummary; showDeadline?: boolean; style?: CSSProperties }>) {
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
    <ul className="tp-job-meta" style={style}>
      {items.map((item) => (
        <li key={item.key} className="tp-job-meta-item">
          <Icon name={item.icon} size={16} />
          <span className="sr-only">{item.label}: </span>
          <span>{item.value}</span>
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
  style,
}: Readonly<{ skills: string[]; max?: number; label?: string; muted?: boolean; style?: CSSProperties }>) {
  const shown = max === undefined ? skills : skills.slice(0, max);
  const hidden = skills.length - shown.length;

  return (
    <ul aria-label={label} className="tp-job-tags" style={style}>
      {shown.map((skill) => (
        <li key={skill} title={skill} className="tp-job-tag" data-muted={muted}>
          {skill}
        </li>
      ))}
      {hidden > 0 && <li className="tp-job-tag-more">+{hidden} more</li>}
    </ul>
  );
}

/** "Posted 3 days ago". Renders nothing when the publish date is unknown. */
export function PostedAt({ iso }: Readonly<{ iso?: string | null }>) {
  if (!iso) return null;
  const when = formatRelativeTime(iso);
  if (when === '—') return null;
  return <p className="tp-job-posted">Posted {when}</p>;
}

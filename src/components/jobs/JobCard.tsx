import { useId } from 'react';
import { Link } from 'react-router-dom';
import type { JobSummary } from '../../api/types';
import { employmentTypeLabel, formatSalary, workplaceTypeLabel } from '../../jobs/jobLabels';
import { jobPath } from '../../jobs/jobPaths';
import { formatCalendarDate } from '../../utils/format';
import { CompanyMark, PostedAt } from './JobParts';

/**
 * The panel tints, all from the palette. Picked from the job id rather than
 * the position in the list, so a card keeps its tint when the list is sorted
 * or filtered. The tint is decoration only: it never encodes anything.
 */
const TINTS = ['bg-primary-50', 'bg-slate-100', 'bg-primary-100'] as const;

/**
 * A polynomial hash of the id, reduced modulo the number of tints at every
 * step. Modular arithmetic gives the same remainder as hashing in full and
 * reducing once, but the running value stays below 31 × TINTS.length, so it
 * can never lose precision or overflow — however long the id.
 */
function tintOf(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % TINTS.length;
  return TINTS[hash];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const CLOSING_SOON_DAYS = 7;

/** True from a week before the deadline until the day itself. */
function closingSoon(date: string, now = Date.now()) {
  const end = Date.parse(`${date}T23:59:59`);
  if (Number.isNaN(end)) return false;
  const days = (end - now) / DAY_MS;
  return days >= 0 && days <= CLOSING_SOON_DAYS;
}

const chip = 'max-w-full truncate rounded-pill border border-slate-300 bg-surface px-2.5 py-0.5 text-caption font-medium text-slate-700';

/** How the job is worked, at a glance: type, place, experience asked for, and openings when hiring several. */
function JobChips({ job }: Readonly<{ job: JobSummary }>) {
  const years = job.minimumExperienceYears;
  const openings = job.openings ?? 0;
  const hasExperience = years !== null && years !== undefined;
  if (!job.employmentType && !job.workplaceType && !hasExperience && openings < 2) return null;

  return (
    <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
      {job.employmentType && (
        <li className={chip}>
          <span className="sr-only">Employment type: </span>
          {employmentTypeLabel(job.employmentType)}
        </li>
      )}
      {job.workplaceType && (
        <li className={chip}>
          <span className="sr-only">Workplace: </span>
          {workplaceTypeLabel(job.workplaceType)}
        </li>
      )}
      {hasExperience && (
        <li className={chip}>
          <span className="sr-only">Experience: </span>
          {years === 0 ? 'No experience' : `${years}+ yrs`}
        </li>
      )}
      {openings >= 2 && <li className={chip}>{openings} openings</li>}
    </ul>
  );
}

/**
 * One vacancy on the public board: enough to decide whether to open it, and
 * no more. A tinted panel holds who and what; below it, what it pays, where,
 * and the way in. The description, skills and benefits live on the details
 * page behind "Details".
 */
export function JobCard({ job }: Readonly<{ job: JobSummary }>) {
  const titleId = useId();
  const salary = formatSalary(job);
  const deadline = job.applicationDeadline;
  const soon = deadline ? closingSoon(deadline) : false;

  return (
    <article
      aria-labelledby={titleId}
      className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-surface p-1.5 shadow-sm transition-[box-shadow,translate] duration-(--tp-motion-base) ease-standard hover:-translate-y-px hover:shadow-md motion-reduce:hover:translate-y-0"
    >
      <div className={`flex flex-1 flex-col gap-3 rounded-xl p-4 ${tintOf(job.id)}`}>
        <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
          <PostedAt
            iso={job.publishedAt}
            className="m-0 rounded-pill bg-surface px-3 py-1 text-caption font-semibold text-slate-700"
          />
          {deadline && (
            <p
              className={`m-0 ml-auto rounded-pill px-2.5 py-1 text-caption font-semibold ${
                soon ? 'bg-warning-bg text-warning-text' : 'bg-surface text-slate-600'
              }`}
            >
              Apply by {formatCalendarDate(deadline)}
            </p>
          )}
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p title={job.companyName} className="m-0 truncate text-small font-medium text-slate-600">
              {job.companyName}
            </p>
            <h3
              id={titleId}
              title={job.title}
              className="m-0 mt-1 line-clamp-2 text-title leading-snug font-semibold tracking-heading text-slate-900 [overflow-wrap:anywhere]"
            >
              {job.title}
            </h3>
          </div>
          <CompanyMark name={job.companyName} logoUrl={job.companyLogoUrl} size="sm" round />
        </div>

        <JobChips job={job} />
      </div>

      <div className="flex items-end justify-between gap-3 px-3 pt-3.5 pb-2.5">
        <div className="min-w-0">
          {salary ? (
            <p data-numeric className="m-0 text-body font-bold text-slate-900">
              <span className="sr-only">Salary: </span>
              {salary}
            </p>
          ) : (
            <p className="m-0 text-small font-medium text-slate-500">Salary not disclosed</p>
          )}
          {job.location && (
            <p className="m-0 mt-0.5 truncate text-small text-slate-500">
              <span className="sr-only">Location: </span>
              <span title={job.location}>{job.location}</span>
            </p>
          )}
        </div>
        <Link
          to={jobPath(job)}
          className="flex-none rounded-pill bg-slate-900 px-4 py-2 text-small font-semibold text-white no-underline transition-colors duration-(--tp-motion-base) hover:bg-primary-600 hover:text-white"
        >
          Details<span className="sr-only">: {job.title}</span>
        </Link>
      </div>
    </article>
  );
}

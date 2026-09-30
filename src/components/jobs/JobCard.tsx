import { useId } from 'react';
import { Link } from 'react-router-dom';
import type { JobSummary } from '../../api/types';
import { Icon } from '../dashboard/Icon';
import { CompanyMark, Deadline, JobBadges, JobMeta, SkillTags } from './JobParts';

const MAX_SKILLS = 4;

const jobDetailPath = (id: string) => `/jobs/${encodeURIComponent(id)}`;

/**
 * One vacancy on the public board. Long titles and previews are clamped here;
 * the full text lives on the details page behind "View Job".
 */
export function JobCard({ job }: Readonly<{ job: JobSummary }>) {
  const titleId = useId();

  return (
    <article
      aria-labelledby={titleId}
      className="group flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/10"
    >
      <div className="flex flex-1 flex-col p-6">
        <div className="flex min-w-0 items-center gap-3">
          <CompanyMark name={job.companyName} logoUrl={job.companyLogoUrl} />
          <p title={job.companyName} className="min-w-0 truncate text-sm font-medium text-slate-600">
            {job.companyName}
          </p>
        </div>

        <h2
          id={titleId}
          title={job.title}
          className="mt-4 line-clamp-2 break-words text-lg font-bold leading-snug text-slate-900 transition-colors group-hover:text-indigo-700"
        >
          {job.title}
        </h2>

        <JobBadges job={job} className="mt-3" />

        {job.summary && <p className="mt-3 line-clamp-2 break-words text-sm leading-relaxed text-slate-600">{job.summary}</p>}

        <JobMeta job={job} showDeadline={false} className="mt-4" />

        {job.skills && job.skills.length > 0 && <SkillTags skills={job.skills} max={MAX_SKILLS} className="mt-4" />}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
        {job.applicationDeadline ? <Deadline date={job.applicationDeadline} /> : <span />}
        <Link
          to={jobDetailPath(job.id)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-indigo-500 hover:to-violet-500 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          View Job<span className="sr-only">: {job.title}</span>
          <Icon name="arrow-left" className="h-4 w-4 rotate-180" />
        </Link>
      </div>
    </article>
  );
}

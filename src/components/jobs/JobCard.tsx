import { useId } from 'react';
import { Link } from 'react-router-dom';
import type { JobSummary } from '../../api/types';
import { CompanyMark, JobMeta, SkillTags } from './JobParts';

const MAX_SKILLS = 5;

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
      className="flex h-full min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex min-w-0 items-start gap-3">
        <CompanyMark name={job.companyName} logoUrl={job.companyLogoUrl} />
        <div className="min-w-0">
          <h2 id={titleId} title={job.title} className="line-clamp-2 break-words text-base font-semibold leading-snug text-slate-900">
            {job.title}
          </h2>
          <p title={job.companyName} className="mt-0.5 truncate text-sm text-slate-500">
            {job.companyName}
          </p>
        </div>
      </div>

      {job.summary && <p className="mt-3 line-clamp-3 break-words text-sm text-slate-600">{job.summary}</p>}

      <JobMeta job={job} className="mt-4" />

      {job.skills && job.skills.length > 0 && <SkillTags skills={job.skills} max={MAX_SKILLS} className="mt-4" />}

      <div className="mt-auto pt-5">
        <Link
          to={jobDetailPath(job.id)}
          className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          View Job<span className="sr-only">: {job.title}</span>
        </Link>
      </div>
    </article>
  );
}

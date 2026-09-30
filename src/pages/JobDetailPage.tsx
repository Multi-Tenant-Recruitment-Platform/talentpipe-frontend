import { Link, useParams } from 'react-router-dom';
import { CompanyMark, JobBadges, JobMeta, SkillTags } from '../components/jobs/JobParts';
import { BackLink, JobLoadError, JobLoading, JobUnavailable } from '../components/jobs/JobStates';
import { jobApplyPath } from '../jobs/jobPaths';
import { usePublicJob } from '../jobs/usePublicJob';

const SECTION_HEADING = 'text-sm font-semibold uppercase tracking-wide text-slate-600';

function JobDetailView({ jobKey }: Readonly<{ jobKey: string }>) {
  const { state, retry } = usePublicJob(jobKey);

  if (state.status === 'loading') return <JobLoading />;
  if (state.status === 'error') return <JobLoadError message={state.message} onRetry={retry} />;

  const { job } = state;
  if (!job) return <JobUnavailable />;

  const about = job.description ?? job.summary;
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div aria-hidden="true" className="h-2 bg-gradient-to-r from-indigo-600 to-violet-600" />
      <div className="p-6 sm:p-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <CompanyMark name={job.companyName} logoUrl={job.companyLogoUrl} size="lg" />
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{job.title}</h1>
              <p className="mt-1 break-words font-medium text-slate-600">{job.companyName}</p>
            </div>
          </div>
          <Link
            to={jobApplyPath(job)}
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-indigo-500 hover:to-violet-500 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Apply Now
          </Link>
        </header>

        <JobBadges job={job} className="mt-5" />
        <JobMeta job={job} className="mt-4" />

        {about && (
          <section className="mt-8">
            <h2 className={SECTION_HEADING}>About the role</h2>
            <p className="mt-3 whitespace-pre-line break-words text-slate-700">{about}</p>
          </section>
        )}

        {job.requirements && job.requirements.length > 0 && (
          <section className="mt-8">
            <h2 className={SECTION_HEADING}>Requirements</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-slate-700">
              {job.requirements.map((requirement) => (
                <li key={requirement} className="break-words">
                  {requirement}
                </li>
              ))}
            </ul>
          </section>
        )}

        {job.skills && job.skills.length > 0 && (
          <section className="mt-8">
            <h2 className={SECTION_HEADING}>Skills</h2>
            <SkillTags skills={job.skills} className="mt-3" />
          </section>
        )}
      </div>
    </article>
  );
}

/** Public vacancy details, with the entry point to the application form. */
export function JobDetailPage() {
  const { jobKey = '' } = useParams();
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink to="/jobs">All jobs</BackLink>
      <div className="mt-6">
        <JobDetailView key={jobKey} jobKey={jobKey} />
      </div>
    </div>
  );
}

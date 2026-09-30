import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiErrorMessage } from '../api/client';
import { getPublicJob } from '../api/publicJobs';
import type { JobDetail } from '../api/types';
import { EmptyState } from '../components/dashboard/EmptyState';
import { Icon } from '../components/dashboard/Icon';
import { CompanyMark, JobBadges, JobMeta, SkillTags } from '../components/jobs/JobParts';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; job: JobDetail | null };

const SECTION_HEADING = 'text-sm font-semibold uppercase tracking-wide text-slate-600';

function BackLink() {
  return (
    <Link
      to="/jobs"
      className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-indigo-700 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
    >
      <Icon name="arrow-left" className="h-4 w-4" />
      All jobs
    </Link>
  );
}

function JobDetailView({ jobId }: Readonly<{ jobId: string }>) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getPublicJob(jobId)
      .then((job) => {
        if (!cancelled) setState({ status: 'ready', job });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: 'error', message: apiErrorMessage(err, 'We could not load this job. Please try again.') });
      });
    return () => {
      cancelled = true;
    };
  }, [jobId, attempt]);

  if (state.status === 'loading') {
    return (
      <div aria-busy="true" className="animate-pulse space-y-4">
        <span className="sr-only" role="status">
          Loading job…
        </span>
        <div className="h-8 w-2/3 rounded bg-slate-200" />
        <div className="h-4 w-1/3 rounded bg-slate-100" />
        <div className="h-32 rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <Alert tone="error">
        <p>{state.message}</p>
        <Button
          size="sm"
          className="mt-3"
          onClick={() => {
            setState({ status: 'loading' });
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </Alert>
    );
  }

  const { job } = state;
  if (!job) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white">
        <EmptyState
          icon="briefcase"
          title="This job is not available."
          description="It may have been closed or removed. Browse the other open positions instead."
          action={<BackLink />}
        />
      </div>
    );
  }

  const about = job.description ?? job.summary;
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div aria-hidden="true" className="h-2 bg-gradient-to-r from-indigo-600 to-violet-600" />
      <div className="p-6 sm:p-8">
        <header className="flex min-w-0 items-start gap-4">
          <CompanyMark name={job.companyName} logoUrl={job.companyLogoUrl} size="lg" />
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{job.title}</h1>
            <p className="mt-1 break-words font-medium text-slate-600">{job.companyName}</p>
          </div>
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

/** Public vacancy details. Applying for the job is a separate task (PB-019). */
export function JobDetailPage() {
  const { jobId = '' } = useParams();
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink />
      <div className="mt-6">
        <JobDetailView key={jobId} jobId={jobId} />
      </div>
    </div>
  );
}

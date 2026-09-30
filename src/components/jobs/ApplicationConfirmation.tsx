import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { JobApplicationResponse, JobSummary } from '../../api/types';
import { jobPath } from '../../jobs/jobPaths';
import { Icon } from '../dashboard/Icon';

export function ApplicationConfirmation({
  job,
  application,
}: Readonly<{ job: JobSummary; application: JobApplicationResponse }>) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The form this replaces had focus; move it here so the outcome is announced.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-center shadow-sm">
      <div aria-hidden="true" className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />
      <div className="px-6 py-10 sm:px-12 sm:py-14">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Icon name="check" className="h-8 w-8" />
        </span>
        <h1 ref={headingRef} tabIndex={-1} className="mt-6 text-2xl font-bold tracking-tight text-slate-900 focus:outline-none sm:text-3xl">
          Application submitted successfully!
        </h1>
        <p className="mx-auto mt-3 max-w-md break-words text-slate-600">
          Your application for <span className="font-semibold text-slate-900">{job.title}</span> at{' '}
          <span className="font-semibold text-slate-900">{job.companyName}</span> has been sent.
        </p>
        <p className="mt-4 text-xs text-slate-500">
          Reference: <span className="break-all font-mono text-slate-700">{application.id}</span>
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/jobs"
            className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-indigo-500 hover:to-violet-500 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Browse more jobs
          </Link>
          <Link
            to={jobPath(job)}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/25"
          >
            View job details
          </Link>
        </div>
      </div>
    </section>
  );
}

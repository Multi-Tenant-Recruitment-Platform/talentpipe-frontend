import { ArrowRightOutlined, CheckOutlined } from '@ant-design/icons';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { JobApplicationResponse, JobSummary } from '../../api/types';
import { jobPath } from '../../jobs/jobPaths';

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
    <section className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-surface text-center shadow-lg">
      <div aria-hidden="true" className="h-1.5 bg-linear-to-r from-success to-primary-600" />
      <div className="px-6 py-10 sm:px-12 sm:py-12">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-success-bg text-success-text ring-8 ring-success-bg/40">
          <CheckOutlined aria-hidden className="text-[28px]" />
        </span>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="m-0 mt-6 text-heading leading-tight font-bold tracking-heading text-slate-900 outline-none"
        >
          Application submitted successfully!
        </h1>
        <p className="mx-auto mt-3 mb-0 max-w-md text-lead leading-normal text-slate-600">
          Your application for <strong className="text-slate-900">{job.title}</strong> at{' '}
          <strong className="text-slate-900">{job.companyName}</strong> has been sent.
        </p>
        <p className="m-0 mt-5 inline-flex items-center gap-2 rounded-pill border border-slate-200 bg-canvas px-4 py-1.5 text-small text-slate-600">
          Reference: <code className="font-semibold text-slate-900">{application.id}</code>
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/jobs"
            className="group flex h-11 items-center justify-center gap-2 rounded-pill bg-primary-600 px-6 font-semibold text-white no-underline shadow-primary transition-colors hover:bg-primary-500 hover:text-white"
          >
            Browse more jobs
            <ArrowRightOutlined
              aria-hidden
              className="text-[14px] transition-transform duration-(--tp-motion-base) group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            to={jobPath(job)}
            className="flex h-11 items-center justify-center rounded-pill border border-slate-300 bg-surface px-6 font-semibold text-slate-700 no-underline transition-colors hover:border-slate-400 hover:bg-canvas hover:text-slate-900"
          >
            View job details
          </Link>
        </div>
      </div>
    </section>
  );
}

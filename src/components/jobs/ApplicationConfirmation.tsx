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
    <section className="tp-job-panel tp-apply-done">
      <span className="tp-apply-done-mark">
        <Icon name="check" size={32} />
      </span>
      <h1 ref={headingRef} tabIndex={-1} className="tp-job-title">
        Application submitted successfully!
      </h1>
      <p className="tp-apply-done-text">
        Your application for <strong>{job.title}</strong> at <strong>{job.companyName}</strong> has been sent.
      </p>
      <p className="tp-apply-done-ref">
        Reference: <code>{application.id}</code>
      </p>

      <div className="tp-apply-done-actions">
        <Link to="/jobs" className="tp-cta-link">
          Browse more jobs
        </Link>
        <Link to={jobPath(job)} className="tp-cta-link tp-cta-link-ghost">
          View job details
        </Link>
      </div>
    </section>
  );
}

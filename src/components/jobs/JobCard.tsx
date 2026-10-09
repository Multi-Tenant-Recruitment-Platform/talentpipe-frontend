import { useId } from 'react';
import { Link } from 'react-router-dom';
import type { JobSummary } from '../../api/types';
import { formatSalary } from '../../jobs/jobLabels';
import { jobPath } from '../../jobs/jobPaths';
import { Icon } from '../dashboard/Icon';
import { CompanyMark, Deadline, JobBadges, PostedAt, SkillTags } from './JobParts';

const MAX_SKILLS = 3;

/**
 * One vacancy on the public board: enough to decide whether to open it, and
 * no more. Who, what, where, how it is worked, what it pays, a few skills and
 * the deadline — the description, requirements and benefits live on the
 * details page behind "View Job".
 */
export function JobCard({ job }: Readonly<{ job: JobSummary }>) {
  const titleId = useId();
  const salary = formatSalary(job);

  return (
    <article aria-labelledby={titleId} className="tp-job-card">
      <div className="tp-job-card-head">
        <CompanyMark name={job.companyName} logoUrl={job.companyLogoUrl} size="sm" />
        <div className="tp-job-card-who">
          <p title={job.companyName} className="tp-job-card-company">
            {job.companyName}
          </p>
          <PostedAt iso={job.publishedAt} />
        </div>
      </div>

      <h2 id={titleId} title={job.title} className="tp-job-card-title">
        {job.title}
      </h2>

      {job.location && (
        <p className="tp-job-meta-item">
          <Icon name="map-pin" size={16} />
          <span className="sr-only">Location: </span>
          <span>{job.location}</span>
        </p>
      )}

      <JobBadges job={job} />

      {salary && (
        <p className="tp-job-card-salary">
          <span className="sr-only">Salary: </span>
          {salary}
        </p>
      )}

      {job.requiredSkills && job.requiredSkills.length > 0 && <SkillTags skills={job.requiredSkills} max={MAX_SKILLS} />}

      <div className="tp-job-card-foot">
        {job.applicationDeadline ? <Deadline date={job.applicationDeadline} /> : <span />}
        <Link to={jobPath(job)} className="tp-cta-link tp-job-card-cta">
          View Job<span className="sr-only">: {job.title}</span>
          <Icon name="arrow-left" size={16} style={{ transform: 'rotate(180deg)' }} />
        </Link>
      </div>
    </article>
  );
}

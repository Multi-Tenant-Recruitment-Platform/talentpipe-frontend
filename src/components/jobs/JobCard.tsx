import { useId } from 'react';
import { Link } from 'react-router-dom';
import type { JobSummary } from '../../api/types';
import { jobPath } from '../../jobs/jobPaths';
import { Icon } from '../dashboard/Icon';
import { CompanyMark, Deadline, JobBadges, JobMeta, SkillTags } from './JobParts';

const MAX_SKILLS = 4;

/**
 * One vacancy on the public board. Long titles and previews are clamped here;
 * the full text lives on the details page behind "View Job".
 */
export function JobCard({ job }: Readonly<{ job: JobSummary }>) {
  const titleId = useId();

  return (
    <article aria-labelledby={titleId} className="tp-job-panel tp-job-card">
      <div className="tp-job-card-body">
        <div className="tp-job-card-company">
          <CompanyMark name={job.companyName} logoUrl={job.companyLogoUrl} />
          <p title={job.companyName} className="tp-truncate">
            {job.companyName}
          </p>
        </div>

        <h2 id={titleId} title={job.title} className="tp-job-card-title tp-clamp-2">
          {job.title}
        </h2>

        <JobBadges job={job} />

        {job.summary && <p className="tp-job-card-summary tp-clamp-2">{job.summary}</p>}

        <JobMeta job={job} showDeadline={false} />

        {job.skills && job.skills.length > 0 && <SkillTags skills={job.skills} max={MAX_SKILLS} />}
      </div>

      <div className="tp-job-card-foot">
        {job.applicationDeadline ? <Deadline date={job.applicationDeadline} /> : <span />}
        <Link to={jobPath(job)} className="tp-cta-link">
          View Job<span className="sr-only">: {job.title}</span>
          <Icon name="arrow-left" size={16} style={{ transform: 'rotate(180deg)' }} />
        </Link>
      </div>
    </article>
  );
}

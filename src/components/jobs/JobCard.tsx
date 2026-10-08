import { useId } from 'react';
import { Link } from 'react-router-dom';
import type { JobSummary } from '../../api/types';
import { space } from '../../theme/tokens';
import { Icon } from '../dashboard/Icon';
import { CompanyMark, Deadline, JobBadges, JobMeta, PostedAt, SkillTags } from './JobParts';

const MAX_SKILLS = 4;

const jobDetailPath = (id: string) => `/jobs/${encodeURIComponent(id)}`;

/**
 * One vacancy on the public board. Long titles and previews are clamped here;
 * the full text lives on the details page behind "View Job".
 */
export function JobCard({ job }: Readonly<{ job: JobSummary }>) {
  const titleId = useId();

  return (
    <article aria-labelledby={titleId} className="tp-job-card">
      <div className="tp-job-card-body">
        <div className="tp-job-card-head">
          <CompanyMark name={job.companyName} logoUrl={job.companyLogoUrl} />
          <p title={job.companyName} className="tp-job-card-company">
            {job.companyName}
          </p>
          <PostedAt iso={job.publishedAt} />
        </div>

        <h2 id={titleId} title={job.title} className="tp-job-card-title">
          {job.title}
        </h2>

        <JobBadges job={job} style={{ marginTop: space[1.5] }} />

        {job.jobSummary && <p className="tp-job-card-summary">{job.jobSummary}</p>}

        <JobMeta job={job} showDeadline={false} style={{ marginTop: space[2] }} />

        {job.requiredSkills && job.requiredSkills.length > 0 && (
          <SkillTags skills={job.requiredSkills} max={MAX_SKILLS} style={{ marginTop: space[2] }} />
        )}
      </div>

      <div className="tp-job-card-foot">
        {job.applicationDeadline ? <Deadline date={job.applicationDeadline} /> : <span />}
        <Link to={jobDetailPath(job.id)} className="tp-cta-link">
          View Job<span className="sr-only">: {job.title}</span>
          <Icon name="arrow-left" size={16} style={{ transform: 'rotate(180deg)' }} />
        </Link>
      </div>
    </article>
  );
}

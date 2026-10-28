import { RightOutlined } from '@ant-design/icons';
import { useId } from 'react';
import { Link } from 'react-router-dom';
import type { JobSummary } from '../../api/types';
import { employmentTypeLabel, workplaceTypeLabel } from '../../jobs/jobLabels';
import { jobPath } from '../../jobs/jobPaths';
import { CompanyMark, PostedAt } from './JobParts';

export function JobCard({ job }: Readonly<{ job: JobSummary }>) {
  const titleId = useId();
  const tags = [...new Set([job.department, ...(job.requiredSkills ?? []),
    job.employmentType ? employmentTypeLabel(job.employmentType) : null,
  ].filter((tag): tag is string => Boolean(tag)))].slice(0, 4);
  return (
    <article aria-labelledby={titleId} className="board-job-row">
      <div className="board-company">
        <CompanyMark name={job.companyName} logoUrl={job.companyLogoUrl} size="md" />
        <div><strong>{job.companyName}</strong><p>{job.location || (job.workplaceType === 'REMOTE' ? 'Remote-first' : 'Location not specified')}</p></div>
      </div>
      <div className="board-job-content">
        <h3 id={titleId}><Link to={jobPath(job)}>{job.title}</Link></h3>
        <p className="board-job-meta"><span>{job.companyName}</span>{job.location && <span>{job.location}</span>}{job.workplaceType && <span>{workplaceTypeLabel(job.workplaceType)}</span>}</p>
        {tags.length > 0 && <ul className="board-job-tags">{tags.map(tag => <li key={tag}>{tag}</li>)}</ul>}
      </div>
      <PostedAt iso={job.publishedAt} className="board-posted" />
      <Link className="board-job-arrow" to={jobPath(job)} aria-label={'Details: ' + job.title}><RightOutlined /></Link>
    </article>
  );
}

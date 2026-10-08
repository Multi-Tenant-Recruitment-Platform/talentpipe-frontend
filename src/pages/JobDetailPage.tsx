import { Link, useParams } from 'react-router-dom';
import { CompanyMark, JobBadges, JobMeta, SkillTags } from '../components/jobs/JobParts';
import { BackLink, JobLoadError, JobLoading, JobUnavailable } from '../components/jobs/JobStates';
import { jobApplyPath } from '../jobs/jobPaths';
import { usePublicJob } from '../jobs/usePublicJob';

function JobDetailView({ jobKey }: Readonly<{ jobKey: string }>) {
  const { state, retry } = usePublicJob(jobKey);

  if (state.status === 'loading') return <JobLoading />;
  if (state.status === 'error') return <JobLoadError message={state.message} onRetry={retry} />;

  const { job } = state;
  if (!job) return <JobUnavailable />;

  const about = job.description ?? job.summary;
  return (
    <article className="tp-job-panel tp-job-panel-body">
      <header className="tp-job-detail-head">
        <div className="tp-job-identity">
          <CompanyMark name={job.companyName} logoUrl={job.companyLogoUrl} size="lg" />
          <div className="tp-job-identity-text">
            <h1 className="tp-job-title">{job.title}</h1>
            <p className="tp-job-company">{job.companyName}</p>
          </div>
        </div>
        <Link to={jobApplyPath(job)} className="tp-cta-link">
          Apply Now
        </Link>
      </header>

      <div className="tp-job-detail-facts">
        <JobBadges job={job} />
        <JobMeta job={job} />
      </div>

      {about && (
        <section className="tp-job-section">
          <h2 className="tp-job-section-title">About the role</h2>
          <p className="tp-job-prose">{about}</p>
        </section>
      )}

      {job.requirements && job.requirements.length > 0 && (
        <section className="tp-job-section">
          <h2 className="tp-job-section-title">Requirements</h2>
          <ul className="tp-job-requirements">
            {job.requirements.map((requirement) => (
              <li key={requirement}>{requirement}</li>
            ))}
          </ul>
        </section>
      )}

      {job.skills && job.skills.length > 0 && (
        <section className="tp-job-section">
          <h2 className="tp-job-section-title">Skills</h2>
          <SkillTags skills={job.skills} />
        </section>
      )}
    </article>
  );
}

/** Public vacancy details, with the entry point to the application form. */
export function JobDetailPage() {
  const { jobKey = '' } = useParams();
  return (
    <div className="tp-job-page">
      <BackLink to="/jobs">All jobs</BackLink>
      <JobDetailView key={jobKey} jobKey={jobKey} />
    </div>
  );
}

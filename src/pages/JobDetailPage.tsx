import { useParams } from 'react-router-dom';
import { JobAdvert, JobApplyCard } from '../components/jobs/JobAdvert';
import { BackLink, JobLoadError, JobLoading, JobUnavailable } from '../components/jobs/JobStates';
import { usePublicJob } from '../jobs/usePublicJob';
import { space } from '../theme/tokens';

function JobDetailView({ jobKey }: Readonly<{ jobKey: string }>) {
  const { state, retry } = usePublicJob(jobKey);

  if (state.status === 'loading') return <JobLoading />;
  if (state.status === 'error') return <JobLoadError message={state.message} onRetry={retry} />;
  if (!state.job) return <JobUnavailable />;

  return (
    <div className="tp-job-view">
      <JobAdvert job={state.job} />
      <JobApplyCard job={state.job} />
    </div>
  );
}

/** Public vacancy details, with the entry point to the application form (PB-019). */
export function JobDetailPage() {
  const { jobKey = '' } = useParams();
  return (
    <div style={{ maxWidth: 1080, marginInline: 'auto' }}>
      <BackLink to="/jobs">All jobs</BackLink>
      <div style={{ marginTop: space[3] }}>
        <JobDetailView key={jobKey} jobKey={jobKey} />
      </div>
    </div>
  );
}

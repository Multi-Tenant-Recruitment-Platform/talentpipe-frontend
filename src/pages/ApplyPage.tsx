import { useState } from 'react';
import { useParams } from 'react-router-dom';
import type { JobApplicationResponse } from '../api/types';
import { ApplicationConfirmation } from '../components/jobs/ApplicationConfirmation';
import { ApplicationForm } from '../components/jobs/ApplicationForm';
import { BackLink, JobLoadError, JobLoading, JobUnavailable } from '../components/jobs/JobStates';
import { Alert } from '../components/ui/Alert';
import { usePublicJob } from '../jobs/usePublicJob';
import { space } from '../theme/tokens';

function ApplyView({ jobKey }: Readonly<{ jobKey: string }>) {
  const { state, retry } = usePublicJob(jobKey);
  const [application, setApplication] = useState<JobApplicationResponse | null>(null);

  if (state.status === 'loading') return <JobLoading />;
  if (state.status === 'error') return <JobLoadError message={state.message} onRetry={retry} />;
  if (!state.job) return <JobUnavailable />;
  // Reached by a saved link after the deadline: say so here rather than let the form be filled in and refused.
  if (state.job.acceptingApplications === false) {
    return <Alert tone="info">{state.job.title} is no longer accepting applications.</Alert>;
  }

  // Once submitted, the form is gone for good, so it cannot be sent twice.
  return application ? (
    <ApplicationConfirmation job={state.job} application={application} />
  ) : (
    <ApplicationForm job={state.job} onSubmitted={setApplication} />
  );
}

/** Apply-for-vacancy flow (PB-019): the form, then the confirmation. */
export function ApplyPage() {
  const { jobKey = '' } = useParams();
  return (
    <div style={{ maxWidth: 768, marginInline: 'auto' }}>
      <BackLink to={`/jobs/${encodeURIComponent(jobKey)}`}>Back to job</BackLink>
      <div style={{ marginTop: space[3] }}>
        <ApplyView key={jobKey} jobKey={jobKey} />
      </div>
    </div>
  );
}

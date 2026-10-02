import { useState } from 'react';
import { useParams } from 'react-router-dom';
import type { JobApplicationResponse } from '../api/types';
import { ApplicationConfirmation } from '../components/jobs/ApplicationConfirmation';
import { ApplicationForm } from '../components/jobs/ApplicationForm';
import { BackLink, JobLoadError, JobLoading, JobUnavailable } from '../components/jobs/JobStates';
import { usePublicJob } from '../jobs/usePublicJob';

function ApplyView({ jobKey }: Readonly<{ jobKey: string }>) {
  const { state, retry } = usePublicJob(jobKey);
  const [application, setApplication] = useState<JobApplicationResponse | null>(null);

  if (state.status === 'loading') return <JobLoading />;
  if (state.status === 'error') return <JobLoadError message={state.message} onRetry={retry} />;
  if (!state.job) return <JobUnavailable />;

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
    <div className="mx-auto max-w-3xl">
      <BackLink to={`/jobs/${encodeURIComponent(jobKey)}`}>Back to job</BackLink>
      <div className="mt-6">
        <ApplyView key={jobKey} jobKey={jobKey} />
      </div>
    </div>
  );
}

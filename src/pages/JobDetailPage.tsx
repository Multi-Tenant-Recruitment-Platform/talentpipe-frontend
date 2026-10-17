import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { HeroBand } from '../components/jobs/HeroBand';
import { JobAdvert, JobApplyCard, JobHero } from '../components/jobs/JobAdvert';
import { BackLink, JobLoadError, JobLoading, JobUnavailable } from '../components/jobs/JobStates';
import { pageContainer } from '../components/ui/classes';
import { usePublicJob } from '../jobs/usePublicJob';

/**
 * The page's two layers: the dark strip with the way back and, once the job is
 * known, its identity; then the content, pulled up to overlap the strip's
 * bottom edge so the two read as one composition. The bottom padding on a
 * phone clears the apply bar pinned there.
 */
function Shell({ hero, children }: Readonly<{ hero?: ReactNode; children: ReactNode }>) {
  return (
    <div>
      <HeroBand className={hero ? 'pt-6 pb-20 lg:pt-8 lg:pb-24' : 'pt-6 pb-16'}>
        <BackLink to="/jobs" tone="dark">
          All jobs
        </BackLink>
        {hero && <div className="mt-6">{hero}</div>}
      </HeroBand>
      <div className={`${pageContainer} relative -mt-12 pb-28 lg:-mt-14 lg:pb-16`}>{children}</div>
    </div>
  );
}

function JobDetailView({ jobKey }: Readonly<{ jobKey: string }>) {
  const { state, retry } = usePublicJob(jobKey);

  if (state.status === 'loading') return <Shell><JobLoading /></Shell>;
  if (state.status === 'error') return <Shell><JobLoadError message={state.message} onRetry={retry} /></Shell>;
  if (!state.job) return <Shell><JobUnavailable /></Shell>;

  return (
    <Shell hero={<JobHero job={state.job} />}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <JobAdvert job={state.job} />
        <JobApplyCard job={state.job} />
      </div>
    </Shell>
  );
}

/** Public vacancy details, with the entry point to the application form (PB-019). */
export function JobDetailPage() {
  const { jobKey = '' } = useParams();
  return <JobDetailView key={jobKey} jobKey={jobKey} />;
}

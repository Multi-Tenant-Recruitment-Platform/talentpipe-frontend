import { EnvironmentOutlined, FileTextOutlined, WalletOutlined } from '@ant-design/icons';
import { useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import type { JobApplicationResponse, JobSummary } from '../api/types';
import { ApplicationConfirmation } from '../components/jobs/ApplicationConfirmation';
import { ApplicationForm, ApplyHero } from '../components/jobs/ApplicationForm';
import { HeroBand } from '../components/jobs/HeroBand';
import { DeadlineFact } from '../components/jobs/JobAdvert';
import { BackLink, JobLoadError, JobLoading, JobUnavailable } from '../components/jobs/JobStates';
import { Alert } from '../components/ui/Alert';
import { pageContainer } from '../components/ui/classes';
import { formatSalary } from '../jobs/jobLabels';
import { usePublicJob } from '../jobs/usePublicJob';

/**
 * The page's two layers, as on the job's details page: the dark strip with
 * the way back and, once the job is known, what is being applied for; then
 * the content, pulled up to overlap the strip's bottom edge.
 */
function Shell({ jobKey, hero, children }: Readonly<{ jobKey: string; hero?: ReactNode; children: ReactNode }>) {
  return (
    <div>
      <HeroBand className={hero ? 'pt-6 pb-20 lg:pt-8 lg:pb-24' : 'pt-6 pb-16'}>
        <BackLink to={`/jobs/${encodeURIComponent(jobKey)}`} tone="dark">
          Back to job
        </BackLink>
        {hero && <div className="mt-6">{hero}</div>}
      </HeroBand>
      <div className={`${pageContainer} relative -mt-12 pb-16 lg:-mt-14`}>{children}</div>
    </div>
  );
}

/**
 * What the candidate weighs while filling the form in — the pay, the place
 * and the deadline — kept in view beside it on a wide screen. Left out on a
 * phone, where it would only push the form down.
 */
function RoleSummary({ job }: Readonly<{ job: JobSummary }>) {
  const salary = formatSalary(job);
  const facts: { icon: typeof WalletOutlined; label: string; value: string }[] = [];
  if (salary) facts.push({ icon: WalletOutlined, label: 'Salary', value: salary });
  if (job.location) facts.push({ icon: EnvironmentOutlined, label: 'Location', value: job.location });

  return (
    <aside aria-label="About this role" className="hidden lg:sticky lg:top-24 lg:block">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-sm">
        <div aria-hidden="true" className="h-1.5 bg-linear-to-r from-primary-600 to-primary-500" />
        <div className="p-6">
          <h2 className="m-0 text-small font-bold tracking-caps text-slate-500 uppercase">At a glance</h2>
          {(facts.length > 0 || job.applicationDeadline) && (
            <dl className="m-0 mt-4 flex flex-col gap-4">
              {facts.map((fact) => (
                <div key={fact.label} className="flex items-start gap-3">
                  <span aria-hidden="true" className="grid size-9 flex-none place-items-center rounded-xl bg-primary-50 text-primary-600">
                    <fact.icon className="text-[16px]" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-caption font-medium text-slate-500">{fact.label}</dt>
                    <dd className="m-0 mt-0.5 text-body font-semibold text-slate-900">{fact.value}</dd>
                  </div>
                </div>
              ))}
              {job.applicationDeadline && <DeadlineFact date={job.applicationDeadline} />}
            </dl>
          )}
          <p className="m-0 mt-5 flex items-start gap-2 rounded-xl bg-canvas p-3 text-small leading-normal text-slate-600">
            <FileTextOutlined aria-hidden className="mt-0.5 text-[14px] text-primary-600" />
            Have your CV ready as a PDF, DOC or DOCX file.
          </p>
        </div>
      </div>
    </aside>
  );
}

function ApplyView({ jobKey }: Readonly<{ jobKey: string }>) {
  const { state, retry } = usePublicJob(jobKey);
  const [application, setApplication] = useState<JobApplicationResponse | null>(null);

  if (state.status === 'loading') return <Shell jobKey={jobKey}><JobLoading /></Shell>;
  if (state.status === 'error') {
    return <Shell jobKey={jobKey}><JobLoadError message={state.message} onRetry={retry} /></Shell>;
  }
  if (!state.job) return <Shell jobKey={jobKey}><JobUnavailable /></Shell>;
  const job = state.job;
  // Reached by a saved link after the deadline: say so here rather than let the form be filled in and refused.
  if (job.acceptingApplications === false) {
    return (
      <Shell jobKey={jobKey} hero={<ApplyHero job={job} />}>
        <Alert tone="info">{job.title} is no longer accepting applications.</Alert>
      </Shell>
    );
  }

  // Once submitted, the form is gone for good, so it cannot be sent twice.
  if (application) {
    return (
      <Shell jobKey={jobKey} hero={<ApplyHero job={job} titleAs="p" />}>
        <ApplicationConfirmation job={job} application={application} />
      </Shell>
    );
  }
  return (
    <Shell jobKey={jobKey} hero={<ApplyHero job={job} />}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <ApplicationForm job={job} onSubmitted={setApplication} />
        <RoleSummary job={job} />
      </div>
    </Shell>
  );
}

/** Apply-for-vacancy flow (PB-019): the form, then the confirmation. */
export function ApplyPage() {
  const { jobKey = '' } = useParams();
  return <ApplyView key={jobKey} jobKey={jobKey} />;
}

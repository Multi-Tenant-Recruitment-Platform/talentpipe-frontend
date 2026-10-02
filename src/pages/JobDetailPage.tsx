import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiErrorMessage } from '../api/client';
import { getPublicJob } from '../api/publicJobs';
import type { JobDetail } from '../api/types';
import { EmptyState } from '../components/dashboard/EmptyState';
import { Icon, type IconName } from '../components/dashboard/Icon';
import { CompanyMark, JobBadges, JobMeta, PostedAt, SkillTags } from '../components/jobs/JobParts';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { benefitLabel, sortBenefits } from '../dashboard/companyProfile';
import { formatExperience, formatSalary, formatWorkingDays, shiftTypeLabel } from '../jobs/jobLabels';

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; job: JobDetail | null };

const SECTION_HEADING = 'text-sm font-semibold uppercase tracking-wide text-slate-600';

function BackLink() {
  return (
    <Link
      to="/jobs"
      className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-indigo-700 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
    >
      <Icon name="arrow-left" className="h-4 w-4" />
      All jobs
    </Link>
  );
}

function JobDetailView({ jobId }: Readonly<{ jobId: string }>) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getPublicJob(jobId)
      .then((job) => {
        if (!cancelled) setState({ status: 'ready', job });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: 'error', message: apiErrorMessage(err, 'We could not load this job. Please try again.') });
      });
    return () => {
      cancelled = true;
    };
  }, [jobId, attempt]);

  if (state.status === 'loading') {
    return (
      <div aria-busy="true" className="animate-pulse space-y-4">
        <span className="sr-only" role="status">
          Loading job…
        </span>
        <div className="h-8 w-2/3 rounded bg-slate-200" />
        <div className="h-4 w-1/3 rounded bg-slate-100" />
        <div className="h-32 rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <Alert tone="error">
        <p>{state.message}</p>
        <Button
          size="sm"
          className="mt-3"
          onClick={() => {
            setState({ status: 'loading' });
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </Alert>
    );
  }

  const { job } = state;
  if (!job) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white">
        <EmptyState
          icon="briefcase"
          title="This job is not available."
          description="It may have been closed or removed. Browse the other open positions instead."
          action={<BackLink />}
        />
      </div>
    );
  }

  return <JobAdvert job={job} />;
}

function Section({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="mt-8">
      <h2 className={SECTION_HEADING}>{title}</h2>
      {children}
    </section>
  );
}

function SubHeading({ children }: Readonly<{ children: string }>) {
  return <h3 className="text-sm font-semibold text-slate-800">{children}</h3>;
}

/** A tick per item: responsibilities and perks read as things you do or get, not bullet points. */
function CheckList({ items, label, columns = false }: Readonly<{ items: string[]; label: string; columns?: boolean }>) {
  return (
    <ul aria-label={label} className={`mt-3 grid gap-2 text-slate-700 ${columns ? 'sm:grid-cols-2' : ''}`}>
      {items.map((item) => (
        <li key={item} className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <Icon name="check" className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 break-words">{item}</span>
        </li>
      ))}
    </ul>
  );
}

const hasItems = (list: string[] | null | undefined): list is string[] => Boolean(list && list.length > 0);

/** The whole advert, in the order the company filled in the vacancy form. Sections with nothing in them are left out. */
function JobAdvert({ job }: Readonly<{ job: JobDetail }>) {
  const facts: { icon: IconName; label: string; value: string }[] = [];
  const addFact = (icon: IconName, label: string, value: string | null | undefined) => {
    if (value) facts.push({ icon, label, value });
  };
  addFact('building', 'Department', job.department);
  addFact('users', 'Openings', job.openings ? String(job.openings) : null);
  addFact('briefcase', 'Experience', formatExperience(job.minimumExperienceYears));
  addFact('academic-cap', 'Education', job.education);
  addFact('banknotes', 'Salary', formatSalary(job));
  addFact('calendar', 'Working days', formatWorkingDays(job.workingDays));
  addFact('clock', 'Working hours', job.workingHours);
  addFact('bolt', 'Shift', job.shiftType ? shiftTypeLabel(job.shiftType) : null);
  addFact('clock', 'Hours per week', job.expectedHoursPerWeek ? `${job.expectedHoursPerWeek} hours` : null);

  const hasRequirements =
    hasItems(job.requiredSkills) ||
    hasItems(job.preferredSkills) ||
    hasItems(job.certifications) ||
    hasItems(job.languageRequirements) ||
    Boolean(job.otherRequirements);
  const benefits = hasItems(job.benefits) ? sortBenefits(job.benefits).map(benefitLabel) : [];

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div aria-hidden="true" className="h-2 bg-gradient-to-r from-indigo-600 to-violet-600" />
      <div className="p-6 sm:p-8">
        <header className="flex min-w-0 items-start gap-4">
          <CompanyMark name={job.companyName} logoUrl={job.companyLogoUrl} size="lg" />
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{job.title}</h1>
            <p className="mt-1 break-words font-medium text-slate-600">{job.companyName}</p>
            <PostedAt iso={job.publishedAt} className="mt-1" />
          </div>
        </header>

        <JobBadges job={job} className="mt-5" />
        {/* Department, salary and experience are in the overview below; the header line keeps to where and when. */}
        <JobMeta job={{ ...job, department: null, salaryMin: null, salaryMax: null, minimumExperienceYears: null }} className="mt-4" />

        {job.jobSummary && <p className="mt-6 break-words text-lg leading-relaxed text-slate-800">{job.jobSummary}</p>}

        {facts.length > 0 && (
          <section aria-labelledby="job-overview" className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h2 id="job-overview" className={SECTION_HEADING}>
              Job overview
            </h2>
            <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {facts.map((fact) => (
                <div key={fact.label} className="flex min-w-0 items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 ring-1 ring-inset ring-slate-200">
                    <Icon name={fact.icon} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-xs font-medium text-slate-500">{fact.label}</dt>
                    <dd className="break-words text-sm font-semibold text-slate-900">{fact.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </section>
        )}

        {job.jobDescription && (
          <Section title="About the role">
            <p className="mt-3 whitespace-pre-line break-words text-slate-700">{job.jobDescription}</p>
          </Section>
        )}

        {hasItems(job.keyResponsibilities) && (
          <Section title="Key responsibilities">
            <CheckList items={job.keyResponsibilities} label="Key responsibilities" />
          </Section>
        )}

        {hasRequirements && (
          <Section title="Requirements">
            <div className="mt-4 space-y-5">
              {hasItems(job.requiredSkills) && (
                <div>
                  <SubHeading>Required skills</SubHeading>
                  <SkillTags skills={job.requiredSkills} className="mt-2" />
                </div>
              )}
              {hasItems(job.preferredSkills) && (
                <div>
                  <SubHeading>Nice to have</SubHeading>
                  <SkillTags skills={job.preferredSkills} label="Preferred skills" muted className="mt-2" />
                </div>
              )}
              {hasItems(job.certifications) && (
                <div>
                  <SubHeading>Certifications</SubHeading>
                  <SkillTags skills={job.certifications} label="Certifications" muted className="mt-2" />
                </div>
              )}
              {hasItems(job.languageRequirements) && (
                <div>
                  <SubHeading>Languages</SubHeading>
                  <p className="mt-1 text-slate-700">{job.languageRequirements.join(', ')}</p>
                </div>
              )}
              {job.otherRequirements && (
                <div>
                  <SubHeading>Other requirements</SubHeading>
                  <p className="mt-1 whitespace-pre-line break-words text-slate-700">{job.otherRequirements}</p>
                </div>
              )}
            </div>
          </Section>
        )}

        {benefits.length > 0 && (
          <Section title="Benefits & perks">
            <CheckList items={benefits} label="Benefits and perks" columns />
          </Section>
        )}
      </div>
    </article>
  );
}

/** Public vacancy details. Applying for the job is a separate task (PB-019). */
export function JobDetailPage() {
  const { jobId = '' } = useParams();
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink />
      <div className="mt-6">
        <JobDetailView key={jobId} jobId={jobId} />
      </div>
    </div>
  );
}

import { Card, Skeleton } from 'antd';
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
import { space } from '../theme/tokens';

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; job: JobDetail | null };

function BackLink() {
  return (
    <Link to="/jobs" className="tp-job-back">
      <Icon name="arrow-left" size={16} />
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
      <div aria-busy="true">
        <span className="sr-only" role="status">
          Loading job…
        </span>
        <Card>
          <Skeleton active avatar={{ shape: 'square', size: 64 }} paragraph={{ rows: 6 }} />
        </Card>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <Alert tone="error">
        <p style={{ margin: 0 }}>{state.message}</p>
        <Button
          size="sm"
          style={{ marginTop: space[1.5] }}
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
      <Card>
        <EmptyState
          icon="briefcase"
          title="This job is not available."
          description="It may have been closed or removed. Browse the other open positions instead."
          action={<BackLink />}
        />
      </Card>
    );
  }

  return <JobAdvert job={job} />;
}

function Section({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="tp-job-advert-section">
      <h2 className="tp-legend">{title}</h2>
      {children}
    </section>
  );
}

/** A tick per item: responsibilities and perks read as things you do or get, not bullet points. */
function CheckList({ items, label, columns = false }: Readonly<{ items: string[]; label: string; columns?: boolean }>) {
  return (
    <ul aria-label={label} className={columns ? 'tp-job-checklist tp-benefit-grid' : 'tp-job-checklist'}>
      {items.map((item) => (
        <li key={item}>
          <span className="tp-job-check">
            <Icon name="check" size={14} />
          </span>
          <span style={{ minWidth: 0 }}>{item}</span>
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
    <article className="tp-job-advert">
      <div aria-hidden="true" className="tp-job-advert-band" />
      <div className="tp-job-advert-body">
        <header className="tp-job-advert-head">
          <CompanyMark name={job.companyName} logoUrl={job.companyLogoUrl} size="lg" />
          <div style={{ minWidth: 0 }}>
            <h1>{job.title}</h1>
            <p className="tp-job-advert-company">{job.companyName}</p>
            <PostedAt iso={job.publishedAt} />
          </div>
        </header>

        <JobBadges job={job} style={{ marginTop: space[2.5] }} />
        {/* Department, salary and experience are in the overview below; the header line keeps to where and when. */}
        <JobMeta
          job={{ ...job, department: null, salaryMin: null, salaryMax: null, minimumExperienceYears: null }}
          style={{ marginTop: space[2] }}
        />

        {job.jobSummary && <p className="tp-job-advert-lede">{job.jobSummary}</p>}

        {facts.length > 0 && (
          <section aria-labelledby="job-overview" className="tp-job-overview">
            <h2 id="job-overview" className="tp-legend">
              Job overview
            </h2>
            <dl className="tp-detail-grid-3">
              {facts.map((fact) => (
                <div key={fact.label} className="tp-job-fact">
                  <span className="tp-job-fact-icon">
                    <Icon name={fact.icon} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </section>
        )}

        {job.jobDescription && (
          <Section title="About the role">
            <p className="tp-job-advert-text">{job.jobDescription}</p>
          </Section>
        )}

        {hasItems(job.keyResponsibilities) && (
          <Section title="Key responsibilities">
            <CheckList items={job.keyResponsibilities} label="Key responsibilities" />
          </Section>
        )}

        {hasRequirements && (
          <Section title="Requirements">
            <div className="tp-job-requirements">
              {hasItems(job.requiredSkills) && (
                <div>
                  <h3>Required skills</h3>
                  <SkillTags skills={job.requiredSkills} />
                </div>
              )}
              {hasItems(job.preferredSkills) && (
                <div>
                  <h3>Nice to have</h3>
                  <SkillTags skills={job.preferredSkills} label="Preferred skills" muted />
                </div>
              )}
              {hasItems(job.certifications) && (
                <div>
                  <h3>Certifications</h3>
                  <SkillTags skills={job.certifications} label="Certifications" muted />
                </div>
              )}
              {hasItems(job.languageRequirements) && (
                <div>
                  <h3>Languages</h3>
                  <p className="tp-job-advert-text">{job.languageRequirements.join(', ')}</p>
                </div>
              )}
              {job.otherRequirements && (
                <div>
                  <h3>Other requirements</h3>
                  <p className="tp-job-advert-text">{job.otherRequirements}</p>
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
    <div style={{ maxWidth: 768, marginInline: 'auto' }}>
      <BackLink />
      <div style={{ marginTop: space[3] }}>
        <JobDetailView key={jobId} jobId={jobId} />
      </div>
    </div>
  );
}

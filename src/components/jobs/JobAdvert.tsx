import { useId, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { JobDetail } from '../../api/types';
import { benefitLabel, sortBenefits } from '../../dashboard/companyProfile';
import { formatExperience, formatSalary, formatWorkingDays, shiftTypeLabel } from '../../jobs/jobLabels';
import { jobApplyPath } from '../../jobs/jobPaths';
import { formatCalendarDate } from '../../utils/format';
import { Icon, type IconName } from '../dashboard/Icon';
import { CompanyMark, JobBadges, JobMeta, PostedAt, SkillTags } from './JobParts';

const hasItems = (list: string[] | null | undefined): list is string[] => Boolean(list && list.length > 0);

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

function Section({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="tp-job-advert-section">
      <h2 className="tp-legend">{title}</h2>
      {children}
    </section>
  );
}

/**
 * The whole advert, in the order the company filled in the vacancy form.
 * Sections with nothing in them are left out. Applying lives in
 * {@link JobApplyCard}, shown beside it.
 */
export function JobAdvert({ job }: Readonly<{ job: JobDetail }>) {
  const overviewId = useId();

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
    <article className="tp-job-advert" data-variant="page">
      <div aria-hidden="true" className="tp-job-advert-band" />
      <div className="tp-job-advert-body">
        <header className="tp-job-advert-head">
          <CompanyMark name={job.companyName} logoUrl={job.companyLogoUrl} size="lg" />
          <div style={{ minWidth: 0 }}>
            <h1 className="tp-job-advert-title">{job.title}</h1>
            <p className="tp-job-advert-company">{job.companyName}</p>
            <PostedAt iso={job.publishedAt} />
          </div>
        </header>

        <div className="tp-job-advert-keyline">
          {/* Department, salary and experience are in the overview below; this line keeps to where and when. */}
          <JobMeta job={{ ...job, department: null, salaryMin: null, salaryMax: null, minimumExperienceYears: null }} />
          <JobBadges job={job} />
        </div>

        {job.jobSummary && <p className="tp-job-advert-lede">{job.jobSummary}</p>}

        {facts.length > 0 && (
          <section aria-labelledby={overviewId} className="tp-job-overview">
            <h2 id={overviewId} className="tp-legend">
              Job overview
            </h2>
            <dl className="tp-job-facts">
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
                  <h3 className="tp-job-advert-subhead">Required skills</h3>
                  <SkillTags skills={job.requiredSkills} />
                </div>
              )}
              {hasItems(job.preferredSkills) && (
                <div>
                  <h3 className="tp-job-advert-subhead">Nice to have</h3>
                  <SkillTags skills={job.preferredSkills} label="Preferred skills" muted />
                </div>
              )}
              {hasItems(job.certifications) && (
                <div>
                  <h3 className="tp-job-advert-subhead">Certifications</h3>
                  <SkillTags skills={job.certifications} label="Certifications" muted />
                </div>
              )}
              {hasItems(job.languageRequirements) && (
                <div>
                  <h3 className="tp-job-advert-subhead">Languages</h3>
                  <p className="tp-job-advert-text">{job.languageRequirements.join(', ')}</p>
                </div>
              )}
              {job.otherRequirements && (
                <div>
                  <h3 className="tp-job-advert-subhead">Other requirements</h3>
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

/**
 * The way to apply, kept in reach for the whole read: a card pinned beside the
 * advert on a wide screen, a bar pinned to the bottom of a narrow one. It
 * repeats only what a candidate weighs at the moment of deciding — the pay and
 * the deadline — and only when the vacancy states them.
 */
export function JobApplyCard({ job }: Readonly<{ job: JobDetail }>) {
  const salary = formatSalary(job);

  return (
    <aside aria-label="Apply for this job" className="tp-job-apply">
      {(salary || job.applicationDeadline) && (
        <dl className="tp-job-apply-facts">
          {salary && (
            <div className="tp-job-apply-salary">
              <dt>Salary</dt>
              <dd>{salary}</dd>
            </div>
          )}
          {job.applicationDeadline && (
            <div className="tp-job-apply-deadline">
              <dt>Apply by</dt>
              <dd>{formatCalendarDate(job.applicationDeadline)}</dd>
            </div>
          )}
        </dl>
      )}
      {/* Only an explicit "no" closes it: a backend that does not send the flag yet is not a closed vacancy. */}
      {job.acceptingApplications === false ? (
        <p className="tp-job-apply-closed">Applications are closed</p>
      ) : (
        <>
          <Link to={jobApplyPath(job)} className="tp-cta-link tp-job-apply-cta">
            Apply Now
          </Link>
          <p className="tp-job-apply-note">Have your CV ready as a PDF, DOC or DOCX file.</p>
        </>
      )}
    </aside>
  );
}

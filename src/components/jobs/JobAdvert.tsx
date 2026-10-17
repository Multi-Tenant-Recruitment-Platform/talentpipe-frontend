import {
  ArrowRightOutlined,
  BankOutlined,
  CalendarOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  GiftOutlined,
  ProfileOutlined,
  ReadOutlined,
  SafetyCertificateOutlined,
  SolutionOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UnorderedListOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { useId, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { JobDetail, JobSummary } from '../../api/types';
import { benefitLabel, sortBenefits } from '../../dashboard/companyProfile';
import {
  employmentTypeLabel,
  formatExperience,
  formatSalary,
  formatWorkingDays,
  shiftTypeLabel,
  workplaceTypeLabel,
} from '../../jobs/jobLabels';
import { jobApplyPath } from '../../jobs/jobPaths';
import { formatCalendarDate } from '../../utils/format';
import type { IconComponent } from '../ui/icon';
import { heroChip } from './HeroBand';
import { CompanyMark, PostedAt } from './JobParts';

const hasItems = (list: string[] | null | undefined): list is string[] => Boolean(list && list.length > 0);

const DAY_MS = 24 * 60 * 60 * 1000;

/** "12 days left", "Last day", or nothing once the date has passed or cannot be read. */
function daysLeftLabel(date: string, now = Date.now()): string | null {
  const end = Date.parse(`${date}T23:59:59`);
  if (Number.isNaN(end) || end < now) return null;
  const days = Math.floor((end - now) / DAY_MS);
  if (days === 0) return 'Last day';
  return `${days} ${days === 1 ? 'day' : 'days'} left`;
}

/** An icon in a soft accent tile — the one shape every section and fact leads with. */
function IconTile({ icon: Icon, size = 'md' }: Readonly<{ icon: IconComponent; size?: 'sm' | 'md' }>) {
  return (
    <span
      aria-hidden="true"
      className={`grid flex-none place-items-center rounded-xl bg-primary-50 text-primary-600 ${
        size === 'sm' ? 'size-9 text-[16px]' : 'size-10 text-[18px]'
      }`}
    >
      <Icon />
    </span>
  );
}

/** One white card of the advert, under an icon heading. */
function SectionCard({ title, icon, children }: Readonly<{ title: string; icon: IconComponent; children: ReactNode }>) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm sm:p-8">
      <h2 id={headingId} className="m-0 flex items-center gap-3 text-title leading-snug font-bold text-slate-900">
        <IconTile icon={icon} size="sm" />
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Long-form text the company wrote; their line breaks are kept. */
const prose = 'm-0 text-body leading-relaxed whitespace-pre-line text-slate-700';

/** A tick per item: responsibilities and perks read as things you do or get, not bullet points. */
function CheckList({ items, label, columns = false }: Readonly<{ items: string[]; label: string; columns?: boolean }>) {
  return (
    <ul aria-label={label} className={`m-0 grid list-none gap-3 p-0 ${columns ? 'sm:grid-cols-2' : ''}`}>
      {items.map((item) => (
        <li
          key={item}
          className={`flex items-start gap-3 text-body leading-relaxed text-slate-700 ${
            columns ? 'rounded-xl border border-slate-200 bg-canvas px-4 py-3' : ''
          }`}
        >
          <span aria-hidden="true" className="mt-0.5 grid size-6 flex-none place-items-center rounded-full bg-primary-50 text-primary-600">
            <CheckOutlined className="text-[12px]" />
          </span>
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Skills and the like as chips; `muted` for the ones that are nice to have rather than required. */
function TagList({ items, label, muted = false }: Readonly<{ items: string[]; label: string; muted?: boolean }>) {
  return (
    <ul aria-label={label} className="m-0 flex list-none flex-wrap gap-2 p-0">
      {items.map((item) => (
        <li
          key={item}
          title={item}
          className={`max-w-full truncate rounded-pill border px-3 py-1 text-small font-medium ${
            muted ? 'border-slate-200 bg-surface text-slate-700' : 'border-primary-100 bg-primary-50 text-primary-700'
          }`}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

const subhead = 'm-0 mb-2.5 text-small font-semibold text-slate-900';

/**
 * Who is hiring, for what, and how it is worked — the job's identity, set on
 * the dark strip the page opens with. The rest of the advert follows in
 * {@link JobAdvert}.
 */
export function JobHero({ job }: Readonly<{ job: JobDetail }>) {
  const openings = job.openings ?? 0;
  const chips: { key: string; icon?: IconComponent; label: string; srLabel?: string }[] = [];
  if (job.location) chips.push({ key: 'location', icon: EnvironmentOutlined, label: job.location, srLabel: 'Location' });
  if (job.employmentType) chips.push({ key: 'type', label: employmentTypeLabel(job.employmentType), srLabel: 'Employment type' });
  if (job.workplaceType) chips.push({ key: 'place', label: workplaceTypeLabel(job.workplaceType), srLabel: 'Workplace' });
  if (openings >= 2) chips.push({ key: 'openings', icon: TeamOutlined, label: `${openings} openings` });
  if (job.applicationDeadline) {
    chips.push({ key: 'deadline', icon: CalendarOutlined, label: `Apply by ${formatCalendarDate(job.applicationDeadline)}` });
  }

  return (
    <header className="flex flex-col gap-5">
      <div className="flex items-start gap-4 sm:gap-5">
        <span className="flex-none rounded-2xl bg-surface p-1 shadow-lg ring-1 ring-white/10">
          <CompanyMark name={job.companyName} logoUrl={job.companyLogoUrl} size="lg" />
        </span>
        <div className="min-w-0">
          <p className="m-0 text-lead font-medium text-slate-300">{job.companyName}</p>
          <h1 className="m-0 mt-1 text-heading leading-tight font-bold tracking-display text-white [overflow-wrap:anywhere] sm:text-[34px] lg:text-[40px]">
            {job.title}
          </h1>
          <PostedAt iso={job.publishedAt} className="m-0 mt-2 text-small text-slate-400" />
        </div>
      </div>

      {job.jobSummary && <p className="m-0 max-w-3xl text-lead leading-normal text-slate-300">{job.jobSummary}</p>}

      {chips.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {chips.map((chip) => (
            <li key={chip.key} className={heroChip}>
              {chip.icon && <chip.icon aria-hidden className="text-[14px] text-slate-300" />}
              {chip.srLabel && <span className="sr-only">{chip.srLabel}: </span>}
              <span className="truncate">{chip.label}</span>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}

/**
 * The advert's body, in the order the company filled in the vacancy form:
 * the overview, then one card per section. Sections with nothing in them are
 * left out. Applying lives in {@link JobApplyCard}, shown beside it.
 */
export function JobAdvert({ job }: Readonly<{ job: JobDetail }>) {
  const overviewId = useId();

  const facts: { icon: IconComponent; label: string; value: string }[] = [];
  const addFact = (icon: IconComponent, label: string, value: string | null | undefined) => {
    if (value) facts.push({ icon, label, value });
  };
  addFact(BankOutlined, 'Department', job.department);
  addFact(TeamOutlined, 'Openings', job.openings ? String(job.openings) : null);
  addFact(SolutionOutlined, 'Experience', formatExperience(job.minimumExperienceYears));
  addFact(ReadOutlined, 'Education', job.education);
  addFact(WalletOutlined, 'Salary', formatSalary(job));
  addFact(CalendarOutlined, 'Working days', formatWorkingDays(job.workingDays));
  addFact(ClockCircleOutlined, 'Working hours', job.workingHours);
  addFact(ThunderboltOutlined, 'Shift', job.shiftType ? shiftTypeLabel(job.shiftType) : null);
  addFact(ClockCircleOutlined, 'Hours per week', job.expectedHoursPerWeek ? `${job.expectedHoursPerWeek} hours` : null);

  const hasRequirements =
    hasItems(job.requiredSkills) ||
    hasItems(job.preferredSkills) ||
    hasItems(job.certifications) ||
    hasItems(job.languageRequirements) ||
    Boolean(job.otherRequirements);
  const benefits = hasItems(job.benefits) ? sortBenefits(job.benefits).map(benefitLabel) : [];

  return (
    <article aria-label={job.title} className="flex min-w-0 flex-col gap-6">
      {facts.length > 0 && (
        <section aria-labelledby={overviewId} className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm sm:p-8">
          <h2 id={overviewId} className="m-0 flex items-center gap-3 text-title leading-snug font-bold text-slate-900">
            <IconTile icon={ProfileOutlined} size="sm" />
            Job overview
          </h2>
          <dl className="m-0 mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.label} className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-100 bg-canvas p-3.5">
                <IconTile icon={fact.icon} />
                <div className="min-w-0">
                  <dt className="text-caption font-medium text-slate-500">{fact.label}</dt>
                  <dd className="m-0 mt-0.5 text-body leading-snug font-semibold text-slate-900">{fact.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>
      )}

      {job.jobDescription && (
        <SectionCard title="About the role" icon={FileTextOutlined}>
          <p className={prose}>{job.jobDescription}</p>
        </SectionCard>
      )}

      {hasItems(job.keyResponsibilities) && (
        <SectionCard title="Key responsibilities" icon={UnorderedListOutlined}>
          <CheckList items={job.keyResponsibilities} label="Key responsibilities" />
        </SectionCard>
      )}

      {hasRequirements && (
        <SectionCard title="Requirements" icon={SafetyCertificateOutlined}>
          <div className="flex flex-col gap-6">
            {hasItems(job.requiredSkills) && (
              <div>
                <h3 className={subhead}>Required skills</h3>
                <TagList items={job.requiredSkills} label="Required skills" />
              </div>
            )}
            {hasItems(job.preferredSkills) && (
              <div>
                <h3 className={subhead}>Nice to have</h3>
                <TagList items={job.preferredSkills} label="Preferred skills" muted />
              </div>
            )}
            {hasItems(job.certifications) && (
              <div>
                <h3 className={subhead}>Certifications</h3>
                <TagList items={job.certifications} label="Certifications" muted />
              </div>
            )}
            {hasItems(job.languageRequirements) && (
              <div>
                <h3 className={subhead}>Languages</h3>
                <p className={prose}>{job.languageRequirements.join(', ')}</p>
              </div>
            )}
            {job.otherRequirements && (
              <div>
                <h3 className={subhead}>Other requirements</h3>
                <p className={prose}>{job.otherRequirements}</p>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {benefits.length > 0 && (
        <SectionCard title="Benefits & perks" icon={GiftOutlined}>
          <CheckList items={benefits} label="Benefits and perks" columns />
        </SectionCard>
      )}
    </article>
  );
}

/** Where the deadline and its countdown sit, on the apply card and the apply page's summary. */
export function DeadlineFact({ date }: Readonly<{ date: string }>) {
  const left = daysLeftLabel(date);
  return (
    <div>
      <dt className="text-caption font-medium text-slate-500">Apply by</dt>
      <dd className="m-0 mt-0.5 flex flex-wrap items-baseline gap-x-2 text-body font-semibold text-slate-900">
        {formatCalendarDate(date)}
        {left && <span className="text-caption font-medium text-primary-700">{left}</span>}
      </dd>
    </div>
  );
}

/**
 * The way to apply, kept in reach for the whole read: a card that stays in
 * view beside the advert on a wide screen, a bar pinned to the bottom of a
 * narrow one. It repeats only what a candidate weighs at the moment of
 * deciding — the pay and the deadline — and only when the vacancy states them.
 */
export function JobApplyCard({ job }: Readonly<{ job: JobSummary }>) {
  const salary = formatSalary(job);
  const closed = job.acceptingApplications === false;

  return (
    <aside
      aria-label="Apply for this job"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-surface/95 px-4 py-3 shadow-xl backdrop-blur-[6px] lg:sticky lg:top-24 lg:z-auto lg:overflow-hidden lg:rounded-2xl lg:border lg:bg-surface lg:p-0 lg:shadow-lg lg:backdrop-blur-none"
    >
      <div aria-hidden="true" className="hidden h-1.5 bg-linear-to-r from-primary-600 to-primary-500 lg:block" />
      <div className="flex items-center gap-4 lg:block lg:p-6">
        {(salary || job.applicationDeadline) && (
          <dl className="m-0 flex min-w-0 flex-1 flex-col gap-4 lg:mb-6">
            {salary && (
              <div className="min-w-0">
                <dt className="text-caption font-medium text-slate-500">Salary</dt>
                <dd data-numeric className="m-0 mt-0.5 truncate text-body font-bold text-slate-900 lg:text-title lg:whitespace-normal">
                  {salary}
                </dd>
              </div>
            )}
            {job.applicationDeadline && (
              // On the phone bar the pay alone fits beside the button.
              <div className={salary ? 'hidden lg:block' : ''}>
                <DeadlineFact date={job.applicationDeadline} />
              </div>
            )}
          </dl>
        )}
        {/* Only an explicit "no" closes it: a backend that does not send the flag yet is not a closed vacancy. */}
        {closed ? (
          <p className="m-0 flex-1 rounded-xl bg-sunken px-4 py-3 text-center font-semibold text-slate-600 lg:flex-none">
            Applications are closed
          </p>
        ) : (
          <>
            <Link
              to={jobApplyPath(job)}
              className="group flex h-12 flex-none items-center justify-center gap-2 rounded-pill bg-primary-600 px-6 font-semibold text-white no-underline shadow-primary transition-colors duration-(--tp-motion-base) hover:bg-primary-500 hover:text-white lg:w-full"
            >
              Apply Now
              <ArrowRightOutlined
                aria-hidden
                className="text-[14px] transition-transform duration-(--tp-motion-base) group-hover:translate-x-0.5"
              />
            </Link>
            <p className="m-0 mt-4 hidden items-start gap-2 text-small leading-normal text-slate-500 lg:flex">
              <FileTextOutlined aria-hidden className="mt-0.5 text-[14px]" />
              Have your CV ready as a PDF, DOC or DOCX file.
            </p>
          </>
        )}
      </div>
    </aside>
  );
}

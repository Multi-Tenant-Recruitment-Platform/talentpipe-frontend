import {
  ArrowRightOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  RollbackOutlined,
  SearchOutlined,
  SendOutlined,
  SolutionOutlined,
  StarOutlined,
  TeamOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { Segmented } from 'antd';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  APPLICATION_STAGES,
  applicationStatusMeta,
  inView,
  progressCounts,
  STAGE_LABELS,
  stageIndex,
  viewCounts,
  type ApplicationStage,
  type AppliedJob,
  type ApplicationsView,
  type StatusTone,
} from '../candidate/myApplications';
import { useMyApplications } from '../candidate/useMyApplications';
import { ApplicationStatusBadge } from '../components/candidate/ApplicationStatusBadge';
import { CompanyLogo } from '../components/dashboard/CompanyLogo';
import { EmptyState } from '../components/dashboard/EmptyState';
import { ErrorState, RowsSkeleton } from '../components/dashboard/ErrorState';
import { HeroBackdrop, heroSurface } from '../components/jobs/HeroBand';
import { Button } from '../components/ui/Button';
import type { IconComponent } from '../components/ui/icon';
import { formatDate, formatRelativeTime } from '../utils/format';

/**
 * Applied jobs — every job the signed-in candidate has applied for, and where
 * each application stands.
 *
 * <p>A dark header sums up the search so far. Below it, each application is a
 * card edged in its status colour: the role and company, when it was sent, a
 * colour-coded status pill, a stepper through the hiring steps and a sentence
 * on what the status means. Statuses refresh on their own while the page is
 * open (see `useMyApplications`).</p>
 */

const VIEW_LABELS: Record<ApplicationsView, string> = { all: 'All', active: 'Active', closed: 'Closed' };

const STAGE_ICONS: Record<ApplicationStage, IconComponent> = {
  APPLIED: SendOutlined,
  IN_REVIEW: EyeOutlined,
  SHORTLISTED: StarOutlined,
  INTERVIEW: TeamOutlined,
  OFFERED: TrophyOutlined,
};

/** The icon beside each status message. */
const STATUS_ICONS: Record<string, IconComponent> = {
  APPLIED: CheckCircleOutlined,
  IN_REVIEW: EyeOutlined,
  SHORTLISTED: StarOutlined,
  INTERVIEW: CalendarOutlined,
  OFFERED: TrophyOutlined,
  REJECTED: CloseCircleOutlined,
  WITHDRAWN: RollbackOutlined,
};

const panel = 'overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-xs';

/**
 * The hiring steps as a stepper: done steps filled in the status colour with a
 * tick, the current step haloed with its own icon, the rest outlined and
 * numbered. The lines between them fill as the application moves along.
 */
function StageStepper({ status, tone }: Readonly<{ status: string; tone: StatusTone }>) {
  const at = stageIndex(status);
  return (
    <ol aria-label="Application progress" className="m-0 flex list-none p-0">
      {APPLICATION_STAGES.map((stage, i) => {
        const state = i < at ? 'done' : i === at ? 'current' : 'upcoming';
        const Glyph = STAGE_ICONS[stage];
        return (
          <li
            key={stage}
            aria-current={state === 'current' ? 'step' : undefined}
            className="flex min-w-0 flex-1 flex-col items-center text-center"
          >
            <div className="relative flex h-10 w-full items-center justify-center">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={`absolute top-1/2 right-1/2 h-0.5 w-full -translate-y-1/2 ${i <= at ? tone.solid : 'bg-slate-200'}`}
                />
              )}
              {state === 'current' ? (
                <span className={`relative z-10 rounded-full p-1 ${tone.soft}`}>
                  <span className={`flex size-8 items-center justify-center rounded-full text-white shadow-sm ${tone.solid}`}>
                    <Glyph aria-hidden className="text-[15px]" />
                  </span>
                </span>
              ) : (
                <span
                  aria-hidden="true"
                  className={`relative z-10 flex size-7 items-center justify-center rounded-full text-caption font-semibold ${
                    state === 'done' ? `${tone.solid} text-white` : 'border-2 border-slate-200 bg-surface text-slate-500'
                  }`}
                >
                  {state === 'done' ? <CheckOutlined className="text-[12px]" /> : i + 1}
                </span>
              )}
            </div>
            <span
              className={`mt-1.5 hidden max-w-full truncate px-1 text-caption sm:block ${
                state === 'current' ? 'font-semibold text-slate-900' : state === 'done' ? 'text-slate-700' : 'text-slate-500'
              }`}
            >
              {STAGE_LABELS[stage]}
            </span>
            {/* The labels are hidden on phones; the step and its state still are not. */}
            <span className="sr-only sm:hidden">
              {STAGE_LABELS[stage]}
              {state === 'done' ? ', done' : ''}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function AppliedJobCard({ job }: Readonly<{ job: AppliedJob }>) {
  const meta = applicationStatusMeta(job.status);
  const onTrack = stageIndex(job.status) >= 0;
  const StatusGlyph = STATUS_ICONS[job.status] ?? InfoCircleOutlined;

  return (
    <li className="relative overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-xs transition duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      {/* The status colour runs down the card's edge, so the list scans by colour. */}
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${meta.tone.solid}`} />

      <div className="flex flex-col gap-5 p-5 sm:p-6 sm:pl-8">
        <div className="flex flex-wrap items-start gap-4">
          <CompanyLogo src={job.companyLogoUrl} name={job.companyName ?? job.jobTitle} size="sm" />

          <div className="min-w-0 flex-1 basis-56">
            <h2 className="m-0 text-lead leading-snug font-semibold text-slate-900">
              {job.jobPath ? (
                <Link to={job.jobPath} className="text-slate-900 hover:text-primary-700 hover:underline">
                  {job.jobTitle}
                </Link>
              ) : (
                job.jobTitle
              )}
            </h2>
            <p className="m-0 mt-0.5 text-body font-medium text-slate-600">
              {job.companyName ?? 'Company unavailable'}
              {!job.jobPath && (
                <span className="ms-2 inline-flex rounded-pill bg-sunken px-2 py-px align-middle text-caption font-medium text-slate-600">
                  Listing closed
                </span>
              )}
            </p>
            <p className="m-0 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <CalendarOutlined aria-hidden className="text-[13px]" />
                Applied on <time dateTime={job.submittedAt}>{formatDate(job.submittedAt)}</time>
              </span>
              {job.updatedAt && (
                <span className="inline-flex items-center gap-1.5">
                  <ClockCircleOutlined aria-hidden className="text-[13px]" />
                  Updated <time dateTime={job.updatedAt}>{formatRelativeTime(job.updatedAt)}</time>
                </span>
              )}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-3">
            <ApplicationStatusBadge status={job.status} />
            {job.jobPath && (
              <Link
                to={job.jobPath}
                aria-label={`View the ${job.jobTitle} job`}
                className="inline-flex items-center gap-1 text-small font-semibold text-primary-700 hover:underline"
              >
                View job
                <ArrowRightOutlined aria-hidden className="text-[12px]" />
              </Link>
            )}
          </div>
        </div>

        {onTrack && <StageStepper status={job.status} tone={meta.tone} />}

        {meta.description && (
          <p className={`m-0 flex items-start gap-2.5 rounded-xl px-4 py-3 text-small font-medium ${meta.tone.soft} ${meta.tone.text}`}>
            <StatusGlyph aria-hidden className="mt-0.5 text-[15px]" />
            {meta.description}
          </p>
        )}
      </div>
    </li>
  );
}

/** One figure on the dark header. */
function HeroStat({ value, label }: Readonly<{ value: number; label: string }>) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
      <p className="m-0 text-title leading-tight font-bold text-white">{value}</p>
      <p className="m-0 mt-0.5 text-caption text-slate-300">{label}</p>
    </div>
  );
}

/** Tells the candidate the statuses are live, not a snapshot. */
function LiveIndicator() {
  return (
    <p className="m-0 inline-flex items-center gap-2 text-caption text-slate-500">
      <span aria-hidden="true" className="relative flex size-2">
        <span className="absolute inline-flex size-full rounded-full bg-success opacity-60 motion-safe:animate-ping" />
        <span className="relative inline-flex size-2 rounded-full bg-success" />
      </span>
      Live · statuses update automatically
    </p>
  );
}

export function MyApplicationsPage() {
  const { state, retry } = useMyApplications();
  const [view, setView] = useState<ApplicationsView>('all');
  const navigate = useNavigate();

  const jobs = state.status === 'ready' ? state.jobs : null;
  const counts = viewCounts(jobs ?? []);
  const progress = progressCounts(jobs ?? []);
  const shown = (jobs ?? []).filter((job) => inView(job, view));

  let body;
  if (state.status === 'loading') {
    body = (
      <div className={`${panel} px-5 sm:px-6`}>
        <RowsSkeleton rows={3} avatar label="Loading your applications…" />
      </div>
    );
  } else if (state.status === 'error') {
    body = (
      <div className={panel}>
        <ErrorState title="Couldn't load your applications" description={state.message} onRetry={retry} />
      </div>
    );
  } else if (counts.all === 0) {
    body = (
      <div className={panel}>
        <EmptyState
          icon={SolutionOutlined}
          title="No applications yet"
          description="Jobs you apply for will appear here, so you can follow each one from review to offer."
          action={
            <Button variant="primary" icon={<SearchOutlined aria-hidden />} onClick={() => navigate('/')}>
              Browse jobs
            </Button>
          }
        />
      </div>
    );
  } else {
    body = (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented<ApplicationsView>
            aria-label="Show applications"
            value={view}
            onChange={setView}
            options={(Object.keys(VIEW_LABELS) as ApplicationsView[]).map((key) => ({
              value: key,
              label: `${VIEW_LABELS[key]} (${counts[key]})`,
            }))}
          />
          <LiveIndicator />
        </div>
        {shown.length === 0 ? (
          <div className={panel}>
            <EmptyState
              icon={SolutionOutlined}
              title={view === 'closed' ? 'No closed applications' : 'No active applications'}
              description={
                view === 'closed'
                  ? 'Applications that are rejected or withdrawn will show here.'
                  : 'Every application you have sent has been closed. Find your next role on the job board.'
              }
            />
          </div>
        ) : (
          <ul aria-label="Your applications" className="m-0 flex list-none flex-col gap-4 p-0">
            {shown.map((job) => (
              <AppliedJobCard key={job.id} job={job} />
            ))}
          </ul>
        )}
      </>
    );
  }

  return (
    <div className="tp-profile-page">
      <header className={`${heroSurface} rounded-2xl px-6 py-8 shadow-lg sm:px-10 sm:py-10`}>
        <HeroBackdrop />
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="m-0 text-caption font-semibold tracking-caps text-primary-200 uppercase">Your job search</p>
            <h1 className="m-0 mt-2 text-heading font-bold tracking-heading text-white">Applied jobs</h1>
            <p className="m-0 mt-2 max-w-xl text-body text-slate-300">
              Every job you have applied for, and where each application stands.
            </p>
          </div>
          <Button variant="primary" icon={<SearchOutlined aria-hidden />} onClick={() => navigate('/')}>
            Find more jobs
          </Button>
        </div>

        {jobs && counts.all > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <HeroStat value={counts.all} label={counts.all === 1 ? 'Application' : 'Applications'} />
            <HeroStat value={counts.active} label="In progress" />
            <HeroStat value={progress.shortlisted} label="Shortlisted or further" />
            <HeroStat value={progress.offers} label={progress.offers === 1 ? 'Offer' : 'Offers'} />
          </div>
        )}
      </header>

      {body}
    </div>
  );
}

import type { ApplicationStatus, CandidateApplicationResponse, JobSummary } from '../api/types';
import { jobPath } from '../jobs/jobPaths';

/**
 * Rules for the candidate's Applied jobs page: what each status means to the
 * person who applied, how far along the hiring steps it is, and how each
 * application is matched with the job advert it was sent to.
 */

/** The hiring steps an application moves through, in order. */
export const APPLICATION_STAGES = ['APPLIED', 'IN_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFERED'] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  APPLIED: 'Applied',
  IN_REVIEW: 'In review',
  SHORTLISTED: 'Shortlisted',
  INTERVIEW: 'Interview',
  OFFERED: 'Offered',
};

/** The status colour in each strength the page uses it at. */
export interface StatusTone {
  /** Solid fill: the card's accent edge, the status dot, done steps on the track. */
  solid: string;
  /** Pale tint behind the status message. */
  soft: string;
  /** Text on the tint; clears 4.5:1 on it. */
  text: string;
}

export interface StatusMeta {
  label: string;
  /** Pill colours: a tint, a matching border and text that clears 4.5:1 on it. */
  className: string;
  tone: StatusTone;
  /** One sentence telling the candidate what this status means for them. */
  description: string;
  /** Rejected and withdrawn applications are finished: nothing more will happen. */
  closed: boolean;
}

const NEUTRAL = 'border-slate-200 bg-slate-100 text-slate-700';
const NEUTRAL_TONE: StatusTone = { solid: 'bg-slate-500', soft: 'bg-slate-50', text: 'text-slate-700' };

/**
 * Each status has its own colour, so a candidate can scan the list by colour:
 * blue in review, purple shortlisted, orange interview, green offered, red
 * rejected. The label always says the status in words too, so the colour is
 * never the only signal.
 */
const STATUS_META: Record<ApplicationStatus, StatusMeta> = {
  APPLIED: {
    label: 'Applied',
    className: NEUTRAL,
    tone: NEUTRAL_TONE,
    description: 'Sent. The company has received your application.',
    closed: false,
  },
  IN_REVIEW: {
    label: 'In review',
    className: 'border-primary-100 bg-primary-50 text-primary-700',
    tone: { solid: 'bg-primary-600', soft: 'bg-primary-50', text: 'text-primary-700' },
    description: 'The hiring team is reviewing your application.',
    closed: false,
  },
  SHORTLISTED: {
    label: 'Shortlisted',
    className: 'border-highlight-bg bg-highlight-bg text-highlight-text',
    tone: { solid: 'bg-highlight-text', soft: 'bg-highlight-bg', text: 'text-highlight-text' },
    description: 'You made the shortlist. The company may contact you about next steps.',
    closed: false,
  },
  INTERVIEW: {
    label: 'Interview',
    className: 'border-warning-bg bg-warning-bg text-warning-text',
    tone: { solid: 'bg-warning', soft: 'bg-warning-bg', text: 'text-warning-text' },
    description: 'You have been invited to interview.',
    closed: false,
  },
  OFFERED: {
    label: 'Offered',
    className: 'border-success-bg bg-success-bg text-success-text',
    tone: { solid: 'bg-success', soft: 'bg-success-bg', text: 'text-success-text' },
    description: 'The company has made you an offer.',
    closed: false,
  },
  REJECTED: {
    label: 'Rejected',
    className: 'border-error-bg bg-error-bg text-error-text',
    tone: { solid: 'bg-error', soft: 'bg-error-bg', text: 'text-error-text' },
    description: 'The company decided not to move forward with this application.',
    closed: true,
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    className: NEUTRAL,
    tone: NEUTRAL_TONE,
    description: 'You withdrew this application.',
    closed: true,
  },
};

const isKnownStatus = (status: string): status is ApplicationStatus => Object.hasOwn(STATUS_META, status);

/** "ON_HOLD" → "On hold": a status the page does not know yet is still shown by name. */
function humanize(status: string): string {
  const words = status.toLowerCase().replace(/_/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : 'Unknown';
}

export function applicationStatusMeta(status: string): StatusMeta {
  if (isKnownStatus(status)) {
    return STATUS_META[status];
  }
  return { label: humanize(status), className: NEUTRAL, tone: NEUTRAL_TONE, description: '', closed: false };
}

/** How far along the hiring steps the application is, or -1 when it is off the track (rejected, withdrawn, unknown). */
export function stageIndex(status: string): number {
  return (APPLICATION_STAGES as readonly string[]).indexOf(status);
}

/** One row on the page: the application plus what its job advert adds. */
export interface AppliedJob {
  id: string;
  jobTitle: string;
  /** Null when the advert is gone and no other application names the company. */
  companyName: string | null;
  companyLogoUrl: string | null;
  /** Link to the advert, or null once it is closed or unpublished. */
  jobPath: string | null;
  status: string;
  submittedAt: string;
  /** Null until the status changes after submission. */
  updatedAt: string | null;
}

/**
 * Pairs each application with its public advert. The application only carries
 * the job title, so the company comes from the advert. A closed advert is no
 * longer public; its company is then borrowed from another application to the
 * same company (same tenant) whose advert is still up, or left unknown.
 * Newest application first.
 */
export function toAppliedJobs(
  applications: readonly CandidateApplicationResponse[],
  jobsById: ReadonlyMap<string, JobSummary | null>,
): AppliedJob[] {
  const companyByTenant = new Map<string, Pick<JobSummary, 'companyName' | 'companyLogoUrl'>>();
  for (const application of applications) {
    const job = jobsById.get(application.jobId);
    if (job && !companyByTenant.has(application.tenantId)) {
      companyByTenant.set(application.tenantId, job);
    }
  }

  return applications
    .map((application): AppliedJob => {
      const job = jobsById.get(application.jobId) ?? null;
      const company = job ?? companyByTenant.get(application.tenantId) ?? null;
      const changed = application.updatedAt && application.updatedAt !== application.createdAt;
      return {
        id: application.id,
        jobTitle: application.jobTitle || job?.title || 'Untitled role',
        companyName: company?.companyName || null,
        companyLogoUrl: company?.companyLogoUrl ?? null,
        jobPath: job ? jobPath(job) : null,
        status: application.status,
        submittedAt: application.createdAt,
        updatedAt: changed ? application.updatedAt : null,
      };
    })
    .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));
}

export type ApplicationsView = 'all' | 'active' | 'closed';

export function inView(job: Pick<AppliedJob, 'status'>, view: ApplicationsView): boolean {
  if (view === 'all') {
    return true;
  }
  const closed = applicationStatusMeta(job.status).closed;
  return view === 'closed' ? closed : !closed;
}

/** How many applications reached the shortlist or beyond, and how many became offers. */
export function progressCounts(jobs: readonly Pick<AppliedJob, 'status'>[]): { shortlisted: number; offers: number } {
  const shortlistAt = stageIndex('SHORTLISTED');
  return {
    shortlisted: jobs.filter((job) => stageIndex(job.status) >= shortlistAt).length,
    offers: jobs.filter((job) => job.status === 'OFFERED').length,
  };
}

export function viewCounts(jobs: readonly Pick<AppliedJob, 'status'>[]): Record<ApplicationsView, number> {
  const closed = jobs.filter((job) => inView(job, 'closed')).length;
  return { all: jobs.length, active: jobs.length - closed, closed };
}

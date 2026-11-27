import type { ApplicantBand, ApplicantQuery, ApplicantSort } from '../api/applicants';
import type {
  ApplicantCounts,
  ApplicantReview,
  ApplicantRow,
  ApplicantThresholds,
  ApplicationEventType,
  ReviewStatus,
} from '../api/types';

/**
 * Rules for a vacancy's applicant dashboard: what each review status is
 * called and how it looks, which filter pills exist and what they count, and
 * how the list's state lives in the URL. Plain functions, so the components
 * hold markup and state only.
 *
 * <p>The ranking itself is the server's (advanced, then manual review, then
 * pending, then rejected; highest score first within each), so paging and the
 * counts always agree. Nothing here re-sorts a page.</p>
 */

/** A colour family from the token palette; each pairs a tint with a text colour that passes contrast on it. */
export type Tone = 'success' | 'warning' | 'error' | 'highlight' | 'neutral';

/** Tailwind utilities for a tone: background tint and readable text. Colour is never the only signal. */
export const TONE_CLASS: Record<Tone, string> = {
  success: 'bg-success-bg text-success-text',
  warning: 'bg-warning-bg text-warning-text',
  error: 'bg-error-bg text-error-text',
  highlight: 'bg-highlight-bg text-highlight-text',
  neutral: 'bg-slate-100 text-slate-600',
};

export const REVIEW_STATUS: Record<ReviewStatus, { label: string; tone: Tone }> = {
  AUTO_ADVANCED: { label: 'Auto-advanced', tone: 'success' },
  ADVANCED_BY_RECRUITER: { label: 'Advanced by recruiter', tone: 'highlight' },
  MANUAL_REVIEW: { label: 'Manual review', tone: 'warning' },
  PENDING_SCREENING: { label: 'Awaiting screening', tone: 'neutral' },
  REJECTED: { label: 'Rejected', tone: 'error' },
  WITHDRAWN: { label: 'Withdrawn', tone: 'neutral' },
};

/** The filter pills, in order, with the count each shows. */
export const BANDS: { id: ApplicantBand; label: string; count: (counts: ApplicantCounts) => number }[] = [
  { id: 'all', label: 'All', count: (c) => c.all },
  { id: 'auto', label: 'Auto-Advanced', count: (c) => c.autoAdvanced },
  { id: 'manual', label: 'Manual Review', count: (c) => c.manualReview },
  { id: 'rejected', label: 'Rejected', count: (c) => c.rejected },
];

export const EMPTY_COUNTS: ApplicantCounts = {
  all: 0,
  autoAdvanced: 0,
  advancedByRecruiter: 0,
  manualReview: 0,
  pending: 0,
  rejected: 0,
  withdrawn: 0,
};

/** The score badge's tone: which side of the vacancy's thresholds it falls. */
export function scoreTone(score: number, thresholds: ApplicantThresholds): Tone {
  if (score >= thresholds.auto) return 'success';
  if (score >= thresholds.manual) return 'warning';
  return 'error';
}

/** What the score cell says when there is no number to show. */
export function scorePlaceholder(row: Pick<ApplicantRow, 'scoreStatus' | 'reviewStatus'>): string {
  if (row.scoreStatus === 'SCORING_FAILED') return 'Not scored';
  // A vacancy that doesn't screen sends applicants straight to a person: there is nothing to wait for.
  if (row.reviewStatus === 'PENDING_SCREENING') return 'Scoring…';
  return 'No score';
}

/** The stage cell: the pipeline stage, or — for a vacancy without one — where the review stands. */
export function stageLabel(row: Pick<ApplicantRow, 'currentStage' | 'reviewStatus'>): string {
  if (row.currentStage) return row.currentStage.name;
  return IMPLICIT_STEPS[implicitStep(row.reviewStatus)];
}

/** Steps a vacancy without a pipeline still goes through. */
const IMPLICIT_STEPS = ['Applied', 'Screening', 'Interview'];

/** Which of {@link IMPLICIT_STEPS} an application is on: advanced ones have gone on to interview. */
function implicitStep(status: ReviewStatus): number {
  if (status === 'PENDING_SCREENING') return 0;
  if (status === 'AUTO_ADVANCED' || status === 'ADVANCED_BY_RECRUITER') return 2;
  return 1;
}

/** One sentence under the pills saying what the bands mean for this vacancy. */
export function thresholdsSentence(thresholds: ApplicantThresholds): string {
  const rule = `Auto-advance from ${thresholds.auto}, manual review from ${thresholds.manual}, below that rejected.`;
  return thresholds.fromPipeline
    ? rule
    : `${rule} This vacancy has no pipeline of its own, so the default thresholds apply.`;
}

// ---------------------------------------------------------------------------
// URL state: ?band=manual&q=perera&sort=score&page=2
// ---------------------------------------------------------------------------

export const PAGE_SIZE = 20;

const BAND_IDS = new Set<string>(BANDS.map((band) => band.id));
const SORTS = new Set<ApplicantSort>(['default', 'score', 'appliedAt', 'name']);

export const DEFAULT_QUERY: ApplicantQuery = { band: 'all', q: '', sort: 'default', page: 0, size: PAGE_SIZE };

/** The list's state from the URL; anything unknown or malformed falls back to the default. */
export function parseApplicantQuery(params: URLSearchParams): ApplicantQuery {
  const band = params.get('band') ?? 'all';
  const sort = params.get('sort') ?? 'default';
  const page = Number.parseInt(params.get('page') ?? '1', 10);
  return {
    band: BAND_IDS.has(band) ? (band as ApplicantBand) : 'all',
    q: (params.get('q') ?? '').slice(0, 100),
    sort: SORTS.has(sort as ApplicantSort) ? (sort as ApplicantSort) : 'default',
    // Pages are 1-based in the address bar, for people; 0-based on the wire.
    page: Number.isFinite(page) && page > 1 ? page - 1 : 0,
    size: PAGE_SIZE,
  };
}

/**
 * Writes the list's state into `params`, leaving any other keys (the page's
 * own) alone and dropping defaults so a plain link stays plain.
 */
export function writeApplicantQuery(params: URLSearchParams, query: ApplicantQuery): URLSearchParams {
  const next = new URLSearchParams(params);
  const set = (key: string, value: string, fallback: string) => {
    if (value === fallback) next.delete(key);
    else next.set(key, value);
  };
  set('band', query.band, 'all');
  set('q', query.q.trim(), '');
  set('sort', query.sort, 'default');
  set('page', String(query.page + 1), '1');
  return next;
}

/** How many applications arrived since `before`, for the "new applicants" pill. Never negative. */
export function newArrivals(before: ApplicantCounts | null, after: ApplicantCounts): number {
  return before ? Math.max(0, after.all - before.all) : 0;
}

/** Whether a summary says the list on screen is out of date. */
export function summaryChanged(
  shown: { counts: ApplicantCounts; lastChangedAt: string | null },
  latest: { counts: ApplicantCounts; lastChangedAt: string | null },
): boolean {
  if (shown.lastChangedAt !== latest.lastChangedAt) return true;
  return (Object.keys(shown.counts) as (keyof ApplicantCounts)[]).some(
    (key) => shown.counts[key] !== latest.counts[key],
  );
}

// ---------------------------------------------------------------------------
// One application: the panel
// ---------------------------------------------------------------------------

/** Whether a score came from the local stand-in scorer rather than the AI service. */
export function isDemoScore(modelVersion: string | null | undefined): boolean {
  return !!modelVersion && modelVersion.startsWith('stub');
}

/**
 * Why the application is where it is, in one or two sentences: which band
 * its score fell in against the thresholds it was judged by, and whether a
 * person has decided since. Rule-based, so it is always available — the AI's
 * own explanation will sit beside it once the service provides one.
 */
export function verdictSentence(review: Pick<ApplicantReview, 'score' | 'thresholds' | 'application'>): string {
  const { score, thresholds } = review;
  const status = review.application.reviewStatus;
  if (status === 'WITHDRAWN') return 'The candidate withdrew this application.';
  if (!score || score.overallScore === null) {
    if (score?.status === 'SCORING_FAILED') {
      return "This application couldn't be scored automatically, so a person reviews it.";
    }
    if (status === 'PENDING_SCREENING') return 'Waiting to be screened.';
    if (status === 'MANUAL_REVIEW') return 'AI screening is off for this vacancy, so a person reviews every applicant.';
    return 'There is no AI score for this application.';
  }
  const value = score.overallScore;
  const auto = score.autoThresholdUsed ?? thresholds.auto;
  const manual = score.manualThresholdUsed ?? thresholds.manual;
  let sentence: string;
  if (value >= auto) {
    sentence = `Scored ${value}, at or above the auto-advance threshold of ${auto}, so screening advanced them.`;
  } else if (value >= manual) {
    sentence = `Scored ${value}, between the manual-review threshold of ${manual} and auto-advance at ${auto}, so a person decides.`;
  } else {
    sentence = `Scored ${value}, below the manual-review threshold of ${manual}, so screening rejected them.`;
  }
  const rejectedByScreening = score.outcome === 'AUTO_REJECTED';
  if (status === 'ADVANCED_BY_RECRUITER') return `${sentence} A recruiter has since advanced them.`;
  if (status === 'REJECTED' && !rejectedByScreening) return `${sentence} A recruiter has since rejected them.`;
  return sentence;
}

/** How each kind of history line reads, and its tint on the timeline. */
export const HISTORY_LABEL: Record<ApplicationEventType, { label: string; tone: Tone }> = {
  SUBMITTED: { label: 'Applied', tone: 'neutral' },
  AI_SCREENED: { label: 'Screened by AI', tone: 'highlight' },
  SCREENING_FAILED: { label: "Couldn't be screened", tone: 'warning' },
  SCREENING_SKIPPED: { label: 'Sent to manual review', tone: 'warning' },
  ADVANCED: { label: 'Advanced', tone: 'success' },
  SHORTLISTED: { label: 'Shortlisted', tone: 'success' },
  STAGE_CHANGED: { label: 'Moved stage', tone: 'neutral' },
  STATUS_CHANGED: { label: 'Status changed', tone: 'neutral' },
  REJECTED: { label: 'Rejected', tone: 'error' },
  HIRED: { label: 'Hired', tone: 'success' },
  WITHDRAWN: { label: 'Withdrew', tone: 'neutral' },
};

export interface PipelineSteps {
  titles: string[];
  /** Index of the step the applicant is on. */
  current: number;
  /** `error` when the application ended there (rejected or withdrawn). */
  status: 'process' | 'error' | 'finish';
}

/**
 * Where the applicant is, as steps: the vacancy's own pipeline when it has
 * one, otherwise Applied → Screening → Interview.
 */
export function pipelineSteps(review: Pick<ApplicantReview, 'stages' | 'currentStageId' | 'application'>): PipelineSteps {
  const status = review.application.reviewStatus;
  const ended = status === 'REJECTED' || status === 'WITHDRAWN';
  if (review.stages.length > 0) {
    const ordered = [...review.stages].sort((a, b) => a.position - b.position);
    const index = ordered.findIndex((stage) => stage.id === review.currentStageId);
    const current = Math.max(0, index);
    const onboarded = ordered[current]?.type === 'ONBOARD';
    return {
      titles: ordered.map((stage) => stage.name),
      current,
      status: ended ? 'error' : onboarded ? 'finish' : 'process',
    };
  }
  // Waiting to be screened is the screening step in progress, not still "applied".
  const current = Math.max(1, implicitStep(status));
  return { titles: IMPLICIT_STEPS, current, status: ended ? 'error' : 'process' };
}

/** The address of one applicant's panel, keeping the list's filters so closing returns to the same view. */
export function applicantPath(jobId: string, applicationId: string, search = ''): string {
  return `/dashboard/applicants/${encodeURIComponent(jobId)}/${encodeURIComponent(applicationId)}${search}`;
}

/** The address of a vacancy's applicant list, with its filters. */
export function vacancyApplicantsPath(jobId: string, search = ''): string {
  return `/dashboard/applicants/${encodeURIComponent(jobId)}${search}`;
}

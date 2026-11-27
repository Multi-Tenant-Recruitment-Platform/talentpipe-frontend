import { describe, expect, it } from 'vitest';
import type { ApplicantCounts, ApplicantReview } from '../api/types';
import {
  DEFAULT_QUERY,
  EMPTY_COUNTS,
  applicantPath,
  isDemoScore,
  pipelineSteps,
  verdictSentence,
  newArrivals,
  parseApplicantQuery,
  scorePlaceholder,
  scoreTone,
  stageLabel,
  summaryChanged,
  thresholdsSentence,
  writeApplicantQuery,
} from './applicants';

const thresholds = { auto: 80, manual: 70, fromPipeline: true };
const counts = (over: Partial<ApplicantCounts> = {}): ApplicantCounts => ({ ...EMPTY_COUNTS, ...over });

describe('scoreTone', () => {
  it('follows the vacancy thresholds, a threshold itself counting as reached', () => {
    expect(scoreTone(80, thresholds)).toBe('success');
    expect(scoreTone(79, thresholds)).toBe('warning');
    expect(scoreTone(70, thresholds)).toBe('warning');
    expect(scoreTone(69, thresholds)).toBe('error');
  });
});

describe('scorePlaceholder', () => {
  it('says scoring is under way only while the application waits to be screened', () => {
    expect(scorePlaceholder({ scoreStatus: 'PENDING', reviewStatus: 'PENDING_SCREENING' })).toBe('Scoring…');
    expect(scorePlaceholder({ scoreStatus: 'SCORING_FAILED', reviewStatus: 'MANUAL_REVIEW' })).toBe('Not scored');
    // A vacancy that does not screen: nothing is coming.
    expect(scorePlaceholder({ scoreStatus: 'PENDING', reviewStatus: 'MANUAL_REVIEW' })).toBe('No score');
  });
});

describe('stageLabel', () => {
  it('names the pipeline stage, or where the review stands without a pipeline', () => {
    expect(stageLabel({ currentStage: { id: 's', name: 'Technical interview', type: 'INTERVIEW' }, reviewStatus: 'AUTO_ADVANCED' }))
      .toBe('Technical interview');
    expect(stageLabel({ currentStage: null, reviewStatus: 'PENDING_SCREENING' })).toBe('Applied');
    expect(stageLabel({ currentStage: null, reviewStatus: 'MANUAL_REVIEW' })).toBe('Screening');
    expect(stageLabel({ currentStage: null, reviewStatus: 'AUTO_ADVANCED' })).toBe('Interview');
  });
});

describe('thresholdsSentence', () => {
  it('says when the default thresholds apply because the vacancy has no pipeline', () => {
    expect(thresholdsSentence(thresholds)).not.toContain('default');
    expect(thresholdsSentence({ ...thresholds, fromPipeline: false })).toContain('default thresholds apply');
  });
});

describe('URL state', () => {
  it('reads the band, search, sort and 1-based page from the address bar', () => {
    expect(parseApplicantQuery(new URLSearchParams('band=manual&q=perera&sort=score&page=3'))).toEqual({
      band: 'manual',
      q: 'perera',
      sort: 'score',
      page: 2,
      size: DEFAULT_QUERY.size,
    });
  });

  it('falls back to the defaults for anything it does not know', () => {
    expect(parseApplicantQuery(new URLSearchParams('band=shortlisted&sort=salary&page=-4'))).toEqual(DEFAULT_QUERY);
  });

  it('writes only what differs from the default, and keeps the page’s other keys', () => {
    const written = writeApplicantQuery(new URLSearchParams('tab=advert'), { ...DEFAULT_QUERY, band: 'rejected' });
    expect(written.toString()).toBe('tab=advert&band=rejected');
    expect(writeApplicantQuery(written, DEFAULT_QUERY).toString()).toBe('tab=advert');
  });

  it('round-trips', () => {
    const query = { ...DEFAULT_QUERY, band: 'auto' as const, q: 'nimal', sort: 'name' as const, page: 4 };
    expect(parseApplicantQuery(writeApplicantQuery(new URLSearchParams(), query))).toEqual(query);
  });
});

describe('polling', () => {
  it('counts arrivals, never negative', () => {
    expect(newArrivals(counts({ all: 3 }), counts({ all: 5 }))).toBe(2);
    expect(newArrivals(counts({ all: 5 }), counts({ all: 4 }))).toBe(0);
    expect(newArrivals(null, counts({ all: 5 }))).toBe(0);
  });

  it('notices a change in any count or in the last-changed time', () => {
    const shown = { counts: counts({ all: 2, manualReview: 2 }), lastChangedAt: '2026-11-27T10:00:00Z' };
    expect(summaryChanged(shown, { ...shown })).toBe(false);
    expect(summaryChanged(shown, { ...shown, lastChangedAt: '2026-11-27T10:00:05Z' })).toBe(true);
    expect(summaryChanged(shown, { ...shown, counts: counts({ all: 2, manualReview: 1, rejected: 1 }) })).toBe(true);
  });
});

type Verdict = Parameters<typeof verdictSentence>[0];

function verdict(over: { overallScore?: number | null; status?: ApplicantReview['application']['reviewStatus']; outcome?: string | null; scoreStatus?: string } = {}): Verdict {
  const scored = over.overallScore !== null && over.overallScore !== undefined;
  return {
    thresholds,
    application: { reviewStatus: over.status ?? 'MANUAL_REVIEW' } as Verdict['application'],
    score:
      over.overallScore === undefined && over.scoreStatus === undefined
        ? null
        : ({
            status: over.scoreStatus ?? (scored ? 'SCORED' : 'SCORING_FAILED'),
            overallScore: over.overallScore ?? null,
            outcome: over.outcome ?? null,
            autoThresholdUsed: scored ? 80 : null,
            manualThresholdUsed: scored ? 70 : null,
          } as Verdict['score']),
  };
}

describe('verdictSentence', () => {
  it('says which band the score fell in, against the thresholds it was judged by', () => {
    expect(verdictSentence(verdict({ overallScore: 85, status: 'AUTO_ADVANCED', outcome: 'AUTO_ADVANCED' })))
      .toContain('at or above the auto-advance threshold of 80');
    expect(verdictSentence(verdict({ overallScore: 74, status: 'MANUAL_REVIEW', outcome: 'MANUAL_REVIEW' })))
      .toContain('between the manual-review threshold of 70 and auto-advance at 80');
    expect(verdictSentence(verdict({ overallScore: 40, status: 'REJECTED', outcome: 'AUTO_REJECTED' })))
      .toBe('Scored 40, below the manual-review threshold of 70, so screening rejected them.');
  });

  it('says when a recruiter has since decided otherwise', () => {
    expect(verdictSentence(verdict({ overallScore: 54, status: 'ADVANCED_BY_RECRUITER', outcome: 'AUTO_REJECTED' })))
      .toMatch(/rejected them\. A recruiter has since advanced them\.$/);
    expect(verdictSentence(verdict({ overallScore: 86, status: 'REJECTED', outcome: 'AUTO_ADVANCED' })))
      .toMatch(/A recruiter has since rejected them\.$/);
  });

  it('explains a missing score without inventing one', () => {
    expect(verdictSentence(verdict({ status: 'PENDING_SCREENING' }))).toBe('Waiting to be screened.');
    expect(verdictSentence(verdict({ status: 'MANUAL_REVIEW' }))).toContain('AI screening is off');
    expect(verdictSentence(verdict({ overallScore: null, scoreStatus: 'SCORING_FAILED' }))).toContain("couldn't be scored");
    expect(verdictSentence(verdict({ overallScore: 90, status: 'WITHDRAWN' }))).toBe('The candidate withdrew this application.');
  });
});

describe('pipelineSteps', () => {
  const stages = [
    { id: 'onboard', name: 'Onboard', type: 'ONBOARD' as const, position: 3 },
    { id: 'applied', name: 'Applied', type: 'POST_APPLICATION' as const, position: 0 },
    { id: 'screen', name: 'Screening', type: 'SCREENING' as const, position: 1 },
    { id: 'interview', name: 'Technical interview', type: 'INTERVIEW' as const, position: 2 },
  ];
  const app = (reviewStatus: ApplicantReview['application']['reviewStatus']) =>
    ({ reviewStatus }) as ApplicantReview['application'];

  it('follows the vacancy pipeline in order, on the stage the applicant is in', () => {
    expect(pipelineSteps({ stages, currentStageId: 'screen', application: app('MANUAL_REVIEW') })).toEqual({
      titles: ['Applied', 'Screening', 'Technical interview', 'Onboard'],
      current: 1,
      status: 'process',
    });
  });

  it('marks a rejected application as stopped where it is, and onboarding as finished', () => {
    expect(pipelineSteps({ stages, currentStageId: 'screen', application: app('REJECTED') }).status).toBe('error');
    expect(pipelineSteps({ stages, currentStageId: 'onboard', application: app('ADVANCED_BY_RECRUITER') }).status).toBe('finish');
  });

  it('uses three plain steps for a vacancy without a pipeline, advanced ones at interview', () => {
    expect(pipelineSteps({ stages: [], currentStageId: null, application: app('PENDING_SCREENING') })).toEqual({
      titles: ['Applied', 'Screening', 'Interview'],
      current: 1,
      status: 'process',
    });
    expect(pipelineSteps({ stages: [], currentStageId: null, application: app('MANUAL_REVIEW') }).current).toBe(1);
    expect(pipelineSteps({ stages: [], currentStageId: null, application: app('AUTO_ADVANCED') }).current).toBe(2);
  });
});

describe('the panel helpers', () => {
  it('tells a stand-in score from an AI one', () => {
    expect(isDemoScore('stub-v1')).toBe(true);
    expect(isDemoScore('gemini-2.5')).toBe(false);
    expect(isDemoScore(null)).toBe(false);
  });

  it('keeps the list’s filters in an applicant’s address', () => {
    expect(applicantPath('v 1', 'a-2', '?band=manual')).toBe('/dashboard/applicants/v%201/a-2?band=manual');
  });
});

import { describe, expect, it } from 'vitest';
import type { CandidateApplicationResponse, JobSummary } from '../api/types';
import { applicationStatusMeta, inView, progressCounts, stageIndex, toAppliedJobs, viewCounts } from './myApplications';

function application(overrides: Partial<CandidateApplicationResponse> = {}): CandidateApplicationResponse {
  return {
    id: 'a-1',
    jobId: 'j-1',
    candidateId: 'c-1',
    tenantId: 't-1',
    jobTitle: 'Data Analyst',
    status: 'APPLIED',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
    withdrawnAt: null,
    ...overrides,
  };
}

const advert = (overrides: Partial<JobSummary> = {}): JobSummary => ({
  id: 'j-1',
  slug: 'data-analyst-lumora',
  title: 'Data Analyst',
  companyName: 'Lumora',
  companyLogoUrl: 'https://cdn.test/lumora.png',
  ...overrides,
});

describe('applicationStatusMeta', () => {
  it.each([
    ['IN_REVIEW', 'In review', 'primary'],
    ['SHORTLISTED', 'Shortlisted', 'highlight'],
    ['INTERVIEW', 'Interview', 'warning'],
    ['OFFERED', 'Offered', 'success'],
    ['REJECTED', 'Rejected', 'error'],
  ])('%s reads "%s" in its own colour', (status, label, colour) => {
    const meta = applicationStatusMeta(status);
    expect(meta.label).toBe(label);
    expect(meta.className).toContain(colour);
  });

  it('marks rejected and withdrawn as closed, the rest as active', () => {
    expect(applicationStatusMeta('REJECTED').closed).toBe(true);
    expect(applicationStatusMeta('WITHDRAWN').closed).toBe(true);
    expect(applicationStatusMeta('SHORTLISTED').closed).toBe(false);
  });

  it('names a status it does not know instead of hiding it', () => {
    expect(applicationStatusMeta('ON_HOLD')).toMatchObject({ label: 'On hold', closed: false });
  });
});

describe('stageIndex', () => {
  it('places each step on the track, and anything else off it', () => {
    expect(stageIndex('APPLIED')).toBe(0);
    expect(stageIndex('OFFERED')).toBe(4);
    expect(stageIndex('REJECTED')).toBe(-1);
    expect(stageIndex('ON_HOLD')).toBe(-1);
  });
});

describe('toAppliedJobs', () => {
  it('takes the company and link from the advert, newest application first', () => {
    const rows = toAppliedJobs(
      [
        application({ id: 'old', createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z' }),
        application({ id: 'new', createdAt: '2026-10-20T00:00:00Z', updatedAt: '2026-10-22T00:00:00Z' }),
      ],
      new Map([['j-1', advert()]]),
    );
    expect(rows.map((row) => row.id)).toEqual(['new', 'old']);
    expect(rows[0]).toMatchObject({
      companyName: 'Lumora',
      companyLogoUrl: 'https://cdn.test/lumora.png',
      jobPath: '/jobs/data-analyst-lumora',
      updatedAt: '2026-10-22T00:00:00Z',
    });
    // Never updated since it was sent: no "Updated" line.
    expect(rows[1].updatedAt).toBeNull();
  });

  it('borrows the company of a closed advert from the same tenant, and has no link', () => {
    const rows = toAppliedJobs(
      [application({ id: 'open' }), application({ id: 'closed', jobId: 'j-gone' })],
      new Map([
        ['j-1', advert()],
        ['j-gone', null],
      ]),
    );
    expect(rows.find((row) => row.id === 'closed')).toMatchObject({ companyName: 'Lumora', jobPath: null });
  });

  it('leaves the company unknown when nothing names it', () => {
    const [row] = toAppliedJobs([application({ jobId: 'j-gone', tenantId: 't-9' })], new Map([['j-gone', null]]));
    expect(row).toMatchObject({ companyName: null, jobPath: null, jobTitle: 'Data Analyst' });
  });
});

describe('views', () => {
  const rows = [{ status: 'IN_REVIEW' }, { status: 'REJECTED' }, { status: 'WITHDRAWN' }, { status: 'APPLIED' }];

  it('counts how many reached the shortlist or beyond, and the offers', () => {
    const progressed = [{ status: 'SHORTLISTED' }, { status: 'INTERVIEW' }, { status: 'OFFERED' }, ...rows];
    expect(progressCounts(progressed)).toEqual({ shortlisted: 3, offers: 1 });
  });

  it('splits active from closed', () => {
    expect(viewCounts(rows)).toEqual({ all: 4, active: 2, closed: 2 });
    expect(rows.filter((row) => inView(row, 'active')).map((row) => row.status)).toEqual(['IN_REVIEW', 'APPLIED']);
  });
});

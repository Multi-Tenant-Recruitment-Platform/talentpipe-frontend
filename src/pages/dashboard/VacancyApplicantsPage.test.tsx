import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, type AxiosResponse } from 'axios';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApplicantPage, ApplicantReview, ApplicantRow } from '../../api/types';
import { EMPTY_COUNTS } from '../../dashboard/applicants';
import { authContextMock, makeUser, setAuth } from '../../test/authHarness';
import { makeVacancy } from '../../test/vacancyFixtures';
import { ApplicantPanelRoute, VacancyApplicantsPage } from './VacancyApplicantsPage';

/**
 * One vacancy's applicants and the applicant panel over them, against mocked
 * APIs: what opens, what it shows, and how it moves between applicants.
 */

vi.setConfig({ testTimeout: 20_000 });
vi.mock('../../auth/AuthContext', () => authContextMock);

const applicants = vi.hoisted(() => ({
  list: vi.fn(),
  summary: vi.fn(),
  review: vi.fn(),
  cv: vi.fn(),
  advanceToInterview: vi.fn(),
}));
vi.mock('../../api/applicants', () => ({ applicantsApi: applicants }));

const jobs = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../api/jobs', () => ({ jobsApi: jobs }));

function row(id: string, name: string, score: number, reviewStatus: ApplicantRow['reviewStatus']): ApplicantRow {
  return {
    applicationId: id,
    candidateName: name,
    email: `${id}@mail.test`,
    appliedAt: '2026-11-20T09:00:00Z',
    score,
    scoreStatus: 'SCORED',
    reviewStatus,
    currentStage: null,
  };
}

const rows = [
  row('a-1', 'Ashan Gunasekara', 54, 'ADVANCED_BY_RECRUITER'),
  row('a-2', 'Mohamed Aadhil', 69, 'REJECTED'),
];

const page: ApplicantPage = {
  content: rows,
  page: 0,
  size: 20,
  totalElements: 2,
  totalPages: 1,
  counts: { ...EMPTY_COUNTS, all: 2, autoAdvanced: 1, advancedByRecruiter: 1, rejected: 1 },
  thresholds: { auto: 80, manual: 70, fromPipeline: true },
  blindMode: false,
  lastChangedAt: '2026-11-27T10:00:00Z',
};

function review(id: string, name: string, over: Partial<ApplicantReview> = {}): ApplicantReview {
  return {
    candidate: { name, email: `${id}@mail.test`, phone: '+94 77 312 4587', location: 'Colombo 07' },
    application: {
      id,
      appliedAt: '2026-11-20T09:00:00Z',
      status: 'SHORTLISTED',
      reviewStatus: 'ADVANCED_BY_RECRUITER',
      decidedAt: '2026-11-22T09:00:00Z',
      version: 3,
      vacancy: { id: 'v-1', title: 'Senior Backend Engineer', status: 'PUBLISHED', blindMode: false },
    },
    score: {
      status: 'SCORED',
      overallScore: 54,
      outcome: 'AUTO_REJECTED',
      autoThresholdUsed: 80,
      manualThresholdUsed: 70,
      summary: 'Strong on Java, light on Kafka.',
      strengths: ['Shows Java'],
      gaps: ['No evidence of Kafka'],
      matchedSkills: ['Java'],
      missingSkills: ['Kafka'],
      criteria: [{ name: 'Java', score: 90, rationale: 'Mentioned in the CV.', weight: 0.75, mustHave: true }],
      modelVersion: 'stub-v1',
      scoredAt: '2026-11-20T09:05:00Z',
      failureReason: null,
    },
    thresholds: { auto: 80, manual: 70, fromPipeline: true },
    stages: [
      { id: 's-0', name: 'Applied', type: 'POST_APPLICATION', position: 0 },
      { id: 's-1', name: 'Screening', type: 'SCREENING', position: 1 },
      { id: 's-2', name: 'Technical interview', type: 'INTERVIEW', position: 2 },
    ],
    currentStageId: 's-1',
    history: [
      { type: 'SUBMITTED', at: '2026-11-20T09:00:00Z', fromStage: null, toStage: 'Applied', fromReviewStatus: null, toReviewStatus: 'PENDING_SCREENING', actorName: null, reason: null, score: null },
      { type: 'AI_SCREENED', at: '2026-11-20T09:05:00Z', fromStage: 'Applied', toStage: 'Screening', fromReviewStatus: 'PENDING_SCREENING', toReviewStatus: 'REJECTED', actorName: null, reason: null, score: 54 },
      { type: 'SHORTLISTED', at: '2026-11-22T09:00:00Z', fromStage: 'Screening', toStage: 'Screening', fromReviewStatus: 'REJECTED', toReviewStatus: 'ADVANCED_BY_RECRUITER', actorName: 'Kasun Perera', reason: null, score: null },
    ],
    cv: null,
    ...over,
  };
}

function LocationProbe() {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{pathname + search}</output>;
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/dashboard/applicants/:jobId" element={<VacancyApplicantsPage />}>
          <Route path=":applicationId" element={<ApplicantPanelRoute />} />
        </Route>
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  setAuth({ user: makeUser({ role: 'HR_MANAGER' }) });
  Object.values(applicants).forEach((fn) => fn.mockReset());
  jobs.get.mockReset();
  jobs.get.mockResolvedValue(makeVacancy({ id: 'v-1', title: 'Senior Backend Engineer', status: 'PUBLISHED' }));
  applicants.list.mockResolvedValue(page);
  applicants.review.mockImplementation((id: string) =>
    Promise.resolve(review(id, id === 'a-1' ? 'Ashan Gunasekara' : 'Mohamed Aadhil')),
  );
});

describe('VacancyApplicantsPage', () => {
  it('names the vacancy in a slim header, without the advert', async () => {
    renderAt('/dashboard/applicants/v-1');

    expect(await screen.findByRole('heading', { level: 1, name: 'Senior Backend Engineer' })).toBeInTheDocument();
    expect(await screen.findAllByTestId('applicant-row')).toHaveLength(2);
    expect(screen.queryByText(/Key responsibilities/i)).not.toBeInTheDocument();
  });

  it('opens an applicant from the list, keeping the filters in the address', async () => {
    renderAt('/dashboard/applicants/v-1?band=all&sort=score');

    fireEvent.click(await screen.findByRole('link', { name: 'Ashan Gunasekara' }));

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/dashboard/applicants/v-1/a-1?band=all&sort=score'),
    );
    const panel = await screen.findByRole('dialog', {}, { timeout: 5000 });
    expect(await within(panel).findByRole('heading', { name: 'Ashan Gunasekara' })).toBeInTheDocument();
  });
});

describe('the applicant panel', () => {
  it('shows who applied, the score ring, where they are, and why', async () => {
    renderAt('/dashboard/applicants/v-1/a-1');
    const panel = await screen.findByRole('dialog', {}, { timeout: 5000 });

    expect(await within(panel).findByRole('heading', { name: 'Ashan Gunasekara' })).toBeInTheDocument();
    expect(within(panel).getByText('a-1@mail.test')).toBeInTheDocument();
    expect(within(panel).getByLabelText('AI score 54 out of 100')).toBeInTheDocument();
    expect(within(panel).getByText('Advanced by recruiter')).toBeInTheDocument();
    // The steps, with Screening as the current one.
    expect(within(panel).getByText('Technical interview')).toBeInTheDocument();
    expect(within(panel).getByText(/A recruiter has since advanced them/)).toBeInTheDocument();
    expect(within(panel).getByText('Demo score — not an AI assessment')).toBeInTheDocument();
    expect(within(panel).getByLabelText('Java: 90 out of 100')).toBeInTheDocument();
    expect(within(panel).getByText('Must-have')).toBeInTheDocument();
  });

  it('lists the history, newest first, with who did what', async () => {
    renderAt('/dashboard/applicants/v-1/a-1');
    const panel = await screen.findByRole('dialog', {}, { timeout: 5000 });
    await within(panel).findByRole('heading', { name: 'Ashan Gunasekara' });

    fireEvent.click(within(panel).getByRole('tab', { name: 'History (3)' }));

    // Only the history tab: "Applied" is also a pipeline step and a field label.
    const history = await within(panel).findByRole('tabpanel', { name: 'History (3)' });
    const lines = within(history).getAllByText(/^(Applied|Screened by AI|Shortlisted)$/);
    expect(lines.map((line) => line.firstChild?.textContent)).toEqual(['Shortlisted', 'Screened by AI', 'Applied']);
    expect(within(history).getByText(/Kasun Perera/)).toBeInTheDocument();
    expect(within(history).getByText('Scored 54 / 100')).toBeInTheDocument();
  });

  it('says plainly when there is no CV', async () => {
    renderAt('/dashboard/applicants/v-1/a-1');
    const panel = await screen.findByRole('dialog', {}, { timeout: 5000 });
    await within(panel).findByRole('heading', { name: 'Ashan Gunasekara' });

    fireEvent.click(within(panel).getByRole('tab', { name: 'CV' }));

    expect(await within(panel).findByText('No CV with this application')).toBeInTheDocument();
    expect(applicants.cv).not.toHaveBeenCalled();
  });

  it('moves to the next applicant in the list without closing', async () => {
    renderAt('/dashboard/applicants/v-1/a-1');
    const panel = await screen.findByRole('dialog', {}, { timeout: 5000 });
    await within(panel).findByRole('heading', { name: 'Ashan Gunasekara' });

    fireEvent.click(within(panel).getByRole('button', { name: 'Next applicant' }));

    expect(await within(panel).findByRole('heading', { name: 'Mohamed Aadhil' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard/applicants/v-1/a-2');
    expect(within(panel).getByRole('button', { name: 'Next applicant' })).toBeDisabled();
  });

  it('hides who the candidate is in blind mode', async () => {
    applicants.review.mockResolvedValue(
      review('a-1', 'Applicant #1', {
        candidate: { name: 'Applicant #1', email: null, phone: null, location: null },
        application: { ...review('a-1', 'x').application, vacancy: { id: 'v-1', title: 'Senior Backend Engineer', status: 'PUBLISHED', blindMode: true } },
      }),
    );
    renderAt('/dashboard/applicants/v-1/a-1');
    const panel = await screen.findByRole('dialog', {}, { timeout: 5000 });

    expect(await within(panel).findByRole('heading', { name: 'Applicant #1' })).toBeInTheDocument();
    expect(within(panel).getByText(/Blind mode is on/)).toBeInTheDocument();
    expect(within(panel).queryByText(/@mail\.test/)).not.toBeInTheDocument();
  });

  it('explains an application that is not the viewer’s to see', async () => {
    applicants.review.mockRejectedValue(
      new AxiosError('nope', '404', undefined, undefined, { status: 404, data: {} } as AxiosResponse),
    );
    renderAt('/dashboard/applicants/v-1/a-1');

    expect(await screen.findByText("This application isn't available")).toBeInTheDocument();
  });

  it('closes back to the same filtered list', async () => {
    renderAt('/dashboard/applicants/v-1/a-1?band=rejected');
    const panel = await screen.findByRole('dialog', {}, { timeout: 5000 });
    await within(panel).findByRole('heading', { name: 'Ashan Gunasekara' });

    fireEvent.click(within(panel).getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/dashboard/applicants/v-1?band=rejected'));
  });
});

describe('sending to interview', () => {
  function manualReview(over: Partial<ApplicantReview['application']> = {}) {
    const base = review('a-1', 'Ashan Gunasekara');
    return { ...base, application: { ...base.application, status: 'APPLIED', reviewStatus: 'MANUAL_REVIEW' as const, decidedAt: null, ...over } };
  }

  it('offers it for a manual-review applicant, and records it after confirming', async () => {
    applicants.review.mockResolvedValue(manualReview());
    const advanced = review('a-1', 'Ashan Gunasekara', {
      currentStageId: 's-2',
    });
    applicants.advanceToInterview = vi.fn().mockResolvedValue(advanced);
    renderAt('/dashboard/applicants/v-1/a-1');
    const panel = await screen.findByRole('dialog', {}, { timeout: 5000 });
    await within(panel).findByRole('heading', { name: 'Ashan Gunasekara' });
    applicants.list.mockClear();

    fireEvent.click(within(panel).getByRole('button', { name: /Send to interview/ }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Send to the interview stage?' });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Send to interview' }));

    await waitFor(() => expect(applicants.advanceToInterview).toHaveBeenCalledWith('a-1', 3));
    expect(await screen.findByText('Ashan Gunasekara was sent to the interview stage.')).toBeInTheDocument();
    // The list behind the panel reloads to match.
    await waitFor(() => expect(applicants.list).toHaveBeenCalled());
    expect(within(panel).queryByRole('button', { name: /Send to interview/ })).not.toBeInTheDocument();
  });

  it('is not offered once an applicant is advanced or rejected', async () => {
    renderAt('/dashboard/applicants/v-1/a-1');
    const panel = await screen.findByRole('dialog', {}, { timeout: 5000 });
    await within(panel).findByRole('heading', { name: 'Ashan Gunasekara' });

    expect(within(panel).queryByRole('button', { name: /Send to interview/ })).not.toBeInTheDocument();
  });

  it('is not offered to someone who may not move applicants', async () => {
    setAuth({ user: makeUser({ role: 'INTERVIEWER' }) });
    applicants.review.mockResolvedValue(manualReview());
    renderAt('/dashboard/applicants/v-1/a-1');
    const panel = await screen.findByRole('dialog', {}, { timeout: 5000 });
    await within(panel).findByRole('heading', { name: 'Ashan Gunasekara' });

    expect(within(panel).queryByRole('button', { name: /Send to interview/ })).not.toBeInTheDocument();
  });

  it('shows the latest version when someone else decided first', async () => {
    applicants.review.mockResolvedValue(manualReview());
    applicants.advanceToInterview = vi
      .fn()
      .mockRejectedValue(new AxiosError('stale', '409', undefined, undefined, { status: 409, data: {} } as AxiosResponse));
    renderAt('/dashboard/applicants/v-1/a-1');
    const panel = await screen.findByRole('dialog', {}, { timeout: 5000 });
    await within(panel).findByRole('heading', { name: 'Ashan Gunasekara' });

    fireEvent.click(within(panel).getByRole('button', { name: /Send to interview/ }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Send to the interview stage?' });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Send to interview' }));

    expect(await screen.findByText(/Someone else updated this applicant/)).toBeInTheDocument();
    await waitFor(() => expect(applicants.review).toHaveBeenCalledTimes(2));
  });
});

describe('the overview', () => {
  it('puts the AI’s CV summary above the AI evaluation', async () => {
    renderAt('/dashboard/applicants/v-1/a-1');
    const panel = await screen.findByRole('dialog', {}, { timeout: 5000 });
    await within(panel).findByRole('heading', { name: 'Ashan Gunasekara' });

    const headings = within(panel).getAllByRole('heading', { level: 4 }).map((h) => h.textContent);
    expect(headings.indexOf('CV summary')).toBeLessThan(headings.indexOf('AI evaluation'));
    expect(within(panel).getByText('Strong on Java, light on Kafka.')).toBeInTheDocument();
  });

  it('says so when the AI has not summarised the CV yet', async () => {
    applicants.review.mockResolvedValue(review('a-1', 'Ashan Gunasekara', { score: null }));
    renderAt('/dashboard/applicants/v-1/a-1');
    const panel = await screen.findByRole('dialog', {}, { timeout: 5000 });

    expect(await within(panel).findByText(/hasn’t summarised this CV yet/)).toBeInTheDocument();
  });

  it('lists applicants without an email column', async () => {
    renderAt('/dashboard/applicants/v-1');
    await screen.findAllByTestId('applicant-row');

    expect(screen.queryByRole('columnheader', { name: 'Email' })).not.toBeInTheDocument();
    expect(screen.queryByText('a-1@mail.test')).not.toBeInTheDocument();
  });
});

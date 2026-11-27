import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApplicantPage, ApplicantRow } from '../../api/types';
import { EMPTY_COUNTS } from '../../dashboard/applicants';
import { POLL_INTERVAL_MS } from '../../dashboard/useApplicants';
import { ApplicantsSection } from './ApplicantsSection';

/**
 * The applicant dashboard on a vacancy's page, against a mocked applicants
 * API. The ranking is the server's; these tests pin what is shown, which
 * requests the controls send, and how the list keeps itself current.
 */

const api = vi.hoisted(() => ({ list: vi.fn(), summary: vi.fn() }));
vi.mock('../../api/applicants', () => ({ applicantsApi: api }));

function row(over: Partial<ApplicantRow> = {}): ApplicantRow {
  return {
    applicationId: crypto.randomUUID(),
    candidateName: 'Nimal Perera',
    email: 'nimal@example.com',
    appliedAt: '2026-11-25T09:00:00Z',
    score: 88,
    scoreStatus: 'SCORED',
    reviewStatus: 'AUTO_ADVANCED',
    currentStage: { id: 'st-2', name: 'Screening', type: 'SCREENING' },
    ...over,
  };
}

function page(rows: ApplicantRow[], over: Partial<ApplicantPage> = {}): ApplicantPage {
  return {
    content: rows,
    page: 0,
    size: 20,
    totalElements: rows.length,
    totalPages: 1,
    counts: { ...EMPTY_COUNTS, all: rows.length, autoAdvanced: 1, manualReview: 1, rejected: 1 },
    thresholds: { auto: 80, manual: 70, fromPipeline: true },
    blindMode: false,
    lastChangedAt: '2026-11-27T10:00:00Z',
    ...over,
  };
}

const ranked = [
  row({ candidateName: 'Bimal Ninety', score: 92 }),
  row({ candidateName: 'Mala Manual', score: 75, reviewStatus: 'MANUAL_REVIEW' }),
  row({ candidateName: 'Ruwan Low', score: 40, reviewStatus: 'REJECTED', email: 'ruwan@example.com' }),
];

/** Shows the router's current search, so tests can read what the controls wrote. */
function SearchProbe() {
  return <output data-testid="search">{useLocation().search}</output>;
}

function renderSection(url = '/dashboard/jobs/v-1') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/dashboard/jobs/:id"
          element={
            <>
              <ApplicantsSection jobId="v-1" vacancyStatus="PUBLISHED" />
              <SearchProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

function axiosError(status: number) {
  return new AxiosError('failed', String(status), undefined, undefined, { status, data: {} } as AxiosResponse);
}

beforeEach(() => {
  api.list.mockReset();
  api.summary.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ApplicantsSection', () => {
  it('shows the applicants in the order the server ranked them, with their scores and statuses', async () => {
    api.list.mockResolvedValue(page(ranked));
    renderSection();

    const rows = await screen.findAllByTestId('applicant-row');
    expect(rows.map((r) => within(r).getAllByRole('cell')[1].textContent)).toEqual([
      expect.stringContaining('Bimal Ninety'),
      expect.stringContaining('Mala Manual'),
      expect.stringContaining('Ruwan Low'),
    ]);
    expect(within(rows[0]).getByLabelText('AI score 92 out of 100')).toHaveTextContent('92 / 100');
    expect(within(rows[1]).getByText('Manual review')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Rejected')).toBeInTheDocument();
    expect(api.list).toHaveBeenCalledWith('v-1', expect.objectContaining({ band: 'all', sort: 'default', page: 0 }), expect.anything());
  });

  it('shows the four figures and the thresholds the bands follow', async () => {
    api.list.mockResolvedValue(page(ranked));
    renderSection();

    expect(await screen.findByText('Total applicants')).toBeInTheDocument();
    expect(screen.getByText(/Auto-advance from 80, manual review from 70/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Manual Review 1/ })).toBeInTheDocument();
  });

  it('filters by a pill, writing it into the address so a reload keeps it', async () => {
    api.list.mockResolvedValue(page(ranked));
    renderSection();
    await screen.findAllByTestId('applicant-row');

    fireEvent.click(screen.getByRole('radio', { name: /Manual Review/ }));

    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('?band=manual'));
    expect(api.list).toHaveBeenLastCalledWith('v-1', expect.objectContaining({ band: 'manual' }), expect.anything());
  });

  it('opens on the view the address names', async () => {
    api.list.mockResolvedValue(page(ranked));
    renderSection('/dashboard/jobs/v-1?band=rejected&sort=score&page=2');

    await screen.findAllByTestId('applicant-row');
    expect(api.list).toHaveBeenCalledWith(
      'v-1',
      expect.objectContaining({ band: 'rejected', sort: 'score', page: 1 }),
      expect.anything(),
    );
  });

  it('searches once typing pauses, not on every keystroke', async () => {
    api.list.mockResolvedValue(page(ranked));
    renderSection();
    await screen.findAllByTestId('applicant-row');
    api.list.mockClear();

    await userEvent.type(screen.getByLabelText('Search applicants by name or email'), 'ruwan');

    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('?q=ruwan'));
    expect(api.list).toHaveBeenCalledTimes(1);
    expect(api.list).toHaveBeenCalledWith('v-1', expect.objectContaining({ q: 'ruwan' }), expect.anything());
  });

  it('says when nobody has applied yet', async () => {
    api.list.mockResolvedValue(page([], { counts: EMPTY_COUNTS }));
    renderSection();

    expect(await screen.findByText('No applicants yet')).toBeInTheDocument();
  });

  it('offers to clear a filter that matches nobody', async () => {
    api.list.mockResolvedValue(page([], { counts: { ...EMPTY_COUNTS, all: 3, autoAdvanced: 3 } }));
    renderSection('/dashboard/jobs/v-1?band=rejected');

    fireEvent.click(await screen.findByRole('button', { name: 'Clear filters' }));

    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(/^$/));
  });

  it('shows pending and failed scores in words, not as a number', async () => {
    api.list.mockResolvedValue(
      page([
        row({ score: null, scoreStatus: 'PENDING', reviewStatus: 'PENDING_SCREENING' }),
        row({ score: null, scoreStatus: 'SCORING_FAILED', reviewStatus: 'MANUAL_REVIEW' }),
      ]),
    );
    renderSection();

    expect(await screen.findByText('Scoring…')).toBeInTheDocument();
    expect(screen.getByText('Not scored')).toBeInTheDocument();
  });

  it('in blind mode, shows no email column and switches the search off', async () => {
    api.list.mockResolvedValue(
      page([row({ candidateName: 'Applicant #1', email: null })], { blindMode: true }),
    );
    renderSection();

    await screen.findAllByTestId('applicant-row');
    expect(screen.queryByRole('columnheader', { name: 'Email' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Search applicants by name or email')).toBeDisabled();
    expect(screen.getByText(/Blind mode is on/)).toBeInTheDocument();
  });

  it('explains, without a retry, when the vacancy’s applicants are not this person’s to see', async () => {
    api.list.mockRejectedValue(axiosError(404));
    renderSection();

    expect(await screen.findByText("Applicants aren't shown to you")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('offers a retry when loading fails', async () => {
    api.list.mockRejectedValueOnce(axiosError(500)).mockResolvedValue(page(ranked));
    renderSection();

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findAllByTestId('applicant-row')).toHaveLength(3);
  });

  describe('keeping current', () => {
    it('announces new applicants instead of moving the rows, and loads them on request', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      api.list.mockResolvedValue(page(ranked));
      renderSection();
      await screen.findAllByTestId('applicant-row');

      api.summary.mockResolvedValue({
        counts: { ...EMPTY_COUNTS, all: 5, autoAdvanced: 3, manualReview: 1, rejected: 1 },
        lastChangedAt: '2026-11-27T10:01:00Z',
      });
      api.list.mockClear();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
      });

      const pill = await screen.findByRole('button', { name: /2 new applicants/ });
      expect(api.list).not.toHaveBeenCalled();
      // The figures move at once.
      expect(screen.getByRole('radio', { name: /^All 5/ })).toBeInTheDocument();

      fireEvent.click(pill);
      await waitFor(() => expect(api.list).toHaveBeenCalledTimes(1));
    });

    it('does not poll while the tab is hidden', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      api.list.mockResolvedValue(page(ranked));
      renderSection();
      await screen.findAllByTestId('applicant-row');
      const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');

      await act(async () => {
        await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 2);
      });

      expect(api.summary).not.toHaveBeenCalled();
      visibility.mockRestore();
    });
  });
});

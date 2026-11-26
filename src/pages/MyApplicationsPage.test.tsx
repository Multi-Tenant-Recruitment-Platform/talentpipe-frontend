import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CandidateApplicationResponse, JobDetail } from '../api/types';

/**
 * Behaviour of the candidate's Applied jobs page. The applications API and the
 * public job lookup are mocked; each test starts by waiting for the list.
 */

const listMyApplications = vi.fn<() => Promise<CandidateApplicationResponse[]>>();
const getPublicJob = vi.fn<(id: string) => Promise<JobDetail | null>>();
vi.mock('../api/applications', () => ({ listMyApplications }));
vi.mock('../api/publicJobs', () => ({ getPublicJob }));

const { MyApplicationsPage } = await import('./MyApplicationsPage');
const { REFRESH_INTERVAL_MS } = await import('../candidate/useMyApplications');

function application(overrides: Partial<CandidateApplicationResponse>): CandidateApplicationResponse {
  return {
    id: 'a-1',
    jobId: 'j-1',
    candidateId: 'c-1',
    tenantId: 't-1',
    jobTitle: 'Data Analyst',
    status: 'IN_REVIEW',
    createdAt: '2026-10-24T10:00:00Z',
    updatedAt: '2026-10-24T10:00:00Z',
    withdrawnAt: null,
    ...overrides,
  };
}

const APPLICATIONS = [
  application({ id: 'a-1', jobId: 'j-1', jobTitle: 'Data Analyst', status: 'IN_REVIEW' }),
  application({
    id: 'a-2',
    jobId: 'j-2',
    tenantId: 't-2',
    jobTitle: 'Front Office Executive',
    status: 'REJECTED',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-05T10:00:00Z',
  }),
];

const ADVERTS: Record<string, JobDetail> = {
  'j-1': { id: 'j-1', slug: 'data-analyst-lumora', title: 'Data Analyst', companyName: 'Lumora Technologies' },
};

function renderPage() {
  return render(
    <MemoryRouter>
      <MyApplicationsPage />
    </MemoryRouter>,
  );
}

/** The application rows only, not the steps inside each row's track. */
const rows = () => Array.from(screen.getByRole('list', { name: 'Your applications' }).children);
const rowFor = (title: string) => screen.getByRole('heading', { name: title }).closest('li')!;

beforeEach(() => {
  listMyApplications.mockResolvedValue(APPLICATIONS);
  getPublicJob.mockImplementation(async (id) => ADVERTS[id] ?? null);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('MyApplicationsPage', () => {
  it('lists each application with its company, date and colour-coded status', async () => {
    renderPage();
    const analyst = await screen.findByRole('heading', { name: 'Data Analyst' });
    const row = analyst.closest('li')!;

    expect(within(row).getByRole('link', { name: 'Data Analyst' })).toHaveAttribute('href', '/jobs/data-analyst-lumora');
    expect(within(row).getByText('Lumora Technologies')).toBeInTheDocument();
    expect(within(row).getByText(/Applied on/)).toBeInTheDocument();
    expect(within(row).getByText('In review', { selector: '.ant-tag' })).toHaveClass('bg-primary-50');
    expect(within(row).getByRole('list', { name: 'Application progress' })).toBeInTheDocument();
  });

  it('shows a closed advert without a link, and a rejection without the progress track', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Front Office Executive' });
    const row = rowFor('Front Office Executive');

    expect(within(row).queryByRole('link')).not.toBeInTheDocument();
    expect(within(row).getByText(/Listing closed/)).toBeInTheDocument();
    expect(within(row).getByText('Rejected')).toHaveClass('bg-error-bg');
    expect(within(row).queryByRole('list', { name: 'Application progress' })).not.toBeInTheDocument();
    expect(within(row).getByText(/Updated/)).toBeInTheDocument();
  });

  it('marks the current step on the track', async () => {
    listMyApplications.mockResolvedValue([application({ status: 'SHORTLISTED' })]);
    renderPage();
    await screen.findByRole('heading', { name: 'Data Analyst' });
    const track = screen.getByRole('list', { name: 'Application progress' });
    const current = within(track)
      .getAllByRole('listitem')
      .find((item) => item.getAttribute('aria-current') === 'step');
    expect(current).toHaveTextContent('Shortlisted');
  });

  it('filters to active or closed applications', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: 'Data Analyst' });

    await user.click(screen.getByText('Closed (1)'));
    expect(screen.queryByRole('heading', { name: 'Data Analyst' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Front Office Executive' })).toBeInTheDocument();

    await user.click(screen.getByText('Active (1)'));
    expect(screen.getByRole('heading', { name: 'Data Analyst' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Front Office Executive' })).not.toBeInTheDocument();
  });

  it('invites a candidate with no applications to browse jobs', async () => {
    listMyApplications.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('No applications yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Browse jobs/ })).toBeInTheDocument();
  });

  it('offers a retry when the list cannot be loaded', async () => {
    const user = userEvent.setup();
    listMyApplications.mockRejectedValueOnce(new Error('offline'));
    renderPage();
    expect(await screen.findByText("Couldn't load your applications")).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Data Analyst' })).toBeInTheDocument();
  });

  it('picks up a status change on its own, without a reload', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderPage();
    await screen.findByText('In review', { selector: '.ant-tag' });

    listMyApplications.mockResolvedValue([
      { ...APPLICATIONS[0], status: 'SHORTLISTED', updatedAt: '2026-10-26T10:00:00Z' },
      APPLICATIONS[1],
    ]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS);
    });

    expect(within(rowFor('Data Analyst')).getByText('Shortlisted', { selector: '.ant-tag' })).toBeInTheDocument();
    // Adverts are looked up once, not on every refresh.
    expect(getPublicJob).toHaveBeenCalledTimes(2);
    expect(rows()).toHaveLength(2);
  });
});

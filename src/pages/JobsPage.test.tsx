import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobDetail, JobSummary, PageResponse } from '../api/types';
import { JobList } from '../components/jobs/JobList';
import { JobDetailPage } from './JobDetailPage';
import { JobsPage } from './JobsPage';

vi.mock('../api/publicJobs', () => ({
  listPublicJobs: vi.fn(),
  getPublicJob: vi.fn(),
}));
const { listPublicJobs, getPublicJob } = vi.mocked(await import('../api/publicJobs'));

const FULL_JOB: JobDetail = {
  id: 'job-1',
  title: 'Senior Frontend Engineer',
  companyName: 'Demo Company',
  summary: 'Build candidate experiences with React.',
  description: 'The full description of the role.',
  requirements: ['4+ years of React'],
  location: 'Colombo, Sri Lanka',
  category: 'Engineering',
  skills: ['React', 'TypeScript', 'Testing', 'CSS', 'HTML', 'Node', 'Vite', 'Git'],
  employmentType: 'Full-time',
  workplaceType: 'Hybrid',
  applicationDeadline: '2026-10-31',
};
const MINIMAL_JOB: JobSummary = { id: 'job-2', title: 'Data Analyst', companyName: 'Northwind' };

function page(content: JobSummary[], { pageNo = 0, total = content.length, totalPages = 1 } = {}): PageResponse<JobSummary> {
  return { content, page: pageNo, size: 20, totalElements: total, totalPages };
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/:jobId" element={<JobDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  listPublicJobs.mockReset();
  getPublicJob.mockReset();
});

describe('JobsPage', () => {
  it('shows the heading and a loading state, then the vacancies', async () => {
    listPublicJobs.mockResolvedValue(page([FULL_JOB, MINIMAL_JOB]));
    renderAt('/jobs');
    expect(screen.getByRole('heading', { level: 1, name: 'Explore Job Opportunities' })).toBeInTheDocument();
    expect(screen.getByText(/loading job vacancies/i)).toBeInTheDocument();
    expect(await screen.findByRole('article', { name: FULL_JOB.title })).toBeInTheDocument();
    expect(screen.getByText('2 open positions')).toBeInTheDocument();
  });

  it('displays the vacancy information on the card', async () => {
    listPublicJobs.mockResolvedValue(page([FULL_JOB]));
    renderAt('/jobs');
    const c = within(await screen.findByRole('article', { name: FULL_JOB.title }));
    for (const text of ['Demo Company', FULL_JOB.summary!, 'Colombo, Sri Lanka', 'Engineering', 'Full-time', 'Hybrid']) {
      expect(c.getByText(text)).toBeInTheDocument();
    }
    expect(c.getByText(/^Apply by .*31.*2026$/)).toBeInTheDocument();
    const skills = c.getByRole('list', { name: 'Skills' });
    expect(within(skills).getByText('React')).toBeInTheDocument();
    expect(within(skills).getByText('+4 more')).toBeInTheDocument();
  });

  it('omits optional details a job does not have', async () => {
    listPublicJobs.mockResolvedValue(page([MINIMAL_JOB]));
    renderAt('/jobs');
    const c = within(await screen.findByRole('article', { name: MINIMAL_JOB.title }));
    expect(c.queryByText(/apply by/i)).toBeNull();
    expect(c.queryByRole('list', { name: 'Skills' })).toBeNull();
    // The link names its job, so a list of "View Job" links is still distinguishable.
    expect(c.getByRole('link', { name: /^view job\W+data analyst$/i })).toBeInTheDocument();
  });

  it('keeps the full title available when the card clamps it', async () => {
    const longTitle = 'Principal '.repeat(20).trim();
    listPublicJobs.mockResolvedValue(page([{ ...MINIMAL_JOB, title: longTitle }]));
    renderAt('/jobs');
    expect(await screen.findByRole('heading', { level: 2, name: longTitle })).toHaveAttribute('title', longTitle);
  });

  it('shows the empty state when nothing is published', async () => {
    listPublicJobs.mockResolvedValue(page([]));
    renderAt('/jobs');
    expect(await screen.findByText('No job vacancies are currently available.')).toBeInTheDocument();
    expect(screen.queryByText(/open position/)).toBeNull();
  });

  it('shows an error with a working retry, and never substitutes other jobs', async () => {
    const user = userEvent.setup();
    listPublicJobs.mockRejectedValueOnce(new Error('network down'));
    renderAt('/jobs');
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load job vacancies/i);
    expect(screen.queryByRole('article')).toBeNull();

    listPublicJobs.mockResolvedValueOnce(page([FULL_JOB]));
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('article', { name: FULL_JOB.title })).toBeInTheDocument();
  });

  it('reports the total from the API, not the page size, and loads more', async () => {
    const user = userEvent.setup();
    listPublicJobs.mockResolvedValueOnce(page([FULL_JOB], { total: 2, totalPages: 2 }));
    renderAt('/jobs');
    expect(await screen.findByText('Showing 1 of 2 open positions')).toBeInTheDocument();

    // The second page repeats a job that shifted pages; it must not appear twice.
    listPublicJobs.mockResolvedValueOnce(page([FULL_JOB, MINIMAL_JOB], { pageNo: 1, total: 2, totalPages: 2 }));
    await user.click(screen.getByRole('button', { name: 'Load more jobs' }));
    expect(await screen.findByRole('article', { name: MINIMAL_JOB.title })).toBeInTheDocument();
    expect(listPublicJobs).toHaveBeenLastCalledWith(1);
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByText('2 open positions')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more jobs' })).toBeNull();
  });

  it('has no search or filter controls yet', async () => {
    listPublicJobs.mockResolvedValue(page([FULL_JOB]));
    renderAt('/jobs');
    await screen.findByRole('article', { name: FULL_JOB.title });
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('opens the matching vacancy from View Job', async () => {
    const user = userEvent.setup();
    listPublicJobs.mockResolvedValue(page([FULL_JOB, MINIMAL_JOB]));
    getPublicJob.mockResolvedValue(FULL_JOB);
    renderAt('/jobs');
    await user.click(within(await screen.findByRole('article', { name: FULL_JOB.title })).getByRole('link', { name: /view job/i }));
    expect(getPublicJob).toHaveBeenCalledWith('job-1');
    expect(await screen.findByRole('heading', { level: 1, name: FULL_JOB.title })).toBeInTheDocument();
    expect(screen.getByText('The full description of the role.')).toBeInTheDocument();
    expect(screen.getByText('4+ years of React')).toBeInTheDocument();
    // Details show every skill, not the card's shortened list.
    expect(within(screen.getByRole('list', { name: 'Skills' })).getByText('Git')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /apply/i })).toBeNull();
  });
});

describe('JobDetailPage', () => {
  it('explains when the vacancy does not exist or is not public', async () => {
    getPublicJob.mockResolvedValue(null);
    renderAt('/jobs/unknown');
    expect(await screen.findByText('This job is not available.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /all jobs/i }).length).toBeGreaterThan(0);
  });

  it('shows an error with retry when details fail to load', async () => {
    const user = userEvent.setup();
    getPublicJob.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(FULL_JOB);
    renderAt('/jobs/job-1');
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load this job/i);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1, name: FULL_JOB.title })).toBeInTheDocument();
  });
});

describe('JobList', () => {
  it('accepts a custom empty message for filtered results', () => {
    render(
      <MemoryRouter>
        <JobList status="ready" jobs={[]} emptyTitle="No matching jobs found" emptyDescription="Try other filters." />
      </MemoryRouter>,
    );
    expect(screen.getByText('No matching jobs found')).toBeInTheDocument();
  });

  it('uses job ids as keys so identical titles still render separately', () => {
    render(
      <MemoryRouter>
        <JobList status="ready" jobs={[MINIMAL_JOB, { ...MINIMAL_JOB, id: 'job-3' }]} />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('article', { name: MINIMAL_JOB.title })).toHaveLength(2);
  });
});

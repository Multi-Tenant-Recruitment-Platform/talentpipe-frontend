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

const THREE_DAYS_AGO = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

/** Every field the vacancy form collects that is public. */
const FULL_JOB: JobDetail = {
  id: 'job-1',
  title: 'Senior Frontend Engineer',
  companyName: 'Demo Company',
  department: 'Engineering',
  openings: 2,
  employmentType: 'FULL_TIME',
  workplaceType: 'HYBRID',
  location: 'Colombo, Sri Lanka',
  applicationDeadline: '2026-10-31',
  publishedAt: THREE_DAYS_AGO,
  jobSummary: 'Build candidate experiences with React.',
  jobDescription: 'The full description of the role.',
  keyResponsibilities: ['Own the job board'],
  requiredSkills: ['React', 'TypeScript', 'Testing', 'CSS', 'HTML', 'Node', 'Vite', 'Git'],
  preferredSkills: ['Kubernetes'],
  minimumExperienceYears: 4,
  education: 'Bachelor’s degree',
  certifications: ['AWS Solutions Architect'],
  languageRequirements: ['English', 'Sinhala'],
  otherRequirements: 'A valid driving licence.',
  salaryMin: 450000,
  salaryMax: 650000,
  currency: 'LKR — Sri Lankan rupee',
  payPeriod: 'MONTHLY',
  benefits: ['TRAINING', 'HEALTH_INSURANCE'],
  workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
  workingHours: '9:00 AM – 6:00 PM',
  shiftType: 'DAY',
  expectedHoursPerWeek: 40,
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
        <Route path="/jobs/:jobKey" element={<JobDetailPage />} />
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
    expect(screen.getByRole('heading', { level: 1, name: 'Find your next opportunity' })).toBeInTheDocument();
    expect(screen.getByText(/loading job vacancies/i)).toBeInTheDocument();
    expect(await screen.findByRole('article', { name: FULL_JOB.title })).toBeInTheDocument();
    expect(screen.getByText('2 jobs available')).toBeInTheDocument();
  });

  it('displays the vacancy information on the card', async () => {
    listPublicJobs.mockResolvedValue(page([FULL_JOB]));
    renderAt('/jobs');
    const c = within(await screen.findByRole('article', { name: FULL_JOB.title }));
    for (const text of [
      'Demo Company',
      'Colombo, Sri Lanka',
      'Full time',
      'Hybrid',
      '2 openings',
      'LKR 450,000 – 650,000 / month',
      'Posted 3 days ago',
    ]) {
      expect(c.getByText(text)).toBeInTheDocument();
    }
    expect(c.getByText(/^Apply by .*31.*2026$/)).toBeInTheDocument();
    // The card is a preview: the summary, department, experience and the rest wait on the details page.
    expect(c.queryByText(FULL_JOB.jobSummary!)).toBeNull();
    expect(c.queryByText(/engineering|years experience|day shift|bachelor|health insurance/i)).toBeNull();
    // Skills are intentionally kept on the details page so the card remains easy to scan.
    expect(c.queryByRole('list', { name: 'Required skills' })).toBeNull();
  });

  it('omits optional details a job does not have', async () => {
    listPublicJobs.mockResolvedValue(page([MINIMAL_JOB]));
    renderAt('/jobs');
    const c = within(await screen.findByRole('article', { name: MINIMAL_JOB.title }));
    expect(c.queryByText(/apply by/i)).toBeNull();
    expect(c.queryByRole('list', { name: 'Required skills' })).toBeNull();
    expect(c.queryByText(/posted|openings|experience/i)).toBeNull();
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
    expect(screen.queryByText(/jobs? available/)).toBeNull();
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
    expect(await screen.findByText('Showing 1 of 2 jobs')).toBeInTheDocument();

    // The second page repeats a job that shifted pages; it must not appear twice.
    listPublicJobs.mockResolvedValueOnce(page([FULL_JOB, MINIMAL_JOB], { pageNo: 1, total: 2, totalPages: 2 }));
    await user.click(screen.getByRole('button', { name: 'Load more jobs' }));
    expect(await screen.findByRole('article', { name: MINIMAL_JOB.title })).toBeInTheDocument();
    expect(listPublicJobs).toHaveBeenLastCalledWith(1, { keyword: '', location: '' });
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByText('2 jobs available')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more jobs' })).toBeNull();
  });

  it('sends the search to the backend and shows what comes back', async () => {
    const user = userEvent.setup();
    // Stands in for the database: the backend, not the page, decides what matches.
    listPublicJobs.mockImplementation(async (_page, search) => {
      if (search?.location === 'Kandy') return page([]);
      if (search?.keyword === 'typescript') return page([FULL_JOB]);
      return page([FULL_JOB, MINIMAL_JOB]);
    });
    renderAt('/jobs');
    await screen.findByRole('article', { name: FULL_JOB.title });
    // The board only lists jobs; a job is read on its own page, so none is fetched here.
    expect(getPublicJob).not.toHaveBeenCalled();

    const search = within(screen.getByRole('search', { name: 'Search jobs' }));
    await user.type(search.getByRole('textbox', { name: 'Job title, skill or company' }), 'typescript');
    // Nothing is requested until the search is submitted.
    expect(listPublicJobs).toHaveBeenCalledTimes(1);
    await user.click(search.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('1 job found')).toBeInTheDocument();
    expect(listPublicJobs).toHaveBeenLastCalledWith(0, { keyword: 'typescript', location: '' });
    expect(screen.getAllByRole('article')).toHaveLength(1);

    await user.type(search.getByRole('textbox', { name: 'Location' }), 'Kandy{Enter}');
    expect(await screen.findByText('No matching jobs found')).toBeInTheDocument();
    expect(listPublicJobs).toHaveBeenLastCalledWith(0, { keyword: 'typescript', location: 'Kandy' });
    expect(screen.queryByRole('article')).toBeNull();
    expect(screen.getByText('0 jobs found')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(await screen.findByText('2 jobs available')).toBeInTheDocument();
    expect(listPublicJobs).toHaveBeenLastCalledWith(0, { keyword: '', location: '' });
    expect(screen.getByRole('textbox', { name: 'Location' })).toHaveValue('');
  });

  it('filters to jobs that state a salary, and sorts newest first', async () => {
    const user = userEvent.setup();
    const older = { ...MINIMAL_JOB, publishedAt: '2020-01-01T00:00:00Z' };
    listPublicJobs.mockResolvedValue(page([older, FULL_JOB]));
    renderAt('/jobs');
    await screen.findByRole('article', { name: FULL_JOB.title });
    const titles = () => screen.getAllByRole('article').map((card) => within(card).getByRole('heading').textContent);
    expect(titles()).toEqual([MINIMAL_JOB.title, FULL_JOB.title]);

    await user.click(screen.getByText('Newest'));
    expect(titles()).toEqual([FULL_JOB.title, MINIMAL_JOB.title]);

    await user.click(screen.getByRole('checkbox', { name: 'Salary shown' }));
    expect(titles()).toEqual([FULL_JOB.title]);
    expect(screen.getByText('1 matching job')).toBeInTheDocument();
  });

  it('filters by job type and workplace with tick boxes that count their jobs', async () => {
    const user = userEvent.setup();
    const contract: JobSummary = { ...MINIMAL_JOB, employmentType: 'CONTRACT', workplaceType: 'REMOTE' };
    listPublicJobs.mockResolvedValue(page([FULL_JOB, contract]));
    renderAt('/jobs');
    await screen.findByRole('article', { name: FULL_JOB.title });

    const group = (name: string) => within(screen.getByRole('group', { name }));
    // Every choice is in the open, each with how many loaded jobs it holds.
    expect(group('Job type').getAllByRole('checkbox')).toHaveLength(5);
    expect(group('Job type').getByText('Contract').parentElement).toHaveTextContent('Contract1');
    expect(group('Job type').getByText('Internship').parentElement).toHaveTextContent('Internship0');

    await user.click(group('Job type').getByRole('checkbox', { name: 'Contract' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('article', { name: MINIMAL_JOB.title })).toBeInTheDocument();

    // Within a group the choices widen; across groups they narrow.
    await user.click(group('Job type').getByRole('checkbox', { name: 'Full time' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    await user.click(group('Workplace').getByRole('checkbox', { name: 'Hybrid' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('article', { name: FULL_JOB.title })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(group('Job type').getByRole('checkbox', { name: 'Contract' })).not.toBeChecked();
  });

  it('leaves the counts off while there are more jobs to load', async () => {
    listPublicJobs.mockResolvedValue(page([FULL_JOB], { total: 40, totalPages: 2 }));
    renderAt('/jobs');
    await screen.findByRole('article', { name: FULL_JOB.title });
    const fullTime = within(screen.getByRole('group', { name: 'Job type' })).getByText('Full time');
    expect(fullTime.parentElement).toHaveTextContent(/^Full time$/);
  });

  it('opens the matching vacancy from View Job', async () => {
    const user = userEvent.setup();
    listPublicJobs.mockResolvedValue(page([FULL_JOB, MINIMAL_JOB]));
    getPublicJob.mockResolvedValue(FULL_JOB);
    renderAt('/jobs');
    await user.click(within(await screen.findByRole('article', { name: FULL_JOB.title })).getByRole('link', { name: /view job/i }));
    expect(getPublicJob).toHaveBeenCalledWith('senior-frontend-engineer-demo-company');
    expect(await screen.findByRole('heading', { level: 1, name: FULL_JOB.title })).toBeInTheDocument();
    expect(screen.getByText('The full description of the role.')).toBeInTheDocument();
    // Details show every skill, not the card's shortened list.
    expect(within(screen.getByRole('list', { name: 'Required skills' })).getByText('Git')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Apply Now' })).toHaveAttribute('href', '/jobs/senior-frontend-engineer-demo-company/apply');
  });
});

describe('JobDetailPage', () => {
  it('shows every public part of the vacancy form, grouped like the form', async () => {
    getPublicJob.mockResolvedValue(FULL_JOB);
    renderAt('/jobs/job-1');
    await screen.findByRole('heading', { level: 1, name: FULL_JOB.title });

    const overview = within(screen.getByRole('region', { name: 'Job overview' }));
    const facts: [string, string][] = [
      ['Department', 'Engineering'],
      ['Openings', '2'],
      ['Experience', '4+ years experience'],
      ['Education', 'Bachelor’s degree'],
      ['Salary', 'LKR 450,000 – 650,000 / month'],
      ['Working days', 'Mon–Fri'],
      ['Working hours', '9:00 AM – 6:00 PM'],
      ['Shift', 'Day shift'],
      ['Hours per week', '40 hours'],
    ];
    for (const [label, value] of facts) {
      expect(overview.getByText(label).nextElementSibling).toHaveTextContent(value);
    }

    expect(screen.getByText(FULL_JOB.jobSummary!)).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Key responsibilities' })).getByText('Own the job board')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Preferred skills' })).getByText('Kubernetes')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Certifications' })).getByText('AWS Solutions Architect')).toBeInTheDocument();
    expect(screen.getByText('English, Sinhala')).toBeInTheDocument();
    expect(screen.getByText('A valid driving licence.')).toBeInTheDocument();
    // Benefit ids become their labels, in catalogue order.
    const perks = within(screen.getByRole('list', { name: 'Benefits and perks' })).getAllByRole('listitem');
    expect(perks.map((li) => li.textContent)).toEqual(['Health insurance', 'Training & development']);
  });

  it('leaves out sections the company did not fill in', async () => {
    getPublicJob.mockResolvedValue(MINIMAL_JOB);
    renderAt('/jobs/job-2');
    await screen.findByRole('heading', { level: 1, name: MINIMAL_JOB.title });
    expect(screen.queryByRole('region', { name: 'Job overview' })).toBeNull();
    for (const heading of ['About the role', 'Key responsibilities', 'Requirements', 'Benefits & perks']) {
      expect(screen.queryByRole('heading', { name: heading })).toBeNull();
    }
  });

  it('offers no way to apply once the vacancy has stopped taking applications', async () => {
    getPublicJob.mockResolvedValue({ ...FULL_JOB, acceptingApplications: false });
    renderAt('/jobs/job-1');
    await screen.findByRole('heading', { level: 1, name: FULL_JOB.title });
    expect(screen.getByText('Applications are closed')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Apply Now' })).toBeNull();
  });

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

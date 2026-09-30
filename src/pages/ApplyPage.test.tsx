import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobApplicationResponse, JobDetail } from '../api/types';
import { authContextMock, LocationProbe, makeUser, setAuth } from '../test/authHarness';

vi.mock('../auth/AuthContext', () => authContextMock);
vi.mock('../api/publicJobs', () => ({ getPublicJob: vi.fn(), listPublicJobs: vi.fn() }));
vi.mock('../api/applications', () => ({ submitApplication: vi.fn() }));

const { getPublicJob } = vi.mocked(await import('../api/publicJobs'));
const { submitApplication } = vi.mocked(await import('../api/applications'));
const { ApplyPage } = await import('./ApplyPage');
const { JobDetailPage } = await import('./JobDetailPage');

const JOB: JobDetail = {
  id: 'job-1',
  title: 'Senior Frontend Engineer',
  companyName: 'Demo Company',
  employmentType: 'Full-time',
  workplaceType: 'Hybrid',
};
const RESPONSE: JobApplicationResponse = { id: 'app-123', jobId: 'job-1', status: 'SUBMITTED', submittedAt: '2026-09-30T10:00:00Z' };
const JOB_PATH = '/jobs/senior-frontend-engineer-demo-company';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <Routes>
        <Route path="/jobs" element={<p>jobs page</p>} />
        <Route path="/jobs/:jobKey" element={<JobDetailPage />} />
        <Route path="/jobs/:jobKey/apply" element={<ApplyPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const nameInput = () => screen.getByLabelText(/full name/i);
const emailInput = () => screen.getByLabelText(/^email/i);
const phoneInput = () => screen.getByLabelText(/phone number/i);
const submitButton = () => screen.getByRole('button', { name: /submit application|submitting/i });

async function openForm() {
  renderAt(`${JOB_PATH}/apply`);
  await screen.findByRole('heading', { level: 1, name: JOB.title });
}

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(nameInput(), '  Ada Lovelace ');
  await user.type(emailInput(), 'ada@example.com');
  await user.type(phoneInput(), '+94 77 123 4567');
}

beforeEach(() => {
  setAuth({ user: null });
  getPublicJob.mockReset().mockResolvedValue(JOB);
  submitApplication.mockReset().mockResolvedValue(RESPONSE);
});

describe('Apply Now entry point', () => {
  it('opens the application form for the job being viewed, using a readable link', async () => {
    const user = userEvent.setup();
    renderAt(JOB_PATH);
    await user.click(await screen.findByRole('link', { name: 'Apply Now' }));
    expect(getPublicJob).toHaveBeenCalledWith('senior-frontend-engineer-demo-company');
    expect(screen.getByTestId('location')).toHaveTextContent(new RegExp(`^${JOB_PATH}/apply$`));
    expect(await screen.findByText('Apply for')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: JOB.title })).toBeInTheDocument();
  });
});

describe('ApplyPage', () => {
  it('shows the selected job clearly with the form and its actions', async () => {
    await openForm();
    expect(screen.getByText('Demo Company')).toBeInTheDocument();
    expect(nameInput()).toBeRequired();
    expect(emailInput()).toBeRequired();
    expect(phoneInput()).toBeRequired();
    expect(screen.getByLabelText(/cover letter/i)).not.toBeRequired();
    expect(submitButton()).toHaveTextContent('Submit Application');
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', JOB_PATH);
  });

  it('prefills name and email for a signed-in candidate', async () => {
    setAuth({ user: makeUser({ role: 'CANDIDATE', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' }) });
    await openForm();
    expect(nameInput()).toHaveValue('Ada Lovelace');
    expect(emailInput()).toHaveValue('ada@example.com');
  });

  it('shows what is missing and focuses the first problem instead of submitting', async () => {
    const user = userEvent.setup();
    await openForm();
    await user.click(submitButton());
    expect(submitApplication).not.toHaveBeenCalled();
    expect(nameInput()).toHaveFocus();
    expect(nameInput()).toHaveAccessibleDescription('Enter your full name.');
    expect(emailInput()).toHaveAttribute('aria-invalid', 'true');
    expect(phoneInput()).toHaveAttribute('aria-invalid', 'true');
  });

  it('re-checks a field as it is corrected after a failed attempt', async () => {
    const user = userEvent.setup();
    await openForm();
    await user.type(emailInput(), 'ada');
    await user.click(submitButton());
    expect(emailInput()).toHaveAccessibleDescription(/valid email/i);
    await user.type(emailInput(), '@example.com');
    expect(emailInput()).not.toHaveAttribute('aria-invalid');
  });

  it('submits once and replaces the form with the confirmation', async () => {
    const user = userEvent.setup();
    await openForm();
    await fillRequired(user);
    await user.type(screen.getByLabelText(/cover letter/i), 'I love accessible UI.');
    await user.click(submitButton());

    const heading = await screen.findByRole('heading', { name: 'Application submitted successfully!' });
    expect(heading).toHaveFocus();
    expect(submitApplication).toHaveBeenCalledTimes(1);
    expect(submitApplication).toHaveBeenCalledWith('job-1', {
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '+94 77 123 4567',
      portfolioUrl: null,
      coverLetter: 'I love accessible UI.',
    });
    expect(screen.getByText('app-123')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit application/i })).toBeNull();
    expect(screen.getByRole('link', { name: 'Browse more jobs' })).toHaveAttribute('href', '/jobs');
  });

  it('ignores repeat submits while one is in flight and locks the form', async () => {
    const user = userEvent.setup();
    let resolve!: (value: JobApplicationResponse) => void;
    submitApplication.mockReturnValue(new Promise((r) => (resolve = r)));
    await openForm();
    await fillRequired(user);

    await user.click(submitButton());
    expect(submitButton()).toBeDisabled();
    expect(submitButton()).toHaveTextContent('Submitting…');
    expect(nameInput()).toBeDisabled();
    await user.dblClick(submitButton());
    await user.keyboard('{Enter}');
    expect(submitApplication).toHaveBeenCalledTimes(1);

    resolve(RESPONSE);
    expect(await screen.findByRole('heading', { name: 'Application submitted successfully!' })).toBeInTheDocument();
    expect(submitApplication).toHaveBeenCalledTimes(1);
  });

  it('keeps the answers and allows a retry when submission fails', async () => {
    const user = userEvent.setup();
    submitApplication.mockRejectedValueOnce(new Error('offline'));
    await openForm();
    await fillRequired(user);
    await user.click(submitButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not submit your application/i);
    expect(nameInput()).toHaveValue('  Ada Lovelace ');
    expect(submitButton()).toBeEnabled();

    await user.click(submitButton());
    expect(await screen.findByRole('heading', { name: 'Application submitted successfully!' })).toBeInTheDocument();
    expect(submitApplication).toHaveBeenCalledTimes(2);
  });

  it('goes back to the job without submitting on Cancel', async () => {
    const user = userEvent.setup();
    await openForm();
    await user.type(nameInput(), 'Ada');
    await user.click(screen.getByRole('link', { name: 'Cancel' }));
    expect(screen.getByTestId('location')).toHaveTextContent(new RegExp(`^${JOB_PATH}$`));
    expect(submitApplication).not.toHaveBeenCalled();
  });

  it('explains when the job cannot be applied to', async () => {
    getPublicJob.mockResolvedValue(null);
    renderAt('/jobs/gone/apply');
    expect(await screen.findByText('This job is not available.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit application/i })).toBeNull();
  });
});

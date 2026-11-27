import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, type AxiosResponse } from 'axios';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApplicantVacancy } from '../../api/types';
import { EMPTY_COUNTS } from '../../dashboard/applicants';
import { ApplicantVacanciesPage } from './ApplicantVacanciesPage';

/** The applicants area's first screen: the vacancies to review, against a mocked API. */

const api = vi.hoisted(() => ({ vacancies: vi.fn() }));
vi.mock('../../api/applicants', () => ({ applicantsApi: api }));

function vacancy(over: Partial<ApplicantVacancy> = {}): ApplicantVacancy {
  return {
    id: 'v-1',
    title: 'Senior Backend Engineer',
    department: 'Engineering',
    location: 'Colombo 03, Sri Lanka',
    employmentType: 'FULL_TIME',
    status: 'PUBLISHED',
    publishedAt: '2026-11-01T09:00:00Z',
    applicationDeadline: '2099-12-31',
    blindMode: false,
    counts: { ...EMPTY_COUNTS, all: 3, autoAdvanced: 1, manualReview: 1, rejected: 1 },
    lastAppliedAt: '2026-11-20T09:00:00Z',
    ...over,
  };
}

function SearchProbe() {
  return <output data-testid="search">{useLocation().search}</output>;
}

function renderPage(url = '/dashboard/applicants') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/dashboard/applicants"
          element={
            <>
              <ApplicantVacanciesPage />
              <SearchProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  api.vacancies.mockReset();
});

describe('ApplicantVacanciesPage', () => {
  it('lists the published vacancies, each with its applicants split by group', async () => {
    api.vacancies.mockResolvedValue([vacancy(), vacancy({ id: 'v-2', title: 'DevOps Engineer', counts: EMPTY_COUNTS, lastAppliedAt: null })]);
    renderPage();

    const card = (await screen.findByText('Senior Backend Engineer')).closest('a')!;
    expect(card).toHaveAttribute('href', '/dashboard/applicants/v-1');
    expect(within(card).getByText('3')).toBeInTheDocument();
    expect(within(card).getByText(/1 applicant is waiting for a person to review/)).toBeInTheDocument();
    expect(screen.getByText('No applications yet')).toBeInTheDocument();
    expect(api.vacancies).toHaveBeenCalledWith('published', expect.anything());
  });

  it('shows closed vacancies on their own tab, kept in the address', async () => {
    api.vacancies.mockResolvedValue([vacancy()]);
    renderPage();
    await screen.findByText('Senior Backend Engineer');

    api.vacancies.mockResolvedValue([vacancy({ id: 'v-9', title: 'Technical Writer', status: 'CLOSED' })]);
    fireEvent.click(screen.getByRole('radio', { name: 'Closed' }));

    expect(await screen.findByText('Technical Writer')).toBeInTheDocument();
    expect(screen.getByTestId('search')).toHaveTextContent('?status=closed');
    expect(api.vacancies).toHaveBeenLastCalledWith('closed', expect.anything());
  });

  it('narrows the cards by title', async () => {
    api.vacancies.mockResolvedValue([vacancy(), vacancy({ id: 'v-2', title: 'DevOps Engineer' })]);
    renderPage();
    await screen.findByText('Senior Backend Engineer');

    fireEvent.change(screen.getByLabelText('Search vacancies by title'), { target: { value: 'devops' } });

    expect(screen.queryByText('Senior Backend Engineer')).not.toBeInTheDocument();
    expect(screen.getByText('DevOps Engineer')).toBeInTheDocument();
  });

  it('says when there is nothing published yet, and where to go', async () => {
    api.vacancies.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('No published vacancies yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to job vacancies' })).toHaveAttribute('href', '/dashboard/jobs');
  });

  it('offers a retry when the list fails to load', async () => {
    api.vacancies
      .mockRejectedValueOnce(new AxiosError('down', '500', undefined, undefined, { status: 500, data: {} } as AxiosResponse))
      .mockResolvedValue([vacancy()]);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(screen.getByText('Senior Backend Engineer')).toBeInTheDocument());
  });
});

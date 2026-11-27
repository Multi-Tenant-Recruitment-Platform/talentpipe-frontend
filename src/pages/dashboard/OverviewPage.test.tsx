import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authContextMock, setAuth } from '../../test/authHarness';
import { DEMO_MEMBERS, type DemoMemberName } from '../../test/demoMembers';

/**
 * The overview every member lands on. It used to be the admin's overview for
 * everyone: an interviewer saw the whole company's funnel, schedule and team
 * activity. Each section now shows only to a member whose role reaches what
 * it is about.
 */

vi.mock('../../auth/AuthContext', () => authContextMock);
const counts = vi.fn(() => Promise.resolve({ DRAFT: 1, PUBLISHED: 3, CLOSED: 0, ARCHIVED: 0 }));
vi.mock('../../api/jobs', () => ({ jobsApi: { counts } }));
const teamList = vi.fn(() => Promise.resolve([]));
vi.mock('../../api/team', () => ({ teamApi: { list: teamList, invite: vi.fn() } }));

const { OverviewPage } = await import('./OverviewPage');
const { TeamSummaryProvider } = await import('../../dashboard/TeamSummaryContext');

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

function renderAs(name: DemoMemberName) {
  setAuth({ user: DEMO_MEMBERS[name], initializing: false });
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <TeamSummaryProvider>
        <Routes>
          <Route path="/dashboard" element={<OverviewPage />} />
          <Route path="/dashboard/jobs/new" element={<p>new vacancy form</p>} />
        </Routes>
      </TeamSummaryProvider>
    </MemoryRouter>,
  );
}

const SECTIONS = [
  'Active jobs',
  'Your active jobs',
  'Candidates in pipeline',
  'Interviews this week',
  'Pending invites',
  'Hiring funnel',
  'Recruitment health',
  'Upcoming interviews',
  'Recent activity',
  'Your work here',
] as const;

const SHOWS: Record<DemoMemberName, (typeof SECTIONS)[number][]> = {
  Owner: [
    'Active jobs',
    'Candidates in pipeline',
    'Interviews this week',
    'Pending invites',
    'Hiring funnel',
    'Recruitment health',
    'Upcoming interviews',
    'Recent activity',
  ],
  Recruiter: [
    'Active jobs',
    'Candidates in pipeline',
    'Interviews this week',
    'Hiring funnel',
    'Recruitment health',
    'Upcoming interviews',
  ],
  Interviewer: ['Your active jobs', 'Your work here'],
  'Hiring Coordinator': [
    'Your active jobs',
    'Candidates in pipeline',
    'Interviews this week',
    'Pending invites',
    'Hiring funnel',
    'Recruitment health',
    'Upcoming interviews',
    'Recent activity',
  ],
  'Junior Recruiter': ['Your active jobs', 'Your work here'],
};

describe('the overview', () => {
  it.each(Object.keys(SHOWS) as DemoMemberName[])('shows the %s only their sections', async (name) => {
    renderAs(name);
    await waitFor(() => expect(counts).toHaveBeenCalled());

    const shown = SECTIONS.filter((section) => screen.queryByText(section, { exact: true }) !== null);
    expect(shown).toEqual(SHOWS[name]);
  });

  it("counts only the vacancies the member can see, from the server's scoped count", async () => {
    renderAs('Interviewer');
    expect(await screen.findByText('3')).toBeInTheDocument();
    expect(counts).toHaveBeenCalledTimes(1);
  });

  it('never asks for the team without team.view', async () => {
    renderAs('Recruiter');
    await waitFor(() => expect(counts).toHaveBeenCalled());
    expect(teamList).not.toHaveBeenCalled();
  });

  it.each([
    ['Owner', true],
    ['Recruiter', true],
    ['Junior Recruiter', true],
    ['Interviewer', false],
    ['Hiring Coordinator', false],
  ] as const)('offers "Post a job" to the %s: %s', (name, offered) => {
    renderAs(name);
    expect(screen.queryByRole('button', { name: /post a job/i }) !== null).toBe(offered);
  });

  it.each([
    ['Owner', true],
    ['Hiring Coordinator', true],
    ['Recruiter', false],
    ['Interviewer', false],
    ['Junior Recruiter', false],
  ] as const)('offers "Invite member" to the %s: %s', (name, offered) => {
    renderAs(name);
    expect(screen.queryByRole('button', { name: /invite member/i }) !== null).toBe(offered);
  });

  it('"Post a job" opens the vacancy form', async () => {
    renderAs('Recruiter');
    await userEvent.click(screen.getByRole('button', { name: /post a job/i }));
    expect(screen.getByText('new vacancy form')).toBeInTheDocument();
  });

  it('points a member with a narrow role at their vacancies', () => {
    renderAs('Interviewer');
    expect(screen.getByRole('link', { name: 'Job Vacancies' })).toHaveAttribute('href', '/dashboard/jobs');
  });
});

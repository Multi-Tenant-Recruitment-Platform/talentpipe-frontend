import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobStageResponse, JobVacancyResponse } from '../../api/types';
import { authContextMock, makeUser, setAuth } from '../../test/authHarness';
import { makeVacancy } from '../../test/vacancyFixtures';

vi.mock('../../auth/AuthContext', () => authContextMock);
vi.mock('../../dashboard/TeamSummaryContext', () => ({
  useTeamSummary: () => ({ activeMembers: [], members: [], loading: false }),
}));
const api = vi.hoisted(() => ({ get: vi.fn(), stages: vi.fn(), hiringTeam: vi.fn() }));
vi.mock('../../api/jobs', () => ({ jobsApi: api }));
const { VacancyDetailPage } = await import('./VacancyDetailPage');

// Deliberately out of order, with names unique to the job's snapshot.
const stages: JobStageResponse[] = [
  { id: 's3', jobId: 'v-1', position: 2, stageType: 'INTERVIEW', name: 'Saved technical interview', benchmark: 73 },
  { id: 's1', jobId: 'v-1', position: 0, stageType: 'POST_APPLICATION', name: 'Saved application', benchmark: null },
  { id: 's4', jobId: 'v-1', position: 3, stageType: 'ONBOARD', name: 'Saved onboarding', benchmark: null },
  { id: 's2', jobId: 'v-1', position: 1, stageType: 'SCREENING', name: 'Saved screening', benchmark: null },
];

beforeEach(() => {
  vi.clearAllMocks();
  setAuth({ user: makeUser(), initializing: false });
  api.hiringTeam.mockResolvedValue({ vacancyId: 'v-1', recruiter: null, hiringManager: null, members: [] });
  api.stages.mockResolvedValue(stages);
});

async function open(overrides: Partial<JobVacancyResponse> = {}) {
  api.get.mockResolvedValue(makeVacancy({
    stages, recruitmentPipelineName: 'Original engineering pipeline',
    autoThreshold: 88, manualThreshold: 65, ...overrides,
  }));
  render(<MemoryRouter initialEntries={['/dashboard/jobs/v-1']}>
    <Routes><Route path="/dashboard/jobs/:id" element={<VacancyDetailPage />} /></Routes>
  </MemoryRouter>);
  return screen.findByRole('region', { name: 'Hiring pipeline' });
}

describe('vacancy pipeline snapshot', () => {
  it('renders saved stages in position order, interview benchmarks, job thresholds, and a header badge', async () => {
    const panel = await open();
    const track = within(panel).getByRole('list', { name: 'Pipeline stages' });
    const items = within(track).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    ['Saved application', 'Saved screening', 'Saved technical interview', 'Saved onboarding']
      .forEach((name, index) => expect(items[index]).toHaveTextContent(name));
    expect(items[2]).toHaveTextContent('73 / 100');
    expect(within(panel).getByText('Original engineering pipeline.')).toBeVisible();
    const bands = within(panel).getByRole('figure');
    expect(bands).toHaveTextContent('88');
    expect(bands).toHaveTextContent('65');
    expect(bands).toHaveTextContent('87');
    expect(screen.getByText('Blind Mode').closest('header')).not.toBeNull();
    expect(api.stages).not.toHaveBeenCalled();
    // The original response remains unsorted; the track sorts a copy.
    expect(stages[0].position).toBe(2);
  });

  it('does not show Blind Mode when disabled, even if ideal matching is enabled', async () => {
    await open({ blindModeEnabled: false, idealMatchingEnabled: true });
    expect(screen.queryByText('Blind Mode')).not.toBeInTheDocument();
  });

  it('loads snapshots from the job endpoint when they are not embedded', async () => {
    let resolve!: (value: JobStageResponse[]) => void;
    api.stages.mockReturnValueOnce(new Promise<JobStageResponse[]>((done) => { resolve = done; }));
    const panel = await open({ stages: undefined });
    expect(within(panel).getByText('Loading saved pipeline stages…')).toBeInTheDocument();
    expect(api.stages).toHaveBeenCalledWith('v-1');
    resolve(stages);
    expect(await within(panel).findByRole('list', { name: 'Pipeline stages' })).toBeVisible();
  });

  it('keeps thresholds visible after a stages failure and lets the user retry', async () => {
    api.stages.mockRejectedValueOnce(new Error('Network error'));
    const panel = await open({ stages: undefined });
    expect(await within(panel).findByText("We couldn't load the saved stages")).toBeVisible();
    expect(within(panel).getByRole('figure')).toBeVisible();
    fireEvent.click(within(panel).getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(within(panel).getByRole('list', { name: 'Pipeline stages' })).toBeVisible());
    expect(api.stages).toHaveBeenCalledTimes(2);
  });

  it('explains missing snapshots and thresholds instead of inventing template defaults', async () => {
    const panel = await open({ stages: [], autoThreshold: null, manualThreshold: null });
    expect(within(panel).getByText('No pipeline stages were saved for this vacancy.')).toBeVisible();
    expect(within(panel).queryByRole('figure')).not.toBeInTheDocument();
    expect(within(panel).getAllByText('Not set')).toHaveLength(2);
    expect(api.stages).not.toHaveBeenCalled();
  });
});

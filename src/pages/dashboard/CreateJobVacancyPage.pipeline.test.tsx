import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { authContextMock, makeUser, setAuth } from '../../test/authHarness';
import { server } from '../../test/http';
import { enterDraftWorkspace, leaveWork, pressNext, resumeWork } from '../../test/vacancyFormHarness';

vi.mock('../../auth/AuthContext', () => authContextMock);
vi.mock('../../dashboard/CompanyProfileContext', () => ({
  useCompanyProfileContext: () => ({ saved: { departments: ['Engineering'], industry: '', additionalIndustries: [] }, loading: false }),
}));
vi.mock('../../dashboard/TeamSummaryContext', () => ({
  useTeamSummary: () => ({ activeMembers: [], members: [], loading: false }),
}));

const { CreateJobVacancyPage } = await import('./CreateJobVacancyPage');

beforeEach(() => {
  setAuth({ user: makeUser(), initializing: false });
  enterDraftWorkspace();
});

/** Opens a new vacancy on its pipeline step, with the first five steps answered. */
async function open() {
  leaveWork('pipeline');
  render(<MemoryRouter initialEntries={['/dashboard/jobs/new']}><CreateJobVacancyPage /></MemoryRouter>);
  await resumeWork();
}

async function selectTemplate() {
  const picker = await screen.findByRole('combobox', { name: /Pipeline template/i });
  await waitFor(() => expect(picker).toBeEnabled());
  fireEvent.mouseDown(picker);
  fireEvent.click(await screen.findByTitle(/^Standard Engineering/));
}

describe('creating a vacancy with a pipeline template', () => {
  it('will not move on until a template is chosen, inherits its defaults, and files the draft with blind mode', async () => {
    await open();
    pressNext();
    expect(screen.getByText('Pipeline template is required.')).toBeVisible();
    expect(screen.getByText('Fill in the marked fields to continue.')).toBeVisible();
    await selectTemplate();
    expect(screen.getByRole('spinbutton', { name: /Auto.*threshold/i })).toHaveValue('80');
    expect(screen.getByRole('spinbutton', { name: /Manual.*threshold/i })).toHaveValue('70');
    expect(screen.getByRole('switch', { name: /Blind screening/i })).toBeChecked();
    expect(screen.getByText(/Defaults from Standard Engineering/)).toBeVisible();
    let submitted: unknown;
    server.use(http.post('*/api/v1/jobs', async ({ request }) => {
      submitted = await request.json();
      return HttpResponse.json({ message: 'Keep the form open' }, { status: 422 });
    }));
    // Moving on is when a new vacancy is first saved as a draft.
    pressNext();
    await waitFor(() => expect(submitted).toMatchObject({
      status: 'DRAFT', pipelineTemplateId: 'pipeline-standard', autoThreshold: 80, manualThreshold: 70, blindModeEnabled: true,
    }));
    expect(submitted).not.toHaveProperty('idealMatchingEnabled');
  });

  it('rejects inverted thresholds on Next and clears the error when corrected', async () => {
    await open();
    await selectTemplate();
    const manual = screen.getByRole('spinbutton', { name: /Manual.*threshold/i });
    fireEvent.change(manual, { target: { value: '85' } });
    pressNext();
    expect(screen.getByText('The manual threshold must be lower than the auto threshold.')).toBeVisible();
    expect(manual).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Fill in the marked fields to continue.')).toBeVisible();
    fireEvent.change(manual, { target: { value: '70' } });
    expect(screen.queryByText('The manual threshold must be lower than the auto threshold.')).not.toBeInTheDocument();
  });

  it('shows a load failure, will not move on, and recovers with Retry', async () => {
    server.use(http.get('*/api/v1/pipeline-templates', () => HttpResponse.json({}, { status: 500 })));
    await open();
    expect(await screen.findByText(/We couldn't load your pipeline templates/)).toBeVisible();
    pressNext();
    expect(screen.getByText('Fill in the marked fields to continue.')).toBeVisible();
    server.resetHandlers();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await selectTemplate();
    expect(screen.getByRole('spinbutton', { name: /Auto.*threshold/i })).toHaveValue('80');
  });

  it('explains an empty active-template list and will not move on without a template', async () => {
    server.use(http.get('*/api/v1/pipeline-templates', () => HttpResponse.json({
      content: [], page: 0, size: 100, totalElements: 0, totalPages: 0,
    })));
    await open();
    expect(await screen.findByText(/this workspace has none yet/)).toBeVisible();
    pressNext();
    expect(screen.getByText('Fill in the marked fields to continue.')).toBeVisible();
  });
});

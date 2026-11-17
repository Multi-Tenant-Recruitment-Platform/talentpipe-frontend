import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { authContextMock, makeUser, setAuth } from '../../test/authHarness';
import { server } from '../../test/http';

vi.mock('../../auth/AuthContext', () => authContextMock);
vi.mock('../../dashboard/CompanyProfileContext', () => ({
  useCompanyProfileContext: () => ({ saved: { departments: ['Engineering'], industry: '', additionalIndustries: [] }, loading: false }),
}));
vi.mock('../../dashboard/TeamSummaryContext', () => ({
  useTeamSummary: () => ({ activeMembers: [], members: [], loading: false }),
}));

const { CreateJobVacancyPage } = await import('./CreateJobVacancyPage');

beforeEach(() => setAuth({ user: makeUser(), initializing: false }));

function open() {
  render(<MemoryRouter initialEntries={['/dashboard/jobs/new']}><CreateJobVacancyPage /></MemoryRouter>);
}

async function selectTemplate() {
  const picker = await screen.findByRole('combobox', { name: /Pipeline template/i });
  await waitFor(() => expect(picker).toBeEnabled());
  fireEvent.mouseDown(picker);
  fireEvent.click(await screen.findByTitle(/^Standard Engineering/));
}

describe('creating a vacancy with a pipeline template', () => {
  it('blocks submission until selection, inherits defaults, and sends blind mode independently', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(screen.getByText('Choose a pipeline template before saving this draft.')).toBeVisible();
    await selectTemplate();
    expect(screen.getByRole('spinbutton', { name: /Auto.*threshold/i })).toHaveValue('80');
    expect(screen.getByRole('spinbutton', { name: /Manual.*threshold/i })).toHaveValue('70');
    expect(screen.getByRole('switch', { name: /Blind screening/i })).toBeChecked();
    expect(screen.getByText(/Defaults from Standard Engineering/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled();
    let submitted: unknown;
    server.use(http.post('*/api/v1/jobs', async ({ request }) => {
      submitted = await request.json();
      return HttpResponse.json({ message: 'Keep the form open' }, { status: 422 });
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(submitted).toMatchObject({
      pipelineTemplateId: 'pipeline-standard', autoThreshold: 80, manualThreshold: 70, blindModeEnabled: true,
    }));
    expect(submitted).not.toHaveProperty('idealMatchingEnabled');
  });

  it('rejects inverted thresholds on save and clears the error when corrected', async () => {
    open();
    await selectTemplate();
    const manual = screen.getByRole('spinbutton', { name: /Manual.*threshold/i });
    fireEvent.change(manual, { target: { value: '85' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(screen.getByText('The manual threshold must be lower than the auto threshold.')).toBeVisible();
    expect(manual).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Fix the screening thresholds before saving this draft.')).toBeVisible();
    fireEvent.change(manual, { target: { value: '70' } });
    expect(screen.queryByText('The manual threshold must be lower than the auto threshold.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled();
  });

  it('shows a load failure, blocks saving, and recovers with Retry', async () => {
    server.use(http.get('*/api/v1/pipeline-templates', () => HttpResponse.json({}, { status: 500 })));
    open();
    expect(await screen.findByText(/We couldn't load your pipeline templates/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(screen.getByText('Choose a pipeline template before saving this draft.')).toBeVisible();
    server.resetHandlers();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await selectTemplate();
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled();
  });

  it('explains an empty active-template list and rejects saving without a template', async () => {
    server.use(http.get('*/api/v1/pipeline-templates', () => HttpResponse.json({
      content: [], page: 0, size: 100, totalElements: 0, totalPages: 0,
    })));
    open();
    expect(await screen.findByText(/this workspace has none yet/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(screen.getByText('Choose a pipeline template before saving this draft.')).toBeVisible();
  });
});

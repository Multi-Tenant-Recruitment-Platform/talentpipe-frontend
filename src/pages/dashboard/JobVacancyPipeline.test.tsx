import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import type { JobStageResponse, PipelineTemplateSummary } from '../../api/types';
import { EMPTY_VACANCY_VALUES, PIPELINE_MESSAGES, validatePipeline } from '../../dashboard/jobVacancy';
import { authContextMock, makeUser, setAuth } from '../../test/authHarness';
import { server } from '../../test/http';
import { makeVacancy } from '../../test/vacancyFixtures';

vi.mock('../../auth/AuthContext', () => authContextMock);
vi.mock('../../dashboard/CompanyProfileContext', () => ({
  useCompanyProfileContext: () => ({ saved: { departments: ['Engineering'], industry: '', additionalIndustries: [] }, loading: false }),
}));
vi.mock('../../dashboard/TeamSummaryContext', () => ({
  useTeamSummary: () => ({ activeMembers: [], members: [], loading: false }),
}));

const { CreateJobVacancyPage } = await import('./CreateJobVacancyPage');
const { VacancyDetailPage } = await import('./VacancyDetailPage');

const template: PipelineTemplateSummary = {
  id: 'engineering', name: 'Engineering pipeline', description: '', status: 'ACTIVE',
  defaultAutoThreshold: 80, defaultManualThreshold: 70, blindModeEnabled: true,
  idealMatchingEnabled: false, stageCount: 4, interviewRoundCount: 1,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', archivedAt: null,
};

function templatesResponse(content: PipelineTemplateSummary[]) {
  return HttpResponse.json({ content, page: 0, size: 100, totalElements: content.length, totalPages: 1 });
}

function openCreate() {
  render(<MemoryRouter><CreateJobVacancyPage /></MemoryRouter>);
}

function expectTemplateRequired() {
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(screen.getByText('Choose a pipeline template before saving this draft.')).toBeVisible();
}

async function choose(name: string) {
  const picker = screen.getByRole('combobox', { name: /Pipeline template/i });
  await waitFor(() => expect(picker).toBeEnabled());
  fireEvent.mouseDown(picker);
  fireEvent.click(await screen.findByTitle(new RegExp(`^${name}`)));
}

beforeEach(() => setAuth({ user: makeUser(), initializing: false }));

describe('job creation pipeline picker', () => {
  it('disables selection while loading and requires a template before saving', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    server.use(http.get('*/api/v1/pipeline-templates', async () => {
      await pending;
      return templatesResponse([template]);
    }));
    openCreate();
    try {
      expect(screen.getByText(/Loading templates/)).toBeVisible();
      expect(screen.getByRole('combobox', { name: /Pipeline template/i })).toBeDisabled();
      expectTemplateRequired();
    } finally {
      await act(async () => { release(); });
    }
    await waitFor(() => expect(screen.getByRole('combobox', { name: /Pipeline template/i })).toBeEnabled());
    expect(screen.getByText('Choose a pipeline template')).toBeVisible();
    expectTemplateRequired();
    await choose(template.name);
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled();
  });

  it('replaces thresholds and blind mode when a different template is selected', async () => {
    server.use(http.get('*/api/v1/pipeline-templates', () => templatesResponse([
      template, { ...template, id: 'minimal', name: 'Minimal pipeline', defaultAutoThreshold: 100, defaultManualThreshold: 0, blindModeEnabled: false },
    ])));
    openCreate();
    await choose(template.name);
    expect(screen.getByRole('spinbutton', { name: /Auto.*threshold/i })).toHaveValue('80');
    expect(screen.getByRole('switch', { name: /Blind screening/i })).toBeChecked();
    await choose('Minimal pipeline');
    expect(screen.getByRole('spinbutton', { name: /Auto.*threshold/i })).toHaveValue('100');
    expect(screen.getByRole('spinbutton', { name: /Manual.*threshold/i })).toHaveValue('0');
    expect(screen.getByRole('switch', { name: /Blind screening/i })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled();
  });

  it.each([false, true])('shows an empty state when only archived templates exist: %s', async (archived) => {
    server.use(http.get('*/api/v1/pipeline-templates', () => templatesResponse(
      archived ? [{ ...template, status: 'ARCHIVED' }] : [],
    )));
    openCreate();
    expect(await screen.findByText(/this workspace has none yet/)).toBeVisible();
    expect(screen.queryByRole('combobox', { name: /Pipeline template/i })).not.toBeInTheDocument();
    expectTemplateRequired();
  });

  it.each([80, 85, 100])('rejects saving when manual threshold is %s and auto is 80', async (manual) => {
    server.use(http.get('*/api/v1/pipeline-templates', () => templatesResponse([template])));
    openCreate();
    await choose(template.name);
    const input = screen.getByRole('spinbutton', { name: /Manual.*threshold/i });
    fireEvent.change(input, { target: { value: String(manual) } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(screen.getByText('The manual threshold must be lower than the auto threshold.')).toBeVisible();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Fix the screening thresholds before saving this draft.')).toBeVisible();
    fireEvent.change(input, { target: { value: '0' } });
    expect(screen.queryByText('The manual threshold must be lower than the auto threshold.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled();
  });
});

describe('pipeline threshold validation', () => {
  it.each([[100, 0], [1, 0], [100, 99]])('accepts auto %s and manual %s', (autoThreshold, manualThreshold) => {
    expect(validatePipeline({ ...EMPTY_VACANCY_VALUES, pipelineTemplateId: template.id, autoThreshold, manualThreshold }, 'create')).toEqual({});
  });

  it.each([[0, 0], [100, 100], [80, 80], [80, 81]])('rejects manual >= auto (%s, %s)', (autoThreshold, manualThreshold) => {
    expect(validatePipeline({ ...EMPTY_VACANCY_VALUES, pipelineTemplateId: template.id, autoThreshold, manualThreshold }, 'create'))
      .toHaveProperty('manualThreshold', 'The manual threshold must be lower than the auto threshold.');
  });

  it.each([
    ['autoThreshold', -1, 0], ['autoThreshold', 101, 0],
    ['manualThreshold', 100, -1], ['manualThreshold', 100, null],
    ['autoThreshold', null, 0], ['autoThreshold', Number.NaN, 0],
  ] as const)('rejects invalid %s (%s, %s)', (field, autoThreshold, manualThreshold) => {
    expect(validatePipeline({ ...EMPTY_VACANCY_VALUES, pipelineTemplateId: template.id, autoThreshold, manualThreshold }, 'create'))
      .toHaveProperty(field, (field === 'autoThreshold' ? autoThreshold : manualThreshold) === null
        ? field === 'autoThreshold' ? PIPELINE_MESSAGES.autoRequired : PIPELINE_MESSAGES.manualRequired
        : PIPELINE_MESSAGES.thresholdRange);
  });
});

describe('detail page pipeline track', () => {
  it('renders saved names in position order with multiple interview rounds and benchmarks', async () => {
    const stages: JobStageResponse[] = [
      { id: 'final', jobId: 'v-1', position: 3, stageType: 'INTERVIEW', name: 'Saved final interview', benchmark: 100 },
      { id: 'onboard', jobId: 'v-1', position: 4, stageType: 'ONBOARD', name: 'Saved onboarding', benchmark: null },
      { id: 'application', jobId: 'v-1', position: 0, stageType: 'POST_APPLICATION', name: 'Saved application', benchmark: null },
      { id: 'technical', jobId: 'v-1', position: 2, stageType: 'INTERVIEW', name: 'Saved technical interview', benchmark: 0 },
      { id: 'screening', jobId: 'v-1', position: 1, stageType: 'SCREENING', name: 'Saved screening', benchmark: null },
    ];
    server.use(
      http.get('*/api/v1/jobs/v-1', () => HttpResponse.json(makeVacancy({ stages, autoThreshold: 100, manualThreshold: 0 }))),
      http.get('*/api/v1/jobs/v-1/hiring-team', () => HttpResponse.json({ vacancyId: 'v-1', recruiter: null, hiringManager: null, members: [] })),
    );
    render(<MemoryRouter initialEntries={['/dashboard/jobs/v-1']}>
      <Routes><Route path="/dashboard/jobs/:id" element={<VacancyDetailPage />} /></Routes>
    </MemoryRouter>);
    const panel = await screen.findByRole('region', { name: 'Hiring pipeline' });
    const items = within(within(panel).getByRole('list', { name: 'Pipeline stages' })).getAllByRole('listitem');
    expect(items).toHaveLength(5);
    ['Saved application', 'Saved screening', 'Saved technical interview', 'Saved final interview', 'Saved onboarding']
      .forEach((name, index) => expect(items[index]).toHaveTextContent(name));
    expect(items[2]).toHaveTextContent('Interview round 1');
    expect(items[2]).toHaveTextContent('0 / 100');
    expect(items[3]).toHaveTextContent('Interview round 2');
    expect(items[3]).toHaveTextContent('100 / 100');
    expect(items[0]).toHaveTextContent('Always first');
    expect(items[4]).toHaveTextContent('Always last');
    expect(within(panel).getByRole('figure')).toBeVisible();
  });
});

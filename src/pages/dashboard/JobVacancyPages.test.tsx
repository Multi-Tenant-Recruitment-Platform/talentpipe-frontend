import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobVacancyResponse } from '../../api/types';
import { authContextMock, makeUser, setAuth } from '../../test/authHarness';
import { makeTemplateSummary, makeVacancy, makeVacancyWithoutPipeline } from '../../test/vacancyFixtures';
import {
  enterDraftWorkspace,
  leaveWork,
  openStep,
  openStepHeading,
  pressNext,
  resumeWork,
  stepButton,
  stepper,
} from '../../test/vacancyFormHarness';
import { NEW_VACANCY_DRAFT, vacancyDraftStore } from '../../dashboard/vacancyDraftStore';

/**
 * Behaviour of the vacancy surfaces (PB-011, PB-018 → PB-022), against the
 * jobs API.
 *
 * <p>The rules themselves are pinned in `jobVacancy.test.ts` and
 * `vacancyList.test.ts`; this file covers what a person can do on screen and
 * which requests that sends. `jobsApi` is mocked at the module boundary, so
 * every assertion about a save is an assertion about the exact call the
 * backend would receive.</p>
 */

// Each form render mounts six sections of antd controls — comfortably under the
// default 5s alone, but close enough that a loaded CI machine turns it red.
vi.setConfig({ testTimeout: 20_000 });

vi.mock('../../auth/AuthContext', () => authContextMock);

/** The company profile the form reads departments and industries from; tests adjust it. */
const profileSaved = vi.hoisted(() => ({
  departments: ['Engineering', 'Design'],
  industry: '',
  additionalIndustries: [] as string[],
}));
vi.mock('../../dashboard/CompanyProfileContext', () => ({
  useCompanyProfileContext: () => ({ saved: profileSaved, loading: false }),
}));

const team = vi.hoisted(() => ({ activeMembers: [] as unknown[] }));
vi.mock('../../dashboard/TeamSummaryContext', () => ({
  useTeamSummary: () => ({ activeMembers: team.activeMembers, members: team.activeMembers, loading: false }),
}));

const api = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  publish: vi.fn(),
  close: vi.fn(),
  archive: vi.fn(),
  hiringTeam: vi.fn(),
  replaceHiringTeam: vi.fn(),
  switchFeatures: vi.fn(),
  stages: vi.fn(),
  interviewPanels: vi.fn(),
  replaceInterviewPanels: vi.fn(),
  searchAssignableMembers: vi.fn(),
  idealMatching: vi.fn(),
  replaceIdealMatching: vi.fn(),
}));
vi.mock('../../api/jobs', () => ({ jobsApi: api }));

/** The company's active templates, as the job form's picker reads them. */
const templatesApi = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn() }));
vi.mock('../../api/pipelineTemplates', () => ({
  pipelineTemplatesApi: templatesApi,
  toSummary: <T,>(template: T) => template,
}));

const engineering = makeTemplateSummary();

/** The profile of a vacancy whose template does not offer matching. */
const noMatching = {
  available: false,
  enabled: false,
  criteria: [],
  totalWeightPercent: 0,
  degreeTypes: [],
  niceToHaveCertifications: [],
};
const sales = makeTemplateSummary({
  id: 'tpl-2',
  name: 'Sales hiring',
  defaultAutoThreshold: 90,
  defaultManualThreshold: 60,
  blindModeEnabled: true,
  stageCount: 5,
  interviewRoundCount: 2,
});

const { CreateJobVacancyPage } = await import('./CreateJobVacancyPage');
const { EditJobVacancyPage } = await import('./EditJobVacancyPage');
const { JobVacanciesPage } = await import('./JobVacanciesPage');
const { VacancyDetailPage } = await import('./VacancyDetailPage');

/** An error shaped exactly like the one axios raises for an HTTP answer. */
function httpError(status: number, message = 'Request failed'): AxiosError {
  return new AxiosError(message, String(status), undefined, undefined, {
    status,
    data: { status, message },
  } as AxiosResponse);
}

/** Sets a field in one event — the form re-renders forty controls per keystroke. */
const fill = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

function LocationProbe() {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{pathname + search}</div>;
}

/** The vacancy routes exactly as App.tsx declares them, minus the gates. */
function VacancyRoutes({ path }: Readonly<{ path: string }>) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/dashboard/jobs" element={<JobVacanciesPage />} />
        <Route path="/dashboard/jobs/new" element={<CreateJobVacancyPage />} />
        <Route path="/dashboard/jobs/:id" element={<VacancyDetailPage />} />
        <Route path="/dashboard/jobs/:id/edit" element={<EditJobVacancyPage />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>
  );
}

const location = () => screen.getByTestId('location');

/** The template picker, once the company's templates have arrived. */
async function templatePicker() {
  const picker = await screen.findByLabelText(/^pipeline template/i);
  await waitFor(() => expect(picker).not.toBeDisabled());
  return picker;
}

/** Opens the picker and chooses the template whose option starts with `name`. */
async function chooseTemplate(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await templatePicker());
  await user.click(await screen.findByTitle(new RegExp(`^${name}`)));
}

beforeEach(() => {
  setAuth({ user: makeUser(), initializing: false });
  for (const fn of Object.values(api)) {
    fn.mockReset();
  }
  api.list.mockResolvedValue([]);
  api.stages.mockResolvedValue([]);
  templatesApi.list.mockReset();
  templatesApi.list.mockResolvedValue([engineering, sales]);
  // No interview rounds unless a test gives the template some, so nothing needs staffing.
  templatesApi.get.mockReset();
  templatesApi.get.mockImplementation(async (id: string) => ({ ...engineering, id, stages: [] }));
  api.interviewPanels.mockResolvedValue([]);
  api.searchAssignableMembers.mockResolvedValue([]);
  // No ideal candidate matching unless a test offers it.
  api.idealMatching.mockResolvedValue(noMatching);
  api.hiringTeam.mockResolvedValue({ vacancyId: 'v-1', recruiter: null, hiringManager: null, members: [] });
  profileSaved.industry = '';
  profileSaved.additionalIndustries = [];
  team.activeMembers = [];
  enterDraftWorkspace();
});

/* --- Create ------------------------------------------------------------- */

describe('creating a vacancy', () => {
  it('walks eight numbered steps, from basic information to the review', () => {
    render(<VacancyRoutes path="/dashboard/jobs/new" />);

    expect(within(stepper()).getAllByRole('button').map((step) => step.textContent)).toEqual([
      expect.stringContaining('Basic information'),
      expect.stringContaining('Job description'),
      expect.stringContaining('Candidate requirements'),
      expect.stringContaining('Salary & benefits'),
      expect.stringContaining('Work schedule'),
      expect.stringContaining('Pipeline & screening'),
      expect.stringContaining('Ideal candidate matching'),
      expect.stringContaining('Review & publish'),
    ]);
    expect(screen.getByText('Step 1 of 8')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /basic information/i })).toHaveTextContent('01');
    // Steps ahead of an unfinished one wait for it.
    expect(stepButton(/job description/i)).toBeDisabled();
  });

  it('offers Next until the review, and no Save draft to remember', () => {
    render(<VacancyRoutes path="/dashboard/jobs/new" />);

    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^next/i })).toHaveAccessibleName(/job description/i);
    expect(screen.queryByRole('button', { name: /^back$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save draft/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /publish vacancy/i })).not.toBeInTheDocument();
  });

  it('will not move on from an unfinished step, says what to fill, and sends nothing', async () => {
    render(<VacancyRoutes path="/dashboard/jobs/new" />);

    pressNext();

    expect(await screen.findByText(/fill in the marked fields to continue/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/job title/i)).toHaveFocus();
    expect(openStepHeading()).toHaveTextContent('Basic information');
    expect(api.create).not.toHaveBeenCalled();
  });

  it('clears a field error as soon as that field is corrected', async () => {
    const user = userEvent.setup();
    render(<VacancyRoutes path="/dashboard/jobs/new" />);

    pressNext();
    expect(await screen.findByText(/a job title is required/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/job title/i), 'Backend');
    expect(screen.queryByText(/a job title is required/i)).not.toBeInTheDocument();
  });

  it('moves on and back with Next and Back, keeping what was entered and landing on each heading', async () => {
    leaveWork('basics');
    render(<VacancyRoutes path="/dashboard/jobs/new" />);
    await resumeWork();

    pressNext();
    expect(openStepHeading()).toHaveTextContent('Job description');
    expect(openStepHeading()).toHaveFocus();
    expect(screen.getByText('Step 2 of 8')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
    expect(openStepHeading()).toHaveTextContent('Basic information');
    expect(screen.getByLabelText(/job title/i)).toHaveValue('Backend Engineer');
  });

  it('keeps the work in this browser and offers it back next time', async () => {
    const first = render(<VacancyRoutes path="/dashboard/jobs/new" />);
    fill(/job title/i, 'Backend Engineer');
    expect(await screen.findByText(/saved in this browser/i)).toBeInTheDocument();
    first.unmount();

    render(<VacancyRoutes path="/dashboard/jobs/new" />);
    expect(screen.getByLabelText(/job title/i)).toHaveValue('');
    await resumeWork();

    expect(screen.getByLabelText(/job title/i)).toHaveValue('Backend Engineer');
    expect(screen.getByText(/picked up where you left off/i)).toBeInTheDocument();
  });

  it('starts over when asked, forgetting the earlier work', async () => {
    leaveWork('requirements');
    render(<VacancyRoutes path="/dashboard/jobs/new" />);

    fireEvent.click(await screen.findByRole('button', { name: /start over/i }));

    expect(screen.queryByRole('button', { name: /^resume$/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/job title/i)).toHaveValue('');
    expect(vacancyDraftStore.read(NEW_VACANCY_DRAFT)).toBeNull();
  });

  it('files a draft once a template is chosen and Next pressed, then keeps updating that same draft in place', async () => {
    const user = userEvent.setup();
    const stored = makeVacancy({ id: 'v-9', status: 'DRAFT', version: 0, title: 'Backend Engineer' });
    api.create.mockResolvedValue(stored);
    api.update.mockResolvedValue({ ...stored, version: 1 });
    leaveWork('pipeline');
    render(<VacancyRoutes path="/dashboard/jobs/new" />);
    await resumeWork();

    await chooseTemplate(user, 'Engineering hiring');
    // Not mid-step: the template is fixed once filed, so it waits for Next.
    expect(api.create).not.toHaveBeenCalled();
    pressNext();

    await waitFor(() =>
      expect(api.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Backend Engineer', status: 'DRAFT', pipelineTemplateId: 'tpl-1' }),
      ),
    );
    await waitFor(() => expect(location()).toHaveTextContent('/dashboard/jobs/new?draft=v-9'));
    expect(await screen.findByText(/draft saved/i)).toBeInTheDocument();
    // The same form, still on the step it moved to.
    expect(openStepHeading()).toHaveTextContent('Ideal candidate matching');

    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
    // Filed, the template is fixed.
    expect(screen.getByRole('group', { name: /pipeline template/i })).toHaveTextContent('Engineering hiring');
    fill(/auto-advance threshold/i, '85');
    pressNext();

    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith('v-9', expect.objectContaining({ autoThreshold: 85, version: 0 })),
    );
    expect(api.create).toHaveBeenCalledTimes(1);
  });

  it('keeps the work when filing the draft fails, says why, and offers to retry', async () => {
    const user = userEvent.setup();
    api.create.mockRejectedValue(new AxiosError('Network Error'));
    leaveWork('pipeline');
    render(<VacancyRoutes path="/dashboard/jobs/new" />);
    await resumeWork();

    await chooseTemplate(user, 'Engineering hiring');
    pressNext();

    expect(await screen.findByText(/couldn't reach the server/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^retry$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/job title/i)).toHaveValue('Backend Engineer');
    expect(location()).toHaveTextContent(/^\/dashboard\/jobs\/new$/);
  });

  it('reads the vacancy back on the review, then publishes the draft it filed', async () => {
    const user = userEvent.setup();
    const stored = makeVacancy({ id: 'v-9', status: 'DRAFT', version: 0 });
    api.create.mockResolvedValue(stored);
    api.update.mockResolvedValue({ ...stored, version: 1 });
    api.publish.mockResolvedValue({ ...stored, version: 2, status: 'PUBLISHED', title: 'Backend Engineer' });
    api.get.mockResolvedValue(makeVacancy({ id: 'v-9', status: 'PUBLISHED' }));
    leaveWork('pipeline');
    render(<VacancyRoutes path="/dashboard/jobs/new" />);
    await resumeWork();

    await chooseTemplate(user, 'Engineering hiring');
    pressNext();
    await screen.findByText(/draft saved/i);
    pressNext();

    expect(openStepHeading()).toHaveTextContent(/review & publish/i);
    expect(screen.getByText(/everything is in place to publish/i)).toBeInTheDocument();
    const basics = screen.getByRole('region', { name: 'Basic information' });
    expect(within(basics).getByText('Backend Engineer')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Pipeline & screening' })).getByText('Engineering hiring')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /publish vacancy/i }));
    const dialog = await screen.findByRole('alertdialog', { name: /publish this vacancy/i });
    await user.click(within(dialog).getByRole('button', { name: /publish vacancy/i }));

    await waitFor(() => expect(api.publish).toHaveBeenCalledWith('v-9'));
    expect(api.create).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(location()).toHaveTextContent(/^\/dashboard\/jobs\/v-9$/));
    expect(vacancyDraftStore.read('v-9')).toBeNull();
  });

  it('asks before leaving with work entered, and keeping editing is safe', async () => {
    const user = userEvent.setup();
    render(<VacancyRoutes path="/dashboard/jobs/new" />);

    fill(/job title/i, 'Backend Engineer');
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    const dialog = await screen.findByRole('alertdialog', { name: /leave this vacancy/i });
    await user.click(within(dialog).getByRole('button', { name: /keep editing/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/job title/i)).toHaveValue('Backend Engineer');
  });

  it('keeps unfinished work in this browser when it is kept as a draft', async () => {
    const user = userEvent.setup();
    render(<VacancyRoutes path="/dashboard/jobs/new" />);

    fill(/job title/i, 'Backend Engineer');
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    const dialog = await screen.findByRole('alertdialog', { name: /leave this vacancy/i });
    expect(dialog).toHaveTextContent(/waits in this browser/i);
    await user.click(within(dialog).getByRole('button', { name: /keep as draft/i }));

    await waitFor(() => expect(location()).toHaveTextContent(/^\/dashboard\/jobs$/));
    expect(vacancyDraftStore.read(NEW_VACANCY_DRAFT)?.values.title).toBe('Backend Engineer');
    expect(api.create).not.toHaveBeenCalled();
  });

  it('throws the work away when it is discarded', async () => {
    const user = userEvent.setup();
    render(<VacancyRoutes path="/dashboard/jobs/new" />);

    fill(/job title/i, 'Backend Engineer');
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    const dialog = await screen.findByRole('alertdialog', { name: /leave this vacancy/i });
    await user.click(within(dialog).getByRole('button', { name: /^discard$/i }));

    await waitFor(() => expect(location()).toHaveTextContent(/^\/dashboard\/jobs$/));
    expect(vacancyDraftStore.read(NEW_VACANCY_DRAFT)).toBeNull();
  });

  it('leaves straight away when nothing has been entered', async () => {
    const user = userEvent.setup();
    render(<VacancyRoutes path="/dashboard/jobs/new" />);

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(location()).toHaveTextContent(/^\/dashboard\/jobs$/);
  });
});

/* --- Duplicate ---------------------------------------------------------- */

describe('duplicating a vacancy', () => {
  it('opens the form prefilled from the original, with a new title and no deadline', async () => {
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'CLOSED' }));
    render(<VacancyRoutes path="/dashboard/jobs/new?from=v-1" />);

    expect(await screen.findByText(/copied from/i)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('v-1');
    expect(screen.getByLabelText(/job title/i)).toHaveValue('Senior Backend Engineer (copy)');
    expect(screen.getByRole('heading', { name: /duplicate vacancy/i })).toBeInTheDocument();
    // Nothing is stored until the recruiter decides to.
    expect(api.create).not.toHaveBeenCalled();
  });
});

/* --- Edit --------------------------------------------------------------- */

describe('editing a vacancy', () => {
  it('opens with the stored values, and an untouched form leaves without asking', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'DRAFT' }));
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    expect(await screen.findByLabelText(/job title/i)).toHaveValue('Senior Backend Engineer');
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(location()).toHaveTextContent(/^\/dashboard\/jobs\/v-1$/);
  });

  it('validates a live vacancy in full before saving it', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'PUBLISHED' }));
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    expect(await screen.findByText(/saved changes appear on the candidate portal/i)).toBeInTheDocument();
    fill(/job title/i, '');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/still missing/i)).toBeInTheDocument();
    expect(api.update).not.toHaveBeenCalled();
  });

  it('saves a live vacancy against the version it was opened at', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'PUBLISHED', version: 3 }));
    api.update.mockResolvedValue(makeVacancy({ id: 'v-1', version: 4, title: 'Staff Engineer' }));
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    await screen.findByLabelText(/job title/i);
    fill(/job title/i, 'Staff Engineer');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith(
        'v-1',
        expect.objectContaining({ title: 'Staff Engineer', version: 3 }),
      ),
    );
    expect(api.update.mock.calls[0][1]).not.toHaveProperty('status');
  });

  it('tells the second of two editors that someone saved first', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'PUBLISHED' }));
    api.update.mockRejectedValue(httpError(409));
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    await screen.findByLabelText(/job title/i);
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/someone else saved changes/i)).toBeInTheDocument();
  });

  it('publishes a complete draft: saves it, then makes the move, after confirming', async () => {
    const user = userEvent.setup();
    const draft = makeVacancy({ id: 'v-1', status: 'DRAFT', version: 1 });
    api.get.mockResolvedValue(draft);
    api.update.mockResolvedValue({ ...draft, version: 2 });
    api.publish.mockResolvedValue({ ...draft, version: 3, status: 'PUBLISHED' });
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    await screen.findByLabelText(/job title/i);
    // Every step of a complete draft is open; the review is one click away.
    openStep(/review & publish/i);
    await user.click(screen.getByRole('button', { name: /publish vacancy/i }));
    const dialog = await screen.findByRole('alertdialog', { name: /publish this vacancy/i });
    await user.click(within(dialog).getByRole('button', { name: /publish vacancy/i }));

    await waitFor(() => expect(api.publish).toHaveBeenCalledWith('v-1'));
    expect(api.update).toHaveBeenCalledWith('v-1', expect.objectContaining({ version: 1 }));
    await waitFor(() => expect(location()).toHaveTextContent(/^\/dashboard\/jobs\/v-1$/));
  });

  it('reopens a section from the review with its Edit button', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'DRAFT', version: 1 }));
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    await screen.findByLabelText(/job title/i);
    openStep(/review & publish/i);
    await user.click(screen.getByRole('button', { name: 'Edit Candidate requirements' }));

    expect(openStepHeading()).toHaveTextContent('Candidate requirements');
  });

  it('saves a draft by itself as it is edited, against the version it was opened at', async () => {
    const draft = makeVacancy({ id: 'v-1', status: 'DRAFT', version: 1 });
    api.get.mockResolvedValue(draft);
    api.update.mockResolvedValue({ ...draft, version: 2 });
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    await screen.findByLabelText(/job title/i);
    fill(/job title/i, 'Staff Engineer');
    pressNext();

    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith('v-1', expect.objectContaining({ title: 'Staff Engineer', version: 1 })),
    );
    expect(await screen.findByText(/draft saved/i)).toBeInTheDocument();
  });

  it('never saves a live vacancy by itself: its saves go straight to candidates', async () => {
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'PUBLISHED', version: 3 }));
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    await screen.findByLabelText(/job title/i);
    fill(/job title/i, 'Staff Engineer');
    pressNext();
    await act(async () => {});

    expect(api.update).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('sends a closed vacancy back to its page instead of opening a form it cannot save', async () => {
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'CLOSED' }));
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    expect(await screen.findByText(/closed vacancies can't be edited/i)).toBeInTheDocument();
    expect(location()).toHaveTextContent(/^\/dashboard\/jobs\/v-1$/);
  });
});

/* --- List --------------------------------------------------------------- */

const draftIncomplete = makeVacancy({
  id: 'd1',
  title: 'Product Designer',
  status: 'DRAFT',
  jobSummary: '',
  createdAt: '2026-09-20T00:00:00Z',
});
const draftComplete = makeVacancy({ id: 'd2', title: 'QA Engineer', status: 'DRAFT', createdAt: '2026-09-15T00:00:00Z' });
const live = makeVacancy({ id: 'p1', title: 'Backend Engineer', status: 'PUBLISHED', createdAt: '2026-09-10T00:00:00Z' });
const closed = makeVacancy({ id: 'c1', title: 'Android Developer', status: 'CLOSED', createdAt: '2026-08-01T00:00:00Z' });
const archived = makeVacancy({ id: 'a1', title: 'Data Analyst', status: 'ARCHIVED', createdAt: '2026-07-01T00:00:00Z' });
const everyState: JobVacancyResponse[] = [draftIncomplete, draftComplete, live, closed, archived];

const row = (title: string) => screen.getByRole('article', { name: title });

describe('the vacancy list', () => {
  it('opens on an empty state rather than an invented example', async () => {
    render(<VacancyRoutes path="/dashboard/jobs" />);

    expect(await screen.findByText(/no vacancies yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create vacancy/i })).toHaveAttribute(
      'href',
      '/dashboard/jobs/new',
    );
  });

  it('says when the list could not be loaded, and retries on request', async () => {
    const user = userEvent.setup();
    api.list.mockRejectedValueOnce(new AxiosError('Network Error')).mockResolvedValueOnce([live]);
    render(<VacancyRoutes path="/dashboard/jobs" />);

    expect(await screen.findByText(/couldn't load your vacancies/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByRole('article', { name: 'Backend Engineer' })).toBeInTheDocument();
  });

  it('keeps archived vacancies out of All, and shows them under Archived', async () => {
    const user = userEvent.setup();
    api.list.mockResolvedValue(everyState);
    render(<VacancyRoutes path="/dashboard/jobs" />);

    await screen.findByRole('article', { name: 'Backend Engineer' });
    expect(screen.queryByRole('article', { name: 'Data Analyst' })).not.toBeInTheDocument();

    // antd hides the real input behind its button skin; the label is what a
    // person clicks.
    await user.click(screen.getByRole('radio', { name: /archived/i }).closest('label') as HTMLElement);

    expect(screen.getByRole('article', { name: 'Data Analyst' })).toBeInTheDocument();
    expect(location()).toHaveTextContent('/dashboard/jobs?status=archived');
  });

  it('shows no applicant figures, because none exist yet', async () => {
    api.list.mockResolvedValue([live]);
    render(<VacancyRoutes path="/dashboard/jobs" />);

    expect(await within(await screen.findByRole('article', { name: 'Backend Engineer' })).findByText(/not connected yet/i)).toBeInTheDocument();
  });

  it('offers a live vacancy only the moves its state allows', async () => {
    const user = userEvent.setup();
    api.list.mockResolvedValue([live]);
    render(<VacancyRoutes path="/dashboard/jobs" />);

    await screen.findByRole('article', { name: 'Backend Engineer' });
    await user.click(screen.getByRole('button', { name: /more actions for backend engineer/i }));

    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: /duplicate/i })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: /close vacancy/i })).toBeInTheDocument();
    expect(within(menu).queryByRole('menuitem', { name: /archive/i })).not.toBeInTheDocument();
    expect(within(menu).queryByRole('menuitem', { name: /publish/i })).not.toBeInTheDocument();
  });

  it('publishes a complete draft after confirming, and shows the server’s answer', async () => {
    const user = userEvent.setup();
    api.list.mockResolvedValue([draftComplete]);
    api.publish.mockResolvedValue({ ...draftComplete, status: 'PUBLISHED' });
    render(<VacancyRoutes path="/dashboard/jobs" />);

    await screen.findByRole('article', { name: 'QA Engineer' });
    await user.click(screen.getByRole('button', { name: /publish qa engineer/i }));

    const dialog = await screen.findByRole('alertdialog', { name: /publish this vacancy/i });
    // Focus starts on the safe choice.
    expect(within(dialog).getByRole('button', { name: /cancel/i })).toHaveFocus();
    await user.click(within(dialog).getByRole('button', { name: /publish vacancy/i }));

    expect(api.publish).toHaveBeenCalledWith('d2');
    expect(await screen.findByText(/qa engineer is live on the candidate portal/i)).toBeInTheDocument();
    expect(within(row('QA Engineer')).getByText('Published')).toBeInTheDocument();
  });

  it('will not offer to publish an incomplete draft, and says what is missing', async () => {
    const user = userEvent.setup();
    api.list.mockResolvedValue([draftIncomplete]);
    render(<VacancyRoutes path="/dashboard/jobs" />);

    await screen.findByRole('article', { name: 'Product Designer' });
    await user.click(screen.getByRole('button', { name: /publish product designer/i }));

    const dialog = await screen.findByRole('alertdialog', { name: /finish this draft first/i });
    expect(dialog).toHaveTextContent(/job summary/i);
    expect(within(dialog).queryByRole('button', { name: /publish/i })).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /complete draft/i }));
    expect(api.publish).not.toHaveBeenCalled();
    expect(location()).toHaveTextContent('/dashboard/jobs/d1/edit');
  });

  it('closes a live vacancy only after a confirmation that names the consequence', async () => {
    const user = userEvent.setup();
    api.list.mockResolvedValue([live]);
    api.close.mockResolvedValue({ ...live, status: 'CLOSED' });
    render(<VacancyRoutes path="/dashboard/jobs" />);

    await screen.findByRole('article', { name: 'Backend Engineer' });
    await user.click(screen.getByRole('button', { name: /more actions for backend engineer/i }));
    await user.click(await screen.findByRole('menuitem', { name: /close vacancy/i }));

    const dialog = await screen.findByRole('alertdialog', { name: /close this vacancy/i });
    expect(dialog).toHaveTextContent(/stop accepting new applications/i);
    await user.click(within(dialog).getByRole('button', { name: /close vacancy/i }));

    expect(api.close).toHaveBeenCalledWith('p1');
    expect(await screen.findByText(/backend engineer is closed/i)).toBeInTheDocument();
  });

  it('reports a failed move honestly and offers to try again', async () => {
    const user = userEvent.setup();
    api.list.mockResolvedValue([closed]);
    api.archive.mockRejectedValue(httpError(500));
    render(<VacancyRoutes path="/dashboard/jobs" />);

    await screen.findByRole('article', { name: 'Android Developer' });
    await user.click(screen.getByRole('button', { name: /more actions for android developer/i }));
    await user.click(await screen.findByRole('menuitem', { name: /archive/i }));
    const dialog = await screen.findByRole('alertdialog', { name: /archive this vacancy/i });
    await user.click(within(dialog).getByRole('button', { name: /archive vacancy/i }));

    expect(await screen.findByText(/something went wrong archiving/i)).toBeInTheDocument();
    expect(within(row('Android Developer')).getByText('Closed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('duplicates by opening a prefilled form, not by filing a copy', async () => {
    const user = userEvent.setup();
    api.list.mockResolvedValue([closed]);
    render(<VacancyRoutes path="/dashboard/jobs" />);

    await screen.findByRole('article', { name: 'Android Developer' });
    await user.click(screen.getByRole('button', { name: /more actions for android developer/i }));
    await user.click(await screen.findByRole('menuitem', { name: /duplicate/i }));

    expect(location()).toHaveTextContent('/dashboard/jobs/new?from=c1');
    expect(api.create).not.toHaveBeenCalled();
  });
});

/* --- Detail ------------------------------------------------------------- */

describe('a vacancy’s page', () => {
  it('says so when the vacancy does not exist in this workspace', async () => {
    api.get.mockRejectedValue(httpError(404, 'Vacancy not found'));
    render(<VacancyRoutes path="/dashboard/jobs/nope" />);

    expect(await screen.findByText(/doesn't exist or was removed/i)).toBeInTheDocument();
  });

  it('shows where the vacancy stands, without inventing applicant numbers', async () => {
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'PUBLISHED' }));
    render(<VacancyRoutes path="/dashboard/jobs/v-1" />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Senior Backend Engineer' })).toBeInTheDocument();
    const lifecycle = screen.getByRole('list', { name: /vacancy lifecycle/i });
    expect(within(lifecycle).getByText('Published').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText(/not connected yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit vacancy/i })).toBeInTheDocument();
  });

  it('points an incomplete draft at the sections that still need work', async () => {
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'DRAFT', requiredSkills: [] }));
    render(<VacancyRoutes path="/dashboard/jobs/v-1" />);

    const link = await screen.findByRole('link', { name: /candidate requirements/i });
    expect(link).toHaveAttribute('href', '/dashboard/jobs/v-1/edit#requirements');
  });
});

/* --- Pipeline & screening ------------------------------------------------ */

describe('choosing a pipeline for a new vacancy', () => {
  it('offers the company’s active templates, and prefills the screening settings from the one chosen', async () => {
    const user = userEvent.setup();
    leaveWork('pipeline');
    render(<VacancyRoutes path="/dashboard/jobs/new" />);
    await resumeWork();

    await user.click(await templatePicker());
    expect(await screen.findByTitle('Engineering hiring · 4 stages · 1 interview round')).toBeInTheDocument();
    await user.click(screen.getByTitle('Sales hiring · 5 stages · 2 interview rounds'));

    expect(screen.getByLabelText(/auto-advance threshold/i)).toHaveValue('90');
    expect(screen.getByLabelText(/manual-review threshold/i)).toHaveValue('60');
    expect(screen.getByRole('switch', { name: /blind screening/i })).toBeChecked();
    expect(screen.getByText(/defaults from sales hiring/i)).toBeInTheDocument();
    expect(templatesApi.list).toHaveBeenCalledWith({ search: '', includeArchived: false });
  });

  it('will not move on, or file anything, without a template', async () => {
    const user = userEvent.setup();
    leaveWork('pipeline');
    render(<VacancyRoutes path="/dashboard/jobs/new" />);
    await resumeWork();
    await templatePicker();

    pressNext();
    expect(await screen.findByText('Pipeline template is required.')).toBeInTheDocument();
    expect(openStepHeading()).toHaveTextContent('Pipeline & screening');

    // Kept as a draft, it can only wait in this browser.
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    const dialog = await screen.findByRole('alertdialog', { name: /leave this vacancy/i });
    await user.click(within(dialog).getByRole('button', { name: /keep as draft/i }));
    await waitFor(() => expect(location()).toHaveTextContent(/^\/dashboard\/jobs$/));
    expect(api.create).not.toHaveBeenCalled();
  });

  it('says so when the workspace has no templates, pointing an admin at the template editor', async () => {
    templatesApi.list.mockResolvedValue([]);
    leaveWork('pipeline');
    render(<VacancyRoutes path="/dashboard/jobs/new" />);
    await resumeWork();

    expect(await screen.findByRole('link', { name: /create a pipeline template/i })).toHaveAttribute(
      'href',
      '/dashboard/pipeline-templates/new',
    );
  });

  it('tells someone who cannot make templates who can', async () => {
    setAuth({ user: makeUser({ role: 'HR_MANAGER' }), initializing: false });
    templatesApi.list.mockResolvedValue([]);
    render(<VacancyRoutes path="/dashboard/jobs/new" />);

    expect(await screen.findByText(/ask a workspace admin to create a pipeline template/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /create a pipeline template/i })).not.toBeInTheDocument();
  });

  it('keeps a duplicate as a draft on the original’s template, with the original’s settings', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', autoThreshold: 85, manualThreshold: 65 }));
    api.create.mockResolvedValue(makeVacancy({ id: 'v-2', status: 'DRAFT' }));
    render(<VacancyRoutes path="/dashboard/jobs/new?from=v-1" />);

    await templatePicker();
    expect(screen.getByLabelText(/auto-advance threshold/i)).toHaveValue('85');
    fill(/job title/i, 'Platform Engineer');
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    const dialog = await screen.findByRole('alertdialog', { name: /leave this vacancy/i });
    await user.click(within(dialog).getByRole('button', { name: /keep as draft/i }));

    await waitFor(() =>
      expect(api.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Platform Engineer',
          pipelineTemplateId: 'tpl-1',
          autoThreshold: 85,
          manualThreshold: 65,
          blindModeEnabled: false,
          status: 'DRAFT',
        }),
      ),
    );
  });

  it('drops a duplicate’s template once it is no longer available, and says so', async () => {
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', pipelineTemplateId: 'tpl-archived' }));
    render(<VacancyRoutes path="/dashboard/jobs/new?from=v-1" />);

    expect(await screen.findByText(/original's pipeline template is no longer available/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/auto-advance threshold/i)).not.toBeInTheDocument();
  });
});

describe('the pipeline rules a form is held to', () => {
  it('counts the template among the required fields of a new vacancy, and marks it required', async () => {
    const user = userEvent.setup();
    render(<VacancyRoutes path="/dashboard/jobs/new" />);

    const counter = () => screen.getByText(/of \d+ required fields complete/i).textContent ?? '';
    await templatePicker();
    expect(counter()).toMatch(/of 12 required fields complete/);
    const before = Number.parseInt(counter(), 10);
    expect(screen.getByText('Pipeline template', { selector: 'label' })).toHaveTextContent('(required)');

    await chooseTemplate(user, 'Engineering hiring');

    expect(Number.parseInt(counter(), 10)).toBe(before + 1);
  });

  it('does not count a template on an edit, where it is already fixed', async () => {
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'PUBLISHED' }));
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    expect(await screen.findByText(/of 11 required fields complete/i)).toBeInTheDocument();
  });

  it('says the template is gone when creating answers 404, not that the vacancy is', async () => {
    const user = userEvent.setup();
    api.create.mockRejectedValue(httpError(404, 'Pipeline template not found'));
    leaveWork('pipeline');
    render(<VacancyRoutes path="/dashboard/jobs/new" />);
    await resumeWork();

    await chooseTemplate(user, 'Engineering hiring');
    pressNext();

    expect(await screen.findByText(/pipeline template you chose no longer exists/i)).toBeInTheDocument();
    expect(screen.queryByText(/this vacancy no longer exists/i)).not.toBeInTheDocument();
  });

  it('clears “manual below auto” when the auto threshold is raised, not only when manual changes', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'PUBLISHED' }));
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    await screen.findByLabelText(/manual-review threshold/i);
    fill(/manual-review threshold/i, '90');
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(
      await screen.findByText('The manual threshold must be lower than the auto threshold.'),
    ).toBeInTheDocument();

    fill(/auto-advance threshold/i, '95');

    await waitFor(() =>
      expect(screen.queryByText('The manual threshold must be lower than the auto threshold.')).not.toBeInTheDocument(),
    );
  });

  it('neither saves nor moves on with thresholds the server would refuse', async () => {
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'DRAFT' }));
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    await screen.findByLabelText(/manual-review threshold/i);
    openStep(/pipeline & screening/i);
    fill(/manual-review threshold/i, '90');
    pressNext();

    expect(await screen.findByText(/fill in the marked fields to continue/i)).toBeInTheDocument();
    expect(screen.getByText('The manual threshold must be lower than the auto threshold.')).toBeInTheDocument();
    expect(openStepHeading()).toHaveTextContent('Pipeline & screening');
    expect(api.update).not.toHaveBeenCalled();
  });
});

describe('the pipeline of a stored vacancy', () => {
  it('shows the template as a fixed badge rather than a picker', async () => {
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'DRAFT' }));
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    await screen.findByLabelText(/job title/i);
    openStep(/pipeline & screening/i);
    const badge = screen.getByRole('group', { name: /pipeline template/i });
    expect(badge).toHaveTextContent('Engineering hiring');
    expect(badge).toHaveTextContent(/fixed when the vacancy was created/i);
    expect(screen.queryByRole('combobox', { name: /pipeline template/i })).not.toBeInTheDocument();
    expect(templatesApi.list).not.toHaveBeenCalled();
  });

  it('saves new thresholds against the stored version, and never sends the template', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'PUBLISHED', version: 3 }));
    api.update.mockResolvedValue(makeVacancy({ id: 'v-1', version: 4, autoThreshold: 85, manualThreshold: 65 }));
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    await screen.findByLabelText(/auto-advance threshold/i);
    openStep(/pipeline & screening/i);
    fill(/auto-advance threshold/i, '85');
    fill(/manual-review threshold/i, '65');
    await user.click(screen.getByRole('switch', { name: /blind screening/i }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith(
        'v-1',
        expect.objectContaining({ autoThreshold: 85, manualThreshold: 65, blindModeEnabled: true, version: 3 }),
      ),
    );
    expect(api.update.mock.calls[0][1]).not.toHaveProperty('pipelineTemplateId');
  });

  it('refuses a manual threshold that is not below the auto one, before sending anything', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'PUBLISHED' }));
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    await screen.findByLabelText(/manual-review threshold/i);
    fill(/manual-review threshold/i, '90');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(
      await screen.findByText('The manual threshold must be lower than the auto threshold.'),
    ).toBeInTheDocument();
    expect(api.update).not.toHaveBeenCalled();
  });

  it('shows the server’s refusal as written', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'PUBLISHED' }));
    api.update.mockRejectedValue(httpError(422, 'The pipeline template cannot be changed after a job is created.'));
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    await screen.findByLabelText(/auto-advance threshold/i);
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(
      await screen.findByText('The pipeline template cannot be changed after a job is created.'),
    ).toBeInTheDocument();
  });

  it('keeps a vacancy whose template was deleted on its own copy', async () => {
    api.get.mockResolvedValue(
      makeVacancy({ id: 'v-1', status: 'DRAFT', pipelineTemplateId: null, pipelineTemplateName: null }),
    );
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    expect(await screen.findByText(/template deleted — this vacancy keeps its own copy/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/auto-advance threshold/i)).toHaveValue('80');
  });

  it('explains a vacancy older than templates, and sends no screening settings for it', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(makeVacancyWithoutPipeline({ id: 'v-1', status: 'PUBLISHED' }));
    api.update.mockResolvedValue(makeVacancyWithoutPipeline({ id: 'v-1', version: 1 }));
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    expect(await screen.findByText(/created before pipeline templates/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/auto-advance threshold/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith(
        'v-1',
        expect.objectContaining({ autoThreshold: null, manualThreshold: null, blindModeEnabled: null }),
      ),
    );
  });

  it('is described on the vacancy’s page', async () => {
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'PUBLISHED', blindModeEnabled: true }));
    render(<VacancyRoutes path="/dashboard/jobs/v-1" />);

    const fact = async (term: string) =>
      (await screen.findByText(term, { selector: 'dt' })).nextElementSibling?.textContent;
    expect(await fact('Pipeline template')).toBe('Engineering hiring');
    expect(await fact('Stages')).toBe('4 stages · 1 interview round');
    expect(await fact('Auto-advance threshold')).toBe('80');
    expect(await fact('Manual-review threshold')).toBe('70');
    expect(await fact('Blind screening')).toBe('On');
  });

  it('is left off the page of a vacancy older than templates', async () => {
    api.get.mockResolvedValue(makeVacancyWithoutPipeline({ id: 'v-1', status: 'PUBLISHED' }));
    render(<VacancyRoutes path="/dashboard/jobs/v-1" />);

    await screen.findByRole('heading', { level: 1, name: 'Senior Backend Engineer' });
    expect(screen.queryByText('Pipeline & screening')).not.toBeInTheDocument();
  });
});

/* --- Company roles, industries and AI switches --------------------------- */

const person = (id: string, firstName: string, lastName: string, roleName: string) => ({
  id,
  firstName,
  lastName,
  email: `${firstName.toLowerCase()}@acme.test`,
  roleName,
  status: 'ACTIVE',
});

describe('the industry a vacancy is filed under', () => {
  it('offers the company industries and sends the one chosen', async () => {
    profileSaved.industry = 'Information Technology';
    profileSaved.additionalIndustries = ['Financial Services'];
    api.create.mockResolvedValue(makeVacancy({ id: 'v-9', status: 'DRAFT' }));
    const user = userEvent.setup();
    leaveWork('basics');
    render(<VacancyRoutes path="/dashboard/jobs/new" />);
    await resumeWork();

    await user.click(screen.getByLabelText(/^industry/i));
    expect(await screen.findByTitle('Information Technology · main')).toBeInTheDocument();
    await user.click(screen.getByTitle('Financial Services'));
    openStep(/pipeline & screening/i);
    await chooseTemplate(user, 'Engineering hiring');
    pressNext();

    await waitFor(() => expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ industry: 'Financial Services' })));
  });

  it('is shown among the basic information of the vacancy', async () => {
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'PUBLISHED', industry: 'Information Technology' }));
    render(<VacancyRoutes path="/dashboard/jobs/v-1" />);

    const term = await screen.findByText('Industry', { selector: 'dt' });
    expect(term.nextElementSibling).toHaveTextContent('Information Technology');
  });

  it('leaves the choice to the server when nothing is picked, and has no field without industries', async () => {
    api.create.mockResolvedValue(makeVacancy({ id: 'v-9', status: 'DRAFT' }));
    const user = userEvent.setup();
    leaveWork('pipeline');
    render(<VacancyRoutes path="/dashboard/jobs/new" />);

    expect(screen.queryByLabelText(/^industry/i)).toBeNull();
    await resumeWork();
    await chooseTemplate(user, 'Engineering hiring');
    pressNext();

    await waitFor(() => expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ industry: null })));
  });
});

describe('only the vacancies I work on', () => {
  it('asks the server for them, and keeps the choice in the address', async () => {
    api.list.mockResolvedValue([makeVacancy({ id: 'v-1', status: 'PUBLISHED' })]);
    const user = userEvent.setup();
    render(<VacancyRoutes path="/dashboard/jobs" />);

    await user.click(await screen.findByRole('switch', { name: /only mine/i }));

    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith({ assignedTo: 'me' }));
    expect(location()).toHaveTextContent('mine=1');
  });

  it('says so when nothing is assigned to you', async () => {
    api.list.mockResolvedValue([]);
    render(<VacancyRoutes path="/dashboard/jobs?mine=1" />);

    expect(await screen.findByText('Nothing is assigned to you yet')).toBeInTheDocument();
  });

  it('is not offered to someone who only sees their own vacancies already', async () => {
    setAuth({ user: makeUser({ role: 'CUSTOM', roleId: 'r-x', permissions: ['jobs.manage'] }), initializing: false });
    api.list.mockResolvedValue([makeVacancy({ id: 'v-1', status: 'PUBLISHED' })]);
    render(<VacancyRoutes path="/dashboard/jobs" />);

    expect(await screen.findByText(/the roles you work on/i)).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /only mine/i })).toBeNull();
  });
});

describe('who works on a vacancy', () => {
  it('names the recruiter, the hiring manager and the team', async () => {
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'PUBLISHED' }));
    api.hiringTeam.mockResolvedValue({
      vacancyId: 'v-1',
      recruiter: person('u-2', 'Kasun', 'Silva', 'Recruiter'),
      hiringManager: null,
      members: [person('u-3', 'Amaya', 'Perera', 'Interviewer')],
    });
    render(<VacancyRoutes path="/dashboard/jobs/v-1" />);

    expect(await screen.findByText('Kasun Silva')).toBeInTheDocument();
    expect(screen.getByText('Not assigned')).toBeInTheDocument();
    expect(screen.getByText('Amaya Perera')).toBeInTheDocument();
  });

  it('replaces the team with the people chosen', async () => {
    team.activeMembers = [
      { ...person('u-3', 'Amaya', 'Perera', 'Interviewer'), role: 'INTERVIEWER', tenantId: 't-1', createdAt: '' },
      { ...person('u-4', 'Nimal', 'Fernando', 'Interviewer'), role: 'INTERVIEWER', tenantId: 't-1', createdAt: '' },
    ];
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'PUBLISHED' }));
    api.replaceHiringTeam.mockResolvedValue({
      vacancyId: 'v-1',
      recruiter: null,
      hiringManager: null,
      members: [person('u-4', 'Nimal', 'Fernando', 'Interviewer')],
    });
    const user = userEvent.setup();
    render(<VacancyRoutes path="/dashboard/jobs/v-1" />);

    await user.click(await screen.findByRole('button', { name: /^edit$/i }));
    const dialog = await screen.findByRole('dialog', { name: /hiring team/i });
    await user.click(within(dialog).getByLabelText('People'));
    await user.click(await screen.findByTitle('Nimal Fernando · Interviewer'));
    await user.click(within(dialog).getByRole('button', { name: /save team/i }));

    expect(api.replaceHiringTeam).toHaveBeenCalledWith('v-1', ['u-4']);
    expect(await screen.findByText('Nimal Fernando')).toBeInTheDocument();
  });
});

describe('who created a vacancy', () => {
  it('is named on its page by the server, even for a role that cannot read the team list', async () => {
    // No team roster at all, as for an HR manager without team.view.
    team.activeMembers = [];
    api.get.mockResolvedValue(
      makeVacancy({ id: 'v-1', status: 'PUBLISHED', createdBy: 'u-3', createdByName: 'Amaya Perera' }),
    );
    render(<VacancyRoutes path="/dashboard/jobs/v-1" />);

    expect(await screen.findByText('by Amaya Perera', { exact: false })).toBeInTheDocument();
  });

  it('is named in the vacancy list and on the edit page', async () => {
    const vacancy = makeVacancy({ id: 'v-1', status: 'DRAFT', createdBy: 'u-3', createdByName: 'Amaya Perera' });
    api.list.mockResolvedValue([vacancy]);
    const { unmount } = render(<VacancyRoutes path="/dashboard/jobs" />);
    expect(await screen.findByText(/Created by Amaya Perera/)).toBeInTheDocument();
    unmount();

    api.get.mockResolvedValue(vacancy);
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);
    expect(await screen.findByText('Amaya Perera')).toBeInTheDocument();
    expect(screen.getByText(/Created by/)).toBeInTheDocument();
  });

  it('names the person filling in a new vacancy as its creator', async () => {
    setAuth({ user: makeUser({ firstName: 'Nimal', lastName: 'Silva' }), initializing: false });
    render(<VacancyRoutes path="/dashboard/jobs/new" />);

    expect(await screen.findByText('Nimal Silva (you)')).toBeInTheDocument();
  });

  it('says "You" for the signed-in member, and nothing for someone unknown', async () => {
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'PUBLISHED', createdBy: 'u-1' }));
    const { unmount } = render(<VacancyRoutes path="/dashboard/jobs/v-1" />);
    expect(await screen.findByText('by You', { exact: false })).toBeInTheDocument();
    unmount();

    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'PUBLISHED', createdBy: 'u-gone' }));
    render(<VacancyRoutes path="/dashboard/jobs/v-1" />);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByText(/^by /)).toBeNull();
  });
});

describe('interview panels', () => {
  const ada = { id: 'u-ada', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@acme.test', roleName: 'Interviewer', status: 'ACTIVE' };
  const grace = { id: 'u-grace', firstName: 'Grace', lastName: 'Hopper', email: 'grace@acme.test', roleName: 'Owner', status: 'ACTIVE' };
  const round = (interviewerCount: number | null, interviewers: (typeof ada)[]) => ({
    stageId: 's-2',
    position: 2,
    name: 'Technical interview',
    benchmark: 70,
    interviewerCount,
    interviewers,
  });

  it('holds Publish until every round has exactly its interviewers, and names the round', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'DRAFT', version: 1 }));
    api.interviewPanels.mockResolvedValue([round(2, [ada])]);
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    await screen.findByLabelText(/job title/i);
    // The review stays out of reach while a round is short.
    expect(stepButton(/review & publish/i)).toBeDisabled();
    openStep(/pipeline & screening/i);
    await user.click(screen.getByRole('button', { name: /^next/i }));

    expect(await screen.findByText('Technical interview needs 2 interviewers, 1 chosen.')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog', { name: /publish this vacancy/i })).not.toBeInTheDocument();
    expect(api.update).not.toHaveBeenCalled();
  });

  it('saves a draft with a round still short, sending the panel as it stands', async () => {
    const user = userEvent.setup();
    const draft = makeVacancy({ id: 'v-1', status: 'DRAFT', version: 1 });
    api.get.mockResolvedValue(draft);
    api.update.mockResolvedValue({ ...draft, version: 2 });
    api.interviewPanels.mockResolvedValue([round(2, [ada])]);
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    await screen.findByLabelText(/job title/i);
    fill(/job title/i, 'Staff Engineer');
    await user.click(screen.getByRole('button', { name: /^next/i }));

    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith(
        'v-1',
        expect.objectContaining({
          interviewPanels: [{ stagePosition: 2, interviewerCount: 2, interviewerIds: ['u-ada'] }],
        }),
      ),
    );
  });

  it('asks for the number first, then searches the company from the first letter typed', async () => {
    const user = userEvent.setup();
    const draft = makeVacancy({ id: 'v-1', status: 'DRAFT', version: 1 });
    api.get.mockResolvedValue(draft);
    api.update.mockResolvedValue({ ...draft, version: 2 });
    api.interviewPanels.mockResolvedValue([round(null, [])]);
    api.searchAssignableMembers.mockResolvedValue([grace]);
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    const picker = await screen.findByLabelText('Interviewers for Technical interview');
    openStep(/pipeline & screening/i);
    expect(picker).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Number of interviewers'), { target: { value: '1' } });
    await waitFor(() => expect(screen.getByLabelText('Interviewers for Technical interview')).not.toBeDisabled());

    await user.click(screen.getByLabelText('Interviewers for Technical interview'));
    await user.keyboard('g');
    await waitFor(() => expect(api.searchAssignableMembers).toHaveBeenCalledWith('g'));
    await user.click(await screen.findByText('Grace Hopper'));

    await user.click(screen.getByRole('button', { name: /^back$/i }));
    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith(
        'v-1',
        expect.objectContaining({
          interviewPanels: [{ stagePosition: 2, interviewerCount: 1, interviewerIds: ['u-grace'] }],
        }),
      ),
    );
  });

  it('never fills a panel past its number: lowering it shows what to take off', async () => {
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'DRAFT', version: 1 }));
    api.interviewPanels.mockResolvedValue([round(2, [ada, grace])]);
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    fireEvent.change(await screen.findByLabelText('Number of interviewers'), { target: { value: '1' } });

    expect(
      await screen.findByText(
        'Technical interview has 2 interviewers but needs only 1. Remove some or raise the number.',
      ),
    ).toBeInTheDocument();
    // Both stay chosen until someone decides which one goes.
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
  });

  it('reads a new vacancy’s rounds from the template it is created on', async () => {
    const user = userEvent.setup();
    templatesApi.get.mockImplementation(async (id: string) => ({
      ...engineering,
      id,
      stages: [
        { id: 's-0', position: 0, stageType: 'POST_APPLICATION', name: 'Applied', benchmark: null },
        { id: 's-2', position: 2, stageType: 'INTERVIEW', name: 'Technical interview', benchmark: 70 },
        { id: 's-3', position: 3, stageType: 'ONBOARD', name: 'Onboard', benchmark: null },
      ],
    }));
    leaveWork('pipeline');
    render(<VacancyRoutes path="/dashboard/jobs/new" />);
    await resumeWork();

    await chooseTemplate(user, 'Engineering hiring');

    expect(await screen.findByLabelText('Interviewers for Technical interview')).toBeDisabled();
    expect(templatesApi.get).toHaveBeenCalledWith(engineering.id);
    expect(screen.getByText('Not staffed yet')).toBeInTheDocument();
  });

  it('lists each round and who runs it on the vacancy’s page', async () => {
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'PUBLISHED' }));
    api.interviewPanels.mockResolvedValue([round(1, [ada])]);
    render(<VacancyRoutes path="/dashboard/jobs/v-1" />);

    expect(await screen.findByRole('heading', { name: 'Interview panels' })).toBeInTheDocument();
    expect(await screen.findByText('Technical interview')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('1 of 1')).toBeInTheDocument();
  });
});

describe('ideal candidate matching', () => {
  const offered = { ...noMatching, available: true };
  const draftWith = (overrides: Partial<JobVacancyResponse> = {}) =>
    makeVacancy({
      id: 'v-1',
      status: 'DRAFT',
      version: 1,
      requiredSkills: ['Java'],
      preferredSkills: ['Kafka'],
      toolsAndTechnologies: ['Docker'],
      minimumExperienceYears: 3,
      education: 'Bachelor’s degree',
      certifications: ['AWS Solutions Architect'],
      idealMatchingAvailable: true,
      ...overrides,
    });

  /** Opens the matching step once the form is in. */
  async function openMatching() {
    await screen.findByLabelText(/job title/i);
    openStep(/ideal candidate matching/i);
  }

  it('switching it on loads the skills, tools and experience from candidate requirements', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(draftWith());
    api.idealMatching.mockResolvedValue(offered);
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    await openMatching();
    await user.click(screen.getByRole('switch', { name: 'Use ideal candidate matching' }));

    expect(screen.getByLabelText('Weight for Java')).toBeInTheDocument();
    expect(screen.getByLabelText('Weight for Kafka')).toBeInTheDocument();
    expect(screen.getByLabelText('Weight for Docker')).toBeInTheDocument();
    expect(screen.getByLabelText('Weight for Relevant experience')).toBeInTheDocument();
    expect(screen.getByText('Minimum 3 years (from Candidate requirements).')).toBeInTheDocument();
    // Certifications come along as nice-to-haves, outside the 100%.
    expect(screen.getByText('Not part of the 100%')).toBeInTheDocument();
  });

  it('evens the weights out to 100% and saves the profile with the draft', async () => {
    const user = userEvent.setup();
    const draft = draftWith();
    api.get.mockResolvedValue(draft);
    api.update.mockResolvedValue({ ...draft, version: 2 });
    api.idealMatching.mockResolvedValue(offered);
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    await openMatching();
    await user.click(screen.getByRole('switch', { name: 'Use ideal candidate matching' }));
    await user.click(screen.getByRole('button', { name: 'Even out weights' }));
    expect(screen.getByText('The weights total 100%.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^back$/i }));
    await waitFor(() => expect(api.update).toHaveBeenCalled());
    const sent = api.update.mock.calls[0][1].idealMatching;
    expect(sent.enabled).toBe(true);
    expect(sent.criteria.map((c: { name: string; weightPercent: number }) => [c.name, c.weightPercent])).toEqual([
      ['Java', 25],
      ['Kafka', 25],
      ['Docker', 25],
      ['Relevant experience', 25],
    ]);
    expect(sent.niceToHaveCertifications).toEqual(['AWS Solutions Architect']);
  });

  it('holds Publish until the weights total exactly 100%, and says so', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(draftWith());
    api.idealMatching.mockResolvedValue({
      ...offered,
      enabled: true,
      criteria: [{ id: 'c1', category: 'TECHNICAL_SKILL', name: 'Java', weightPercent: 60, requirement: 'MUST_HAVE', position: 0 }],
      totalWeightPercent: 60,
    });
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    await screen.findByLabelText('Weight for Java');
    openStep(/ideal candidate matching/i);
    await user.click(screen.getByRole('button', { name: /^next/i }));

    expect(
      await screen.findByText('The ideal candidate weights add up to 60%; they need to total 100%.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog', { name: /publish this vacancy/i })).not.toBeInTheDocument();
    expect(api.update).not.toHaveBeenCalled();
  });

  it('adds and removes rows, and refuses a name already weighted', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(draftWith());
    api.idealMatching.mockResolvedValue(offered);
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);
    await openMatching();
    await user.click(screen.getByRole('switch', { name: 'Use ideal candidate matching' }));

    await user.click(screen.getByRole('button', { name: 'Remove Kafka' }));
    expect(screen.queryByLabelText('Weight for Kafka')).not.toBeInTheDocument();
    // Removed, it is offered again rather than coming back by itself.
    expect(screen.getByRole('button', { name: 'Add Kafka' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Add a tool'), 'Jenkins{Enter}');
    expect(screen.getByLabelText('Weight for Jenkins')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Add a tool'), 'docker{Enter}');
    expect(screen.getByText('docker is already weighted.')).toBeInTheDocument();
  });

  it('asks for degree types only when the education asked for is a degree', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(draftWith({ education: 'Higher secondary (A/L)' }));
    api.idealMatching.mockResolvedValue(offered);
    const { unmount } = render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);
    await openMatching();
    await user.click(screen.getByRole('switch', { name: 'Use ideal candidate matching' }));
    expect(screen.queryByLabelText(/accepted degree types/i)).not.toBeInTheDocument();
    expect(screen.getByText(/choose a degree \(diploma or higher\)/i)).toBeInTheDocument();
    unmount();

    api.get.mockResolvedValue(draftWith());
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);
    await openMatching();
    await user.click(screen.getByRole('switch', { name: 'Use ideal candidate matching' }));
    expect(screen.getByLabelText(/accepted degree types/i)).toBeInTheDocument();
  });

  it('explains when the pipeline template does not offer it', async () => {
    api.get.mockResolvedValue(draftWith({ idealMatchingAvailable: false }));
    render(<VacancyRoutes path="/dashboard/jobs/v-1/edit" />);

    expect(await screen.findByText(/doesn’t offer ideal candidate matching/i)).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Use ideal candidate matching' })).not.toBeInTheDocument();
  });

  it('summarises the profile on the vacancy’s page', async () => {
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'PUBLISHED' }));
    api.idealMatching.mockResolvedValue({
      ...offered,
      enabled: true,
      criteria: [
        { id: 'c1', category: 'TECHNICAL_SKILL', name: 'Java', weightPercent: 60, requirement: 'MUST_HAVE', position: 0 },
        { id: 'c2', category: 'TOOL', name: 'Docker', weightPercent: 40, requirement: 'PREFERRED', position: 1 },
      ],
      totalWeightPercent: 100,
      degreeTypes: ['Computer Science'],
    });
    render(<VacancyRoutes path="/dashboard/jobs/v-1" />);

    expect(await screen.findByRole('heading', { name: 'Ideal candidate' })).toBeInTheDocument();
    expect(await screen.findByText('60%')).toBeInTheDocument();
    expect(screen.getByText('Must-have')).toBeInTheDocument();
    expect(screen.getByText(/Computer Science/)).toBeInTheDocument();
  });

  it('shows the tools among the vacancy’s requirements', async () => {
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'PUBLISHED', toolsAndTechnologies: ['Docker', 'Git'] }));
    render(<VacancyRoutes path="/dashboard/jobs/v-1" />);

    expect(await screen.findByText('Tools & technologies')).toBeInTheDocument();
    expect(screen.getByText('Docker')).toBeInTheDocument();
  });
});

describe('the AI switches', () => {
  it('saves a switch as soon as it is flipped', async () => {
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'PUBLISHED', aiScreeningEnabled: false }));
    api.switchFeatures.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'PUBLISHED', aiScreeningEnabled: true }));
    const user = userEvent.setup();
    render(<VacancyRoutes path="/dashboard/jobs/v-1" />);

    const ai = await screen.findByRole('switch', { name: 'AI screening' });
    expect(ai).not.toBeChecked();
    await user.click(ai);

    expect(api.switchFeatures).toHaveBeenCalledWith('v-1', { aiScreeningEnabled: true });
    await waitFor(() => expect(screen.getByRole('switch', { name: 'AI screening' })).toBeChecked());
  });

  it('puts a refused switch back and says why', async () => {
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'PUBLISHED', candidateMatchingEnabled: false }));
    api.switchFeatures.mockRejectedValue(httpError(422, 'This vacancy has closed.'));
    const user = userEvent.setup();
    render(<VacancyRoutes path="/dashboard/jobs/v-1" />);

    await user.click(await screen.findByRole('switch', { name: 'Candidate matching' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This vacancy has closed.');
    expect(screen.getByRole('switch', { name: 'Candidate matching' })).not.toBeChecked();
  });

  it('cannot be changed once the vacancy has ended', async () => {
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'CLOSED' }));
    render(<VacancyRoutes path="/dashboard/jobs/v-1" />);

    expect(await screen.findByRole('switch', { name: 'AI screening' })).toBeDisabled();
    expect(screen.getByText(/this vacancy has ended/i)).toBeInTheDocument();
  });
});

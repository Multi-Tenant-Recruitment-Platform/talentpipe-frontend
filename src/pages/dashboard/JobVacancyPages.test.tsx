import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobVacancyResponse } from '../../api/types';
import { authContextMock, makeUser, setAuth } from '../../test/authHarness';
import { makeVacancy } from '../../test/vacancyFixtures';

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
}));
vi.mock('../../api/jobs', () => ({ jobsApi: api }));

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

beforeEach(() => {
  setAuth({ user: makeUser(), initializing: false });
  for (const fn of Object.values(api)) {
    fn.mockReset();
  }
  api.list.mockResolvedValue([]);
  api.hiringTeam.mockResolvedValue({ vacancyId: 'v-1', recruiter: null, hiringManager: null, members: [] });
  profileSaved.industry = '';
  profileSaved.additionalIndustries = [];
  team.activeMembers = [];
});

/* --- Create ------------------------------------------------------------- */

describe('creating a vacancy', () => {
  it('lays the five sections out in order, each numbered', () => {
    render(<VacancyRoutes path="/dashboard/jobs/new" />);

    const nav = screen.getByRole('navigation', { name: /vacancy form sections/i });
    expect(within(nav).getAllByRole('button').map((step) => step.textContent)).toEqual([
      expect.stringContaining('Basic information'),
      expect.stringContaining('Job description'),
      expect.stringContaining('Candidate requirements'),
      expect.stringContaining('Salary & benefits'),
      expect.stringContaining('Work schedule'),
    ]);
    expect(screen.getByRole('group', { name: /basic information/i })).toHaveTextContent('01');
  });

  it('says plainly that the main action publishes', () => {
    render(<VacancyRoutes path="/dashboard/jobs/new" />);

    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /publish vacancy/i })).toBeInTheDocument();
  });

  it('refuses to publish an incomplete vacancy, says where to look, and sends nothing', async () => {
    const user = userEvent.setup();
    render(<VacancyRoutes path="/dashboard/jobs/new" />);

    await user.click(screen.getByRole('button', { name: /publish vacancy/i }));

    expect(await screen.findByText(/still missing/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/job title/i)).toHaveFocus();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('clears a field error as soon as that field is corrected', async () => {
    const user = userEvent.setup();
    render(<VacancyRoutes path="/dashboard/jobs/new" />);

    await user.click(screen.getByRole('button', { name: /publish vacancy/i }));
    expect(await screen.findByText(/a job title is required/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/job title/i), 'Backend');
    expect(screen.queryByText(/a job title is required/i)).not.toBeInTheDocument();
  });

  it('files a draft unvalidated, then continues on its edit page so the next save updates it', async () => {
    const user = userEvent.setup();
    const stored = makeVacancy({ id: 'v-9', status: 'DRAFT', title: 'Backend Engineer' });
    api.create.mockResolvedValue(stored);
    api.get.mockResolvedValue(stored);
    render(<VacancyRoutes path="/dashboard/jobs/new" />);

    fill(/job title/i, 'Backend Engineer');
    await user.click(screen.getByRole('button', { name: /save draft/i }));

    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Backend Engineer', status: 'DRAFT', applicationDeadline: null }),
    );
    await waitFor(() => expect(location()).toHaveTextContent('/dashboard/jobs/v-9/edit'));
    expect(await screen.findByText(/draft saved/i)).toBeInTheDocument();
  });

  it('keeps the work when saving fails, and says why', async () => {
    const user = userEvent.setup();
    api.create.mockRejectedValue(new AxiosError('Network Error'));
    render(<VacancyRoutes path="/dashboard/jobs/new" />);

    fill(/job title/i, 'Backend Engineer');
    await user.click(screen.getByRole('button', { name: /save draft/i }));

    expect(await screen.findByText(/couldn't reach the server/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/job title/i)).toHaveValue('Backend Engineer');
    expect(location()).toHaveTextContent('/dashboard/jobs/new');
  });

  it('asks before throwing away work, and keeping it is safe', async () => {
    const user = userEvent.setup();
    render(<VacancyRoutes path="/dashboard/jobs/new" />);

    fill(/job title/i, 'Backend Engineer');
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /keep editing/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/job title/i)).toHaveValue('Backend Engineer');
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
    await user.click(screen.getByRole('button', { name: /publish vacancy/i }));
    const dialog = await screen.findByRole('alertdialog', { name: /publish this vacancy/i });
    await user.click(within(dialog).getByRole('button', { name: /publish vacancy/i }));

    await waitFor(() => expect(api.publish).toHaveBeenCalledWith('v-1'));
    expect(api.update).toHaveBeenCalledWith('v-1', expect.objectContaining({ version: 1 }));
    await waitFor(() => expect(location()).toHaveTextContent(/^\/dashboard\/jobs\/v-1$/));
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
    api.get.mockResolvedValue(makeVacancy({ id: 'v-9', status: 'DRAFT' }));
    const user = userEvent.setup();
    render(<VacancyRoutes path="/dashboard/jobs/new" />);

    await user.click(screen.getByLabelText(/^industry/i));
    expect(await screen.findByTitle('Information Technology · main')).toBeInTheDocument();
    await user.click(screen.getByTitle('Financial Services'));
    fill(/job title/i, 'Payments Engineer');
    await user.click(screen.getByRole('button', { name: /save draft/i }));

    expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ industry: 'Financial Services' }));
  });

  it('is shown among the basic information of the vacancy', async () => {
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'PUBLISHED', industry: 'Information Technology' }));
    render(<VacancyRoutes path="/dashboard/jobs/v-1" />);

    const term = await screen.findByText('Industry', { selector: 'dt' });
    expect(term.nextElementSibling).toHaveTextContent('Information Technology');
  });

  it('leaves the choice to the server when nothing is picked, and has no field without industries', async () => {
    api.create.mockResolvedValue(makeVacancy({ id: 'v-9', status: 'DRAFT' }));
    api.get.mockResolvedValue(makeVacancy({ id: 'v-9', status: 'DRAFT' }));
    const user = userEvent.setup();
    render(<VacancyRoutes path="/dashboard/jobs/new" />);

    expect(screen.queryByLabelText(/^industry/i)).toBeNull();
    fill(/job title/i, 'Payments Engineer');
    await user.click(screen.getByRole('button', { name: /save draft/i }));

    expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ industry: null }));
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
  it('is named on its page when the team list knows them', async () => {
    team.activeMembers = [
      { ...person('u-3', 'Amaya', 'Perera', 'Recruiter'), role: 'HR_MANAGER', tenantId: 't-1', createdAt: '' },
    ];
    api.get.mockResolvedValue(makeVacancy({ id: 'v-1', status: 'PUBLISHED', createdBy: 'u-3' }));
    render(<VacancyRoutes path="/dashboard/jobs/v-1" />);

    expect(await screen.findByText('by Amaya Perera', { exact: false })).toBeInTheDocument();
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

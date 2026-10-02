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

vi.mock('../../dashboard/CompanyProfileContext', () => ({
  useCompanyProfileContext: () => ({
    saved: { departments: ['Engineering', 'Design'] },
    loading: false,
  }),
}));

vi.mock('../../dashboard/TeamSummaryContext', () => ({
  useTeamSummary: () => ({ activeMembers: [], loading: false }),
}));

const api = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  publish: vi.fn(),
  close: vi.fn(),
  archive: vi.fn(),
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
});

/* --- Create ------------------------------------------------------------- */

describe('creating a vacancy', () => {
  it('lays the six sections out in order, each numbered', () => {
    render(<VacancyRoutes path="/dashboard/jobs/new" />);

    const nav = screen.getByRole('navigation', { name: /vacancy form sections/i });
    expect(within(nav).getAllByRole('button').map((step) => step.textContent)).toEqual([
      expect.stringContaining('Basic information'),
      expect.stringContaining('Job description'),
      expect.stringContaining('Candidate requirements'),
      expect.stringContaining('Salary & benefits'),
      expect.stringContaining('Work schedule'),
      expect.stringContaining('Recruitment settings'),
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

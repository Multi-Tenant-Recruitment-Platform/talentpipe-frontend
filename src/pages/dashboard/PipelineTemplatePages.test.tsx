import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PipelineTemplate, PipelineTemplateSummary } from '../../api/types';
import { authContextMock, makeUser, setAuth } from '../../test/authHarness';

/**
 * The pipeline template screens (PT-1 → PT-9) against a mocked API, so every
 * assertion about a save is an assertion about the exact request the backend
 * would receive. The rules themselves are pinned in `pipelineTemplate.test.ts`.
 */

vi.setConfig({ testTimeout: 20_000 });

vi.mock('../../auth/AuthContext', () => authContextMock);

const api = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  archive: vi.fn(),
  duplicate: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('../../api/pipelineTemplates', async (original) => ({
  ...(await original<typeof import('../../api/pipelineTemplates')>()),
  pipelineTemplatesApi: api,
}));

const { RequirePermission } = await import('../../components/RequirePermission');
const { CreatePipelineTemplatePage } = await import('./CreatePipelineTemplatePage');
const { EditPipelineTemplatePage } = await import('./EditPipelineTemplatePage');
const { PipelineTemplateDetailPage } = await import('./PipelineTemplateDetailPage');
const { PipelineTemplatesPage } = await import('./PipelineTemplatesPage');

function httpError(status: number, message = 'Request failed'): AxiosError {
  return new AxiosError(message, String(status), undefined, undefined, {
    status,
    data: { status, message },
  } as AxiosResponse);
}

/** Shaped like the backend's PipelineTemplateSummaryResponse. */
function makeSummary(overrides: Partial<PipelineTemplateSummary> = {}): PipelineTemplateSummary {
  return {
    id: 'tpl-1',
    name: 'Engineering hiring',
    description: 'Technical round, then a panel.',
    defaultAutoThreshold: 80,
    defaultManualThreshold: 70,
    idealMatchingEnabled: false,
    status: 'ACTIVE',
    stageCount: 4,
    interviewRoundCount: 1,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-20T00:00:00Z',
    archivedAt: null,
    ...overrides,
  };
}

/** Shaped like the backend's PipelineTemplateResponse: 0-based positions, `stageType`. */
function makeTemplate(overrides: Partial<PipelineTemplate> = {}): PipelineTemplate {
  return {
    ...makeSummary(),
    stages: [
      { id: 's1', position: 0, stageType: 'POST_APPLICATION', name: 'Post application', benchmark: null },
      { id: 's2', position: 1, stageType: 'SCREENING', name: 'Screening', benchmark: null },
      { id: 's3', position: 2, stageType: 'INTERVIEW', name: 'Technical interview', benchmark: 70 },
      { id: 's4', position: 3, stageType: 'ONBOARD', name: 'Onboard', benchmark: null },
    ],
    ...overrides,
  };
}

function LocationProbe() {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{pathname + search}</div>;
}

/** The template routes as App.tsx declares them, gates included. */
function TemplateRoutes({ path }: Readonly<{ path: string }>) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/dashboard/pipeline-templates"
          element={
            <RequirePermission permission="templates.view">
              <PipelineTemplatesPage />
            </RequirePermission>
          }
        />
        <Route
          path="/dashboard/pipeline-templates/new"
          element={
            <RequirePermission permission="templates.manage">
              <CreatePipelineTemplatePage />
            </RequirePermission>
          }
        />
        <Route
          path="/dashboard/pipeline-templates/:id"
          element={
            <RequirePermission permission="templates.view">
              <PipelineTemplateDetailPage />
            </RequirePermission>
          }
        />
        <Route
          path="/dashboard/pipeline-templates/:id/edit"
          element={
            <RequirePermission permission="templates.manage">
              <EditPipelineTemplatePage />
            </RequirePermission>
          }
        />
      </Routes>
      <LocationProbe />
    </MemoryRouter>
  );
}

const location = () => screen.getByTestId('location');
const saveButton = () => screen.getByRole('button', { name: /save template/i });
const fill = (label: RegExp | string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

/** Fills the two fields a new template is missing. */
function completeNewTemplate(name = 'Engineering hiring') {
  fill(/template name/i, name);
  fill(/^benchmark/i, '70');
}

beforeEach(() => {
  setAuth({ user: makeUser(), initializing: false });
  for (const fn of Object.values(api)) {
    fn.mockReset();
  }
  api.list.mockResolvedValue([]);
});

/* --- Create ----------------------------------------------------------------- */

describe('creating a template', () => {
  it('starts with the fixed stages, screening and one round, and the thresholds pre-filled', () => {
    render(<TemplateRoutes path="/dashboard/pipeline-templates/new" />);

    const stages = screen.getAllByRole('list', { name: /pipeline stages/i })[0];
    expect(stages).toHaveTextContent(/post application.*fixed · always first/i);
    expect(stages).toHaveTextContent(/screening/i);
    expect(stages).toHaveTextContent(/onboard.*fixed · always last/i);
    expect(screen.getByLabelText(/round name/i)).toHaveValue('Interview round 1');
    expect(screen.getByLabelText(/auto-advance threshold/i)).toHaveValue('80');
    expect(screen.getByLabelText(/manual-review threshold/i)).toHaveValue('70');
    expect(screen.getByRole('switch', { name: /allow ideal-person matching/i })).not.toBeChecked();
  });

  it('keeps Save disabled until the form is valid, counting what is left without alarm', () => {
    render(<TemplateRoutes path="/dashboard/pipeline-templates/new" />);

    // An untouched form is unfinished, not wrong: a neutral count, no red, no errors.
    expect(saveButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: '2 fields to complete' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /issues? to fix/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Enter a template name.')).not.toBeInTheDocument();

    completeNewTemplate();
    expect(saveButton()).toBeEnabled();
    expect(screen.queryByRole('button', { name: /fields? to complete/i })).not.toBeInTheDocument();
  });

  it('goes to the first field to complete without flagging anything', async () => {
    const user = userEvent.setup();
    render(<TemplateRoutes path="/dashboard/pipeline-templates/new" />);

    await user.click(screen.getByRole('button', { name: '2 fields to complete' }));

    expect(screen.getByLabelText(/template name/i)).toHaveFocus();
    expect(screen.queryByText('Enter a template name.')).not.toBeInTheDocument();
  });

  it('turns the count red once a field has been left with a problem, and lists every error on click', async () => {
    const user = userEvent.setup();
    render(<TemplateRoutes path="/dashboard/pipeline-templates/new" />);

    await user.click(screen.getByLabelText(/template name/i));
    await user.tab();
    await user.click(screen.getByRole('button', { name: '2 issues to fix' }));

    expect(screen.getByLabelText(/template name/i)).toHaveFocus();
    expect(screen.getByText('Enter a template name.')).toBeInTheDocument();
    expect(screen.getByText('Set a benchmark for this round.')).toBeInTheDocument();
  });

  it('waits until a field is left before flagging it', async () => {
    const user = userEvent.setup();
    render(<TemplateRoutes path="/dashboard/pipeline-templates/new" />);

    await user.click(screen.getByLabelText(/template name/i));
    expect(screen.queryByText('Enter a template name.')).not.toBeInTheDocument();
    await user.tab();
    expect(screen.getByText('Enter a template name.')).toBeInTheDocument();
  });

  it('flags a manual threshold that is not below the auto threshold straight away', () => {
    render(<TemplateRoutes path="/dashboard/pipeline-templates/new" />);

    fill(/manual-review threshold/i, '80');
    expect(
      screen.getByText('Manual-review threshold must be lower than the auto-advance threshold.'),
    ).toBeInTheDocument();
  });

  it('sends the template with its stages in order, then shows it', async () => {
    const user = userEvent.setup();
    api.create.mockResolvedValue(makeTemplate({ id: 'new-1' }));
    api.get.mockResolvedValue(makeTemplate({ id: 'new-1' }));
    render(<TemplateRoutes path="/dashboard/pipeline-templates/new" />);

    completeNewTemplate();
    await user.click(screen.getByRole('switch', { name: /allow ideal-person matching/i }));
    await user.click(saveButton());

    expect(api.create).toHaveBeenCalledWith({
      name: 'Engineering hiring',
      description: null,
      defaultAutoThreshold: 80,
      defaultManualThreshold: 70,
      idealMatchingEnabled: true,
      stages: [
        { stageType: 'POST_APPLICATION', name: 'Post application', benchmark: null, position: 0 },
        { stageType: 'SCREENING', name: 'Screening', benchmark: null, position: 1 },
        { stageType: 'INTERVIEW', name: 'Interview round 1', benchmark: 70, position: 2 },
        { stageType: 'ONBOARD', name: 'Onboard', benchmark: null, position: 3 },
      ],
    });
    await waitFor(() => expect(location()).toHaveTextContent('/dashboard/pipeline-templates/new-1'));
    expect(await screen.findByText(/template “engineering hiring” created/i)).toBeInTheDocument();
  });

  it('puts a name clash from the server on the Name field', async () => {
    const user = userEvent.setup();
    api.create.mockRejectedValue(httpError(409, 'duplicate'));
    render(<TemplateRoutes path="/dashboard/pipeline-templates/new" />);

    completeNewTemplate();
    await user.click(saveButton());

    expect(await screen.findByText('A template with this name already exists.')).toBeInTheDocument();
    expect(screen.getByLabelText(/template name/i)).toHaveAttribute('aria-invalid', 'true');
    expect(saveButton()).toBeDisabled();

    fill(/template name/i, 'Engineering hiring 2');
    expect(saveButton()).toBeEnabled();
  });

  it('warns early about a name another active template already has', async () => {
    api.list.mockResolvedValue([makeSummary()]);
    render(<TemplateRoutes path="/dashboard/pipeline-templates/new" />);

    await waitFor(() => expect(api.list).toHaveBeenCalled());
    fill(/template name/i, 'engineering hiring');
    fireEvent.blur(screen.getByLabelText(/template name/i));

    expect(await screen.findByText('A template with this name already exists.')).toBeInTheDocument();
  });

  it('puts a threshold rule refused by the backend (422) on the threshold field', async () => {
    const user = userEvent.setup();
    api.create.mockRejectedValue(httpError(422, 'Manual threshold must be lower than auto threshold'));
    render(<TemplateRoutes path="/dashboard/pipeline-templates/new" />);

    completeNewTemplate();
    await user.click(saveButton());

    expect(
      await screen.findByText('Manual-review threshold must be lower than the auto-advance threshold.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/manual-review threshold/i)).toHaveFocus();
  });

  it('places bean-validation errors (400) on the fields they name', async () => {
    const user = userEvent.setup();
    api.create.mockRejectedValue(
      httpError(400, 'stages[2].benchmark: Benchmark cannot exceed 100; name: Template name cannot exceed 120 characters'),
    );
    render(<TemplateRoutes path="/dashboard/pipeline-templates/new" />);

    completeNewTemplate();
    await user.click(saveButton());

    expect(await screen.findByText('Benchmark cannot exceed 100')).toBeInTheDocument();
    expect(screen.getByText('Template name cannot exceed 120 characters')).toBeInTheDocument();
  });

  it('shows a rule with no field of its own above the action bar', async () => {
    const user = userEvent.setup();
    api.create.mockRejectedValue(httpError(422, 'Benchmark is only allowed for interview rounds'));
    render(<TemplateRoutes path="/dashboard/pipeline-templates/new" />);

    completeNewTemplate();
    await user.click(saveButton());

    expect(await screen.findByText('Benchmark is only allowed for interview rounds')).toBeInTheDocument();
  });

  it('says the server lacks the template API — not that a template vanished — when create 404s', async () => {
    const user = userEvent.setup();
    api.create.mockRejectedValue(httpError(404, 'Resource not found'));
    render(<TemplateRoutes path="/dashboard/pipeline-templates/new" />);

    completeNewTemplate();
    await user.click(saveButton());

    expect(await screen.findByText(/this server doesn't support pipeline templates yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/no longer exists/i)).not.toBeInTheDocument();
    // Retrying can't conjure an endpoint.
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('offers a retry after a server failure and keeps what was typed', async () => {
    const user = userEvent.setup();
    api.create.mockRejectedValueOnce(httpError(500)).mockResolvedValueOnce(makeTemplate({ id: 'new-1' }));
    api.get.mockResolvedValue(makeTemplate({ id: 'new-1' }));
    render(<TemplateRoutes path="/dashboard/pipeline-templates/new" />);

    completeNewTemplate('Sales hiring');
    await user.click(saveButton());

    expect(await screen.findByText(/something went wrong saving this template/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/template name/i)).toHaveValue('Sales hiring');

    await user.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(2));
  });
});

/* --- Stage builder ---------------------------------------------------------- */

describe('the stage builder', () => {
  it('adds a round, focuses its name and announces it', async () => {
    const user = userEvent.setup();
    render(<TemplateRoutes path="/dashboard/pipeline-templates/new" />);

    await user.click(screen.getByRole('button', { name: /add interview round/i }));

    const names = screen.getAllByLabelText(/round name/i);
    expect(names).toHaveLength(2);
    expect(names[1]).toHaveValue('Interview round 2');
    expect(names[1]).toHaveFocus();
    expect(screen.getByText('Interview round 2 added.')).toBeInTheDocument();
  });

  it('removes a round with an undo, and puts it back', async () => {
    const user = userEvent.setup();
    render(<TemplateRoutes path="/dashboard/pipeline-templates/new" />);

    await user.click(screen.getByRole('button', { name: /add interview round/i }));
    await user.click(screen.getByRole('button', { name: 'Remove Interview round 1' }));

    expect(screen.getAllByLabelText(/round name/i)).toHaveLength(1);
    const undo = screen.getByRole('button', { name: /undo/i });
    expect(undo).toHaveFocus();

    await user.click(undo);
    expect(screen.getAllByLabelText(/round name/i)).toHaveLength(2);
  });

  it('will not remove the only interview round', () => {
    render(<TemplateRoutes path="/dashboard/pipeline-templates/new" />);
    expect(screen.getByRole('button', { name: /remove interview round 1/i })).toBeDisabled();
  });

  it('reorders rounds, keeps focus on the moved row and announces the new position', async () => {
    const user = userEvent.setup();
    render(<TemplateRoutes path="/dashboard/pipeline-templates/new" />);

    await user.click(screen.getByRole('button', { name: /add interview round/i }));
    fireEvent.change(screen.getAllByLabelText(/round name/i)[1], { target: { value: 'Panel' } });
    await user.click(screen.getByRole('button', { name: 'Move Panel up' }));

    expect(screen.getAllByLabelText(/round name/i).map((input) => (input as HTMLInputElement).value)).toEqual([
      'Panel',
      'Interview round 2',
    ]);
    // Now first, so "up" no longer applies and focus moves to its twin.
    expect(screen.getByRole('button', { name: 'Move Panel down' })).toHaveFocus();
    expect(screen.getByText('Panel moved to position 1 of 2 interview rounds.')).toBeInTheDocument();
  });

  it('can leave screening out, and hides the thresholds with it', async () => {
    const user = userEvent.setup();
    render(<TemplateRoutes path="/dashboard/pipeline-templates/new" />);

    await user.click(screen.getByRole('button', { name: /remove screening/i }));

    expect(screen.getByRole('button', { name: /add screening stage/i })).toHaveFocus();
    expect(screen.queryByLabelText(/auto-advance threshold/i)).not.toBeInTheDocument();
    expect(screen.getByText(/thresholds apply only when the pipeline includes screening/i)).toBeInTheDocument();
  });
});

/* --- List ------------------------------------------------------------------- */

describe('the template list', () => {
  it('shows name, stages, interview rounds and last updated, active only by default', async () => {
    api.list.mockResolvedValue([makeSummary({ interviewRoundCount: 2, stageCount: 5 })]);
    render(<TemplateRoutes path="/dashboard/pipeline-templates" />);

    const row = (await screen.findByRole('article', { name: 'Engineering hiring' })) as HTMLElement;
    expect(within(row).getByText('Stages').nextSibling).toHaveTextContent('5');
    expect(within(row).getByText('Interview rounds').nextSibling).toHaveTextContent('2');
    expect(within(row).getByText('Last updated')).toBeInTheDocument();
    expect(api.list).toHaveBeenCalledWith({ search: '', includeArchived: false });
  });

  it('shows archived templates when asked, in the address bar too', async () => {
    const user = userEvent.setup();
    render(<TemplateRoutes path="/dashboard/pipeline-templates" />);

    await user.click(await screen.findByRole('switch', { name: /show archived/i }));

    expect(location()).toHaveTextContent('/dashboard/pipeline-templates?archived=1');
    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith({ search: '', includeArchived: true }));
  });

  it('searches on the server after a pause in typing, and keeps the search in the address bar', async () => {
    render(<TemplateRoutes path="/dashboard/pipeline-templates" />);
    fireEvent.change(await screen.findByRole('searchbox', { name: /search templates/i }), {
      target: { value: 'eng' },
    });

    await waitFor(() => expect(location()).toHaveTextContent('?q=eng'));
    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith({ search: 'eng', includeArchived: false }));
    expect(await screen.findByText(/no templates match “eng”/i)).toBeInTheDocument();
  });

  it('gives an admin a way to create the first template', async () => {
    render(<TemplateRoutes path="/dashboard/pipeline-templates" />);
    expect(await screen.findByRole('link', { name: /create your first template/i })).toHaveAttribute(
      'href',
      '/dashboard/pipeline-templates/new',
    );
  });

  it('explains a backend without the template API, and still offers Create', async () => {
    api.list.mockRejectedValue(httpError(404, 'Resource not found'));
    render(<TemplateRoutes path="/dashboard/pipeline-templates" />);

    expect(await screen.findByText(/this server doesn't support pipeline templates yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create template/i })).toHaveAttribute(
      'href',
      '/dashboard/pipeline-templates/new',
    );
  });

  it('shows Create in the header for an admin while the list is loading and once it has rows', async () => {
    api.list.mockResolvedValue([makeSummary()]);
    render(<TemplateRoutes path="/dashboard/pipeline-templates" />);

    expect(screen.getByRole('link', { name: /create template/i })).toBeInTheDocument();
    await screen.findByRole('article', { name: 'Engineering hiring' });
    expect(screen.getByRole('link', { name: /create template/i })).toBeInTheDocument();
  });

  it('shows a retry when the list fails to load', async () => {
    const user = userEvent.setup();
    api.list.mockRejectedValueOnce(httpError(500)).mockResolvedValue([makeSummary()]);
    render(<TemplateRoutes path="/dashboard/pipeline-templates" />);

    await user.click(await screen.findByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('article', { name: 'Engineering hiring' })).toBeInTheDocument();
  });

  it('archives after a confirmation that starts on Cancel, and drops the row from the view', async () => {
    const user = userEvent.setup();
    api.list.mockResolvedValue([makeSummary()]);
    api.archive.mockResolvedValue(makeTemplate({ status: 'ARCHIVED' }));
    render(<TemplateRoutes path="/dashboard/pipeline-templates" />);

    await user.click(await screen.findByRole('button', { name: /more actions for engineering hiring/i }));
    await user.click(await screen.findByRole('menuitem', { name: /archive/i }));

    const dialog = screen.getByRole('alertdialog', { name: /archive “engineering hiring”\?/i });
    expect(dialog).toHaveTextContent(/jobs already using this template keep their own copy/i);
    expect(within(dialog).getByRole('button', { name: /cancel/i })).toHaveFocus();

    await user.click(within(dialog).getByRole('button', { name: /archive template/i }));

    expect(api.archive).toHaveBeenCalledWith('tpl-1');
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Engineering hiring' })).not.toBeInTheDocument());
    expect(screen.getByText(/“engineering hiring” archived/i)).toBeInTheDocument();
  });

  it('keeps the dialog open and explains a failed archive', async () => {
    const user = userEvent.setup();
    api.list.mockResolvedValue([makeSummary()]);
    api.archive.mockRejectedValue(httpError(500));
    render(<TemplateRoutes path="/dashboard/pipeline-templates" />);

    await user.click(await screen.findByRole('button', { name: /more actions for engineering hiring/i }));
    await user.click(await screen.findByRole('menuitem', { name: /archive/i }));
    await user.click(screen.getByRole('button', { name: /archive template/i }));

    const dialog = await screen.findByRole('alertdialog');
    expect(await within(dialog).findByText(/something went wrong archiving this template/i)).toBeInTheDocument();
  });

  it('duplicates into the editor of the copy, saying what it is called', async () => {
    const user = userEvent.setup();
    api.list.mockResolvedValue([makeSummary()]);
    const copy = makeTemplate({ id: 'tpl-2', name: 'Engineering hiring (Copy)' });
    api.duplicate.mockResolvedValue(copy);
    api.get.mockResolvedValue(copy);
    render(<TemplateRoutes path="/dashboard/pipeline-templates" />);

    await user.click(await screen.findByRole('button', { name: /more actions for engineering hiring/i }));
    await user.click(await screen.findByRole('menuitem', { name: /duplicate/i }));

    expect(api.duplicate).toHaveBeenCalledWith('tpl-1');
    await waitFor(() => expect(location()).toHaveTextContent('/dashboard/pipeline-templates/tpl-2/edit'));
    expect(await screen.findByText(/copy saved as “engineering hiring \(copy\)”/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/template name/i)).toHaveValue('Engineering hiring (Copy)');
  });

  it('deletes only after a red confirmation, then drops the row', async () => {
    const user = userEvent.setup();
    api.list.mockResolvedValue([makeSummary()]);
    api.remove.mockResolvedValue(undefined);
    render(<TemplateRoutes path="/dashboard/pipeline-templates" />);

    await user.click(await screen.findByRole('button', { name: /more actions for engineering hiring/i }));
    await user.click(await screen.findByRole('menuitem', { name: /delete permanently/i }));

    const dialog = screen.getByRole('alertdialog', { name: /delete “engineering hiring” permanently\?/i });
    expect(dialog).toHaveTextContent(/can't be undone/i);
    expect(within(dialog).getByRole('button', { name: /cancel/i })).toHaveFocus();
    expect(api.remove).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: /delete template/i }));

    expect(api.remove).toHaveBeenCalledWith('tpl-1');
    await waitFor(() => expect(screen.queryByRole('article', { name: 'Engineering hiring' })).not.toBeInTheDocument());
    expect(screen.getByText(/“engineering hiring” deleted/i)).toBeInTheDocument();
  });

  it('offers an archived template Duplicate and Delete, but not Edit or Archive', async () => {
    const user = userEvent.setup();
    api.list.mockResolvedValue([makeSummary({ status: 'ARCHIVED', archivedAt: '2026-10-21T00:00:00Z' })]);
    render(<TemplateRoutes path="/dashboard/pipeline-templates?archived=1" />);

    await screen.findByRole('article', { name: /engineering hiring/i });
    expect(screen.queryByRole('button', { name: /edit engineering hiring/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /more actions for engineering hiring/i }));
    expect(await screen.findByRole('menuitem', { name: /duplicate/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /delete permanently/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /^archive$/i })).not.toBeInTheDocument();
  });
});

/* --- Roles ------------------------------------------------------------------ */

describe('who sees what', () => {
  it('gives an HR manager the list only — no create, edit, archive or archived filter', async () => {
    setAuth({ user: makeUser({ role: 'HR_MANAGER' }) });
    api.list.mockResolvedValue([makeSummary()]);
    render(<TemplateRoutes path="/dashboard/pipeline-templates?archived=1" />);

    expect(await screen.findByRole('article', { name: 'Engineering hiring' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /create template/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /show archived/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit engineering hiring/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /more actions/i })).not.toBeInTheDocument();
    // Whatever the URL says, a job creator never asks for archived templates.
    expect(api.list).toHaveBeenCalledWith({ search: '', includeArchived: false });
  });

  it('gives an admin create, edit and archive', async () => {
    api.list.mockResolvedValue([makeSummary()]);
    render(<TemplateRoutes path="/dashboard/pipeline-templates" />);

    expect(await screen.findByRole('button', { name: /edit engineering hiring/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create template/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /more actions for engineering hiring/i })).toBeInTheDocument();
  });

  it('shows an interviewer a 403 instead of the list', () => {
    setAuth({ user: makeUser({ role: 'INTERVIEWER' }) });
    render(<TemplateRoutes path="/dashboard/pipeline-templates" />);

    expect(screen.getByText(/error 403/i)).toBeInTheDocument();
    expect(api.list).not.toHaveBeenCalled();
  });

  it('keeps an HR manager out of the editor', () => {
    setAuth({ user: makeUser({ role: 'HR_MANAGER' }) });
    render(<TemplateRoutes path="/dashboard/pipeline-templates/new" />);

    expect(screen.getByText(/only a company admin can create or change pipeline templates/i)).toBeInTheDocument();
  });
});

/* --- Detail and edit ---------------------------------------------------------- */

describe('a saved template', () => {
  it('reads back its stages, benchmarks, thresholds and matching setting', async () => {
    api.get.mockResolvedValue(makeTemplate());
    render(<TemplateRoutes path="/dashboard/pipeline-templates/tpl-1" />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Engineering hiring' })).toBeInTheDocument();
    expect(screen.getByText('Technical interview')).toBeInTheDocument();
    expect(screen.getByText('70 / 100')).toBeInTheDocument();
    expect(screen.getAllByText(/scores 80 and above advance automatically/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Not available')).toBeInTheDocument();
  });

  it('says plainly when a template is archived, and offers no actions', async () => {
    api.get.mockResolvedValue(makeTemplate({ status: 'ARCHIVED' }));
    render(<TemplateRoutes path="/dashboard/pipeline-templates/tpl-1" />);

    expect(await screen.findByText(/can't be chosen for new jobs/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit template/i })).not.toBeInTheDocument();
  });

  it('opens for editing with what was saved, and sends the changes', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(makeTemplate());
    api.update.mockResolvedValue(makeTemplate({ name: 'Engineering hiring v2' }));
    render(<TemplateRoutes path="/dashboard/pipeline-templates/tpl-1/edit" />);

    expect(await screen.findByText(/jobs already using this template keep their own copy/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/round name/i)).toHaveValue('Technical interview');
    fill(/template name/i, 'Engineering hiring v2');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(api.update).toHaveBeenCalledWith(
      'tpl-1',
      expect.objectContaining({ name: 'Engineering hiring v2' }),
    );
    await waitFor(() => expect(location()).toHaveTextContent(/^\/dashboard\/pipeline-templates\/tpl-1$/));
  });

  it('sends an archived template to its page instead of the editor', async () => {
    api.get.mockResolvedValue(makeTemplate({ status: 'ARCHIVED' }));
    render(<TemplateRoutes path="/dashboard/pipeline-templates/tpl-1/edit" />);

    await waitFor(() => expect(location()).toHaveTextContent(/^\/dashboard\/pipeline-templates\/tpl-1$/));
    expect(await screen.findByText("Archived templates can't be edited.")).toBeInTheDocument();
  });

  it('says when a template does not exist', async () => {
    api.get.mockRejectedValue(httpError(404));
    render(<TemplateRoutes path="/dashboard/pipeline-templates/nope" />);

    expect(await screen.findByText('Template not found')).toBeInTheDocument();
  });

  it('returns to the list after deleting from its own page', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(makeTemplate());
    api.remove.mockResolvedValue(undefined);
    render(<TemplateRoutes path="/dashboard/pipeline-templates/tpl-1" />);

    await user.click(await screen.findByRole('button', { name: /more actions for engineering hiring/i }));
    await user.click(await screen.findByRole('menuitem', { name: /delete permanently/i }));
    await user.click(screen.getByRole('button', { name: /delete template/i }));

    await waitFor(() => expect(location()).toHaveTextContent(/^\/dashboard\/pipeline-templates$/));
    expect(await screen.findByText(/“engineering hiring” deleted/i)).toBeInTheDocument();
  });

  it('shows when an archived template was archived', async () => {
    api.get.mockResolvedValue(makeTemplate({ status: 'ARCHIVED', archivedAt: '2026-10-21T10:00:00Z' }));
    render(<TemplateRoutes path="/dashboard/pipeline-templates/tpl-1" />);

    expect(await screen.findByText(/archived on/i)).toBeInTheDocument();
  });

  it('archives from its own page', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(makeTemplate());
    api.archive.mockResolvedValue(makeTemplate({ status: 'ARCHIVED' }));
    render(<TemplateRoutes path="/dashboard/pipeline-templates/tpl-1" />);

    await user.click(await screen.findByRole('button', { name: /more actions for engineering hiring/i }));
    await user.click(await screen.findByRole('menuitem', { name: /archive/i }));
    await user.click(screen.getByRole('button', { name: /archive template/i }));

    expect(await screen.findByText(/“engineering hiring” archived/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit template/i })).not.toBeInTheDocument();
  });
});

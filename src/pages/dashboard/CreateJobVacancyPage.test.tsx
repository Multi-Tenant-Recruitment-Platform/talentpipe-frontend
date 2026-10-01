import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authContextMock, makeUser, setAuth } from '../../test/authHarness';
import { activeTenant, resetActiveTenantForTests } from '../../tenant/activeTenant';

/**
 * Behaviour of the vacancy surfaces (PB-011).
 *
 * <p>The rules themselves are pinned in `src/dashboard/jobVacancy.test.ts`;
 * this file covers what a person can do on screen — that the form refuses to
 * publish an incomplete vacancy, that a draft is kept without being validated,
 * and that leaving with unsaved work asks first.</p>
 *
 * <p>The two contexts the form reads from are stubbed rather than driven
 * through their APIs: the page is not supposed to know whether departments and
 * the roster came from a request or a fixture.</p>
 */

// Each render here mounts six sections of antd controls, which makes these the
// slowest tests in the suite — comfortably under the default 5s alone, but
// close enough to it that a loaded CI machine turns them red for no reason.
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

const { CreateJobVacancyPage } = await import('./CreateJobVacancyPage');
const { JobVacanciesPage } = await import('./JobVacanciesPage');

/**
 * Sets a field in one event.
 *
 * <p>`userEvent.type` dispatches a keystroke at a time, and every one of them
 * re-renders all six sections — forty-odd antd controls. That is the right tool
 * where the test is about typing; where it only needs a value in the box, this
 * keeps the suite from spending seconds on it.</p>
 */
const fill = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

function LocationProbe() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}

/** The two vacancy routes exactly as App.tsx declares them, minus the gates. */
function VacancyRoutes({ path = '/dashboard/jobs/new' }: Readonly<{ path?: string }>) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/dashboard/jobs" element={<JobVacanciesPage />} />
        <Route path="/dashboard/jobs/new" element={<CreateJobVacancyPage />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>
  );
}

beforeEach(() => {
  setAuth({ user: makeUser(), initializing: false });
  localStorage.clear();
  resetActiveTenantForTests();
  // Without an active workspace the store is a no-op by design, so a draft
  // would go nowhere — the app stamps this at sign-in.
  activeTenant.set('t-1');
});

describe('the vacancy form', () => {
  it('lays the six sections out in order, each numbered', () => {
    render(<VacancyRoutes />);

    const nav = screen.getByRole('navigation', { name: /vacancy form sections/i });
    const steps = within(nav).getAllByRole('button');
    expect(steps.map((step) => step.textContent)).toEqual([
      expect.stringContaining('Basic information'),
      expect.stringContaining('Job description'),
      expect.stringContaining('Candidate requirements'),
      expect.stringContaining('Salary & benefits'),
      expect.stringContaining('Work schedule'),
      expect.stringContaining('Recruitment settings'),
    ]);

    // Each section is a real fieldset, so the controls inside carry its name.
    // The number is aria-hidden on purpose — it is visual wayfinding, and the
    // legend should announce the section, not read a figure aloud first.
    const basics = screen.getByRole('group', { name: /basic information/i });
    expect(basics).toHaveTextContent('01');
  });

  it('offers all three actions from the first screen, draft included', () => {
    render(<VacancyRoutes />);

    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create vacancy/i })).toBeInTheDocument();
  });

  it('refuses to publish an incomplete vacancy and says where to look', async () => {
    const user = userEvent.setup();
    render(<VacancyRoutes />);

    await user.click(screen.getByRole('button', { name: /create vacancy/i }));

    // Not getByRole('alert') — every flagged field is one too, which is the
    // point; this asserts on the banner that summarises them.
    expect(await screen.findByText(/still missing/i)).toBeInTheDocument();
    // The caret lands on the first thing that needs fixing, in reading order.
    expect(screen.getByLabelText(/job title/i)).toHaveFocus();
    // And nothing was filed.
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard/jobs/new');
  });

  it('clears a field error as soon as that field is corrected', async () => {
    const user = userEvent.setup();
    render(<VacancyRoutes />);

    await user.click(screen.getByRole('button', { name: /create vacancy/i }));
    expect(await screen.findByText(/a job title is required/i)).toBeInTheDocument();

    // Typed for real here: the behaviour under test is what happens as the
    // field is corrected, not the value that ends up in it.
    await user.type(screen.getByLabelText(/job title/i), 'Backend');
    expect(screen.queryByText(/a job title is required/i)).not.toBeInTheDocument();
  });

  it('keeps a draft without validating it, and shows it on the list', async () => {
    const user = userEvent.setup();
    const view = render(<VacancyRoutes />);

    fill(/job title/i, 'Backend Engineer');
    await user.click(screen.getByRole('button', { name: /save draft/i }));

    expect(await screen.findByText(/draft saved/i)).toBeInTheDocument();
    view.unmount();

    render(<VacancyRoutes path="/dashboard/jobs" />);
    const row = screen.getByRole('row', { name: /backend engineer/i });
    expect(within(row).getByText('Draft')).toBeInTheDocument();
  });

  it('asks before throwing away work, and keeping it is safe', async () => {
    const user = userEvent.setup();
    render(<VacancyRoutes />);

    fill(/job title/i, 'Backend Engineer');
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /keep editing/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/job title/i)).toHaveValue('Backend Engineer');
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard/jobs/new');
  });

  it('leaves straight away when nothing has been entered', async () => {
    const user = userEvent.setup();
    render(<VacancyRoutes />);

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard/jobs');
  });
});

describe('the vacancy list', () => {
  it('opens on an empty state rather than an invented example', () => {
    render(<VacancyRoutes path="/dashboard/jobs" />);

    expect(screen.getByText(/no vacancies yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create vacancy/i })).toHaveAttribute(
      'href',
      '/dashboard/jobs/new',
    );
  });
});

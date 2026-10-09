import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MyCandidateProfileResponse } from '../api/types';
import { authContextMock, makeUser, setAuth } from '../test/authHarness';

/**
 * Behaviour of the candidate's My profile page.
 *
 * <p>`candidatesApi` is mocked wholesale; every assertion about what is sent
 * reads the FormData handed to `saveMine`, which is exactly what goes on the
 * wire. The profile loads in an effect, so each test starts with a `findBy`.</p>
 */

vi.mock('../auth/AuthContext', () => authContextMock);

const getMine = vi.fn<() => Promise<MyCandidateProfileResponse>>();
const saveMine = vi.fn<(payload: FormData) => Promise<MyCandidateProfileResponse>>();
vi.mock('../api/candidates', () => ({ candidatesApi: { getMine, saveMine } }));

const { CandidateProfilePage } = await import('./CandidateProfilePage');

const POOL_LABEL = 'Add me to the Talent Pool';
const CV_REGION = 'CV / Resume (Optional)';
const LEAVING_NOTE = "You'll be removed from the Talent Pool when you save.";

function makeProfile(overrides: Partial<MyCandidateProfileResponse> = {}): MyCandidateProfileResponse {
  return {
    id: 'c-1',
    fullName: 'Jane Perera',
    email: 'jane@example.com',
    phone: '+94 77 123 4567',
    identityCardNumber: '200012345678',
    photoUrl: null,
    inTalentPool: false,
    cv: null,
    ...overrides,
  };
}

const notFound = { isAxiosError: true, response: { status: 404, data: { message: 'Not found' } } };

const pdf = (name = 'jane-cv.pdf', size = 240_000) => {
  const file = new File(['%PDF'], name, { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/profile']}>
      <Routes>
        <Route path="/profile" element={<CandidateProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const poolBox = () => screen.getByRole('checkbox', { name: POOL_LABEL });
const cvRegion = () => screen.queryByRole('region', { name: CV_REGION });
const cvInput = () => screen.getByLabelText('CV / Resume file');
const saveButton = () => screen.getByRole('button', { name: 'Save profile' });
const strengthBar = () => screen.getByRole('progressbar', { name: 'Profile strength' });
const lastPayload = () => saveMine.mock.lastCall![0];

/** Renders and waits for the profile to land. */
async function ready() {
  const user = userEvent.setup();
  renderPage();
  await screen.findByLabelText('Full name');
  return user;
}

beforeEach(() => {
  setAuth({
    user: makeUser({
      role: 'CANDIDATE',
      tenantId: null,
      tenantName: null,
      firstName: 'Jane',
      lastName: 'Perera',
      email: 'jane@example.com',
    }),
  });
  getMine.mockReset();
  saveMine.mockReset();
  getMine.mockResolvedValue(makeProfile());
  saveMine.mockImplementation(async () => makeProfile());
});

describe('CandidateProfilePage — Talent Pool and CV', () => {
  it('does not render the CV section by default', async () => {
    await ready();
    expect(screen.getByRole('heading', { level: 1, name: 'My profile: Jane Perera' })).toBeInTheDocument();
    expect(poolBox()).not.toBeChecked();
    expect(poolBox()).toHaveAttribute('aria-expanded', 'false');
    expect(cvRegion()).not.toBeInTheDocument();
  });

  it('reveals the CV section when checked and hides it when unchecked', async () => {
    const user = await ready();

    // The helper text is part of the row, so clicking it toggles too.
    await user.click(screen.getByText('Let companies on TalentPipe consider you for future job opportunities.'));
    expect(poolBox()).toBeChecked();
    expect(poolBox()).toHaveAttribute('aria-expanded', 'true');
    expect(cvRegion()).toHaveAttribute('id', poolBox().getAttribute('aria-controls'));
    expect(screen.getByText('Upload a CV to help match you with future vacancies.')).toBeInTheDocument();

    await user.click(poolBox());
    expect(cvRegion()).not.toBeInTheDocument();
  });

  it('saves with the box unchecked and sends no CV', async () => {
    const user = await ready();
    await user.click(saveButton());

    await waitFor(() => expect(saveMine).toHaveBeenCalledTimes(1));
    expect(lastPayload().get('fullName')).toBe('Jane Perera');
    expect(lastPayload().get('addToTalentPool')).toBe('false');
    expect(lastPayload().has('cv')).toBe(false);
    expect(await screen.findByText('Profile saved.')).toBeInTheDocument();
  });

  it('saves with the box checked and no CV', async () => {
    const user = await ready();
    await user.click(poolBox());
    await user.click(saveButton());

    await waitFor(() => expect(saveMine).toHaveBeenCalledTimes(1));
    expect(lastPayload().get('addToTalentPool')).toBe('true');
    expect(lastPayload().has('cv')).toBe(false);
  });

  it('stages a PDF, and Replace and Remove both work', async () => {
    const user = await ready();
    await user.click(poolBox());

    await user.upload(cvInput(), pdf('first.pdf'));
    expect(screen.getByText('first.pdf')).toHaveAttribute('title', 'first.pdf');
    expect(screen.getByText('PDF · 235 KB')).toBeInTheDocument();

    // Replace opens the same picker; the new file takes the row.
    const click = vi.spyOn(cvInput(), 'click');
    await user.click(screen.getByRole('button', { name: 'Replace first.pdf' }));
    expect(click).toHaveBeenCalled();
    await user.upload(cvInput(), pdf('second.pdf'));
    expect(screen.queryByText('first.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('second.pdf')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove second.pdf' }));
    expect(screen.queryByText('second.pdf')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Drag & drop or browse' })).toBeInTheDocument();
  });

  it('rejects a wrong file type with an error and keeps the previous file', async () => {
    const user = await ready();
    await user.click(poolBox());
    await user.upload(cvInput(), pdf('good.pdf'));

    fireEvent.change(cvInput(), {
      target: { files: [new File(['x'], 'notes.txt', { type: 'text/plain' })] },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Choose a PDF or DOCX file.');
    expect(screen.getByText('good.pdf')).toBeInTheDocument();
  });

  it('accepts a file dropped on the drop zone', async () => {
    const user = await ready();
    await user.click(poolBox());

    fireEvent.drop(screen.getByRole('button', { name: 'Drag & drop or browse' }), {
      dataTransfer: { files: [pdf('dropped.pdf')] },
    });
    expect(screen.getByText('dropped.pdf')).toBeInTheDocument();
  });

  it('keeps a staged CV across uncheck / re-check, but never sends it while unchecked', async () => {
    const user = await ready();
    await user.click(poolBox());
    await user.upload(cvInput(), pdf('kept.pdf'));

    await user.click(poolBox());
    expect(screen.queryByText('kept.pdf')).not.toBeInTheDocument();

    // Save while unchecked — but fail, so the form (and the staged file) stays.
    saveMine.mockRejectedValueOnce({ isAxiosError: true, response: { status: 500, data: { message: 'Server down' } } });
    await user.click(saveButton());
    expect(await screen.findByText('Server down')).toBeInTheDocument();
    expect(lastPayload().get('addToTalentPool')).toBe('false');
    expect(lastPayload().has('cv')).toBe(false);

    await user.click(poolBox());
    expect(screen.getByText('kept.pdf')).toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toHaveValue('Jane Perera');

    await user.click(saveButton());
    await waitFor(() => expect(saveMine).toHaveBeenCalledTimes(2));
    expect((lastPayload().get('cv') as File).name).toBe('kept.pdf');
  });
});

describe('CandidateProfilePage — stored profile', () => {
  const member = makeProfile({
    inTalentPool: true,
    cv: { fileName: 'jane-cv.pdf', sizeBytes: 240_000, url: null },
  });

  it('prefills a pool member and their CV, and warns on unchecking', async () => {
    getMine.mockResolvedValue(member);
    const user = await ready();

    expect(screen.getByLabelText('Full name')).toHaveValue('Jane Perera');
    expect(screen.getByLabelText('ID number')).toHaveValue('200012345678');
    expect(screen.getByLabelText('Email')).toHaveValue('jane@example.com');
    expect(screen.getByLabelText(/Phone number/)).toHaveValue('+94 77 123 4567');
    expect(screen.getByText('Talent Pool member')).toBeInTheDocument();
    expect(poolBox()).toBeChecked();
    expect(screen.getByText('jane-cv.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Replace jane-cv.pdf' })).toBeInTheDocument();

    expect(screen.queryByText(LEAVING_NOTE)).not.toBeInTheDocument();
    await user.click(poolBox());
    expect(screen.getByText(LEAVING_NOTE)).toBeInTheDocument();
    await user.click(poolBox());
    expect(screen.queryByText(LEAVING_NOTE)).not.toBeInTheDocument();
  });

  it('only marks a stored CV for removal until Save', async () => {
    getMine.mockResolvedValue(member);
    saveMine.mockResolvedValue({ ...member, cv: null });
    const user = await ready();

    await user.click(screen.getByRole('button', { name: 'Remove jane-cv.pdf' }));
    expect(screen.getByText(/will be removed when you save/)).toBeInTheDocument();
    expect(saveMine).not.toHaveBeenCalled();

    await user.click(saveButton());
    await waitFor(() => expect(saveMine).toHaveBeenCalledTimes(1));
    expect(lastPayload().get('removeCv')).toBe('true');
    expect(await screen.findByText('Profile saved.')).toBeInTheDocument();
  });

  it('starts a first profile from the account when none exists yet', async () => {
    getMine.mockRejectedValue(notFound);
    await ready();
    expect(screen.getByLabelText('Full name')).toHaveValue('Jane Perera');
    expect(screen.getByLabelText('Email')).toHaveValue('jane@example.com');
    expect(screen.getByLabelText('ID number')).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText("Your profile hasn't been saved yet.")).toBeInTheDocument();
  });

  it('shows a load failure with a way to retry', async () => {
    getMine.mockRejectedValueOnce({ isAxiosError: true, response: { status: 500, data: { message: 'Server down' } } });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Server down')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByLabelText('Full name')).toHaveValue('Jane Perera');
  });
});

describe('CandidateProfilePage — form behaviour', () => {
  it('shows errors on submit, not while typing, and does not save', async () => {
    getMine.mockRejectedValue(notFound);
    setAuth({ user: makeUser({ role: 'CANDIDATE', firstName: '', lastName: '', email: '' }) });
    const user = await ready();

    await user.type(screen.getByLabelText('Email'), 'jane@');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(saveButton());
    expect(screen.getByText('Enter your full name.')).toBeInTheDocument();
    expect(screen.getByText('Enter your ID number.')).toBeInTheDocument();
    expect(screen.getByText(/valid email address/)).toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toHaveFocus();
    expect(screen.getByLabelText('Full name')).toHaveAttribute('aria-describedby', 'candidate-fullName-error');
    expect(saveMine).not.toHaveBeenCalled();
  });

  it('shows an error on blur', async () => {
    const user = await ready();
    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), 'nope');
    await user.tab();
    expect(screen.getByText(/valid email address/)).toBeInTheDocument();
  });

  it('sends the ID number normalised, and shows it in the summary', async () => {
    const user = await ready();
    const id = screen.getByLabelText('ID number');
    expect(id).toHaveAttribute('aria-describedby', 'candidate-identityCardNumber-hint');

    await user.clear(id);
    await user.type(id, ' 912345678v ');
    expect(screen.getByText('912345678V')).toBeInTheDocument();

    await user.click(saveButton());
    await waitFor(() => expect(saveMine).toHaveBeenCalledTimes(1));
    expect(lastPayload().get('identityCardNumber')).toBe('912345678V');
  });

  it('rejects a malformed ID number', async () => {
    const user = await ready();
    await user.clear(screen.getByLabelText('ID number'));
    await user.type(screen.getByLabelText('ID number'), '12');
    await user.click(saveButton());
    expect(screen.getByText(/valid ID number/)).toBeInTheDocument();
    expect(screen.getByLabelText('ID number')).toHaveFocus();
    expect(saveMine).not.toHaveBeenCalled();
  });

  it('tracks unsaved changes, and Discard puts the saved profile back', async () => {
    const user = await ready();
    expect(screen.getByText('All changes saved.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Discard changes' })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/Phone number/), '9');
    await user.click(poolBox());
    expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.getByLabelText(/Phone number/)).toHaveValue('+94 77 123 4567');
    expect(poolBox()).not.toBeChecked();
    expect(screen.getByText('All changes saved.')).toBeInTheDocument();
    expect(saveMine).not.toHaveBeenCalled();
  });

  it('blocks a second submit while saving', async () => {
    let resolve!: (value: MyCandidateProfileResponse) => void;
    saveMine.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const user = await ready();

    await user.click(saveButton());
    const busy = screen.getByRole('button', { name: /Saving/ });
    expect(busy).toBeDisabled();
    fireEvent.submit(busy.closest('form')!);
    expect(saveMine).toHaveBeenCalledTimes(1);
    resolve(makeProfile());
    expect(await screen.findByText('Profile saved.')).toBeInTheDocument();
  });
});

describe('CandidateProfilePage — profile strength', () => {
  it('scores the profile and updates as it fills in', async () => {
    const user = await ready();
    // Name, ID, email and phone: four of seven.
    expect(strengthBar()).toHaveAttribute('aria-valuenow', '57');

    await user.click(poolBox());
    expect(strengthBar()).toHaveAttribute('aria-valuenow', '71');
  });

  it('takes an unfinished item to the control that finishes it', async () => {
    const user = await ready();
    await user.click(screen.getByRole('button', { name: /Profile photo \(to do\)/ }));
    expect(screen.getByRole('button', { name: /Upload photo/ })).toHaveFocus();

    // The CV sits under the Talent Pool choice, so that comes first.
    await user.click(screen.getByRole('button', { name: /CV uploaded \(to do\)/ }));
    expect(poolBox()).toHaveFocus();
    await user.click(poolBox());
    await user.click(screen.getByRole('button', { name: /CV uploaded \(to do\)/ }));
    expect(screen.getByRole('button', { name: 'Drag & drop or browse' })).toHaveFocus();
  });

  it('lists finished items as done rather than as links', async () => {
    await ready();
    expect(screen.queryByRole('button', { name: /Full name/ })).not.toBeInTheDocument();
    expect(screen.getByText(/^Full name/, { selector: '.tp-checklist-item' })).toHaveTextContent('Full name (done)');
  });
});

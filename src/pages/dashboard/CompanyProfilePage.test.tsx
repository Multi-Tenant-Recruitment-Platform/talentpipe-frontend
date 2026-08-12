import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompanyProfileResponse, UpdateCompanyProfileRequest } from '../../api/types';
import { toFormValues, toUpdateRequest } from '../../dashboard/companyProfile';
import { authContextMock, makeUser, setAuth } from '../../test/authHarness';
import { makeCompanyProfile } from '../../test/companyFixtures';

/**
 * Behaviour of the company profile surface (PB-010).
 *
 * <p>These run against the Profile Management page, but they cover the shared
 * `CompanyProfilePanel` that Company Settings renders too — so they are the
 * suite for both. `CompanySettingsPage.test.tsx` only covers what is unique to
 * settings.</p>
 *
 * <p>Notes for anyone extending this file:</p>
 * <ol>
 *   <li>The profile is fetched in an effect, so the FIRST assertion of every
 *       test must be an `await screen.findBy…` — a bare `getBy` races it.</li>
 *   <li>`companyApi` is mocked wholesale. The page is not supposed to know
 *       whether it talks to the draft store or a real `/tenant`.</li>
 *   <li>Rejections use the plain `{ isAxiosError: true, response: … }` shape,
 *       which is what `axios.isAxiosError` checks.</li>
 * </ol>
 */

vi.mock('../../auth/AuthContext', () => authContextMock);

const get = vi.fn<() => Promise<CompanyProfileResponse>>();
const update = vi.fn();
const uploadImage = vi.fn();
const removeImage = vi.fn();
vi.mock('../../api/company', () => ({ companyApi: { get, update, uploadImage, removeImage } }));

const { CompanyProfilePage } = await import('./CompanyProfilePage');
const { CompanyProfileProvider } = await import('../../dashboard/CompanyProfileContext');

const PROFILE = makeCompanyProfile();

const axiosError = (status: number, message = 'boom') => ({
  isAxiosError: true,
  response: { status, data: { message } },
});

const pngFile = (name = 'logo.png', size = 50_000) => {
  const file = new File(['fake-bytes'], name, { type: 'image/png' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

function renderPage() {
  return render(
    <MemoryRouter>
      <CompanyProfileProvider>
        <CompanyProfilePage />
      </CompanyProfileProvider>
    </MemoryRouter>,
  );
}

async function openEditor(user: ReturnType<typeof userEvent.setup>) {
  renderPage();
  await user.click(await screen.findByRole('button', { name: /edit profile/i }));
  return screen.getByLabelText(/^company name$/i);
}

const lastRequest = (): UpdateCompanyProfileRequest =>
  update.mock.calls[update.mock.calls.length - 1][0];

beforeEach(() => {
  vi.clearAllMocks();
  setAuth({ user: makeUser(), initializing: false });
  get.mockResolvedValue(PROFILE);
  // The saved profile is what comes back — the same contract the endpoint has.
  update.mockImplementation(async (request: UpdateCompanyProfileRequest) => ({
    ...PROFILE,
    ...request,
    updatedAt: new Date().toISOString(),
  }));
  uploadImage.mockImplementation(async (kind: string) => `https://cdn.test/${kind}.png`);
  removeImage.mockResolvedValue(undefined);
});

describe('viewing the profile', () => {
  it('presents the company in sections, with contactable values as links', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'ABC Technologies' })).toBeInTheDocument();

    expect(screen.getByText('Information Technology')).toBeInTheDocument();
    expect(screen.getByText('51–200 employees')).toBeInTheDocument();
    expect(screen.getByTestId('company-description')).toHaveTextContent(
      'ABC Technologies is a software company.',
    );

    expect(within(screen.getByTestId('company-email')).getByRole('link')).toHaveAttribute(
      'href',
      'mailto:contact@abc.com',
    );
    // Separators are stripped for dialling but kept for reading.
    const phone = within(screen.getByTestId('company-phone')).getByRole('link');
    expect(phone).toHaveAttribute('href', 'tel:0112345678');
    expect(phone).toHaveTextContent('011 234 5678');
    // The scheme is what the browser needs, not what a person wants to read.
    const website = within(screen.getByTestId('company-website')).getByRole('link');
    expect(website).toHaveAttribute('href', 'https://abc.com');
    expect(website).toHaveTextContent('abc.com');

    expect(screen.getByTestId('company-address')).toHaveTextContent('No. 42, Galle Road, 00300');
    expect(screen.getByTestId('company-location')).toHaveTextContent('Colombo, Western, Sri Lanka');
    expect(within(screen.getByTestId('company-hrEmail')).getByRole('link')).toHaveAttribute(
      'href',
      'mailto:careers@abc.com',
    );
  });

  it('shows a section heading for each part of the profile', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'ABC Technologies' });

    expect(screen.getByRole('heading', { name: /contact information/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^location$/i })).toBeInTheDocument();
    expect(screen.getByText(/about the company/i)).toBeInTheDocument();
  });

  it('says "Not set" instead of leaving a blank where a value belongs', async () => {
    get.mockResolvedValue({ ...PROFILE, phone: null, city: null, state: null, country: null });
    renderPage();
    await screen.findByRole('heading', { name: 'ABC Technologies' });

    expect(screen.getByTestId('company-phone')).toHaveTextContent('Not set');
    expect(screen.getByTestId('company-location')).toHaveTextContent('Not set');
    // A partial profile is prompted once, and names what is missing so the
    // number turns into a next action.
    expect(screen.getByText(/profile 6 of 9 complete/i)).toBeInTheDocument();
    expect(screen.getByText(/still to add: city, country, company logo/i)).toBeInTheDocument();
  });

  it('falls back to a monogram when there is no logo, and shows one when there is', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'ABC Technologies' });
    // A generic building glyph would make every logo-less company identical.
    expect(screen.getByText('AT')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();

    get.mockResolvedValue({ ...PROFILE, logoUrl: 'https://cdn.test/logo.png' });
    renderPage();
    const logos = await screen.findAllByRole('img', { name: 'ABC Technologies' });
    expect(logos[0]).toHaveAttribute('src', 'https://cdn.test/logo.png');
  });

  it('does not open the editor by itself', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'ABC Technologies' });
    expect(screen.queryByLabelText(/^company name$/i)).toBeNull();
  });
});

describe('editing', () => {
  it('opens with the saved values and saves every field the API accepts', async () => {
    const user = userEvent.setup();
    const nameInput = await openEditor(user);
    expect(nameInput).toHaveValue('ABC Technologies');
    expect(screen.getByLabelText(/company email/i)).toHaveValue('contact@abc.com');
    expect(screen.getByLabelText(/^city$/i)).toHaveValue('Colombo');

    await user.clear(nameInput);
    await user.type(nameInput, 'ABC Technologies (Pvt) Ltd');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    // Every editable field round-trips, with only the name changed.
    expect(lastRequest()).toEqual({
      ...toUpdateRequest(toFormValues(PROFILE)),
      name: 'ABC Technologies (Pvt) Ltd',
    });
    // And nothing that is not this screen's to change goes with it — identity,
    // billing and the images all have their own homes.
    for (const leaked of ['id', 'subdomain', 'planTier', 'status', 'logoUrl', 'coverImageUrl']) {
      expect(lastRequest()).not.toHaveProperty(leaked);
    }
    expect(await screen.findByText(/company profile updated successfully/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ABC Technologies (Pvt) Ltd' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^company name$/i)).toBeNull();
  });

  it('saves a bare domain as a working URL', async () => {
    const user = userEvent.setup();
    await openEditor(user);

    const website = screen.getByLabelText(/^website$/i);
    await user.clear(website);
    await user.type(website, 'newsite.lk');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(lastRequest().website).toBe('https://newsite.lk');
    const link = within(await screen.findByTestId('company-website')).getByRole('link');
    expect(link).toHaveAttribute('href', 'https://newsite.lk');
  });

  it('clears an optional field to null rather than to an empty string', async () => {
    const user = userEvent.setup();
    await openEditor(user);

    await user.clear(screen.getByLabelText(/phone number/i));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(lastRequest().phone).toBeNull();
    expect(await screen.findByTestId('company-phone')).toHaveTextContent('Not set');
  });

  it('offers nothing to save until something changes', async () => {
    const user = userEvent.setup();
    const nameInput = await openEditor(user);
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();

    // Whitespace is not a change, so it must not enable Save either.
    await user.type(nameInput, '  ');
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();

    await user.type(nameInput, 'Ltd');
    expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled();
  });
});

describe('the logo and cover image', () => {
  it('previews a picked image before anything is uploaded', async () => {
    const user = userEvent.setup();
    await openEditor(user);

    await user.upload(screen.getByLabelText('Company logo'), pngFile());

    // The preview is a local data URL — nothing has been sent yet.
    const preview = await screen.findByRole('img', { name: 'ABC Technologies' });
    expect(preview.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
    expect(uploadImage).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /change company logo/i })).toBeInTheDocument();
  });

  it('uploads the staged file on save and shows the stored URL', async () => {
    const user = userEvent.setup();
    await openEditor(user);

    const file = pngFile();
    await user.upload(screen.getByLabelText('Company logo'), file);
    await screen.findByRole('img', { name: 'ABC Technologies' });
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(uploadImage).toHaveBeenCalledWith('logo', file);
    const logo = await screen.findByRole('img', { name: 'ABC Technologies' });
    expect(logo).toHaveAttribute('src', 'https://cdn.test/logo.png');
  });

  it('keeps the two images independent', async () => {
    const user = userEvent.setup();
    await openEditor(user);

    const cover = pngFile('cover.png');
    await user.upload(screen.getByLabelText('Cover image'), cover);
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    // Only the cover was touched, so only the cover is uploaded.
    expect(uploadImage).toHaveBeenCalledTimes(1);
    expect(uploadImage).toHaveBeenCalledWith('cover', cover);
    const banner = await screen.findByRole('img', { name: /ABC Technologies cover/i });
    expect(banner).toHaveAttribute('src', 'https://cdn.test/cover.png');
  });

  it('rejects a file that is not an image it can use', async () => {
    const user = userEvent.setup();
    await openEditor(user);

    // fireEvent, not user.upload: userEvent honours the input's `accept` and
    // silently drops a PDF, so it cannot reach the validator. A real browser
    // filters the picker the same way — but drag-and-drop and the "All files"
    // escape hatch both get past it, which is exactly what this guards.
    fireEvent.change(screen.getByLabelText('Company logo'), {
      target: { files: [new File(['x'], 'cv.pdf', { type: 'application/pdf' })] },
    });

    // Matched on the error's own wording: both pickers also carry a hint
    // listing the same formats, so a looser pattern hits three elements.
    expect(await screen.findByText(/choose a png, jpg, svg or webp image/i)).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('gives the cover a larger ceiling than the logo', async () => {
    const user = userEvent.setup();
    await openEditor(user);
    const threeMb = pngFile('big.png', 3 * 1024 * 1024);

    await user.upload(screen.getByLabelText('Company logo'), threeMb);
    expect(await screen.findByText(/under 2 MB/)).toBeInTheDocument();

    // The very same file is fine as a cover.
    await user.upload(screen.getByLabelText('Cover image'), threeMb);
    expect(await screen.findByRole('img', { name: /cover/i })).toBeInTheDocument();
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('lets a picked logo be abandoned without touching the stored one', async () => {
    const user = userEvent.setup();
    get.mockResolvedValue({ ...PROFILE, logoUrl: 'https://cdn.test/old.png' });
    await openEditor(user);

    await user.upload(screen.getByLabelText('Company logo'), pngFile());
    await screen.findByRole('button', { name: /change company logo/i });

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: /discard changes/i }),
    );

    expect(uploadImage).not.toHaveBeenCalled();
    const logo = await screen.findByRole('img', { name: 'ABC Technologies' });
    expect(logo).toHaveAttribute('src', 'https://cdn.test/old.png');
  });

  it('removes a stored logo through its own endpoint', async () => {
    const user = userEvent.setup();
    get.mockResolvedValue({ ...PROFILE, logoUrl: 'https://cdn.test/old.png' });
    await openEditor(user);

    await user.click(screen.getByRole('button', { name: /^remove$/i }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(removeImage).toHaveBeenCalledWith('logo');
    expect(uploadImage).not.toHaveBeenCalled();
    expect(await screen.findByText('AT')).toBeInTheDocument();
  });

  it('counts an image change on its own as something worth saving', async () => {
    const user = userEvent.setup();
    await openEditor(user);
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();

    await user.upload(screen.getByLabelText('Company logo'), pngFile());
    await screen.findByRole('button', { name: /change company logo/i });

    expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled();
  });
});

describe('the derived counts', () => {
  it('counts the lists rather than storing a number beside them', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'ABC Technologies' });

    const stats = within(screen.getByTestId('company-stats'));
    // Fixture: 3 departments, 2 teams, 1 business unit, 2 offices.
    expect(stats.getByText('Departments').closest('div')).toHaveTextContent('3');
    expect(stats.getByText('Teams').closest('div')).toHaveTextContent('2');
    expect(stats.getByText('Business units').closest('div')).toHaveTextContent('1');
    expect(stats.getByText('Offices').closest('div')).toHaveTextContent('2');
  });

  it('shows only figures this page can answer for', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'ABC Technologies' });

    // Headcounts belong to the team roster and open positions to jobs; both
    // have their own pages. A number here that you cannot change here only
    // raises "where do I edit this?" on a screen that cannot answer.
    const stats = within(screen.getByTestId('company-stats'));
    expect(stats.queryByText(/hr managers/i)).toBeNull();
    expect(stats.queryByText(/interviewers/i)).toBeNull();
    expect(stats.queryByText(/open positions/i)).toBeNull();
  });

  it('follows the list when it changes, with no second number to update', async () => {
    const user = userEvent.setup();
    await openEditor(user);

    await user.type(screen.getByLabelText(/^departments$/i), 'Finance');
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(lastRequest().departments).toEqual(['Engineering', 'QA', 'HR', 'Finance']);
    const stats = within(await screen.findByTestId('company-stats'));
    expect(stats.getByText('Departments').closest('div')).toHaveTextContent('4');
  });
});

describe('the shared profile context', () => {
  it('gives the chrome the edited name, not the one from the login response', async () => {
    const user = userEvent.setup();
    // The workspace chip used to read user.tenantName and never change: an
    // admin renaming the company saw the old name in the top bar until they
    // signed in again. Both now read the one shared profile.
    const { useCompanyIdentity } = await import('../../dashboard/CompanyProfileContext');

    function Chrome() {
      const company = useCompanyIdentity('ABC Technologies');
      return <div data-testid="chip">{company.name}</div>;
    }

    render(
      <MemoryRouter>
        <CompanyProfileProvider>
          <Chrome />
          <CompanyProfilePage />
        </CompanyProfileProvider>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'ABC Technologies' });
    await user.click(screen.getByRole('button', { name: /edit profile/i }));
    const nameInput = screen.getByLabelText(/^company name$/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'LankaTech Solutions');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/updated successfully/i)).toBeInTheDocument();
    expect(screen.getByTestId('chip')).toHaveTextContent('LankaTech Solutions');
  });

  it('falls back to the session name until the profile lands', async () => {
    const { useCompanyIdentity } = await import('../../dashboard/CompanyProfileContext');

    function Chrome() {
      const company = useCompanyIdentity('ABC Technologies');
      return <div data-testid="chip">{company.name}</div>;
    }

    render(
      <MemoryRouter>
        <CompanyProfileProvider>
          <Chrome />
        </CompanyProfileProvider>
      </MemoryRouter>,
    );

    // Never blank while loading — the login response already knows enough.
    expect(screen.getByTestId('chip')).toHaveTextContent('ABC Technologies');
  });
});

describe('the hiring vocabulary', () => {
  it('shows labels for the stored identifiers, in catalogue order', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'ABC Technologies' });

    // 'FULL_TIME' is for the database; 'Full-time' is for the person.
    expect(screen.getByTestId('company-employmentTypes')).toHaveTextContent('Full-time');
    expect(screen.getByTestId('company-employmentTypes')).toHaveTextContent('Internship');
    // Seniority order, never alphabetical — Junior before Senior.
    const levels = within(screen.getByTestId('company-jobLevels')).getAllByRole('listitem');
    expect(levels.map((l) => l.textContent)).toEqual(['Junior', 'Senior']);
    expect(screen.getByTestId('company-jobTitles')).toHaveTextContent('Software Engineer');
  });

  it('keeps job levels in seniority order however they are picked', async () => {
    const user = userEvent.setup();
    await openEditor(user);

    await user.click(screen.getByRole('checkbox', { name: 'Intern' }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(lastRequest().jobLevels).toEqual(['INTERN', 'JUNIOR', 'SENIOR']);
  });
});

describe('benefits, culture and social links', () => {
  it('shows the perks in catalogue order and the culture note', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'ABC Technologies' });

    const perks = within(screen.getByTestId('company-benefits')).getAllByRole('listitem');
    expect(perks.map((p) => p.textContent)).toEqual([
      'Remote / hybrid work',
      'Health insurance',
    ]);
    expect(screen.getByTestId('company-culture')).toHaveTextContent(
      'We encourage collaboration and continuous learning.',
    );
  });

  it('shows only the social links that are set', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'ABC Technologies' });

    expect(within(screen.getByTestId('company-linkedinUrl')).getByRole('link')).toHaveAttribute(
      'href',
      'https://linkedin.com/company/abc',
    );
    // An empty "Not set" row for every unused network is noise on a page
    // meant to sell the company.
    expect(screen.queryByTestId('company-facebookUrl')).toBeNull();
  });

  it('toggles a perk and saves the new set', async () => {
    const user = userEvent.setup();
    await openEditor(user);

    await user.click(screen.getByRole('checkbox', { name: /stock options/i }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(lastRequest().benefits).toEqual([
      'REMOTE_HYBRID',
      'HEALTH_INSURANCE',
      'STOCK_OPTIONS',
    ]);
  });

  it('hides the social section entirely when none are set', async () => {
    get.mockResolvedValue({ ...PROFILE, linkedinUrl: null });
    renderPage();
    await screen.findByRole('heading', { name: 'ABC Technologies' });

    expect(screen.queryByRole('heading', { name: /social links/i })).toBeNull();
  });
});

describe('the public profile preview', () => {
  it('opens a candidate’s-eye view of the saved profile', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: 'ABC Technologies' });

    await user.click(screen.getByRole('button', { name: /preview public profile/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/how your profile reads to a candidate/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'ABC Technologies' })).toBeInTheDocument();
    expect(within(dialog).getByText(/about us/i)).toBeInTheDocument();
    // Twice on purpose: under the company name, and again in the fact strip.
    expect(within(dialog).getAllByText('Colombo, Western, Sri Lanka')).toHaveLength(2);
    // The new candidate-facing details all reach the preview.
    expect(within(dialog).getByText('Hiring software for growing teams')).toBeInTheDocument();
    expect(within(dialog).getByText(/founded 2015/i)).toBeInTheDocument();
    expect(within(dialog).getByTestId('company-mission')).toHaveTextContent(
      'Make hiring fair and fast.',
    );
    expect(within(within(dialog).getByTestId('company-values')).getAllByRole('listitem')).toHaveLength(
      2,
    );
    // Registration and tax are administrative — a candidate never sees them.
    expect(within(dialog).queryByText(/PV 12345/)).toBeNull();
    expect(within(dialog).queryByText(/VAT-987654321/)).toBeNull();
    // The jobs board is a real route, so the call to action goes somewhere.
    expect(within(dialog).getByRole('link', { name: /view open positions/i })).toHaveAttribute(
      'href',
      '/jobs',
    );
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: 'ABC Technologies' });

    const trigger = screen.getByRole('button', { name: /preview public profile/i });
    await user.click(trigger);
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('is offered on the profile page but never inside settings', async () => {
    // Asserted here because the button belongs to the shared view; the
    // settings card would otherwise grow a third footer action.
    renderPage();
    await screen.findByRole('heading', { name: 'ABC Technologies' });
    expect(screen.getByRole('button', { name: /preview public profile/i })).toBeInTheDocument();
  });
});

describe('validation', () => {
  it('refuses to save without a company email, and puts the caret on it', async () => {
    const user = userEvent.setup();
    await openEditor(user);

    const email = screen.getByLabelText(/company email/i);
    await user.clear(email);
    // Dirty via another field, so Save is reachable at all.
    await user.type(screen.getByLabelText(/^city$/i), ' 03');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(update).not.toHaveBeenCalled();
    expect(screen.getByText(/company email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/some details need fixing/i)).toBeInTheDocument();
    expect(document.activeElement).toBe(email);
    expect(email).toHaveAttribute('aria-invalid', 'true');
  });

  it('rejects a malformed website and email with the spec’s wording', async () => {
    const user = userEvent.setup();
    await openEditor(user);

    const website = screen.getByLabelText(/^website$/i);
    await user.clear(website);
    await user.type(website, 'abc');
    const email = screen.getByLabelText(/company email/i);
    await user.clear(email);
    await user.type(email, 'invalid-email');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(screen.getByText(/please enter a valid website/i)).toBeInTheDocument();
    expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });

  it('clears a field error as soon as the field is corrected', async () => {
    const user = userEvent.setup();
    await openEditor(user);

    const email = screen.getByLabelText(/company email/i);
    await user.clear(email);
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(screen.getByText(/company email is required/i)).toBeInTheDocument();

    await user.type(email, 'careers@abc.com');
    expect(screen.queryByText(/company email is required/i)).toBeNull();

    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(lastRequest().email).toBe('careers@abc.com');
  });

  it('does not turn a field red while it is still being typed', async () => {
    const user = userEvent.setup();
    await openEditor(user);

    const email = screen.getByLabelText(/company email/i);
    await user.clear(email);
    // 'c', 'ca', 'car' … every prefix is an invalid address, and saying so on
    // each keystroke is noise, not help.
    await user.type(email, 'careers@ab');
    expect(screen.queryByText(/valid email/i)).toBeNull();
  });
});

describe('leaving the editor', () => {
  it('goes straight back when nothing was changed', async () => {
    const user = userEvent.setup();
    await openEditor(user);

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(await screen.findByRole('button', { name: /edit profile/i })).toBeInTheDocument();
  });

  it('asks before throwing away edits, and keeping them is safe', async () => {
    const user = userEvent.setup();
    const nameInput = await openEditor(user);
    await user.type(nameInput, ' Ltd');

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    const dialog = await screen.findByRole('alertdialog');

    await user.click(within(dialog).getByRole('button', { name: /keep editing/i }));
    expect(screen.getByLabelText(/^company name$/i)).toHaveValue('ABC Technologies Ltd');
  });

  it('restores the saved values when the edits are discarded', async () => {
    const user = userEvent.setup();
    const nameInput = await openEditor(user);
    await user.clear(nameInput);
    await user.type(nameInput, 'Something Else');

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: /discard changes/i }),
    );

    expect(update).not.toHaveBeenCalled();
    expect(await screen.findByRole('heading', { name: 'ABC Technologies' })).toBeInTheDocument();

    // Re-opening starts from the saved profile, not the abandoned edit.
    await user.click(screen.getByRole('button', { name: /edit profile/i }));
    expect(screen.getByLabelText(/^company name$/i)).toHaveValue('ABC Technologies');
  });
});

describe('loading and failures', () => {
  it('shows a skeleton while the profile loads', async () => {
    renderPage();
    expect(screen.getByTestId('profile-skeleton')).toBeInTheDocument();
    await screen.findByRole('heading', { name: 'ABC Technologies' });
    expect(screen.queryByTestId('profile-skeleton')).toBeNull();
  });

  it('offers a retry that recovers from a failed load', async () => {
    const user = userEvent.setup();
    get.mockRejectedValueOnce(axiosError(500));
    renderPage();

    await user.click(await screen.findByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('heading', { name: 'ABC Technologies' })).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('keeps the edits on screen when the save could not be sent', async () => {
    const user = userEvent.setup();
    update.mockRejectedValue({ isAxiosError: true });
    const nameInput = await openEditor(user);
    await user.type(nameInput, ' Ltd');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/nothing was saved/i)).toBeInTheDocument();
    // Losing an admin's typing because the wifi dropped is unforgivable.
    expect(screen.getByLabelText(/^company name$/i)).toHaveValue('ABC Technologies Ltd');
  });

  it('re-syncs and closes the editor when the role changed underneath', async () => {
    const user = userEvent.setup();
    update.mockRejectedValue(axiosError(403, 'Access denied'));
    const nameInput = await openEditor(user);
    await user.type(nameInput, ' Ltd');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/your permissions changed/i)).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
    expect(screen.queryByLabelText(/^company name$/i)).toBeNull();
  });
});

describe('permissions', () => {
  it('lets a role without settings.edit read the profile but not change it', async () => {
    setAuth({ user: makeUser({ role: 'INTERVIEWER' }), initializing: false });
    renderPage();
    await screen.findByRole('heading', { name: 'ABC Technologies' });

    // An interviewer can reach this page — it is their company too.
    expect(screen.getByTestId('company-email')).toHaveTextContent('contact@abc.com');
    expect(screen.queryByRole('button', { name: /edit profile/i })).toBeNull();
    expect(screen.getByText(/ask a company admin to update it/i)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});

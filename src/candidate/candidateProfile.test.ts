import { describe, expect, it } from 'vitest';
import {
  buildCandidatePayload,
  CV_ACCEPT_ATTRIBUTE,
  cvFormat,
  displayedCv,
  blankProfileFor,
  EMPTY_CANDIDATE_FORM,
  isProfileDirty,
  profileChecklist,
  profileStrength,
  leavingTalentPool,
  MAX_CV_BYTES,
  removeCv,
  toCandidateFormState,
  validateCandidateValues,
  validateCvFile,
  validatePhotoFile,
  type CandidateFormState,
} from './candidateProfile';

const PDF = 'application/pdf';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** A File of a given size without allocating the bytes. */
function fakeFile(name: string, type: string, bytes = 100_000): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: bytes });
  return file;
}

const VALID: CandidateFormState = {
  ...EMPTY_CANDIDATE_FORM,
  values: { fullName: ' Jane Perera ', identityCardNumber: ' 912345678v ', email: 'jane@example.com', phone: '' },
};

describe('validateCvFile', () => {
  it.each([
    ['cv.pdf', PDF],
    ['CV.PDF', PDF],
    ['cv.docx', DOCX],
    // Windows reports DOCX with no MIME type when Office is not installed.
    ['cv.docx', ''],
    ['cv.pdf', ''],
  ])('accepts %s with type "%s"', (name, type) => {
    expect(validateCvFile(fakeFile(name, type))).toBeNull();
  });

  it.each([
    ['cv.doc', 'application/msword'],
    ['cv.txt', 'text/plain'],
    ['photo.png', 'image/png'],
    ['cv', ''],
    // Extension and MIME type must agree.
    ['cv.pdf', DOCX],
    ['cv.docx', PDF],
    ['cv.pdf', 'image/png'],
  ])('rejects %s with type "%s"', (name, type) => {
    expect(validateCvFile(fakeFile(name, type))).toBe('Choose a PDF or DOCX file.');
  });

  it('accepts a file exactly at the limit and rejects one byte over', () => {
    expect(validateCvFile(fakeFile('cv.pdf', PDF, MAX_CV_BYTES))).toBeNull();
    expect(validateCvFile(fakeFile('cv.pdf', PDF, MAX_CV_BYTES + 1))).toMatch(/limit is 5 MB/);
  });

  it('names the real size of an oversize file', () => {
    expect(validateCvFile(fakeFile('cv.docx', DOCX, 8 * 1024 * 1024))).toBe(
      'That file is 8 MB. The limit is 5 MB.',
    );
  });

  it('rejects an empty file', () => {
    expect(validateCvFile(fakeFile('cv.pdf', PDF, 0))).toMatch(/empty/);
  });
});

describe('cvFormat', () => {
  it('reads the format from a matching extension and type', () => {
    expect(cvFormat({ name: 'a.pdf', type: PDF })).toBe('PDF');
    expect(cvFormat({ name: 'a.docx', type: '' })).toBe('DOCX');
  });
});

describe('CV_ACCEPT_ATTRIBUTE', () => {
  it('offers both extensions and both MIME types', () => {
    expect(CV_ACCEPT_ATTRIBUTE).toBe(`.pdf,.docx,${PDF},${DOCX}`);
  });
});

describe('validatePhotoFile', () => {
  it('takes images and refuses documents', () => {
    expect(validatePhotoFile(fakeFile('me.jpg', 'image/jpeg'))).toBeNull();
    expect(validatePhotoFile(fakeFile('cv.pdf', PDF))).toMatch(/PNG, JPG/);
    expect(validatePhotoFile(fakeFile('me.png', 'image/png', 3 * 1024 * 1024))).toMatch(/under 2 MB/);
  });
});

describe('validateCandidateValues', () => {
  it.each(['912345678V', '912345678v', '200012345678', 'N1234567', '2000-1234-5678'])('accepts the ID %s', (id) => {
    expect(validateCandidateValues({ ...VALID.values, identityCardNumber: id }).identityCardNumber).toBeUndefined();
  });

  it.each(['1234', '912345678V!', 'ID: 91234', '123456789012345678901'])('rejects the ID %s', (id) => {
    expect(validateCandidateValues({ ...VALID.values, identityCardNumber: id }).identityCardNumber).toMatch(
      /valid ID number/,
    );
  });

  it('requires a name, an ID number and an email, and nothing else', () => {
    expect(validateCandidateValues({ fullName: ' ', identityCardNumber: '', email: '', phone: '' })).toEqual({
      fullName: 'Enter your full name.',
      identityCardNumber: 'Enter your ID number.',
      email: 'Enter your email address.',
    });
    expect(validateCandidateValues(VALID.values)).toEqual({});
  });

  it('checks the email format and an optional phone only when given', () => {
    const errors = validateCandidateValues({ ...VALID.values, email: 'jane@', phone: 'abc' });
    expect(errors.email).toMatch(/valid email/);
    expect(errors.phone).toMatch(/valid phone/);
    expect(validateCandidateValues({ ...VALID.values, phone: '+94 77 123 4567' })).toEqual({});
  });
});

describe('buildCandidatePayload', () => {
  const cv = fakeFile('cv.pdf', PDF);

  it('sends no CV when the Talent Pool is off, even with one staged', () => {
    const form = buildCandidatePayload({ ...VALID, addToTalentPool: false, cvFile: cv });
    expect(form.get('addToTalentPool')).toBe('false');
    expect(form.has('cv')).toBe(false);
    expect(form.has('removeCv')).toBe(false);
  });

  it('sends the staged CV when the Talent Pool is on', () => {
    const form = buildCandidatePayload({ ...VALID, addToTalentPool: true, cvFile: cv });
    expect(form.get('addToTalentPool')).toBe('true');
    expect((form.get('cv') as File).name).toBe('cv.pdf');
  });

  it('saves into the pool with no CV at all', () => {
    const form = buildCandidatePayload({ ...VALID, addToTalentPool: true });
    expect(form.get('addToTalentPool')).toBe('true');
    expect(form.has('cv')).toBe(false);
  });

  it('trims the text fields and always sends phone, even empty', () => {
    const form = buildCandidatePayload(VALID);
    expect(form.get('fullName')).toBe('Jane Perera');
    // Normalised, so 912345678v and 912345678V are one ID.
    expect(form.get('identityCardNumber')).toBe('912345678V');
    expect(form.get('email')).toBe('jane@example.com');
    expect(form.get('phone')).toBe('');
    expect(form.has('photo')).toBe(false);
  });

  it('asks for a stored CV to go only when it was marked and the pool stays on', () => {
    const existing = { ...VALID, addToTalentPool: true, existingCv: { name: 'old.pdf' } };
    expect(buildCandidatePayload(removeCv(existing)).get('removeCv')).toBe('true');
    expect(buildCandidatePayload(existing).has('removeCv')).toBe(false);
  });

  it('sends a photo, or a request to remove the stored one', () => {
    const photo = fakeFile('me.png', 'image/png');
    expect((buildCandidatePayload({ ...VALID, photoFile: photo }).get('photo') as File).name).toBe('me.png');
    const removing = { ...VALID, existingPhotoUrl: '/p.png', removePhoto: true };
    expect(buildCandidatePayload(removing).get('removePhoto')).toBe('true');
  });
});

describe('stored-profile state', () => {
  const state = toCandidateFormState({
    id: 'c-1',
    fullName: 'Jane Perera',
    email: 'jane@example.com',
    phone: null,
    identityCardNumber: '200012345678',
    photoUrl: null,
    inTalentPool: true,
    cv: { fileName: 'jane-cv.pdf', sizeBytes: 240_000, url: null },
  });

  it('prefills a pool member with their stored CV', () => {
    expect(state.addToTalentPool).toBe(true);
    expect(state.values.phone).toBe('');
    expect(state.values.identityCardNumber).toBe('200012345678');
    expect(displayedCv(state)).toEqual({ name: 'jane-cv.pdf', size: 240_000, url: undefined, format: 'PDF' });
  });

  it('marks, rather than drops, a stored CV on Remove', () => {
    const removed = removeCv(state);
    expect(removed.existingCv).not.toBeNull();
    expect(removed.removeExistingCv).toBe(true);
    expect(displayedCv(removed)).toBeNull();
  });

  it('flags leaving the pool only for a member who was in it', () => {
    expect(leavingTalentPool({ ...state, addToTalentPool: false })).toBe(true);
    expect(leavingTalentPool(state)).toBe(false);
    expect(leavingTalentPool(EMPTY_CANDIDATE_FORM)).toBe(false);
  });
});

describe('blankProfileFor', () => {
  it('starts a first profile from the account name and email, outside the pool', () => {
    const state = blankProfileFor({ firstName: 'Jane', lastName: 'Perera', email: 'jane@example.com' });
    expect(state.values).toEqual({ fullName: 'Jane Perera', identityCardNumber: '', email: 'jane@example.com', phone: '' });
    expect(state.addToTalentPool).toBe(false);
    expect(blankProfileFor(null)).toBe(EMPTY_CANDIDATE_FORM);
  });
});

describe('profile strength', () => {
  it('counts only valid, filled items and rounds to a percentage', () => {
    const items = profileChecklist(VALID);
    // Name, ID and email are done; phone, photo, pool and CV are not.
    expect(items.filter((item) => item.done).map((item) => item.id)).toEqual(['fullName', 'identityCardNumber', 'email']);
    expect(profileStrength(items)).toBe(43);
    expect(profileStrength(profileChecklist({ ...VALID, values: { ...VALID.values, email: 'nope' } }))).toBe(29);
  });

  it('counts a CV only while the Talent Pool is on', () => {
    const cv = fakeFile('cv.pdf', PDF);
    const cvDone = (state: CandidateFormState) => profileChecklist(state).find((item) => item.id === 'cv')!.done;
    expect(cvDone({ ...VALID, cvFile: cv, addToTalentPool: false })).toBe(false);
    expect(cvDone({ ...VALID, cvFile: cv, addToTalentPool: true })).toBe(true);
  });
});

describe('isProfileDirty', () => {
  it('notices edits, staged files and pool changes, but not a CV that would not be sent', () => {
    expect(isProfileDirty(VALID, VALID)).toBe(false);
    expect(isProfileDirty(VALID, { ...VALID, values: { ...VALID.values, phone: '1' } })).toBe(true);
    expect(isProfileDirty(VALID, { ...VALID, addToTalentPool: true })).toBe(true);
    expect(isProfileDirty(VALID, { ...VALID, cvFile: fakeFile('cv.pdf', PDF) })).toBe(false);
    expect(isProfileDirty(VALID, { ...VALID, photoFile: fakeFile('me.png', 'image/png') })).toBe(true);
  });
});

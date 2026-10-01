import { describe, expect, it } from 'vitest';
import { makeUser } from '../test/authHarness';
import {
  formatFileSize,
  initialApplicationValues,
  toApplicationRequest,
  validateApplication,
  validateResume,
  type ApplicationFormValues,
} from './applicationForm';

function makeFile(name: string, size = 1024) {
  const file = new File(['x'], name);
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

const VALID: ApplicationFormValues = {
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '+94 77 123 4567',
  location: '',
  resume: makeFile('ada-cv.pdf'),
  currentTitle: '',
  yearsOfExperience: '',
  portfolioUrl: '',
  coverLetter: '',
  consent: true,
};

describe('initialApplicationValues', () => {
  it('prefills name and email for a signed-in candidate', () => {
    const values = initialApplicationValues(makeUser({ role: 'CANDIDATE', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@x.test' }));
    expect(values).toMatchObject({ fullName: 'Ada Lovelace', email: 'ada@x.test', phone: '', resume: null, consent: false });
  });

  it('starts empty for visitors and company users', () => {
    expect(initialApplicationValues(null).fullName).toBe('');
    expect(initialApplicationValues(makeUser({ role: 'COMPANY_ADMIN' })).email).toBe('');
  });
});

describe('validateApplication', () => {
  it('accepts a complete application', () => {
    expect(validateApplication(VALID)).toEqual({});
  });

  it('requires name, email, phone, a resume and consent, ignoring whitespace', () => {
    const errors = validateApplication({ ...VALID, fullName: '  ', email: '', phone: ' ', resume: null, consent: false });
    expect(Object.keys(errors).sort()).toEqual(['consent', 'email', 'fullName', 'phone', 'resume']);
  });

  it('leaves location, job title and experience optional', () => {
    expect(validateApplication({ ...VALID, location: ' ', currentTitle: '', yearsOfExperience: '' })).toEqual({});
  });

  it.each(['0', '7', '60'])('accepts %j years of experience', (yearsOfExperience) => {
    expect(validateApplication({ ...VALID, yearsOfExperience }).yearsOfExperience).toBeUndefined();
  });

  it.each(['-1', '2.5', '61', 'five'])('rejects %j years of experience', (yearsOfExperience) => {
    expect(validateApplication({ ...VALID, yearsOfExperience }).yearsOfExperience).toBeTruthy();
  });

  it.each(['ada', 'ada@', 'ada@example', 'a da@example.com'])('rejects the email %j', (email) => {
    expect(validateApplication({ ...VALID, email }).email).toBeTruthy();
  });

  it.each(['0771234567', '+94 77 123 4567', '(077) 123-4567'])('accepts the phone %j', (phone) => {
    expect(validateApplication({ ...VALID, phone }).phone).toBeUndefined();
  });

  it.each(['12345', 'call me', '+94 77 123 4567 890 12'])('rejects the phone %j', (phone) => {
    expect(validateApplication({ ...VALID, phone }).phone).toBeTruthy();
  });

  it('only accepts http(s) links for the portfolio', () => {
    expect(validateApplication({ ...VALID, portfolioUrl: 'https://linkedin.com/in/ada' }).portfolioUrl).toBeUndefined();
    expect(validateApplication({ ...VALID, portfolioUrl: 'linkedin.com/in/ada' }).portfolioUrl).toBeTruthy();
    expect(validateApplication({ ...VALID, portfolioUrl: 'javascript:alert(1)' }).portfolioUrl).toBeTruthy();
  });

  it('limits the cover letter length', () => {
    expect(validateApplication({ ...VALID, coverLetter: 'x'.repeat(2001) }).coverLetter).toBeTruthy();
  });
});

describe('validateResume', () => {
  it.each(['cv.pdf', 'CV.DOCX', 'resume.doc'])('accepts %j', (name) => {
    expect(validateResume(makeFile(name))).toBeUndefined();
  });

  it('rejects other file types', () => {
    expect(validateResume(makeFile('cv.png'))).toMatch(/PDF, DOC or DOCX/);
    expect(validateResume(makeFile('cv.pdf.exe'))).toMatch(/PDF, DOC or DOCX/);
  });

  it('rejects empty files and files over 5 MB', () => {
    expect(validateResume(makeFile('cv.pdf', 0))).toMatch(/empty/);
    expect(validateResume(makeFile('cv.pdf', 5 * 1024 * 1024))).toBeUndefined();
    expect(validateResume(makeFile('cv.pdf', 5 * 1024 * 1024 + 1))).toMatch(/under 5\.0 MB/);
  });
});

describe('formatFileSize', () => {
  it('shows small files in KB and larger ones in MB', () => {
    expect(formatFileSize(200)).toBe('1 KB');
    expect(formatFileSize(340 * 1024)).toBe('340 KB');
    expect(formatFileSize(1.25 * 1024 * 1024)).toBe('1.3 MB');
  });
});

describe('toApplicationRequest', () => {
  it('trims values and sends empty optional fields as null', () => {
    expect(toApplicationRequest({ ...VALID, fullName: '  Ada Lovelace ', location: ' ', portfolioUrl: '  ', coverLetter: '' })).toEqual({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '+94 77 123 4567',
      location: null,
      currentTitle: null,
      yearsOfExperience: null,
      portfolioUrl: null,
      coverLetter: null,
      consentGiven: true,
    });
  });

  it('sends the optional career details when given', () => {
    expect(
      toApplicationRequest({ ...VALID, location: ' Colombo, Sri Lanka ', currentTitle: 'Engineer ', yearsOfExperience: '07' }),
    ).toMatchObject({ location: 'Colombo, Sri Lanka', currentTitle: 'Engineer', yearsOfExperience: 7 });
  });
});

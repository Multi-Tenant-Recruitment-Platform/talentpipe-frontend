import { describe, expect, it } from 'vitest';
import { makeUser } from '../test/authHarness';
import { initialApplicationValues, toApplicationRequest, validateApplication, type ApplicationFormValues } from './applicationForm';

const VALID: ApplicationFormValues = {
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '+94 77 123 4567',
  portfolioUrl: '',
  coverLetter: '',
};

describe('initialApplicationValues', () => {
  it('prefills name and email for a signed-in candidate', () => {
    const values = initialApplicationValues(makeUser({ role: 'CANDIDATE', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@x.test' }));
    expect(values).toMatchObject({ fullName: 'Ada Lovelace', email: 'ada@x.test', phone: '' });
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

  it('requires name, email and phone, ignoring whitespace', () => {
    const errors = validateApplication({ ...VALID, fullName: '  ', email: '', phone: ' ' });
    expect(Object.keys(errors).sort()).toEqual(['email', 'fullName', 'phone']);
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

describe('toApplicationRequest', () => {
  it('trims values and sends empty optional fields as null', () => {
    expect(toApplicationRequest({ ...VALID, fullName: '  Ada Lovelace ', portfolioUrl: '  ', coverLetter: '' })).toEqual({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '+94 77 123 4567',
      portfolioUrl: null,
      coverLetter: null,
    });
  });
});

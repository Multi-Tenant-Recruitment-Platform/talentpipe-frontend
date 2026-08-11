import { describe, expect, it } from 'vitest';
import type { CompanyProfileResponse } from '../api/types';
import {
  changedFields,
  EMPTY_FORM_VALUES,
  isDirty,
  normalizeFormValues,
  normalizeWebsite,
  profileCompleteness,
  toFormValues,
  toUpdateRequest,
  validateCompanyProfile,
  websiteLabel,
  type CompanyFormValues,
} from './companyProfile';

const COMPLETE: CompanyFormValues = {
  name: 'ABC Technologies',
  industry: 'Information Technology',
  size: '51–200 employees',
  email: 'hr@abc.com',
  phone: '011 234 5678',
  website: 'https://abc.com',
  address: 'Colombo, Sri Lanka',
  description: 'We build recruitment software.',
};

const form = (overrides: Partial<CompanyFormValues> = {}): CompanyFormValues => ({
  ...COMPLETE,
  ...overrides,
});

describe('toFormValues', () => {
  it('turns every null the API can send into an empty string', () => {
    const profile: CompanyProfileResponse = {
      id: 't-1',
      name: 'ABC Technologies',
      subdomain: 'abc',
      industry: null,
      size: null,
      email: null,
      phone: null,
      website: null,
      address: null,
      description: null,
      planTier: 'STANDARD',
      status: 'ACTIVE',
      updatedAt: null,
    };

    // A null reaching a controlled <input value> is React's "uncontrolled to
    // controlled" warning and a field that silently stops updating.
    expect(toFormValues(profile)).toEqual({ ...EMPTY_FORM_VALUES, name: 'ABC Technologies' });
  });
});

describe('normalizeWebsite', () => {
  it('adds https:// to a bare domain', () => {
    expect(normalizeWebsite('abc.com')).toBe('https://abc.com');
    expect(normalizeWebsite('  abc.com/careers ')).toBe('https://abc.com/careers');
  });

  it('leaves an explicit scheme alone, whatever its case', () => {
    expect(normalizeWebsite('http://abc.com')).toBe('http://abc.com');
    expect(normalizeWebsite('HTTPS://abc.com')).toBe('HTTPS://abc.com');
  });

  it('keeps blank blank rather than inventing https://', () => {
    expect(normalizeWebsite('')).toBe('');
    expect(normalizeWebsite('   ')).toBe('');
  });
});

describe('normalizeFormValues', () => {
  it('trims every field and collapses runs of whitespace in the name', () => {
    const normalized = normalizeFormValues(
      form({ name: '  ABC   Technologies  ', address: ' Colombo ', description: ' Hello ' }),
    );
    expect(normalized.name).toBe('ABC Technologies');
    expect(normalized.address).toBe('Colombo');
    expect(normalized.description).toBe('Hello');
  });

  it('does not collapse the line breaks a description is written with', () => {
    const normalized = normalizeFormValues(form({ description: 'Line one.\n\nLine two.' }));
    expect(normalized.description).toBe('Line one.\n\nLine two.');
  });
});

describe('validateCompanyProfile', () => {
  it('accepts a complete profile', () => {
    expect(validateCompanyProfile(COMPLETE)).toEqual({});
  });

  it('accepts a profile with every optional field blank', () => {
    expect(
      validateCompanyProfile(form({ industry: '', size: '', phone: '', website: '', address: '', description: '' })),
    ).toEqual({});
  });

  it('requires a name that is more than whitespace', () => {
    expect(validateCompanyProfile(form({ name: '' })).name).toMatch(/required/i);
    expect(validateCompanyProfile(form({ name: '   ' })).name).toMatch(/required/i);
  });

  it('requires a contact email, and rejects a malformed one', () => {
    expect(validateCompanyProfile(form({ email: '' })).email).toMatch(/required/i);
    expect(validateCompanyProfile(form({ email: 'hr@abc' })).email).toMatch(/valid email/i);
    expect(validateCompanyProfile(form({ email: 'hr at abc.com' })).email).toMatch(/valid email/i);
    expect(validateCompanyProfile(form({ email: '  hr@abc.com  ' })).email).toBeUndefined();
  });

  it('accepts the separators people actually type in a phone number', () => {
    for (const phone of ['+94 11 234 5678', '011-234-5678', '(011) 2345678']) {
      expect(validateCompanyProfile(form({ phone })).phone).toBeUndefined();
    }
  });

  it('rejects a phone number that is letters, or too short to dial', () => {
    expect(validateCompanyProfile(form({ phone: 'call us' })).phone).toMatch(/valid phone/i);
    expect(validateCompanyProfile(form({ phone: '12345' })).phone).toMatch(/valid phone/i);
  });

  it('validates the website as it would be saved, not as it was typed', () => {
    // 'abc.com' is not a URL until normalizeWebsite has run — validating the
    // raw input would reject the single most common way of typing this.
    expect(validateCompanyProfile(form({ website: 'abc.com' })).website).toBeUndefined();
    expect(validateCompanyProfile(form({ website: 'not a website' })).website).toMatch(/valid website/i);
    // A single label is a valid URL but never a public site.
    expect(validateCompanyProfile(form({ website: 'https://intranet' })).website).toMatch(/valid website/i);
  });

  it('caps the description and says how far over it is', () => {
    const error = validateCompanyProfile(form({ description: 'x'.repeat(1001) })).description;
    expect(error).toMatch(/1000/);
    expect(error).toMatch(/1001/);
    expect(validateCompanyProfile(form({ description: 'x'.repeat(1000) })).description).toBeUndefined();
  });
});

describe('changedFields', () => {
  it('ignores edits that would save identically', () => {
    // Whitespace is not a change — and it must not be saved as one.
    expect(isDirty(COMPLETE, form({ name: '  ABC Technologies  ' }))).toBe(false);
    expect(isDirty(COMPLETE, form({ description: 'We build recruitment software. ' }))).toBe(false);
  });

  it('sees a bare domain as unchanged once it is already normalised', () => {
    expect(isDirty(COMPLETE, form({ website: 'abc.com' }))).toBe(false);
  });

  it('names exactly the fields that differ', () => {
    expect(changedFields(COMPLETE, form({ phone: '011 999 8888', address: 'Kandy' }))).toEqual([
      'phone',
      'address',
    ]);
  });
});

describe('toUpdateRequest', () => {
  it('sends blank optionals as null and never as an empty string', () => {
    expect(toUpdateRequest(form({ phone: '', website: '', address: '', description: '' }))).toEqual({
      name: 'ABC Technologies',
      industry: 'Information Technology',
      size: '51–200 employees',
      email: 'hr@abc.com',
      phone: null,
      website: null,
      address: null,
      description: null,
    });
  });

  it('sends the normalised website, not the typed one', () => {
    expect(toUpdateRequest(form({ website: 'abc.com' })).website).toBe('https://abc.com');
  });
});

describe('profileCompleteness', () => {
  it('reports 100% and nothing missing for a full profile', () => {
    expect(profileCompleteness(COMPLETE)).toEqual({
      filled: 8,
      total: 8,
      percent: 100,
      missing: [],
    });
  });

  it('counts a whitespace-only field as missing', () => {
    const { filled, percent, missing } = profileCompleteness(form({ phone: '   ', address: '' }));
    expect(missing).toEqual(['phone', 'address']);
    expect(filled).toBe(6);
    expect(percent).toBe(75);
  });
});

describe('websiteLabel', () => {
  it('shows what people read, not what the browser needs', () => {
    expect(websiteLabel('https://abc.com')).toBe('abc.com');
    expect(websiteLabel('http://abc.com/')).toBe('abc.com');
    expect(websiteLabel('https://abc.com/careers')).toBe('abc.com/careers');
  });
});

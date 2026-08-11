import { describe, expect, it } from 'vitest';
import type { CompanyProfileResponse } from '../api/types';
import {
  benefitLabel,
  changedFields,
  companyInitials,
  EMPTY_FORM_VALUES,
  formatLocation,
  isDirty,
  sortBenefits,
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
  description: 'We build recruitment software.',
  culture: 'We encourage collaboration and continuous learning.',
  email: 'contact@abc.com',
  phone: '011 234 5678',
  website: 'https://abc.com',
  linkedinUrl: 'https://linkedin.com/company/abc',
  facebookUrl: 'https://facebook.com/abc',
  twitterUrl: 'https://x.com/abc',
  address: 'No. 42, Galle Road',
  city: 'Colombo',
  country: 'Sri Lanka',
  benefits: ['REMOTE_HYBRID', 'HEALTH_INSURANCE'],
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
      logoUrl: null,
      coverImageUrl: null,
      industry: null,
      size: null,
      description: null,
      culture: null,
      benefits: [],
      email: null,
      phone: null,
      website: null,
      linkedinUrl: null,
      facebookUrl: null,
      twitterUrl: null,
      address: null,
      city: null,
      country: null,
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
      validateCompanyProfile(
        form({
          industry: '',
          size: '',
          description: '',
          phone: '',
          website: '',
          address: '',
          city: '',
          country: '',
        }),
      ),
    ).toEqual({});
  });

  it('requires a name that is more than whitespace', () => {
    expect(validateCompanyProfile(form({ name: '' })).name).toMatch(/required/i);
    expect(validateCompanyProfile(form({ name: '   ' })).name).toMatch(/required/i);
  });

  it('requires a company email, and rejects a malformed one', () => {
    expect(validateCompanyProfile(form({ email: '' })).email).toMatch(/required/i);
    expect(validateCompanyProfile(form({ email: 'invalid-email' })).email).toMatch(/valid email/i);
    expect(validateCompanyProfile(form({ email: 'hr@abc' })).email).toMatch(/valid email/i);
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
    expect(changedFields(COMPLETE, form({ phone: '011 999 8888', city: 'Kandy' }))).toEqual([
      'phone',
      'city',
    ]);
  });
});

describe('formatLocation', () => {
  it('joins city and country the way a person reads them', () => {
    expect(formatLocation(COMPLETE)).toBe('Colombo, Sri Lanka');
  });

  it('drops whichever half is missing instead of leaving a dangling comma', () => {
    expect(formatLocation(form({ country: '' }))).toBe('Colombo');
    expect(formatLocation(form({ city: '' }))).toBe('Sri Lanka');
    expect(formatLocation(form({ city: '', country: '' }))).toBe('');
  });
});

describe('companyInitials', () => {
  it('takes one letter from each of the first two words', () => {
    expect(companyInitials('ABC Technologies')).toBe('AT');
    expect(companyInitials('Acme')).toBe('A');
    expect(companyInitials('  spaced   out  name ')).toBe('SO');
  });

  it('never renders an empty monogram', () => {
    expect(companyInitials('')).toBe('?');
    expect(companyInitials('   ')).toBe('?');
  });
});

describe('toUpdateRequest', () => {
  it('sends blank optionals as null and never as an empty string', () => {
    expect(
      toUpdateRequest(
        form({
          description: '',
          culture: '',
          phone: '',
          website: '',
          linkedinUrl: '',
          facebookUrl: '',
          twitterUrl: '',
          address: '',
          city: '',
          country: '',
          benefits: [],
        }),
      ),
    ).toEqual({
      name: 'ABC Technologies',
      industry: 'Information Technology',
      size: '51–200 employees',
      description: null,
      culture: null,
      benefits: [],
      email: 'contact@abc.com',
      phone: null,
      website: null,
      linkedinUrl: null,
      facebookUrl: null,
      twitterUrl: null,
      address: null,
      city: null,
      country: null,
    });
  });

  it('sends the normalised website, not the typed one', () => {
    expect(toUpdateRequest(form({ website: 'abc.com' })).website).toBe('https://abc.com');
  });

  it('normalises social links the same way as the website', () => {
    const request = toUpdateRequest(
      form({ linkedinUrl: 'linkedin.com/company/abc', twitterUrl: 'x.com/abc' }),
    );
    expect(request.linkedinUrl).toBe('https://linkedin.com/company/abc');
    expect(request.twitterUrl).toBe('https://x.com/abc');
  });

  it('sends benefits in catalogue order, whatever order they were picked', () => {
    // Otherwise the same set of perks looks like a change on every save.
    expect(toUpdateRequest(form({ benefits: ['HEALTH_INSURANCE', 'REMOTE_HYBRID'] })).benefits).toEqual(
      ['REMOTE_HYBRID', 'HEALTH_INSURANCE'],
    );
  });
});

describe('benefits', () => {
  it('treats a re-ordered selection as unchanged', () => {
    expect(isDirty(COMPLETE, form({ benefits: ['HEALTH_INSURANCE', 'REMOTE_HYBRID'] }))).toBe(false);
  });

  it('sees an added or removed perk as a change', () => {
    expect(changedFields(COMPLETE, form({ benefits: ['REMOTE_HYBRID'] }))).toEqual(['benefits']);
    expect(
      changedFields(COMPLETE, form({ benefits: [...COMPLETE.benefits, 'STOCK_OPTIONS'] })),
    ).toEqual(['benefits']);
  });

  it('keeps a retired benefit readable instead of dropping it', () => {
    // The catalogue can change; data already saved against it cannot.
    expect(benefitLabel('REMOTE_HYBRID')).toBe('Remote / hybrid work');
    expect(benefitLabel('SOME_RETIRED_PERK')).toBe('SOME_RETIRED_PERK');
    expect(sortBenefits(['SOME_RETIRED_PERK', 'REMOTE_HYBRID'])).toEqual([
      'REMOTE_HYBRID',
      'SOME_RETIRED_PERK',
    ]);
  });
});

describe('social link validation', () => {
  it('accepts a bare domain and rejects nonsense', () => {
    expect(validateCompanyProfile(form({ linkedinUrl: 'linkedin.com/company/abc' })).linkedinUrl)
      .toBeUndefined();
    expect(validateCompanyProfile(form({ facebookUrl: 'not a link' })).facebookUrl).toMatch(
      /valid Facebook link/i,
    );
  });

  it('leaves an unset social link alone', () => {
    expect(validateCompanyProfile(form({ linkedinUrl: '', facebookUrl: '', twitterUrl: '' })))
      .toEqual({});
  });
});

describe('profileCompleteness', () => {
  it('reaches 100% on the fields a candidate actually needs, plus a logo', () => {
    // Deliberately not every field — socials, culture, benefits, phone and the
    // street address are enrichment. A meter that can never reach 100% stops
    // being read, so it must be reachable with a reasonable profile.
    expect(profileCompleteness(COMPLETE, true)).toEqual({
      filled: 9,
      total: 9,
      percent: 100,
      missing: [],
    });
  });

  it('counts a missing logo, and names what is missing in words', () => {
    const { filled, total, percent, missing } = profileCompleteness(COMPLETE, false);
    expect(missing).toEqual(['Company logo']);
    expect(filled).toBe(8);
    expect(total).toBe(9);
    expect(percent).toBe(89);
  });

  it('counts a whitespace-only field as missing', () => {
    const { missing } = profileCompleteness(form({ city: '   ', country: '' }), true);
    expect(missing).toEqual(['City', 'Country']);
  });

  it('ignores the enrichment fields entirely', () => {
    // Blanking every one of these must not move the meter.
    const stripped = form({
      culture: '',
      phone: '',
      address: '',
      linkedinUrl: '',
      facebookUrl: '',
      twitterUrl: '',
      benefits: [],
    });
    expect(profileCompleteness(stripped, true).percent).toBe(100);
  });
});

describe('websiteLabel', () => {
  it('shows what people read, not what the browser needs', () => {
    expect(websiteLabel('https://abc.com')).toBe('abc.com');
    expect(websiteLabel('http://abc.com/')).toBe('abc.com');
    expect(websiteLabel('https://abc.com/careers')).toBe('abc.com/careers');
  });
});

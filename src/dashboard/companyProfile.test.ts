import { describe, expect, it } from 'vitest';
import { makeCompanyProfile, makeEmptyCompanyProfile } from '../test/companyFixtures';
import {
  benefitLabel,
  changedFields,
  cleanValues,
  companyInitials,
  currencyCode,
  EMPTY_FORM_VALUES,
  formatLocation,
  formatStreet,
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

const COMPLETE: CompanyFormValues = toFormValues(
  makeCompanyProfile({
    facebookUrl: 'https://facebook.com/abc',
    twitterUrl: 'https://x.com/abc',
  }),
);

const form = (overrides: Partial<CompanyFormValues> = {}): CompanyFormValues => ({
  ...COMPLETE,
  ...overrides,
});

describe('toFormValues', () => {
  it('turns every null the API can send into an empty string', () => {
    // A null reaching a controlled <input value> is React's "uncontrolled to
    // controlled" warning and a field that silently stops updating.
    expect(toFormValues(makeEmptyCompanyProfile())).toEqual({
      ...EMPTY_FORM_VALUES,
      name: 'ABC Technologies',
    });
  });

  it('renders numbers as the strings the inputs hold', () => {
    const values = toFormValues(makeCompanyProfile({ foundedYear: 2015, employeeCount: 120 }));
    expect(values.foundedYear).toBe('2015');
    expect(values.employeeCount).toBe('120');

    // Zero is a real value and must not be flattened into "not set" — the
    // classic falsy bug that would blank a legitimate figure.
    expect(toFormValues(makeCompanyProfile({ employeeCount: 0 })).employeeCount).toBe('0');
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
    expect(isDirty(COMPLETE, form({ name: `  ${COMPLETE.name}  ` }))).toBe(false);
    expect(isDirty(COMPLETE, form({ description: `${COMPLETE.description} ` }))).toBe(false);
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
  it('joins city, state and country the way a person reads them', () => {
    expect(formatLocation(COMPLETE)).toBe('Colombo, Western, Sri Lanka');
  });

  it('drops whichever parts are missing instead of leaving dangling commas', () => {
    expect(formatLocation(form({ state: '' }))).toBe('Colombo, Sri Lanka');
    expect(formatLocation(form({ country: '', state: '' }))).toBe('Colombo');
    expect(formatLocation(form({ city: '', state: '' }))).toBe('Sri Lanka');
    expect(formatLocation(form({ city: '', state: '', country: '' }))).toBe('');
  });
});

describe('formatStreet', () => {
  it('joins the street line and the postal code', () => {
    expect(formatStreet(COMPLETE)).toBe('No. 42, Galle Road, 00300');
    expect(formatStreet(form({ postalCode: '' }))).toBe('No. 42, Galle Road');
    expect(formatStreet(form({ address: '', postalCode: '' }))).toBe('');
  });
});

describe('currencyCode', () => {
  it('keeps the code and drops the label', () => {
    // 'LKR' belongs next to a salary figure; the full name belongs in the picker.
    expect(currencyCode('LKR — Sri Lankan rupee')).toBe('LKR');
    expect(currencyCode('USD')).toBe('USD');
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
    const request = toUpdateRequest({ ...EMPTY_FORM_VALUES, name: 'ABC', email: 'a@b.com' });

    // Every optional text field is null; the list fields are [], never null.
    const nulls = Object.entries(request).filter(([, value]) => value === null);
    expect(nulls.length).toBeGreaterThan(20);
    expect(request.name).toBe('ABC');
    expect(request.email).toBe('a@b.com');
    expect(request.values).toEqual([]);
    expect(request.benefits).toEqual([]);
    expect(request.workModes).toEqual([]);
    expect(Object.values(request)).not.toContain('');
  });

  it('sends the numbers as numbers, not as the strings the form held', () => {
    const request = toUpdateRequest(form({ foundedYear: '2015', employeeCount: '120' }));
    expect(request.foundedYear).toBe(2015);
    expect(request.employeeCount).toBe(120);

    const blank = toUpdateRequest(form({ foundedYear: '', employeeCount: '' }));
    expect(blank.foundedYear).toBeNull();
    expect(blank.employeeCount).toBeNull();
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

describe('numbers', () => {
  it('rejects a founded year that is impossible', () => {
    const thisYear = new Date().getFullYear();
    expect(validateCompanyProfile(form({ foundedYear: '1750' })).foundedYear).toMatch(/between/i);
    expect(validateCompanyProfile(form({ foundedYear: String(thisYear + 1) })).foundedYear).toMatch(
      /between/i,
    );
    expect(validateCompanyProfile(form({ foundedYear: '2015.5' })).foundedYear).toMatch(/between/i);
    // A number input yields '' for "abc", but a paste can still land here.
    expect(validateCompanyProfile(form({ foundedYear: 'abc' })).foundedYear).toMatch(/between/i);
  });

  it('accepts the boundary years', () => {
    const thisYear = String(new Date().getFullYear());
    expect(validateCompanyProfile(form({ foundedYear: '1800' })).foundedYear).toBeUndefined();
    expect(validateCompanyProfile(form({ foundedYear: thisYear })).foundedYear).toBeUndefined();
  });

  it('requires the employee count to be a whole positive number', () => {
    expect(validateCompanyProfile(form({ employeeCount: '0' })).employeeCount).toMatch(/whole/i);
    expect(validateCompanyProfile(form({ employeeCount: '-5' })).employeeCount).toMatch(/whole/i);
    expect(validateCompanyProfile(form({ employeeCount: '12.5' })).employeeCount).toMatch(/whole/i);
    expect(validateCompanyProfile(form({ employeeCount: '1' })).employeeCount).toBeUndefined();
  });
});

describe('the second contact channels', () => {
  it('validates the HR email and the alternative phone like the primaries', () => {
    expect(validateCompanyProfile(form({ hrEmail: 'nope' })).hrEmail).toMatch(/valid email/i);
    expect(validateCompanyProfile(form({ hrEmail: '' })).hrEmail).toBeUndefined();
    expect(validateCompanyProfile(form({ alternativePhone: 'call me' })).alternativePhone).toMatch(
      /valid phone/i,
    );
    expect(validateCompanyProfile(form({ alternativePhone: '' })).alternativePhone).toBeUndefined();
  });
});

describe('registration details', () => {
  it('does not impose a format, because they differ by country', () => {
    // A regex here would reject a legitimate number somewhere in the world.
    for (const registrationNumber of ['PV 12345', '12345678901234', 'HRB-9911/X']) {
      expect(validateCompanyProfile(form({ registrationNumber })).registrationNumber).toBeUndefined();
    }
  });

  it('still caps the length', () => {
    expect(
      validateCompanyProfile(form({ registrationNumber: 'x'.repeat(61) })).registrationNumber,
    ).toMatch(/under 60/);
  });
});

describe('company values', () => {
  it('trims, drops blanks and de-duplicates case-insensitively', () => {
    expect(cleanValues([' Ownership ', 'ownership', '', '  ', 'Craft'])).toEqual([
      'Ownership',
      'Craft',
    ]);
  });

  it('treats a re-typed duplicate as no change', () => {
    expect(isDirty(COMPLETE, form({ values: ['Ownership', 'Craft', 'ownership'] }))).toBe(false);
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

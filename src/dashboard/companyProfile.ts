import type { CompanyProfileResponse, UpdateCompanyProfileRequest } from '../api/types';

/**
 * Derivation layer for the company profile.
 *
 * <p>Everything the profile screens decide — what a field must contain,
 * whether anything actually changed, what a bare `abc.com` becomes when saved
 * — lives here, pure and DOM-free, so the rules can be tested without a
 * render. The pages are left to orchestrate load, edit and save.</p>
 */

/**
 * Every editable text field, grouped the way both screens present them. The
 * order is load-bearing: it decides which field the form focuses first when
 * validation fails.
 */
export const COMPANY_TEXT_FIELDS = [
  // Overview
  'name',
  'tagline',
  'industry',
  'companyType',
  'size',
  'foundedYear',
  'description',
  // Story
  'mission',
  'vision',
  // Registration
  'legalName',
  'registrationNumber',
  // Operations
  'timezone',
  'currency',
  'language',
  // Contact
  'email',
  'hrEmail',
  'phone',
  'alternativePhone',
  'website',
  'linkedinUrl',
  'facebookUrl',
  'twitterUrl',
  'instagramUrl',
  // Location
  'address',
  'city',
  'state',
  'postalCode',
  'country',
] as const;

export type CompanyTextField = (typeof COMPANY_TEXT_FIELDS)[number];

/** The list-valued fields, which need set comparison rather than equality. */
export const COMPANY_LIST_FIELDS = [
  'benefits',
  'officeLocations',
  'departments',
] as const;
export type CompanyListField = (typeof COMPANY_LIST_FIELDS)[number];

export type CompanyField = CompanyTextField | CompanyListField;

/**
 * Form state. Text fields are strings — a `<select>` with nothing chosen and a
 * cleared `<input>` are both `''`, and `''` is what becomes `null` on the
 * wire. Numbers are strings too while being typed: `<input type="number">`
 * yields `''` for an empty box and for "abc", and coercing early would turn a
 * half-typed year into a validation error the moment the first digit lands.
 */
export type CompanyFormValues = Record<CompanyTextField, string> &
  Record<CompanyListField, string[]>;

export type CompanyFieldErrors = Partial<Record<CompanyTextField, string>>;

/** `name` mirrors the backend column (255); the rest are product limits. */
const MAX_NAME = 255;
const MAX_ADDRESS = 255;
const MAX_PLACE = 120;
const MAX_SHORT = 60;
const MAX_TAGLINE = 140;
export const MAX_DESCRIPTION = 1000;
export const MAX_STATEMENT = 400;

/** Founded before this and it is not a company, it is a typo. */
const EARLIEST_FOUNDED_YEAR = 1800;

export const INDUSTRIES = [
  'Information Technology',
  'Finance & Banking',
  'Healthcare',
  'Education',
  'Retail & E-commerce',
  'Manufacturing',
  'Hospitality & Leisure',
  'Construction & Engineering',
  'Logistics & Transport',
  'Other',
];

/**
 * Two vocabularies, grouped in the picker rather than merged: some companies
 * think in headcount bands, others describe themselves by classification.
 * Flattening both into one list would offer '51–200 employees' and
 * 'Medium-sized enterprise' as if they were alternatives at the same level.
 */
export const COMPANY_SIZE_GROUPS: { label: string; options: string[] }[] = [
  {
    label: 'By headcount',
    options: [
      '1–10 employees',
      '11–50 employees',
      '51–200 employees',
      '201–500 employees',
      '500+ employees',
    ],
  },
  {
    label: 'By classification',
    options: [
      'Micro enterprise',
      'Small enterprise',
      'Medium-sized enterprise',
      'Large enterprise',
    ],
  },
];

export const COMPANY_SIZES = COMPANY_SIZE_GROUPS.flatMap((group) => group.options);

export const COMPANY_TYPES = [
  'Private limited company',
  'Public limited company',
  'Partnership',
  'Sole proprietorship',
  'Non-profit / NGO',
  'Government / public sector',
  'Other',
];

/**
 * Deliberately short. A full IANA list is four hundred entries and turns a
 * select into a scrolling exercise; these cover the region the product is
 * sold in plus the majors, and the field accepts whatever the backend stores
 * so an unlisted zone survives a round trip.
 */
export const TIMEZONES = [
  'Asia/Colombo',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'UTC',
];

export const CURRENCIES = [
  'LKR — Sri Lankan rupee',
  'USD — US dollar',
  'EUR — Euro',
  'GBP — Pound sterling',
  'INR — Indian rupee',
  'AUD — Australian dollar',
  'SGD — Singapore dollar',
  'AED — UAE dirham',
  'CAD — Canadian dollar',
  'JPY — Japanese yen',
];

export const LANGUAGES = [
  'English',
  'Sinhala',
  'Tamil',
  'Hindi',
  'Arabic',
  'French',
  'German',
  'Spanish',
  'Mandarin',
  'Japanese',
];

/**
 * The perks a company can advertise.
 *
 * <p>A fixed catalogue rather than free text: stored as identifiers, these can
 * be filtered on later ("show me remote-friendly companies"), which a sentence
 * someone typed can never be. The labels are what a candidate reads; the ids
 * are what is stored, so wording can be revised without a migration.</p>
 */
export const BENEFIT_CATALOGUE: { id: string; label: string }[] = [
  { id: 'REMOTE_HYBRID', label: 'Remote / hybrid work' },
  { id: 'FLEXIBLE_HOURS', label: 'Flexible working hours' },
  { id: 'HEALTH_INSURANCE', label: 'Health insurance' },
  { id: 'TRAINING', label: 'Training & development' },
  { id: 'PAID_LEAVE', label: 'Generous paid leave' },
  { id: 'PARENTAL_LEAVE', label: 'Parental leave' },
  { id: 'PERFORMANCE_BONUS', label: 'Performance bonus' },
  { id: 'STOCK_OPTIONS', label: 'Stock options' },
  { id: 'WELLBEING', label: 'Wellbeing & gym support' },
  { id: 'TRANSPORT', label: 'Transport allowance' },
  { id: 'MEALS', label: 'Meals provided' },
  { id: 'RELOCATION', label: 'Relocation support' },
  { id: 'CAREER_DEVELOPMENT', label: 'Career development' },
];

const BENEFIT_LABELS = new Map(BENEFIT_CATALOGUE.map((b) => [b.id, b.label]));

/** Falls back to the raw id so a benefit we stop offering is still readable. */
export function benefitLabel(id: string): string {
  return BENEFIT_LABELS.get(id) ?? id;
}

/** Catalogue order, whatever order they were selected or stored in. */
function sortByCatalogue(ids: string[], catalogue: { id: string }[]): string[] {
  const rank = new Map(catalogue.map((entry, index) => [entry.id, index]));
  return [...ids].sort(
    (a, b) => (rank.get(a) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b) ?? Number.MAX_SAFE_INTEGER),
  );
}

export const sortBenefits = (ids: string[]) => sortByCatalogue(ids, BENEFIT_CATALOGUE);

/** Free-text lists only ever get trimmed and de-duped. */
export function cleanValues(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim().replace(/\s+/g, ' ');
    const key = value.toLowerCase();
    if (value !== '' && !seen.has(key)) {
      seen.add(key);
      out.push(value);
    }
  }
  return out;
}

const EMPTY_TEXT = Object.fromEntries(COMPANY_TEXT_FIELDS.map((field) => [field, ''])) as Record<
  CompanyTextField,
  string
>;

export const EMPTY_FORM_VALUES: CompanyFormValues = {
  ...EMPTY_TEXT,
  benefits: [],
  officeLocations: [],
  departments: [],
};

/** Human label for a field, used in labels, prompts and error summaries. */
export const FIELD_LABELS: Record<CompanyField, string> = {
  name: 'Company name',
  tagline: 'Tagline',
  industry: 'Industry',
  companyType: 'Company type',
  size: 'Company size',
  foundedYear: 'Founded year',
  description: 'Company description',
  mission: 'Mission',
  vision: 'Vision',
  legalName: 'Legal company name',
  registrationNumber: 'Registration number',
  timezone: 'Time zone',
  currency: 'Currency',
  language: 'Primary language',
  email: 'Company email',
  hrEmail: 'HR / recruitment email',
  phone: 'Phone number',
  alternativePhone: 'Alternative phone',
  website: 'Website',
  linkedinUrl: 'LinkedIn',
  facebookUrl: 'Facebook',
  twitterUrl: 'X (Twitter)',
  instagramUrl: 'Instagram',
  address: 'Street address',
  city: 'City',
  state: 'State / province',
  postalCode: 'Postal code',
  country: 'Country',
  benefits: 'Benefits & perks',
  officeLocations: 'Other branches',
  departments: 'Departments',
};

/** The social fields, in the order they are shown. */
export const SOCIAL_FIELDS = [
  'linkedinUrl',
  'facebookUrl',
  'twitterUrl',
  'instagramUrl',
] as const;
export type SocialField = (typeof SOCIAL_FIELDS)[number];

/** Placeholder shown in each social input — the shape people recognise. */
export const SOCIAL_PLACEHOLDERS: Record<SocialField, string> = {
  linkedinUrl: 'linkedin.com/company/abc',
  facebookUrl: 'facebook.com/abc',
  twitterUrl: 'x.com/abc',
  instagramUrl: 'instagram.com/abc',
};

/** Server shape → form state. Null and undefined both mean "not set" = ''. */
export function toFormValues(profile: CompanyProfileResponse): CompanyFormValues {
  const text = (value: string | null | undefined) => value ?? '';
  const num = (value: number | null | undefined) =>
    value === null || value === undefined ? '' : String(value);

  return {
    name: text(profile.name),
    tagline: text(profile.tagline),
    industry: text(profile.industry),
    companyType: text(profile.companyType),
    size: text(profile.size),
    foundedYear: num(profile.foundedYear),
    description: text(profile.description),
    mission: text(profile.mission),
    vision: text(profile.vision),
    legalName: text(profile.legalName),
    registrationNumber: text(profile.registrationNumber),
    timezone: text(profile.timezone),
    currency: text(profile.currency),
    language: text(profile.language),
    email: text(profile.email),
    hrEmail: text(profile.hrEmail),
    phone: text(profile.phone),
    alternativePhone: text(profile.alternativePhone),
    website: text(profile.website),
    linkedinUrl: text(profile.linkedinUrl),
    facebookUrl: text(profile.facebookUrl),
    twitterUrl: text(profile.twitterUrl),
    instagramUrl: text(profile.instagramUrl),
    address: text(profile.address),
    city: text(profile.city),
    state: text(profile.state),
    postalCode: text(profile.postalCode),
    country: text(profile.country),
    officeLocations: cleanValues(profile.officeLocations ?? []),
    departments: cleanValues(profile.departments ?? []),
    // Sorted on the way in, so a backend that returns them in insertion order
    // cannot make the same set look like a change.
    benefits: sortBenefits(profile.benefits ?? []),
  };
}

/**
 * Turns `acme.com` into `https://acme.com` and leaves an explicit scheme alone.
 *
 * <p>Admins type the bare domain far more often than the URL, and a stored
 * value without a scheme becomes a relative link that navigates to
 * `/dashboard/acme.com`. Normalising on save means the read view can render an
 * anchor without guessing.</p>
 */
export function normalizeWebsite(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return '';
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Every field that holds a URL, and so gets the same normalising and check. */
const URL_FIELDS = ['website', ...SOCIAL_FIELDS] as const;
/** Long-form fields keep their line breaks; everything else is one line. */
const MULTILINE_FIELDS = new Set<CompanyTextField>(['description', 'mission', 'vision']);

/**
 * What gets validated and compared: the values as they would be saved.
 *
 * <p>Comparing raw input instead would call a trailing space a change, and
 * would then "save" it.</p>
 */
export function normalizeFormValues(values: CompanyFormValues): CompanyFormValues {
  const normalized = { ...values };
  for (const field of COMPANY_TEXT_FIELDS) {
    if (URL_FIELDS.includes(field as (typeof URL_FIELDS)[number])) {
      normalized[field] = normalizeWebsite(values[field]);
    } else if (MULTILINE_FIELDS.has(field)) {
      normalized[field] = values[field].trim();
    } else {
      // Inner runs of whitespace collapse on single-line fields.
      normalized[field] = values[field].trim().replace(/\s+/g, ' ');
    }
  }
  for (const field of ['officeLocations', 'departments'] as const) {
    normalized[field] = cleanValues(values[field]);
  }
  normalized.benefits = sortBenefits(values.benefits);
  return normalized;
}

// Deliberately permissive: one @, no spaces, a dotted domain. The authority on
// whether an address exists is the mail server, not a regex.
// The domain labels exclude '.' so each part of the pattern matches a
// distinct span: overlapping '[^\s@]+' around the dot backtracks quadratically
// on a long malformed address.
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/;
// Digits with the separators people actually type: + ( ) - and spaces. The
// leading '(' matters — '(011) 234 5678' is how an area code is usually
// written, and rejecting it would look like the field is simply broken.
const PHONE_SHAPE = /^[+(\d][\d\s()-]*$/;

function invalidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return !PHONE_SHAPE.test(value) || digits.length < 7 || digits.length > 15;
}

/**
 * Field-level errors for the values as they would be saved.
 *
 * <p>Only two things are required: a name, because it is the company's
 * identity across the product, and a contact email, because the profile is
 * candidate-facing and a company page with no way to reach anyone is worse
 * than no page. Everything else may legitimately be blank — these are
 * presentation rules, and the backend will own the real ones. Registration and
 * tax numbers in particular are deliberately format-free: they differ by
 * country, and a regex here would reject a legitimate one somewhere.</p>
 */
export function validateCompanyProfile(values: CompanyFormValues): CompanyFieldErrors {
  const n = normalizeFormValues(values);
  const errors: CompanyFieldErrors = {};

  // One pass per family of rules. Split out of a single body that had grown
  // past the point where the shape of the whole was still readable.
  checkIdentity(n, errors);
  checkPhones(n, errors);
  checkLinks(n, errors);
  checkNumbers(n, errors);
  checkPlaceLengths(n, errors);
  checkStoryLengths(n, errors);

  return errors;
}

/** The two required fields, plus the optional HR address that must still parse. */
function checkIdentity(n: CompanyFormValues, errors: CompanyFieldErrors): void {
  if (n.name === '') {
    errors.name = 'Company name is required.';
  } else if (n.name.length > MAX_NAME) {
    errors.name = `Keep the company name under ${MAX_NAME} characters.`;
  }

  if (n.email === '') {
    errors.email = 'A company email is required — candidates use it to reach you.';
  } else if (!EMAIL.test(n.email)) {
    errors.email = 'Please enter a valid email address, like contact@abc.com.';
  }

  if (n.hrEmail !== '' && !EMAIL.test(n.hrEmail)) {
    errors.hrEmail = 'Please enter a valid email address, like careers@abc.com.';
  }
}

function checkPhones(n: CompanyFormValues, errors: CompanyFieldErrors): void {
  for (const field of ['phone', 'alternativePhone'] as const) {
    if (n[field] !== '' && invalidPhone(n[field])) {
      errors[field] = 'Please enter a valid phone number, like +94 11 234 5678.';
    }
  }
}

function checkLinks(n: CompanyFormValues, errors: CompanyFieldErrors): void {
  for (const field of URL_FIELDS) {
    if (n[field] === '' || isValidWebsite(n[field])) {
      continue;
    }
    errors[field] =
      field === 'website'
        ? 'Please enter a valid website, like abc.com or https://abc.com.'
        : `Please enter a valid ${FIELD_LABELS[field]} link, like ${SOCIAL_PLACEHOLDERS[field as SocialField]}.`;
  }
}

/**
 * The year arrives as a string, so "12e4" and "  " have to be rejected here
 * rather than trusted to have been filtered by the input type.
 */
function checkNumbers(n: CompanyFormValues, errors: CompanyFieldErrors): void {
  if (n.foundedYear !== '') {
    const year = Number(n.foundedYear);
    const thisYear = new Date().getFullYear();
    if (!Number.isInteger(year) || year < EARLIEST_FOUNDED_YEAR || year > thisYear) {
      errors.foundedYear = `Enter a year between ${EARLIEST_FOUNDED_YEAR} and ${thisYear}.`;
    }
  }
}

/** Ceilings on the address block. */
function checkPlaceLengths(n: CompanyFormValues, errors: CompanyFieldErrors): void {
  if (n.address.length > MAX_ADDRESS) {
    errors.address = `Keep the address under ${MAX_ADDRESS} characters.`;
  }

  for (const field of ['city', 'state', 'country'] as const) {
    if (n[field].length > MAX_PLACE) {
      errors[field] = `Keep the ${FIELD_LABELS[field].toLowerCase()} under ${MAX_PLACE} characters.`;
    }
  }

  for (const field of ['postalCode', 'registrationNumber'] as const) {
    if (n[field].length > MAX_SHORT) {
      errors[field] = `Keep the ${FIELD_LABELS[field].toLowerCase()} under ${MAX_SHORT} characters.`;
    }
  }
}

/** Ceilings on the free-text story fields. */
function checkStoryLengths(n: CompanyFormValues, errors: CompanyFieldErrors): void {
  if (n.legalName.length > MAX_NAME) {
    errors.legalName = `Keep the legal name under ${MAX_NAME} characters.`;
  }

  if (n.tagline.length > MAX_TAGLINE) {
    errors.tagline = `Keep the tagline under ${MAX_TAGLINE} characters — it is one line, not a paragraph.`;
  }

  if (n.description.length > MAX_DESCRIPTION) {
    errors.description = `Keep the description under ${MAX_DESCRIPTION} characters — it is ${n.description.length} right now.`;
  }

  for (const field of ['mission', 'vision'] as const) {
    if (n[field].length > MAX_STATEMENT) {
      errors[field] = `Keep the ${FIELD_LABELS[field].toLowerCase()} under ${MAX_STATEMENT} characters.`;
    }
  }
}

/** True when a normalized URL has a host that could plausibly resolve. */
function isValidWebsite(normalized: string): boolean {
  try {
    const url = new URL(normalized);
    // A single label ('https://acme') is a valid URL but not a public website;
    // requiring an inner dot rejects it without pretending to know every TLD.
    return /^[^\s.]+(\.[^\s.]+)+$/.test(url.hostname);
  } catch {
    return false;
  }
}

/** Fields whose saved value would differ. Empty means Save has nothing to do. */
export function changedFields(
  original: CompanyFormValues,
  edited: CompanyFormValues,
): CompanyField[] {
  const a = normalizeFormValues(original);
  const b = normalizeFormValues(edited);
  const changed: CompanyField[] = COMPANY_TEXT_FIELDS.filter((field) => a[field] !== b[field]);
  for (const field of COMPANY_LIST_FIELDS) {
    // Both sides are already ordered by normalizeFormValues, so joining is a
    // safe comparison — a re-ordered selection is not a change.
    if (a[field].join(' ') !== b[field].join(' ')) {
      changed.push(field);
    }
  }
  return changed;
}

export function isDirty(original: CompanyFormValues, edited: CompanyFormValues): boolean {
  return changedFields(original, edited).length > 0;
}

/** Form state → request body. Blank optionals travel as null, never as ''. */
export function toUpdateRequest(values: CompanyFormValues): UpdateCompanyProfileRequest {
  const n = normalizeFormValues(values);
  const orNull = (value: string) => (value === '' ? null : value);
  const numOrNull = (value: string) => (value === '' ? null : Number(value));
  return {
    name: n.name,
    tagline: orNull(n.tagline),
    industry: orNull(n.industry),
    companyType: orNull(n.companyType),
    size: orNull(n.size),
    foundedYear: numOrNull(n.foundedYear),
    description: orNull(n.description),
    mission: orNull(n.mission),
    vision: orNull(n.vision),
    benefits: n.benefits,
    legalName: orNull(n.legalName),
    registrationNumber: orNull(n.registrationNumber),
    timezone: orNull(n.timezone),
    currency: orNull(n.currency),
    language: orNull(n.language),
    // email is required on the backend; validateCompanyProfile already
    // rejects blank before this function is ever called, so n.email is
    // guaranteed non-empty here and must not be sent as null.
    email: n.email,
    hrEmail: orNull(n.hrEmail),
    phone: orNull(n.phone),
    alternativePhone: orNull(n.alternativePhone),
    website: orNull(n.website),
    linkedinUrl: orNull(n.linkedinUrl),
    facebookUrl: orNull(n.facebookUrl),
    twitterUrl: orNull(n.twitterUrl),
    instagramUrl: orNull(n.instagramUrl),
    address: orNull(n.address),
    city: orNull(n.city),
    state: orNull(n.state),
    postalCode: orNull(n.postalCode),
    country: orNull(n.country),
    officeLocations: n.officeLocations,
    departments: n.departments,
  };
}

/**
 * What a candidate-facing profile is judged complete on.
 *
 * <p>Deliberately not every field. Registration numbers, tax details, socials,
 * phone and the street address are either enrichment or paperwork —
 * valuable, but a profile without them is not broken, and a meter that can
 * never reach 100% stops being read. These plus a logo are what makes the
 * profile answer "who are these people?".</p>
 */
const COMPLETENESS_FIELDS = [
  'name',
  'industry',
  'size',
  'description',
  'email',
  'website',
  'city',
  'country',
] as const satisfies readonly CompanyTextField[];

export interface Completeness {
  filled: number;
  total: number;
  percent: number;
  /** What is still blank, so a prompt can name one instead of nagging vaguely. */
  missing: string[];
}

export function profileCompleteness(values: CompanyFormValues, hasLogo = false): Completeness {
  const normalized = normalizeFormValues(values);
  const missing = COMPLETENESS_FIELDS.filter((field) => normalized[field] === '').map(
    (field) => FIELD_LABELS[field],
  );
  if (!hasLogo) {
    missing.push('Company logo');
  }
  const total = COMPLETENESS_FIELDS.length + 1;
  const filled = total - missing.length;
  return { filled, total, percent: Math.round((filled / total) * 100), missing };
}

/** `https://abc.com/careers` → `abc.com/careers`, which is what people read. */
export function websiteLabel(website: string): string {
  return website.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

/**
 * 'Colombo, Western, Sri Lanka' — the administrative parts, in the order a
 * person reads an address, with the missing ones simply absent.
 */
export function formatLocation(values: CompanyFormValues): string {
  return [values.city, values.state, values.country]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');
}

/**
 * Headquarters (item 30) — derived from the address fields rather than stored.
 * A separate 'headquarters' box would be a second place to change the city,
 * and the two would disagree the first time only one was updated.
 */
export function formatHeadquarters(values: CompanyFormValues): string {
  return [values.city, values.country].map((part) => part.trim()).filter(Boolean).join(', ');
}

/** The street line and postal code, for the full postal address. */
export function formatStreet(values: CompanyFormValues): string {
  return [values.address, values.postalCode]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');
}

/** 'ISO — Name' → 'ISO'. The code is what belongs next to a salary. */
export function currencyCode(currency: string): string {
  return currency.split('—')[0].trim();
}

/** Two letters for the logo fallback: 'ABC Technologies' → 'AT'. */
export function companyInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '?';
  }
  return (words[0][0] + (words[1]?.[0] ?? '')).toUpperCase();
}

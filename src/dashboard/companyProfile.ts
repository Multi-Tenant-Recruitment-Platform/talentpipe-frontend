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
  'name',
  'industry',
  'size',
  'description',
  'culture',
  'email',
  'phone',
  'website',
  'linkedinUrl',
  'facebookUrl',
  'twitterUrl',
  'address',
  'city',
  'country',
] as const;

export type CompanyTextField = (typeof COMPANY_TEXT_FIELDS)[number];

/**
 * Form state. Text fields are strings — a `<select>` with nothing chosen and a
 * cleared `<input>` are both `''`, and `''` is what becomes `null` on the
 * wire. Benefits are a set, so they are the one exception.
 */
export type CompanyFormValues = Record<CompanyTextField, string> & {
  benefits: string[];
};

export type CompanyFieldErrors = Partial<Record<CompanyTextField, string>>;

/** `name` mirrors the backend column (255); the rest are product limits. */
const MAX_NAME = 255;
const MAX_ADDRESS = 255;
const MAX_PLACE = 120;
export const MAX_DESCRIPTION = 1000;
export const MAX_CULTURE = 600;

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

export const COMPANY_SIZES = [
  '1–10 employees',
  '11–50 employees',
  '51–200 employees',
  '201–500 employees',
  '500+ employees',
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
];

const BENEFIT_LABELS = new Map(BENEFIT_CATALOGUE.map((b) => [b.id, b.label]));

/** Falls back to the raw id so a benefit we stop offering is still readable. */
export function benefitLabel(id: string): string {
  return BENEFIT_LABELS.get(id) ?? id;
}

/** Catalogue order, whatever order they were selected or stored in. */
export function sortBenefits(ids: string[]): string[] {
  const rank = new Map(BENEFIT_CATALOGUE.map((b, index) => [b.id, index]));
  return [...ids].sort(
    (a, b) => (rank.get(a) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b) ?? Number.MAX_SAFE_INTEGER),
  );
}

export const EMPTY_FORM_VALUES: CompanyFormValues = {
  name: '',
  industry: '',
  size: '',
  description: '',
  culture: '',
  email: '',
  phone: '',
  website: '',
  linkedinUrl: '',
  facebookUrl: '',
  twitterUrl: '',
  address: '',
  city: '',
  country: '',
  benefits: [],
};

/** Human label for a field, used in labels, prompts and error summaries. */
export const FIELD_LABELS: Record<CompanyTextField, string> = {
  name: 'Company name',
  industry: 'Industry',
  size: 'Company size',
  description: 'Company description',
  culture: 'Company culture',
  email: 'Company email',
  phone: 'Phone number',
  website: 'Website',
  linkedinUrl: 'LinkedIn',
  facebookUrl: 'Facebook',
  twitterUrl: 'X (Twitter)',
  address: 'Address',
  city: 'City',
  country: 'Country',
};

/** The social fields, in the order they are shown. */
export const SOCIAL_FIELDS = ['linkedinUrl', 'facebookUrl', 'twitterUrl'] as const;
export type SocialField = (typeof SOCIAL_FIELDS)[number];

/** Placeholder shown in each social input — the shape people recognise. */
export const SOCIAL_PLACEHOLDERS: Record<SocialField, string> = {
  linkedinUrl: 'linkedin.com/company/abc',
  facebookUrl: 'facebook.com/abc',
  twitterUrl: 'x.com/abc',
};

/** Server shape → form state. Null and undefined both mean "not set" = ''. */
export function toFormValues(profile: CompanyProfileResponse): CompanyFormValues {
  return {
    name: profile.name ?? '',
    industry: profile.industry ?? '',
    size: profile.size ?? '',
    description: profile.description ?? '',
    culture: profile.culture ?? '',
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    website: profile.website ?? '',
    linkedinUrl: profile.linkedinUrl ?? '',
    facebookUrl: profile.facebookUrl ?? '',
    twitterUrl: profile.twitterUrl ?? '',
    address: profile.address ?? '',
    city: profile.city ?? '',
    country: profile.country ?? '',
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

/**
 * What gets validated and compared: the values as they would be saved.
 *
 * <p>Comparing raw input instead would call a trailing space a change, and
 * would then "save" it.</p>
 */
export function normalizeFormValues(values: CompanyFormValues): CompanyFormValues {
  // Inner runs of whitespace collapse on single-line fields; the long-form
  // text keeps its line breaks, because they are the paragraphs someone wrote.
  const oneLine = (value: string) => value.trim().replace(/\s+/g, ' ');
  return {
    name: oneLine(values.name),
    industry: values.industry.trim(),
    size: values.size.trim(),
    description: values.description.trim(),
    culture: values.culture.trim(),
    email: values.email.trim(),
    phone: oneLine(values.phone),
    website: normalizeWebsite(values.website),
    linkedinUrl: normalizeWebsite(values.linkedinUrl),
    facebookUrl: normalizeWebsite(values.facebookUrl),
    twitterUrl: normalizeWebsite(values.twitterUrl),
    address: oneLine(values.address),
    city: oneLine(values.city),
    country: oneLine(values.country),
    benefits: sortBenefits(values.benefits),
  };
}

// Deliberately permissive: one @, no spaces, a dotted domain. The authority on
// whether an address exists is the mail server, not a regex.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Digits with the separators people actually type: + ( ) - and spaces. The
// leading '(' matters — '(011) 234 5678' is how an area code is usually
// written, and rejecting it would look like the field is simply broken.
const PHONE_SHAPE = /^[+(\d][\d\s()-]*$/;

/**
 * Field-level errors for the values as they would be saved.
 *
 * <p>Only two things are required: a name, because it is the company's
 * identity across the product, and a contact email, because the profile is
 * candidate-facing and a company page with no way to reach anyone is worse
 * than no page. Everything else may legitimately be blank — these are
 * presentation rules, and the backend will own the real ones.</p>
 */
export function validateCompanyProfile(values: CompanyFormValues): CompanyFieldErrors {
  const normalized = normalizeFormValues(values);
  const errors: CompanyFieldErrors = {};

  if (normalized.name === '') {
    errors.name = 'Company name is required.';
  } else if (normalized.name.length > MAX_NAME) {
    errors.name = `Keep the company name under ${MAX_NAME} characters.`;
  }

  if (normalized.email === '') {
    errors.email = 'A company email is required — candidates use it to reach you.';
  } else if (!EMAIL.test(normalized.email)) {
    errors.email = 'Please enter a valid email address, like contact@abc.com.';
  }

  if (normalized.phone !== '') {
    const digits = normalized.phone.replace(/\D/g, '');
    if (!PHONE_SHAPE.test(normalized.phone) || digits.length < 7 || digits.length > 15) {
      errors.phone = 'Please enter a valid phone number, like +94 11 234 5678.';
    }
  }

  for (const field of URL_FIELDS) {
    if (normalized[field] !== '' && !isValidWebsite(normalized[field])) {
      errors[field] =
        field === 'website'
          ? 'Please enter a valid website, like abc.com or https://abc.com.'
          : `Please enter a valid ${FIELD_LABELS[field]} link, like ${SOCIAL_PLACEHOLDERS[field as SocialField]}.`;
    }
  }

  if (normalized.address.length > MAX_ADDRESS) {
    errors.address = `Keep the address under ${MAX_ADDRESS} characters.`;
  }

  for (const field of ['city', 'country'] as const) {
    if (normalized[field].length > MAX_PLACE) {
      errors[field] = `Keep the ${FIELD_LABELS[field].toLowerCase()} under ${MAX_PLACE} characters.`;
    }
  }

  if (normalized.description.length > MAX_DESCRIPTION) {
    errors.description = `Keep the description under ${MAX_DESCRIPTION} characters — it is ${normalized.description.length} right now.`;
  }

  if (normalized.culture.length > MAX_CULTURE) {
    errors.culture = `Keep the culture note under ${MAX_CULTURE} characters — it is ${normalized.culture.length} right now.`;
  }

  return errors;
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

export type CompanyField = CompanyTextField | 'benefits';

/** Fields whose saved value would differ. Empty means Save has nothing to do. */
export function changedFields(
  original: CompanyFormValues,
  edited: CompanyFormValues,
): CompanyField[] {
  const a = normalizeFormValues(original);
  const b = normalizeFormValues(edited);
  const changed: CompanyField[] = COMPANY_TEXT_FIELDS.filter((field) => a[field] !== b[field]);
  // Both sides are sorted by normalizeFormValues, so joining is a safe
  // comparison — a re-ordered selection is not a change.
  if (a.benefits.join(' ') !== b.benefits.join(' ')) {
    changed.push('benefits');
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
  return {
    name: n.name,
    industry: orNull(n.industry),
    size: orNull(n.size),
    description: orNull(n.description),
    culture: orNull(n.culture),
    benefits: n.benefits,
    email: orNull(n.email),
    phone: orNull(n.phone),
    website: orNull(n.website),
    linkedinUrl: orNull(n.linkedinUrl),
    facebookUrl: orNull(n.facebookUrl),
    twitterUrl: orNull(n.twitterUrl),
    address: orNull(n.address),
    city: orNull(n.city),
    country: orNull(n.country),
  };
}

/**
 * What a candidate-facing profile is judged complete on.
 *
 * <p>Deliberately not every field. Socials, benefits, culture, phone and the
 * street address are enrichment — valuable, but a profile without them is not
 * broken, and a meter that can never reach 100% stops being read. These eight
 * plus a logo are what makes the profile answer "who are these people?".</p>
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

export function profileCompleteness(
  values: CompanyFormValues,
  hasLogo = false,
): Completeness {
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

/** 'Colombo' + 'Sri Lanka' → 'Colombo, Sri Lanka'; drops whichever is missing. */
export function formatLocation(values: CompanyFormValues): string {
  return [values.city.trim(), values.country.trim()].filter(Boolean).join(', ');
}

/** Two letters for the logo fallback: 'ABC Technologies' → 'AT'. */
export function companyInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '?';
  }
  return (words[0][0] + (words[1]?.[0] ?? '')).toUpperCase();
}

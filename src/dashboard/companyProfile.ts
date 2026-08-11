import type { CompanyProfileResponse, UpdateCompanyProfileRequest } from '../api/types';

/**
 * Derivation layer for the company profile form.
 *
 * <p>Everything the settings page decides — what a field must contain, whether
 * anything actually changed, what a bare `abc.com` becomes when saved — lives
 * here, pure and DOM-free, so the rules can be tested without a render. The
 * page is left to orchestrate load, edit and save.</p>
 */

/** Every editable field, in the order the form and the read view present them. */
export const COMPANY_FIELDS = [
  'name',
  'industry',
  'size',
  'email',
  'phone',
  'website',
  'address',
  'description',
] as const;

export type CompanyField = (typeof COMPANY_FIELDS)[number];

/**
 * Form state. Every field is a string — a `<select>` with nothing chosen and a
 * cleared `<input>` are both `''`, and `''` is what becomes `null` on the wire.
 */
export type CompanyFormValues = Record<CompanyField, string>;

export type CompanyFieldErrors = Partial<Record<CompanyField, string>>;

/** `name` mirrors the backend column (255); the rest are product limits. */
const MAX_NAME = 255;
const MAX_ADDRESS = 255;
export const MAX_DESCRIPTION = 1000;

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

export const EMPTY_FORM_VALUES: CompanyFormValues = {
  name: '',
  industry: '',
  size: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  description: '',
};

/** Server shape → form state. Null and undefined both mean "not set" = ''. */
export function toFormValues(profile: CompanyProfileResponse): CompanyFormValues {
  return {
    name: profile.name ?? '',
    industry: profile.industry ?? '',
    size: profile.size ?? '',
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    website: profile.website ?? '',
    address: profile.address ?? '',
    description: profile.description ?? '',
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

/**
 * What gets validated and compared: the values as they would be saved.
 *
 * <p>Comparing raw input instead would call a trailing space a change, and
 * would then "save" it.</p>
 */
export function normalizeFormValues(values: CompanyFormValues): CompanyFormValues {
  return {
    // Inner runs of whitespace collapse too — a pasted name is the one field
    // rendered as a heading everywhere in the product.
    name: values.name.trim().replace(/\s+/g, ' '),
    industry: values.industry.trim(),
    size: values.size.trim(),
    email: values.email.trim(),
    phone: values.phone.trim().replace(/\s+/g, ' '),
    website: normalizeWebsite(values.website),
    address: values.address.trim(),
    description: values.description.trim(),
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
 * candidate-facing and a careers page with no way to reach anyone is worse
 * than no profile. Everything else may legitimately be blank.</p>
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
    errors.email = 'A contact email is required — candidates use it to reach you.';
  } else if (!EMAIL.test(normalized.email)) {
    errors.email = 'Enter a valid email address, like hr@yourcompany.com.';
  }

  if (normalized.phone !== '') {
    const digits = normalized.phone.replace(/\D/g, '');
    if (!PHONE_SHAPE.test(normalized.phone) || digits.length < 7 || digits.length > 15) {
      errors.phone = 'Enter a valid phone number, like +94 11 234 5678.';
    }
  }

  if (normalized.website !== '' && !isValidWebsite(normalized.website)) {
    errors.website = 'Enter a valid website, like abc.com or https://abc.com.';
  }

  if (normalized.address.length > MAX_ADDRESS) {
    errors.address = `Keep the address under ${MAX_ADDRESS} characters.`;
  }

  if (normalized.description.length > MAX_DESCRIPTION) {
    errors.description = `Keep the description under ${MAX_DESCRIPTION} characters — it is ${normalized.description.length} right now.`;
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

/** Fields whose saved value would differ. Empty means Save has nothing to do. */
export function changedFields(
  original: CompanyFormValues,
  edited: CompanyFormValues,
): CompanyField[] {
  const a = normalizeFormValues(original);
  const b = normalizeFormValues(edited);
  return COMPANY_FIELDS.filter((field) => a[field] !== b[field]);
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
    email: orNull(n.email),
    phone: orNull(n.phone),
    website: orNull(n.website),
    address: orNull(n.address),
    description: orNull(n.description),
  };
}

export interface Completeness {
  filled: number;
  total: number;
  percent: number;
  /** Fields still blank, so the prompt can name one instead of nagging vaguely. */
  missing: CompanyField[];
}

/**
 * How much of the profile a candidate would actually see filled in.
 *
 * <p>Shown only while something is missing: a completeness meter that is
 * permanently at 100% is decoration, and one that never disappears is nagging.</p>
 */
export function profileCompleteness(values: CompanyFormValues): Completeness {
  const normalized = normalizeFormValues(values);
  const missing = COMPANY_FIELDS.filter((field) => normalized[field] === '');
  const filled = COMPANY_FIELDS.length - missing.length;
  return {
    filled,
    total: COMPANY_FIELDS.length,
    percent: Math.round((filled / COMPANY_FIELDS.length) * 100),
    missing,
  };
}

/** Human label for a field, used in prompts and error summaries. */
export const FIELD_LABELS: Record<CompanyField, string> = {
  name: 'Company name',
  industry: 'Industry',
  size: 'Company size',
  email: 'Email',
  phone: 'Phone',
  website: 'Website',
  address: 'Address',
  description: 'Description',
};

/** `https://abc.com/careers` → `abc.com/careers`, which is what people read. */
export function websiteLabel(website: string): string {
  return website.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

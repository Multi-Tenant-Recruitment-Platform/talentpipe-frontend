import type { JobApplicationRequest, UserResponse } from '../api/types';

export interface ApplicationFormValues {
  fullName: string;
  email: string;
  phone: string;
  portfolioUrl: string;
  coverLetter: string;
}

export type ApplicationField = keyof ApplicationFormValues;
export type ApplicationErrors = Partial<Record<ApplicationField, string>>;

/** Order used to focus the first invalid field. */
export const APPLICATION_FIELDS: ApplicationField[] = ['fullName', 'email', 'phone', 'portfolioUrl', 'coverLetter'];

export const MAX_NAME = 200;
export const MAX_EMAIL = 255;
export const MAX_URL = 500;
export const MAX_COVER_LETTER = 2000;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** 7–15 digits, optional leading +; spaces, dashes and brackets are allowed as separators. */
const PHONE = /^\+?\d{7,15}$/;

/** Signed-in candidates start with their name and email filled in. */
export function initialApplicationValues(user: UserResponse | null): ApplicationFormValues {
  const candidate = user?.role === 'CANDIDATE' ? user : null;
  return {
    fullName: candidate ? `${candidate.firstName} ${candidate.lastName}`.trim() : '',
    email: candidate?.email ?? '',
    phone: '',
    portfolioUrl: '',
    coverLetter: '',
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateApplication(values: ApplicationFormValues): ApplicationErrors {
  const errors: ApplicationErrors = {};
  const fullName = values.fullName.trim();
  const email = values.email.trim();
  const phone = values.phone.trim();
  const portfolioUrl = values.portfolioUrl.trim();

  if (!fullName) errors.fullName = 'Enter your full name.';
  else if (fullName.length > MAX_NAME) errors.fullName = `Keep your name under ${MAX_NAME} characters.`;

  if (!email) errors.email = 'Enter your email address.';
  else if (email.length > MAX_EMAIL || !EMAIL.test(email)) errors.email = 'Enter a valid email address, like name@example.com.';

  if (!phone) errors.phone = 'Enter your phone number.';
  else if (!PHONE.test(phone.replace(/[\s()-]/g, ''))) errors.phone = 'Enter a valid phone number, like +94 77 123 4567.';

  if (portfolioUrl && (portfolioUrl.length > MAX_URL || !isHttpUrl(portfolioUrl))) {
    errors.portfolioUrl = 'Enter a full link starting with https://';
  }

  if (values.coverLetter.length > MAX_COVER_LETTER) {
    errors.coverLetter = `Keep your cover letter under ${MAX_COVER_LETTER} characters.`;
  }
  return errors;
}

export function toApplicationRequest(values: ApplicationFormValues): JobApplicationRequest {
  const optional = (value: string) => value.trim() || null;
  return {
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    portfolioUrl: optional(values.portfolioUrl),
    coverLetter: optional(values.coverLetter),
  };
}

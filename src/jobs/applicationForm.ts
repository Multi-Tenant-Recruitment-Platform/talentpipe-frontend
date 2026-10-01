import type { JobApplicationRequest, UserResponse } from '../api/types';

export interface ApplicationFormValues {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  resume: File | null;
  currentTitle: string;
  /** Kept as typed so a half-entered value can be shown back; parsed on submit. */
  yearsOfExperience: string;
  portfolioUrl: string;
  coverLetter: string;
  consent: boolean;
}

export type ApplicationField = keyof ApplicationFormValues;
/** Fields edited through a text input or textarea. */
export type ApplicationTextField = Exclude<ApplicationField, 'resume' | 'consent'>;
export type ApplicationErrors = Partial<Record<ApplicationField, string>>;

/** Order used to focus the first invalid field — the order they appear on the page. */
export const APPLICATION_FIELDS: ApplicationField[] = [
  'fullName',
  'email',
  'phone',
  'location',
  'resume',
  'currentTitle',
  'yearsOfExperience',
  'portfolioUrl',
  'coverLetter',
  'consent',
];

export const MAX_NAME = 200;
export const MAX_EMAIL = 255;
export const MAX_LOCATION = 200;
export const MAX_TITLE = 200;
export const MAX_YEARS = 60;
export const MAX_URL = 500;
export const MAX_COVER_LETTER = 2000;

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
/** Checked by extension: browsers report an empty or generic MIME type for .doc on some systems. */
export const RESUME_EXTENSIONS = ['.pdf', '.doc', '.docx'];
export const RESUME_ACCEPT = [
  ...RESUME_EXTENSIONS,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
].join(',');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** 7–15 digits, optional leading +; spaces, dashes and brackets are allowed as separators. */
const PHONE = /^\+?\d{7,15}$/;
const WHOLE_NUMBER = /^\d+$/;

/** Signed-in candidates start with their name and email filled in. */
export function initialApplicationValues(user: UserResponse | null): ApplicationFormValues {
  const candidate = user?.role === 'CANDIDATE' ? user : null;
  return {
    fullName: candidate ? `${candidate.firstName} ${candidate.lastName}`.trim() : '',
    email: candidate?.email ?? '',
    phone: '',
    location: '',
    resume: null,
    currentTitle: '',
    yearsOfExperience: '',
    portfolioUrl: '',
    coverLetter: '',
    consent: false,
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

/** "1.2 MB" / "340 KB" — for showing the chosen file back to the candidate. */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function validateResume(file: File | null): string | undefined {
  if (!file) return 'Upload your resume or CV.';
  const name = file.name.toLowerCase();
  if (!RESUME_EXTENSIONS.some((ext) => name.endsWith(ext))) return 'Upload a PDF, DOC or DOCX file.';
  if (file.size === 0) return 'This file is empty. Choose another one.';
  if (file.size > MAX_RESUME_BYTES) return `Keep your file under ${formatFileSize(MAX_RESUME_BYTES)}.`;
  return undefined;
}

export function validateApplication(values: ApplicationFormValues): ApplicationErrors {
  const errors: ApplicationErrors = {};
  const fullName = values.fullName.trim();
  const email = values.email.trim();
  const phone = values.phone.trim();
  const years = values.yearsOfExperience.trim();
  const portfolioUrl = values.portfolioUrl.trim();

  if (!fullName) errors.fullName = 'Enter your full name.';
  else if (fullName.length > MAX_NAME) errors.fullName = `Keep your name under ${MAX_NAME} characters.`;

  if (!email) errors.email = 'Enter your email address.';
  else if (email.length > MAX_EMAIL || !EMAIL.test(email)) errors.email = 'Enter a valid email address, like name@example.com.';

  if (!phone) errors.phone = 'Enter your phone number.';
  else if (!PHONE.test(phone.replace(/[\s()-]/g, ''))) errors.phone = 'Enter a valid phone number, like +94 77 123 4567.';

  if (values.location.trim().length > MAX_LOCATION) errors.location = `Keep your location under ${MAX_LOCATION} characters.`;

  const resumeError = validateResume(values.resume);
  if (resumeError) errors.resume = resumeError;

  if (values.currentTitle.trim().length > MAX_TITLE) errors.currentTitle = `Keep your job title under ${MAX_TITLE} characters.`;

  if (years && (!WHOLE_NUMBER.test(years) || Number(years) > MAX_YEARS)) {
    errors.yearsOfExperience = `Enter a whole number of years from 0 to ${MAX_YEARS}.`;
  }

  if (portfolioUrl && (portfolioUrl.length > MAX_URL || !isHttpUrl(portfolioUrl))) {
    errors.portfolioUrl = 'Enter a full link starting with https://';
  }

  if (values.coverLetter.length > MAX_COVER_LETTER) {
    errors.coverLetter = `Keep your cover letter under ${MAX_COVER_LETTER} characters.`;
  }

  if (!values.consent) errors.consent = 'Agree to this so the hiring team can review your application.';
  return errors;
}

/** Only call on values that passed {@link validateApplication}. */
export function toApplicationRequest(values: ApplicationFormValues): JobApplicationRequest {
  const optional = (value: string) => value.trim() || null;
  const years = values.yearsOfExperience.trim();
  return {
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    location: optional(values.location),
    currentTitle: optional(values.currentTitle),
    yearsOfExperience: years ? Number(years) : null,
    portfolioUrl: optional(values.portfolioUrl),
    coverLetter: optional(values.coverLetter),
    consentGiven: true,
  };
}

import type { MyCandidateProfileResponse, UpdateMyCandidateProfileRequest, UserResponse } from '../api/types';
import { ACCEPTED_IMAGE_TYPES, formatBytes } from '../dashboard/companyImages';
import { EMAIL, invalidPhone } from '../dashboard/companyProfile';

/**
 * Rules for the candidate's own My profile form.
 *
 * <p>Everything that decides what the form shows or sends lives here, as
 * plain functions, so the page is left holding state and markup. The one
 * rule that matters most — a CV is sent only while "Add to Talent Pool" is
 * ticked — is {@link buildCandidatePayload}'s, and nobody else's.</p>
 *
 * <p>As with the company images, the file checks are a courtesy that turn
 * "upload failed" into a reason before anything crosses the network. The
 * backend must check again.</p>
 */

// ---------------------------------------------------------------------------
// CV files
// ---------------------------------------------------------------------------

export type CvFormat = 'PDF' | 'DOCX';

const CV_FORMATS: { format: CvFormat; extension: string; mime: string }[] = [
  { format: 'PDF', extension: '.pdf', mime: 'application/pdf' },
  {
    format: 'DOCX',
    extension: '.docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
];

/** What the CV picker offers — extensions and MIME types, derived from the same table. */
export const CV_ACCEPT_ATTRIBUTE = [
  ...CV_FORMATS.map((entry) => entry.extension),
  ...CV_FORMATS.map((entry) => entry.mime),
].join(',');

export const MAX_CV_BYTES = 5 * 1024 * 1024;

/** The format a file name claims, from its extension alone. */
export function cvFormatFromName(name: string): CvFormat | null {
  const lower = name.toLowerCase();
  return CV_FORMATS.find((entry) => lower.endsWith(entry.extension))?.format ?? null;
}

/**
 * The file's format when its extension and its MIME type agree on one we take.
 *
 * <p>An empty MIME type falls back to the extension: Windows commonly reports
 * a DOCX with no type at all when Office is not installed, and refusing those
 * would refuse a large share of real CVs.</p>
 */
export function cvFormat(file: Pick<File, 'name' | 'type'>): CvFormat | null {
  const byName = cvFormatFromName(file.name);
  if (!byName) {
    return null;
  }
  if (file.type === '') {
    return byName;
  }
  return CV_FORMATS.find((entry) => entry.mime === file.type)?.format === byName ? byName : null;
}

/** Returns the reason this CV cannot be used, or null when it is fine. */
export function validateCvFile(file: File): string | null {
  if (!cvFormat(file)) {
    return 'Choose a PDF or DOCX file.';
  }
  if (file.size === 0) {
    return 'That file is empty. Choose another one.';
  }
  if (file.size > MAX_CV_BYTES) {
    return `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_CV_BYTES)}.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Profile photo
// ---------------------------------------------------------------------------

/** Same ceiling as a company logo: a small square shown at avatar size. */
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export function validatePhotoFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Choose a PNG, JPG, SVG or WebP image.';
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return `That image is ${formatBytes(file.size)}. Choose one under ${formatBytes(MAX_PHOTO_BYTES)}.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

export interface CandidateFormValues {
  fullName: string;
  identityCardNumber: string;
  email: string;
  phone: string;
}

export type CandidateTextField = keyof CandidateFormValues;
export type CandidateFieldErrors = Partial<Record<CandidateTextField, string>>;

/** Document order — where the caret lands first when a submit is refused. */
export const CANDIDATE_TEXT_FIELDS: CandidateTextField[] = ['fullName', 'identityCardNumber', 'email', 'phone'];

/** The ID field's input limit — the same one registration uses. */
export const MAX_ID_NUMBER_LENGTH = 30;

export interface ExistingCv {
  name: string;
  size?: number;
  url?: string;
}

/**
 * Everything the form holds. Files are staged here and go nowhere until Save,
 * so Cancel — which simply drops this state — leaves the stored record as it was.
 */
export interface CandidateFormState {
  values: CandidateFormValues;
  photoFile: File | null;
  existingPhotoUrl: string | null;
  /** Edit only: the stored photo is to go on Save. */
  removePhoto: boolean;
  addToTalentPool: boolean;
  /** Whether the stored record is in the pool — drives the removal note. */
  wasInTalentPool: boolean;
  /**
   * The CV picked this session. Kept while the box is unticked, so ticking it
   * again brings it back; {@link buildCandidatePayload} is what leaves it out.
   */
  cvFile: File | null;
  existingCv: ExistingCv | null;
  /** Edit only: the stored CV is marked to go on Save. */
  removeExistingCv: boolean;
}

export const EMPTY_CANDIDATE_FORM: CandidateFormState = {
  values: { fullName: '', identityCardNumber: '', email: '', phone: '' },
  photoFile: null,
  existingPhotoUrl: null,
  removePhoto: false,
  // A new profile starts outside the pool: joining it is a deliberate choice.
  addToTalentPool: false,
  wasInTalentPool: false,
  cvFile: null,
  existingCv: null,
  removeExistingCv: false,
};

/**
 * A first-time profile, started from what the account already knows, so the
 * candidate is not asked to retype the name and email they registered with.
 */
export function blankProfileFor(user: Pick<UserResponse, 'firstName' | 'lastName' | 'email'> | null): CandidateFormState {
  if (!user) {
    return EMPTY_CANDIDATE_FORM;
  }
  return {
    ...EMPTY_CANDIDATE_FORM,
    values: {
      ...EMPTY_CANDIDATE_FORM.values,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
    },
  };
}

export function toCandidateFormState(candidate: MyCandidateProfileResponse): CandidateFormState {
  return {
    ...EMPTY_CANDIDATE_FORM,
    values: {
      fullName: candidate.fullName,
      identityCardNumber: candidate.identityCardNumber ?? '',
      email: candidate.email,
      phone: candidate.phone ?? '',
    },
    existingPhotoUrl: candidate.photoUrl,
    addToTalentPool: candidate.inTalentPool,
    wasInTalentPool: candidate.inTalentPool,
    existingCv: candidate.cv
      ? {
          name: candidate.cv.fileName,
          size: candidate.cv.sizeBytes ?? undefined,
          url: candidate.cv.url ?? undefined,
        }
      : null,
  };
}

/**
 * An NIC (old 912345678V or new 200012345678) or a passport number. Kept
 * permissive on purpose — letters and digits, 5 to 20 of them once spaces and
 * hyphens are set aside — because the authority on whether an ID is real is
 * the backend, not a regex that has to know every country's format.
 */
function invalidIdNumber(value: string): boolean {
  const compact = value.replace(/[\s-]/g, '');
  return !/^[A-Za-z0-9\s-]+$/.test(value) || !/^[A-Za-z0-9]{5,20}$/.test(compact);
}

/** Name, ID number and email are required; phone is optional, and the CV never is. */
export function validateCandidateValues(values: CandidateFormValues): CandidateFieldErrors {
  const errors: CandidateFieldErrors = {};
  const fullName = values.fullName.trim();
  const idNumber = values.identityCardNumber.trim();
  const email = values.email.trim();
  const phone = values.phone.trim();

  if (fullName === '') {
    errors.fullName = 'Enter your full name.';
  }
  if (idNumber === '') {
    errors.identityCardNumber = 'Enter your ID number.';
  } else if (invalidIdNumber(idNumber)) {
    errors.identityCardNumber = 'Enter a valid ID number, like 200012345678 or 912345678V.';
  }
  if (email === '') {
    errors.email = 'Enter your email address.';
  } else if (!EMAIL.test(email)) {
    errors.email = 'Enter a valid email address, like name@example.com.';
  }
  if (phone !== '' && invalidPhone(phone)) {
    errors.phone = 'Enter a valid phone number, like +94 77 123 4567.';
  }
  return errors;
}

/** The CV the file row shows: the one just picked, else the stored one unless it is marked to go. */
export interface DisplayedCv {
  name: string;
  size?: number;
  format: CvFormat | null;
}

export function displayedCv(state: CandidateFormState): DisplayedCv | null {
  if (state.cvFile) {
    return { name: state.cvFile.name, size: state.cvFile.size, format: cvFormat(state.cvFile) };
  }
  if (state.existingCv && !state.removeExistingCv) {
    return { ...state.existingCv, format: cvFormatFromName(state.existingCv.name) };
  }
  return null;
}

/**
 * Remove, from the file row: drops a staged file and, if a stored CV was
 * showing behind it, marks that one to go too — what the candidate saw
 * disappear is what disappears.
 */
export function removeCv(state: CandidateFormState): CandidateFormState {
  return { ...state, cvFile: null, removeExistingCv: state.existingCv !== null };
}

/** The pool membership on record is about to be dropped by this save. */
export function leavingTalentPool(state: CandidateFormState): boolean {
  return state.wasInTalentPool && !state.addToTalentPool;
}

/**
 * The multipart body for create and update. The only place that decides what
 * is sent: a staged CV rides along only while the Talent Pool box is ticked.
 */
export function buildCandidatePayload(state: CandidateFormState): FormData {
  const request: UpdateMyCandidateProfileRequest = {
    fullName: state.values.fullName.trim(),
    email: state.values.email.trim(),
    phone: state.values.phone.trim(),
    identityCardNumber: state.values.identityCardNumber.trim().toUpperCase(),
    addToTalentPool: state.addToTalentPool,
  };
  if (state.photoFile) {
    request.photo = state.photoFile;
  } else if (state.removePhoto && state.existingPhotoUrl) {
    request.removePhoto = true;
  }
  if (state.addToTalentPool) {
    if (state.cvFile) {
      request.cv = state.cvFile;
    } else if (state.removeExistingCv && state.existingCv) {
      request.removeCv = true;
    }
  }

  const form = new FormData();
  for (const [key, value] of Object.entries(request)) {
    if (value instanceof File) {
      form.append(key, value, value.name);
    } else if (value !== undefined) {
      form.append(key, String(value));
    }
  }
  return form;
}

// ---------------------------------------------------------------------------
// Profile strength and unsaved changes
// ---------------------------------------------------------------------------

/** Where a checklist item sends focus — a form control's id. */
export type ChecklistTarget = CandidateTextField | 'photo' | 'talentPool' | 'cv';

export interface ChecklistItem {
  id: ChecklistTarget;
  label: string;
  done: boolean;
}

/** The photo the candidate would end up with if they saved now. */
export function hasPhoto(state: CandidateFormState): boolean {
  return state.photoFile !== null || (state.existingPhotoUrl !== null && !state.removePhoto);
}

/**
 * What a complete profile has, in the order the page asks for it. A field
 * counts once it holds something valid, not merely something.
 */
export function profileChecklist(state: CandidateFormState): ChecklistItem[] {
  const errors = validateCandidateValues(state.values);
  const filled = (field: CandidateTextField) => state.values[field].trim() !== '' && !errors[field];
  return [
    { id: 'fullName', label: 'Full name', done: filled('fullName') },
    { id: 'identityCardNumber', label: 'ID number', done: filled('identityCardNumber') },
    { id: 'email', label: 'Email address', done: filled('email') },
    { id: 'phone', label: 'Phone number', done: filled('phone') },
    { id: 'photo', label: 'Profile photo', done: hasPhoto(state) },
    { id: 'talentPool', label: 'Joined the Talent Pool', done: state.addToTalentPool },
    { id: 'cv', label: 'CV uploaded', done: state.addToTalentPool && displayedCv(state) !== null },
  ];
}

/** 0–100, rounded, from {@link profileChecklist}. */
export function profileStrength(items: ChecklistItem[]): number {
  return items.length === 0 ? 0 : Math.round((items.filter((item) => item.done).length / items.length) * 100);
}

/**
 * Whether saving now would change anything, measured against the state last
 * loaded or saved. A CV staged while the box is clear is not a change — it
 * would not be sent.
 */
export function isProfileDirty(baseline: CandidateFormState, state: CandidateFormState): boolean {
  const valuesChanged = CANDIDATE_TEXT_FIELDS.some((field) => baseline.values[field] !== state.values[field]);
  return (
    valuesChanged ||
    state.photoFile !== null ||
    state.removePhoto !== baseline.removePhoto ||
    state.addToTalentPool !== baseline.addToTalentPool ||
    (state.addToTalentPool && (state.cvFile !== null || state.removeExistingCv !== baseline.removeExistingCv))
  );
}

/**
 * The element each checklist item sends focus to. The components that render
 * those elements take their ids from here, so a renamed id cannot quietly
 * break a checklist link.
 */
export const PROFILE_FOCUS_IDS = {
  photo: 'candidate-photo-button',
  talentPool: 'candidate-talent-pool',
  cvDropzone: 'candidate-cv-dropzone',
} as const;

import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { submitApplication } from '../../api/applications';
import { apiErrorMessage } from '../../api/client';
import type { JobApplicationResponse, JobSummary } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import {
  APPLICATION_FIELDS,
  MAX_COVER_LETTER,
  MAX_EMAIL,
  MAX_LOCATION,
  MAX_NAME,
  MAX_RESUME_BYTES,
  MAX_TITLE,
  MAX_URL,
  MAX_YEARS,
  RESUME_ACCEPT,
  formatFileSize,
  initialApplicationValues,
  toApplicationRequest,
  validateApplication,
  validateResume,
  type ApplicationErrors,
  type ApplicationField,
  type ApplicationFormValues,
  type ApplicationTextField,
} from '../../jobs/applicationForm';
import { jobPath } from '../../jobs/jobPaths';
import { Icon } from '../dashboard/Icon';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { inputClass } from '../ui/inputClass';
import { CompanyMark, JobBadges } from './JobParts';

const LEGEND = 'text-sm font-semibold uppercase tracking-wide text-slate-600';

const fieldId = (name: ApplicationField) => `application-${name}`;

function FieldError({ id, children }: Readonly<{ id: string; children: ReactNode }>) {
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1 text-xs text-red-600">
      <Icon name="warning" className="mt-px h-3.5 w-3.5 shrink-0" />
      {children}
    </p>
  );
}

function Field({
  id,
  label,
  required = false,
  error,
  hint,
  className = '',
  children,
}: Readonly<{ id: string; label: string; required?: boolean; error?: string; hint?: ReactNode; className?: string; children: ReactNode }>) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-red-600">
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <FieldError id={`${id}-error`}>{error}</FieldError>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/**
 * File input for the CV. The real input stays in the tab order (visually
 * hidden) so keyboard and screen-reader users get the native picker; the
 * visible drop zone and file card are pointer conveniences on top of it.
 */
function ResumePicker({
  id,
  file,
  invalid,
  describedBy,
  onChange,
}: Readonly<{ id: string; file: File | null; invalid: boolean; describedBy?: string; onChange: (file: File | null) => void }>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  // Inherits the surrounding fieldset's disabled state while submitting.
  const isDisabled = () => inputRef.current?.matches(':disabled') ?? false;

  const choose = (next: File | null) => {
    // Cleared every time so picking the same file again after removing it still fires a change.
    if (inputRef.current) inputRef.current.value = '';
    onChange(next);
  };
  const openPicker = () => {
    if (!isDisabled()) inputRef.current?.click();
  };
  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    if (!isDisabled()) setDragging(true);
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files[0];
    if (dropped && !isDisabled()) choose(dropped);
  };

  const ring = 'peer-focus-visible:ring-4 peer-focus-visible:ring-indigo-500/25';
  let tone = 'border-slate-200 bg-slate-50';
  if (invalid) tone = 'border-red-300 bg-red-50';
  else if (dragging) tone = 'border-indigo-400 bg-indigo-50';
  let zoneTone = 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50';
  if (dragging) zoneTone = 'border-indigo-500 bg-indigo-50';
  else if (invalid) zoneTone = 'border-red-300 bg-red-50/50 hover:border-red-400';

  return (
    <div className="mt-1.5" onDragOver={onDragOver} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
      <input
        ref={inputRef}
        id={id}
        name="resume"
        type="file"
        accept={RESUME_ACCEPT}
        aria-required="true"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => choose(event.target.files?.[0] ?? null)}
        className="peer sr-only"
      />
      {file ? (
        <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${ring} ${tone}`}>
          <Icon name="document" className={`h-8 w-8 shrink-0 ${invalid ? 'text-red-500' : 'text-indigo-600'}`} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
            <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={openPicker}
            className="rounded-md px-2 py-1 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={() => choose(null)}
            aria-label={`Remove ${file.name}`}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="x-mark" className="h-4 w-4" />
          </button>
        </div>
      ) : (
        // Pointer-only shortcut to the input above, which carries the accessible name.
        <div
          aria-hidden="true"
          onClick={openPicker}
          className={`flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${ring} ${zoneTone}`}
        >
          <Icon name="upload" className={`h-8 w-8 ${dragging ? 'text-indigo-600' : 'text-slate-400'}`} />
          <p className="mt-2 text-sm text-slate-700">
            <span className="font-semibold text-indigo-600">Choose a file</span> or drag it here
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Application form for one vacancy. Submitting locks the whole form, and a
 * second submit while one is in flight is ignored, so double clicks and Enter
 * presses cannot send the application twice.
 */
export function ApplicationForm({
  job,
  onSubmitted,
}: Readonly<{ job: JobSummary; onSubmitted: (application: JobApplicationResponse) => void }>) {
  const { user } = useAuth();
  const [values, setValues] = useState(() => initialApplicationValues(user));
  const [errors, setErrors] = useState<ApplicationErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const describedBy = (name: ApplicationField, hasHint = false) => {
    if (errors[name]) return `${fieldId(name)}-error`;
    return hasHint ? `${fieldId(name)}-hint` : undefined;
  };

  const update = (next: ApplicationFormValues) => {
    setValues(next);
    if (attempted) setErrors(validateApplication(next));
  };

  const field = (name: ApplicationTextField, hasHint = false) => ({
    id: fieldId(name),
    name,
    value: values[name],
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update({ ...values, [name]: event.target.value }),
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': describedBy(name, hasHint),
  });

  const setResume = (resume: File | null) => {
    const next = { ...values, resume };
    setValues(next);
    // A wrong file type or size is reported as soon as it is picked, not only on submit.
    if (attempted) setErrors(validateApplication(next));
    else setErrors((current) => ({ ...current, resume: resume ? validateResume(resume) : undefined }));
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;

    setAttempted(true);
    const found = validateApplication(values);
    setErrors(found);
    const firstInvalid = APPLICATION_FIELDS.find((name) => found[name]);
    if (firstInvalid) {
      document.getElementById(fieldId(firstInvalid))?.focus();
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // validateApplication guarantees a resume is present here.
      onSubmitted(await submitApplication(job.id, toApplicationRequest(values), values.resume!));
    } catch (err) {
      setSubmitError(apiErrorMessage(err, 'We could not submit your application. Please check your connection and try again.'));
      inFlight.current = false;
      setSubmitting(false);
    }
  }


  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div aria-hidden="true" className="h-2 bg-gradient-to-r from-indigo-600 to-violet-600" />
      <header className="flex min-w-0 items-start gap-4 border-b border-slate-100 p-6 sm:p-8">
        <CompanyMark name={job.companyName} logoUrl={job.companyLogoUrl} size="lg" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Apply for</p>
          <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{job.title}</h1>
          <p className="mt-1 break-words font-medium text-slate-600">{job.companyName}</p>
          <JobBadges job={job} className="mt-3" />
        </div>
      </header>

      <form noValidate onSubmit={(e) => void handleSubmit(e)} className="p-6 sm:p-8" aria-busy={submitting}>
        {submitError && (
          <Alert tone="error" className="mb-6">
            {submitError}
          </Alert>
        )}

        <fieldset disabled={submitting} className="space-y-8">
          <fieldset>
            <legend className={LEGEND}>Your details</legend>
            <p className="mt-1 text-xs text-slate-500">
              Fields marked <span className="text-red-600">*</span> are required.
            </p>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <Field id="application-fullName" label="Full name" required error={errors.fullName} className="sm:col-span-2">
                <input {...field('fullName')} required maxLength={MAX_NAME} autoComplete="name" className={inputClass} />
              </Field>
              <Field id="application-email" label="Email" required error={errors.email}>
                <input {...field('email')} type="email" required maxLength={MAX_EMAIL} autoComplete="email" className={inputClass} />
              </Field>
              <Field id="application-phone" label="Phone number" required error={errors.phone}>
                <input
                  {...field('phone')}
                  type="tel"
                  required
                  maxLength={25}
                  autoComplete="tel"
                  placeholder="+94 77 123 4567"
                  className={inputClass}
                />
              </Field>
              <Field id="application-location" label="Current location" error={errors.location} className="sm:col-span-2">
                <input
                  {...field('location')}
                  maxLength={MAX_LOCATION}
                  autoComplete="address-level2"
                  placeholder="City, country"
                  className={inputClass}
                />
              </Field>
            </div>
          </fieldset>

          <fieldset>
            <legend className={LEGEND}>Experience</legend>
            <p className="mt-1 text-xs text-slate-500">Your CV and where you are in your career today.</p>
            <div className="mt-4 grid gap-5 sm:grid-cols-3">
              <Field
                id="application-resume"
                label="Resume / CV"
                required
                error={errors.resume}
                hint={`PDF, DOC or DOCX, up to ${formatFileSize(MAX_RESUME_BYTES)}.`}
                className="sm:col-span-3"
              >
                <ResumePicker
                  id={fieldId('resume')}
                  file={values.resume}
                  invalid={Boolean(errors.resume)}
                  describedBy={describedBy('resume', true)}
                  onChange={setResume}
                />
              </Field>
              <Field id="application-currentTitle" label="Current job title" error={errors.currentTitle} className="sm:col-span-2">
                <input
                  {...field('currentTitle')}
                  maxLength={MAX_TITLE}
                  autoComplete="organization-title"
                  placeholder="e.g. Frontend Engineer"
                  className={inputClass}
                />
              </Field>
              <Field id="application-yearsOfExperience" label="Years of experience" error={errors.yearsOfExperience}>
                <input
                  {...field('yearsOfExperience')}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MAX_YEARS}
                  step={1}
                  placeholder="0"
                  className={inputClass}
                />
              </Field>
            </div>
          </fieldset>

          <fieldset>
            <legend className={LEGEND}>Additional information</legend>
            <p className="mt-1 text-xs text-slate-500">Optional, but it helps the hiring team get to know you.</p>
            <div className="mt-4 space-y-5">
              <Field
                id="application-portfolioUrl"
                label="LinkedIn or portfolio link"
                error={errors.portfolioUrl}
                hint="A full link, e.g. https://linkedin.com/in/your-name"
              >
                <input
                  {...field('portfolioUrl', true)}
                  type="url"
                  maxLength={MAX_URL}
                  autoComplete="url"
                  placeholder="https://"
                  className={inputClass}
                />
              </Field>
              <Field
                id="application-coverLetter"
                label="Cover letter"
                error={errors.coverLetter}
                hint={`${values.coverLetter.length} / ${MAX_COVER_LETTER} characters`}
              >
                <textarea
                  {...field('coverLetter', true)}
                  rows={6}
                  maxLength={MAX_COVER_LETTER}
                  placeholder="Tell the hiring team why you're a great fit for this role."
                  className={`${inputClass} resize-y`}
                />
              </Field>
            </div>
          </fieldset>

          <div>
            <div className="flex items-start gap-3">
              <input
                id={fieldId('consent')}
                name="consent"
                type="checkbox"
                checked={values.consent}
                onChange={(event) => update({ ...values, consent: event.target.checked })}
                aria-required="true"
                aria-invalid={errors.consent ? true : undefined}
                aria-describedby={describedBy('consent')}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-indigo-600 disabled:cursor-not-allowed"
              />
              <label htmlFor={fieldId('consent')} className="cursor-pointer text-sm text-slate-700">
                I agree to {job.companyName} storing and processing my personal data to assess this application.
                <span aria-hidden="true" className="ml-0.5 text-red-600">
                  *
                </span>
              </label>
            </div>
            {errors.consent && <FieldError id={`${fieldId('consent')}-error`}>{errors.consent}</FieldError>}
          </div>
        </fieldset>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
          <Link
            to={jobPath(job)}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/25"
          >
            Cancel
          </Link>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Application'}
          </Button>
        </div>
      </form>
    </article>
  );
}

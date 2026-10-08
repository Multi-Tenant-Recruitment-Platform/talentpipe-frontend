import { Checkbox, Input, Typography } from 'antd';
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
import { fontSize, space, status } from '../../theme/tokens';
import { Icon } from '../dashboard/Icon';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { CompanyMark, JobBadges } from './JobParts';

const fieldId = (name: ApplicationField) => `application-${name}`;

function RequiredMark() {
  return (
    <span aria-hidden="true" style={{ marginLeft: 2, color: status.errorText }}>
      *
    </span>
  );
}

function FieldError({ id, children }: Readonly<{ id: string; children: ReactNode }>) {
  return (
    <Typography.Paragraph
      id={id}
      role="alert"
      type="danger"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: space[0.5],
        fontSize: fontSize.caption,
        margin: `${space[0.75]}px 0 0`,
      }}
    >
      <Icon name="warning" size={14} style={{ marginTop: 1 }} />
      {children}
    </Typography.Paragraph>
  );
}

function Field({
  id,
  label,
  required = false,
  error,
  hint,
  className,
  children,
}: Readonly<{ id: string; label: string; required?: boolean; error?: string; hint?: ReactNode; className?: string; children: ReactNode }>) {
  return (
    <div className={className}>
      <label htmlFor={id} className="tp-vacancy-label">
        {label}
        {required && <RequiredMark />}
      </label>
      {children}
      {error ? (
        <FieldError id={`${id}-error`}>{error}</FieldError>
      ) : (
        hint && (
          <Typography.Text
            id={`${id}-hint`}
            type="secondary"
            style={{ display: 'block', fontSize: fontSize.caption, marginTop: space[0.75] }}
          >
            {hint}
          </Typography.Text>
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

  let tone = '';
  if (dragging) tone = ' tp-resume-dragging';
  else if (invalid) tone = ' tp-resume-invalid';

  return (
    <div onDragOver={onDragOver} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
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
        className="sr-only"
      />
      {file ? (
        <div className={`tp-resume-file${tone}`}>
          <Icon name="document" size={32} />
          <div className="tp-resume-file-text">
            <p className="tp-resume-file-name tp-truncate">{file.name}</p>
            <p className="tp-resume-file-size">{formatFileSize(file.size)}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={openPicker}>
            Replace
          </Button>
          <Button variant="ghost" size="sm" onClick={() => choose(null)} aria-label={`Remove ${file.name}`}>
            <Icon name="x-mark" size={16} />
          </Button>
        </div>
      ) : (
        // Pointer-only shortcut to the input above, which carries the accessible name.
        <div aria-hidden="true" onClick={openPicker} className={`tp-resume-zone${tone}`}>
          <Icon name="upload" size={32} />
          <p>
            <strong>Choose a file</strong> or drag it here
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
    // The fieldset below already disables the control; antd needs telling too, to draw it disabled.
    disabled: submitting,
    status: errors[name] ? ('error' as const) : undefined,
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
    <article className="tp-job-panel">
      <header className="tp-job-identity tp-job-panel-body tp-apply-head">
        <CompanyMark name={job.companyName} logoUrl={job.companyLogoUrl} size="lg" />
        <div className="tp-job-identity-text">
          <p className="tp-job-eyebrow">Apply for</p>
          <h1 className="tp-job-title">{job.title}</h1>
          <p className="tp-job-company" style={{ marginBottom: space[1.5] }}>
            {job.companyName}
          </p>
          <JobBadges job={job} />
        </div>
      </header>

      <form noValidate onSubmit={(e) => void handleSubmit(e)} className="tp-job-panel-body" aria-busy={submitting}>
        {submitError && (
          <Alert tone="error" style={{ marginBottom: space[3] }}>
            {submitError}
          </Alert>
        )}

        <fieldset disabled={submitting} className="tp-apply-groups">
          <fieldset className="tp-apply-group">
            <legend className="tp-legend">Your details</legend>
            <p className="tp-apply-note">
              Fields marked <RequiredMark /> are required.
            </p>
            <div className="tp-detail-grid">
              <Field id="application-fullName" label="Full name" required error={errors.fullName} className="tp-detail-grid-full">
                <Input {...field('fullName')} required maxLength={MAX_NAME} autoComplete="name" />
              </Field>
              <Field id="application-email" label="Email" required error={errors.email}>
                <Input {...field('email')} type="email" required maxLength={MAX_EMAIL} autoComplete="email" />
              </Field>
              <Field id="application-phone" label="Phone number" required error={errors.phone}>
                <Input {...field('phone')} type="tel" required maxLength={25} autoComplete="tel" placeholder="+94 77 123 4567" />
              </Field>
              <Field id="application-location" label="Current location" error={errors.location} className="tp-detail-grid-full">
                <Input {...field('location')} maxLength={MAX_LOCATION} autoComplete="address-level2" placeholder="City, country" />
              </Field>
            </div>
          </fieldset>

          <fieldset className="tp-apply-group">
            <legend className="tp-legend">Experience</legend>
            <p className="tp-apply-note">Your CV and where you are in your career today.</p>
            <div className="tp-detail-grid-3">
              <Field
                id="application-resume"
                label="Resume / CV"
                required
                error={errors.resume}
                hint={`PDF, DOC or DOCX, up to ${formatFileSize(MAX_RESUME_BYTES)}.`}
                className="tp-detail-grid-full"
              >
                <ResumePicker
                  id={fieldId('resume')}
                  file={values.resume}
                  invalid={Boolean(errors.resume)}
                  describedBy={describedBy('resume', true)}
                  onChange={setResume}
                />
              </Field>
              <Field id="application-currentTitle" label="Current job title" error={errors.currentTitle} className="tp-apply-span-2">
                <Input
                  {...field('currentTitle')}
                  maxLength={MAX_TITLE}
                  autoComplete="organization-title"
                  placeholder="e.g. Frontend Engineer"
                />
              </Field>
              <Field id="application-yearsOfExperience" label="Years of experience" error={errors.yearsOfExperience}>
                <Input
                  {...field('yearsOfExperience')}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MAX_YEARS}
                  step={1}
                  placeholder="0"
                />
              </Field>
            </div>
          </fieldset>

          <fieldset className="tp-apply-group">
            <legend className="tp-legend">Additional information</legend>
            <p className="tp-apply-note">Optional, but it helps the hiring team get to know you.</p>
            <div className="tp-detail-grid-3">
              <Field
                id="application-portfolioUrl"
                label="LinkedIn or portfolio link"
                error={errors.portfolioUrl}
                hint="A full link, e.g. https://linkedin.com/in/your-name"
                className="tp-detail-grid-full"
              >
                <Input {...field('portfolioUrl', true)} type="url" maxLength={MAX_URL} autoComplete="url" placeholder="https://" />
              </Field>
              <Field
                id="application-coverLetter"
                label="Cover letter"
                error={errors.coverLetter}
                hint={`${values.coverLetter.length} / ${MAX_COVER_LETTER} characters`}
                className="tp-detail-grid-full"
              >
                <Input.TextArea
                  {...field('coverLetter', true)}
                  rows={6}
                  maxLength={MAX_COVER_LETTER}
                  placeholder="Tell the hiring team why you're a great fit for this role."
                />
              </Field>
            </div>
          </fieldset>

          <div>
            <Checkbox
              id={fieldId('consent')}
              name="consent"
              checked={values.consent}
              onChange={(event) => update({ ...values, consent: event.target.checked })}
              disabled={submitting}
              aria-required="true"
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={describedBy('consent')}
            >
              I agree to {job.companyName} storing and processing my personal data to assess this application.
              <RequiredMark />
            </Checkbox>
            {errors.consent && <FieldError id={`${fieldId('consent')}-error`}>{errors.consent}</FieldError>}
          </div>
        </fieldset>

        <div className="tp-apply-actions">
          <Link to={jobPath(job)} className="tp-cta-link tp-cta-link-ghost">
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

import { ArrowRightOutlined, CloseOutlined, FileOutlined, UploadOutlined } from '@ant-design/icons';
import { Checkbox, ConfigProvider, Input, Typography, type ThemeConfig } from 'antd';
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
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { FieldError } from '../ui/FieldError';
import { CompanyMark } from './JobParts';
import { detailGrid, detailGrid3 } from '../ui/classes';
import { heroChip } from './HeroBand';
import { employmentTypeLabel, workplaceTypeLabel } from '../../jobs/jobLabels';
import { primary, radius, slate, space } from '../../theme/tokens';

const fieldId = (name: ApplicationField) => `application-${name}`;

/**
 * Roomier, softer fields for a form people fill in once and care about: a
 * taller control, a larger radius, and a placeholder at slate-500 so example
 * text stays legible (antd's default fails 4.5:1).
 */
const FORM_THEME: ThemeConfig = {
  components: {
    Input: {
      controlHeight: 44,
      borderRadius: radius.lg,
      paddingInline: space[1.5] + 2,
      hoverBorderColor: primary[500],
      colorTextPlaceholder: slate[500],
    },
  },
};

function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-0.5 text-error-text">
      *
    </span>
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
      <label htmlFor={id} className="mb-1.5 block text-small font-semibold text-slate-800">
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
            className="mt-1.5 block text-caption"
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

  let tone = 'border-primary-200 bg-primary-50/40 hover:border-primary-500 hover:bg-primary-50';
  if (dragging) tone = 'border-primary-600 bg-primary-50';
  else if (invalid) tone = 'border-error bg-error-bg/40';

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
        <div
          className={`flex items-center gap-3 rounded-2xl border bg-surface p-3 pl-4 ${
            invalid ? 'border-error bg-error-bg/40' : 'border-slate-200'
          }`}
        >
          <span aria-hidden="true" className="grid size-11 flex-none place-items-center rounded-xl bg-primary-50 text-primary-600">
            <FileOutlined className="text-[20px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate font-semibold text-slate-900">{file.name}</p>
            <p className="m-0 text-caption text-slate-500">{formatFileSize(file.size)}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={openPicker}>
            Replace
          </Button>
          <Button variant="ghost" size="sm" onClick={() => choose(null)} aria-label={`Remove ${file.name}`}>
            <CloseOutlined aria-hidden className="text-[16px]" />
          </Button>
        </div>
      ) : (
        // Pointer-only shortcut to the input above, which carries the accessible name.
        <div
          aria-hidden="true"
          onClick={openPicker}
          className={`flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors duration-(--tp-motion-fast) ${tone}`}
        >
          <span className="grid size-12 place-items-center rounded-full bg-surface text-primary-600 shadow-sm">
            <UploadOutlined className="text-[20px]" />
          </span>
          <p className="m-0 text-body text-slate-600">
            <strong className="font-semibold text-primary-700">Choose a file</strong> or drag it here
          </p>
        </div>
      )}
    </div>
  );
}

/** One numbered step of the form: a legend with its number, a note, then the fields. */
const step = 'm-0 min-w-0 border-0 p-0';
/**
 * The rule between steps is its own element: a border on the fieldset itself
 * would be drawn through its legend, the way browsers render fieldsets.
 */
const StepRule = () => <hr aria-hidden="true" className="m-0 h-px border-0 bg-slate-200" />;
const stepLegend = 'm-0 flex items-center gap-3 p-0 text-title font-bold text-slate-900';
const stepNote = 'm-0 mt-1.5 mb-5 pl-11 text-small text-slate-500';

function StepNumber({ n }: Readonly<{ n: number }>) {
  return (
    <span aria-hidden="true" className="grid size-8 flex-none place-items-center rounded-full bg-primary-600 text-small font-bold text-white">
      {n}
    </span>
  );
}

/**
 * The job being applied for, on the dark strip the page opens with. Once the
 * application is sent the confirmation carries the page's h1, so the title
 * steps down to a paragraph (`titleAs`).
 */
export function ApplyHero({ job, titleAs: Title = 'h1' }: Readonly<{ job: JobSummary; titleAs?: 'h1' | 'p' }>) {
  const openings = job.openings ?? 0;
  const chips = [
    job.employmentType && employmentTypeLabel(job.employmentType),
    job.workplaceType && workplaceTypeLabel(job.workplaceType),
    openings >= 2 && `${openings} openings`,
  ].filter((chip): chip is string => Boolean(chip));

  return (
    <header className="flex items-start gap-4 sm:gap-5">
      <span className="flex-none rounded-2xl bg-surface p-1 shadow-lg ring-1 ring-white/10">
        <CompanyMark name={job.companyName} logoUrl={job.companyLogoUrl} size="lg" />
      </span>
      <div className="min-w-0">
        <p className="m-0 text-caption font-bold tracking-caps text-primary-200 uppercase">Apply for</p>
        <Title className="m-0 mt-1 text-heading leading-tight font-bold tracking-display text-white [overflow-wrap:anywhere] sm:text-[34px]">
          {job.title}
        </Title>
        <p className="m-0 mt-1 text-lead font-medium text-slate-300">{job.companyName}</p>
        {chips.length > 0 && (
          <ul className="m-0 mt-4 flex list-none flex-wrap gap-2 p-0">
            {chips.map((chip) => (
              <li key={chip} className={heroChip}>
                {chip}
              </li>
            ))}
          </ul>
        )}
      </div>
    </header>
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
    <ConfigProvider theme={FORM_THEME}>
      <form
        noValidate
        onSubmit={(e) => void handleSubmit(e)}
        aria-busy={submitting}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-lg"
      >
        <div className="p-6 sm:p-8">
          {submitError && (
            <Alert tone="error" className="mb-6">
              {submitError}
            </Alert>
          )}

        <fieldset disabled={submitting} className="m-0 flex min-w-0 flex-col gap-8 border-0 p-0">
          <fieldset className={step}>
            <legend className={stepLegend}>
              <StepNumber n={1} />
              Your details
            </legend>
            <p className={stepNote}>
              Fields marked <RequiredMark /> are required.
            </p>
            <div className={detailGrid}>
              <Field id="application-fullName" label="Full name" required error={errors.fullName} className="col-span-full">
                <Input {...field('fullName')} required maxLength={MAX_NAME} autoComplete="name" />
              </Field>
              <Field id="application-email" label="Email" required error={errors.email}>
                <Input {...field('email')} type="email" required maxLength={MAX_EMAIL} autoComplete="email" />
              </Field>
              <Field id="application-phone" label="Phone number" required error={errors.phone}>
                <Input {...field('phone')} type="tel" required maxLength={25} autoComplete="tel" placeholder="+94 77 123 4567" />
              </Field>
              <Field id="application-location" label="Current location" error={errors.location} className="col-span-full">
                <Input {...field('location')} maxLength={MAX_LOCATION} autoComplete="address-level2" placeholder="City, country" />
              </Field>
            </div>
          </fieldset>

          <StepRule />

          <fieldset className={step}>
            <legend className={stepLegend}>
              <StepNumber n={2} />
              Experience
            </legend>
            <p className={stepNote}>Your CV and where you are in your career today.</p>
            <div className={detailGrid3}>
              <Field
                id="application-resume"
                label="Resume / CV"
                required
                error={errors.resume}
                hint={`PDF, DOC or DOCX, up to ${formatFileSize(MAX_RESUME_BYTES)}.`}
                className="col-span-full"
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

          <StepRule />

          <fieldset className={step}>
            <legend className={stepLegend}>
              <StepNumber n={3} />
              Additional information
            </legend>
            <p className={stepNote}>Optional, but it helps the hiring team get to know you.</p>
            <div className={detailGrid3}>
              <Field
                id="application-portfolioUrl"
                label="LinkedIn or portfolio link"
                error={errors.portfolioUrl}
                hint="A full link, e.g. https://linkedin.com/in/your-name"
                className="col-span-full"
              >
                <Input {...field('portfolioUrl', true)} type="url" maxLength={MAX_URL} autoComplete="url" placeholder="https://" />
              </Field>
              <Field
                id="application-coverLetter"
                label="Cover letter"
                error={errors.coverLetter}
                hint={`${values.coverLetter.length} / ${MAX_COVER_LETTER} characters`}
                className="col-span-full"
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

          <div className="rounded-xl border border-slate-200 bg-canvas p-4">
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
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-canvas px-6 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-8">
          <Link
            to={jobPath(job)}
            className="flex h-11 items-center justify-center rounded-pill px-5 font-semibold text-slate-700 no-underline transition-colors hover:bg-sunken hover:text-slate-900"
          >
            Cancel
          </Link>
          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            className="h-11 rounded-pill px-6 shadow-primary"
          >
            {submitting ? 'Submitting…' : 'Submit Application'}
            {!submitting && <ArrowRightOutlined aria-hidden className="text-[14px]" />}
          </Button>
        </div>
      </form>
    </ConfigProvider>
  );
}

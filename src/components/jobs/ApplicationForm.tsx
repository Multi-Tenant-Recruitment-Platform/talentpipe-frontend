import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { submitApplication } from '../../api/applications';
import { apiErrorMessage } from '../../api/client';
import type { JobApplicationResponse, JobSummary } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import {
  APPLICATION_FIELDS,
  MAX_COVER_LETTER,
  MAX_EMAIL,
  MAX_NAME,
  MAX_URL,
  initialApplicationValues,
  toApplicationRequest,
  validateApplication,
  type ApplicationErrors,
  type ApplicationField,
} from '../../jobs/applicationForm';
import { jobPath } from '../../jobs/jobPaths';
import { Icon } from '../dashboard/Icon';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { inputClass } from '../ui/inputClass';
import { CompanyMark, JobBadges } from './JobParts';

const LEGEND = 'text-sm font-semibold uppercase tracking-wide text-slate-600';

const fieldId = (name: ApplicationField) => `application-${name}`;

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
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-start gap-1 text-xs text-red-600">
          <Icon name="warning" className="mt-px h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
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

  const field = (name: ApplicationField, hasHint = false) => {
    const id = fieldId(name);
    const describedBy = errors[name] ? `${id}-error` : hasHint ? `${id}-hint` : undefined;
    return {
      id,
      name,
      value: values[name],
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const next = { ...values, [name]: event.target.value };
        setValues(next);
        if (attempted) setErrors(validateApplication(next));
      },
      'aria-invalid': errors[name] ? true : undefined,
      'aria-describedby': describedBy,
    };
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
      onSubmitted(await submitApplication(job.id, toApplicationRequest(values)));
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

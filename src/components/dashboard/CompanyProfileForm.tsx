import { useRef, type FormEvent, type ReactNode } from 'react';
import {
  COMPANY_FIELDS,
  COMPANY_SIZES,
  INDUSTRIES,
  MAX_DESCRIPTION,
  type CompanyField,
  type CompanyFieldErrors,
  type CompanyFormValues,
} from '../../dashboard/companyProfile';
import { Button } from '../ui/Button';
import { inputClass } from '../ui/inputClass';
import { Icon } from './Icon';

/**
 * Edit mode for the company profile.
 *
 * <p>Validation is not run per keystroke: an email is invalid for every
 * character you type before the '@', and telling someone so while they type is
 * noise. Errors arrive from the page on submit — {@link onSubmit} hands them
 * back — and from then on the field re-validates as it is corrected, which is
 * the moment the feedback is actually useful.</p>
 */

const fieldId = (field: CompanyField) => `company-${field}`;
const errorId = (field: CompanyField) => `company-${field}-error`;

function Field({
  field,
  label,
  error,
  hint,
  className = '',
  children,
}: {
  field: CompanyField;
  label: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={fieldId(field)} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error ? (
        <p id={errorId(field)} role="alert" className="mt-1.5 flex items-start gap-1 text-xs text-red-600">
          <Icon name="warning" className="mt-px h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>
      )}
    </div>
  );
}

export function CompanyProfileForm({
  values,
  errors,
  dirty,
  saving,
  onChange,
  onSubmit,
  onCancel,
}: {
  values: CompanyFormValues;
  errors: CompanyFieldErrors;
  dirty: boolean;
  saving: boolean;
  onChange: (field: CompanyField, value: string) => void;
  /** Validates and saves; returns the errors that stopped it, if any. */
  onSubmit: () => CompanyFieldErrors;
  onCancel: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = onSubmit();
    // Land the caret on the first problem in document order, rather than
    // leaving the admin to hunt for the red text on a long form.
    const firstBroken = COMPANY_FIELDS.find((field) => found[field]);
    if (firstBroken) {
      formRef.current?.querySelector<HTMLElement>(`#${fieldId(firstBroken)}`)?.focus();
    }
  }

  /** Wires a field's error to its control for assistive tech. */
  const a11y = (field: CompanyField) =>
    errors[field] ? { 'aria-invalid': true, 'aria-describedby': errorId(field) } : {};

  const overLimit = values.description.trim().length > MAX_DESCRIPTION;

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Logo sits with the identity fields it belongs to, disabled until the
          media API exists — labelled so it reads as "not yet", not "broken". */}
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
          <Icon name="building" className="h-8 w-8" />
        </span>
        <div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled
            title="Logo upload arrives with the tenant media API"
          >
            Upload logo
          </Button>
          <p className="mt-1.5 text-xs text-slate-400">PNG or SVG, at least 256×256.</p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field field="name" label="Company name" error={errors.name} className="sm:col-span-2">
          <input
            id={fieldId('name')}
            value={values.name}
            onChange={(e) => onChange('name', e.target.value)}
            autoComplete="organization"
            className={inputClass}
            {...a11y('name')}
          />
        </Field>

        <Field field="industry" label="Industry" error={errors.industry}>
          <select
            id={fieldId('industry')}
            value={values.industry}
            onChange={(e) => onChange('industry', e.target.value)}
            className={inputClass}
            {...a11y('industry')}
          >
            {/* An explicit "not set" option: without it the first industry in
                the list silently becomes every company's answer. */}
            <option value="">Select an industry</option>
            {INDUSTRIES.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </Field>

        <Field field="size" label="Company size" error={errors.size}>
          <select
            id={fieldId('size')}
            value={values.size}
            onChange={(e) => onChange('size', e.target.value)}
            className={inputClass}
            {...a11y('size')}
          >
            <option value="">Select a size</option>
            {COMPANY_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </Field>

        <Field
          field="email"
          label="Email"
          error={errors.email}
          hint="Where candidates and applicants reach you."
        >
          <input
            id={fieldId('email')}
            type="email"
            value={values.email}
            onChange={(e) => onChange('email', e.target.value)}
            autoComplete="email"
            placeholder="hr@yourcompany.com"
            className={inputClass}
            {...a11y('email')}
          />
        </Field>

        <Field field="phone" label="Phone" error={errors.phone}>
          <input
            id={fieldId('phone')}
            type="tel"
            value={values.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            autoComplete="tel"
            placeholder="+94 11 234 5678"
            className={inputClass}
            {...a11y('phone')}
          />
        </Field>

        <Field
          field="website"
          label="Website"
          error={errors.website}
          hint="We'll add https:// if you leave it out."
        >
          {/* type="text", not "url": type="url" makes the browser reject a bare
              'abc.com' with its own tooltip before our normaliser ever sees it. */}
          <input
            id={fieldId('website')}
            type="text"
            inputMode="url"
            value={values.website}
            onChange={(e) => onChange('website', e.target.value)}
            autoComplete="url"
            placeholder="abc.com"
            className={inputClass}
            {...a11y('website')}
          />
        </Field>

        <Field field="address" label="Address" error={errors.address}>
          <input
            id={fieldId('address')}
            value={values.address}
            onChange={(e) => onChange('address', e.target.value)}
            autoComplete="street-address"
            placeholder="City, Country"
            className={inputClass}
            {...a11y('address')}
          />
        </Field>

        <Field
          field="description"
          label="Description"
          error={errors.description}
          className="sm:col-span-2"
          hint="A short pitch that appears at the top of your careers page."
        >
          <textarea
            id={fieldId('description')}
            rows={4}
            value={values.description}
            onChange={(e) => onChange('description', e.target.value)}
            className={`${inputClass} resize-none`}
            {...a11y('description')}
          />
          <p
            className={`mt-1 text-right text-xs tabular-nums ${overLimit ? 'font-medium text-red-600' : 'text-slate-400'}`}
          >
            {values.description.trim().length} / {MAX_DESCRIPTION}
          </p>
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-5">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          // Not disabled on validation errors: a Save that does nothing at
          // least says why, while a permanently greyed button says nothing.
          disabled={saving || !dirty}
          title={dirty ? undefined : 'Nothing has changed yet'}
        >
          {saving ? (
            'Saving…'
          ) : (
            <>
              <Icon name="check" className="h-4 w-4" />
              Save changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

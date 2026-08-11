import { useRef, type FormEvent, type ReactNode } from 'react';
import type { CompanyImageKind } from '../../api/types';
import {
  BENEFIT_CATALOGUE,
  COMPANY_SIZES,
  COMPANY_TEXT_FIELDS,
  FIELD_LABELS,
  INDUSTRIES,
  MAX_CULTURE,
  MAX_DESCRIPTION,
  SOCIAL_FIELDS,
  SOCIAL_PLACEHOLDERS,
  type CompanyFieldErrors,
  type CompanyFormValues,
  type CompanyTextField,
} from '../../dashboard/companyProfile';
import { Button } from '../ui/Button';
import { inputClass } from '../ui/inputClass';
import { CompanyImagePicker } from './CompanyImagePicker';
import { Icon } from './Icon';

/**
 * Edit mode for the company profile, laid out in the same three sections the
 * read view uses — overview, contact, location — so switching between them
 * does not rearrange the furniture.
 *
 * <p>Validation is not run per keystroke: an email is invalid for every
 * character you type before the '@', and telling someone so while they type is
 * noise. Errors arrive from the caller on submit — {@link onSubmit} hands them
 * back — and from then on the field re-validates as it is corrected, which is
 * the moment the feedback is actually useful.</p>
 */

const fieldId = (field: CompanyTextField) => `company-${field}`;
const errorId = (field: CompanyTextField) => `company-${field}-error`;

function Fieldset({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-slate-100 pt-6">
      <legend className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {legend}
      </legend>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({
  field,
  error,
  hint,
  className = '',
  children,
}: {
  field: CompanyTextField;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={fieldId(field)} className="block text-sm font-medium text-slate-700">
        {FIELD_LABELS[field]}
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
  logoUrl,
  coverUrl,
  imageErrors,
  onChange,
  onToggleBenefit,
  onPickImage,
  onRemoveImage,
  onSubmit,
  onCancel,
}: {
  values: CompanyFormValues;
  errors: CompanyFieldErrors;
  dirty: boolean;
  saving: boolean;
  logoUrl: string | null;
  coverUrl: string | null;
  imageErrors: Record<CompanyImageKind, string | null>;
  onChange: (field: CompanyTextField, value: string) => void;
  onToggleBenefit: (id: string) => void;
  onPickImage: (kind: CompanyImageKind, file: File) => void;
  onRemoveImage: (kind: CompanyImageKind) => void;
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
    const firstBroken = COMPANY_TEXT_FIELDS.find((field) => found[field]);
    if (firstBroken) {
      formRef.current?.querySelector<HTMLElement>(`#${fieldId(firstBroken)}`)?.focus();
    }
  }

  /** Wires a field's error to its control for assistive tech. */
  const a11y = (field: CompanyTextField) =>
    errors[field] ? { 'aria-invalid': true, 'aria-describedby': errorId(field) } : {};

  const overLimit = values.description.trim().length > MAX_DESCRIPTION;
  const cultureOver = values.culture.trim().length > MAX_CULTURE;

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <CompanyImagePicker
          kind="logo"
          imageUrl={logoUrl}
          companyName={values.name}
          error={imageErrors.logo}
          disabled={saving}
          onPick={(file) => onPickImage('logo', file)}
          onRemove={() => onRemoveImage('logo')}
        />
        <CompanyImagePicker
          kind="cover"
          imageUrl={coverUrl}
          companyName={values.name}
          error={imageErrors.cover}
          disabled={saving}
          onPick={(file) => onPickImage('cover', file)}
          onRemove={() => onRemoveImage('cover')}
        />
      </div>

      <Fieldset legend="Company overview">
        <Field field="name" error={errors.name} className="sm:col-span-2">
          <input
            id={fieldId('name')}
            value={values.name}
            onChange={(e) => onChange('name', e.target.value)}
            autoComplete="organization"
            className={inputClass}
            {...a11y('name')}
          />
        </Field>

        <Field field="industry" error={errors.industry}>
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

        <Field field="size" error={errors.size}>
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
          field="description"
          error={errors.description}
          className="sm:col-span-2"
          hint="What the company does, in a few sentences. Candidates read this first."
        >
          <textarea
            id={fieldId('description')}
            rows={5}
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

        <Field
          field="culture"
          error={errors.culture}
          className="sm:col-span-2"
          hint="What it is like to work here — the day to day, not the mission statement."
        >
          <textarea
            id={fieldId('culture')}
            rows={3}
            value={values.culture}
            onChange={(e) => onChange('culture', e.target.value)}
            placeholder="We encourage collaboration, continuous learning and innovation…"
            className={`${inputClass} resize-none`}
            {...a11y('culture')}
          />
          <p
            className={`mt-1 text-right text-xs tabular-nums ${cultureOver ? 'font-medium text-red-600' : 'text-slate-400'}`}
          >
            {values.culture.trim().length} / {MAX_CULTURE}
          </p>
        </Field>
      </Fieldset>

      {/* A checklist, not free text: stored as identifiers, these can be
          filtered on later — "show me remote-friendly companies" — which a
          sentence someone typed never could. */}
      <fieldset className="border-t border-slate-100 pt-6">
        <legend className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Benefits &amp; perks
        </legend>
        <p className="mt-1 text-xs text-slate-400">
          Pick everything that applies. Candidates scan these before the job description.
        </p>
        <div className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
          {BENEFIT_CATALOGUE.map((benefit) => (
            <label
              key={benefit.id}
              className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                checked={values.benefits.includes(benefit.id)}
                onChange={() => onToggleBenefit(benefit.id)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/40"
              />
              {benefit.label}
            </label>
          ))}
        </div>
      </fieldset>

      <Fieldset legend="Contact information">
        <Field field="email" error={errors.email} hint="Where candidates and applicants reach you.">
          <input
            id={fieldId('email')}
            type="email"
            value={values.email}
            onChange={(e) => onChange('email', e.target.value)}
            autoComplete="email"
            placeholder="contact@abc.com"
            className={inputClass}
            {...a11y('email')}
          />
        </Field>

        <Field field="phone" error={errors.phone}>
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
          error={errors.website}
          className="sm:col-span-2"
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
      </Fieldset>

      <Fieldset legend="Social links">
        {SOCIAL_FIELDS.map((field) => (
          <Field key={field} field={field} error={errors[field]}>
            {/* type="text" for the same reason as the website field: the
                browser's own url validation rejects a bare domain first. */}
            <input
              id={fieldId(field)}
              type="text"
              inputMode="url"
              value={values[field]}
              onChange={(e) => onChange(field, e.target.value)}
              placeholder={SOCIAL_PLACEHOLDERS[field]}
              className={inputClass}
              {...a11y(field)}
            />
          </Field>
        ))}
      </Fieldset>

      <Fieldset legend="Location">
        <Field field="address" error={errors.address} className="sm:col-span-2">
          <input
            id={fieldId('address')}
            value={values.address}
            onChange={(e) => onChange('address', e.target.value)}
            autoComplete="street-address"
            placeholder="No. 42, Galle Road"
            className={inputClass}
            {...a11y('address')}
          />
        </Field>

        <Field field="city" error={errors.city}>
          <input
            id={fieldId('city')}
            value={values.city}
            onChange={(e) => onChange('city', e.target.value)}
            autoComplete="address-level2"
            placeholder="Colombo"
            className={inputClass}
            {...a11y('city')}
          />
        </Field>

        <Field field="country" error={errors.country}>
          <input
            id={fieldId('country')}
            value={values.country}
            onChange={(e) => onChange('country', e.target.value)}
            autoComplete="country-name"
            placeholder="Sri Lanka"
            className={inputClass}
            {...a11y('country')}
          />
        </Field>
      </Fieldset>

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

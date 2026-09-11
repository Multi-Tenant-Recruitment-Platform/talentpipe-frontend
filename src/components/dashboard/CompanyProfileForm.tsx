import { useRef, type FormEvent, type ReactNode } from 'react';
import type { CompanyImageKind } from '../../api/types';
import {
  BENEFIT_CATALOGUE,
  COMPANY_SIZE_GROUPS,
  COMPANY_TEXT_FIELDS,
  COMPANY_TYPES,
  CURRENCIES,
  FIELD_LABELS,
  INDUSTRIES,
  LANGUAGES,
  MAX_DESCRIPTION,
  SOCIAL_FIELDS,
  SOCIAL_PLACEHOLDERS,
  TIMEZONES,
  type CompanyFieldErrors,
  type CompanyFormValues,
  type CompanyListField,
  type CompanyTextField,
} from '../../dashboard/companyProfile';
import { Button } from '../ui/Button';
import { inputClass } from '../ui/inputClass';
import { CompanyImagePicker } from './CompanyImagePicker';
import { CompanyChipListEditor } from './CompanyChipListEditor';
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

/**
 * Section headings. Dark enough to read as headings and break a long form into
 * parts — the lighter grey they had sat below the field labels in weight.
 */
const LEGEND_CLASS = 'text-xs font-semibold uppercase tracking-wide text-slate-600';

const fieldId = (field: CompanyTextField) => `company-${field}`;
const errorId = (field: CompanyTextField) => `company-${field}-error`;

function Fieldset({ legend, children }: Readonly<{ legend: string; children: ReactNode }>) {
  return (
    <fieldset className="border-t border-slate-100 pt-6">
      <legend className={LEGEND_CLASS}>{legend}</legend>
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
}: Readonly<{
  field: CompanyTextField;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}>) {
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

/** A titled set of checkboxes over a fixed catalogue. */
function CheckboxGroup({
  legend,
  hint,
  options,
  selected,
  onToggle,
  columns = 'sm:grid-cols-2',
}: Readonly<{
  legend: string;
  hint: string;
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  columns?: string;
}>) {
  return (
    <fieldset className="border-t border-slate-100 pt-6">
      <legend className={LEGEND_CLASS}>{legend}</legend>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
      <div className={`mt-4 grid gap-x-6 gap-y-2.5 ${columns}`}>
        {options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700"
          >
            <input
              type="checkbox"
              checked={selected.includes(option.id)}
              onChange={() => onToggle(option.id)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/40"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
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
  onToggleListValue,
  onChangeList,
  onPickImage,
  onRemoveImage,
  onSubmit,
  onCancel,
}: Readonly<{
  values: CompanyFormValues;
  errors: CompanyFieldErrors;
  dirty: boolean;
  saving: boolean;
  logoUrl: string | null;
  coverUrl: string | null;
  imageErrors: Record<CompanyImageKind, string | null>;
  onChange: (field: CompanyTextField, value: string) => void;
  onToggleListValue: (field: CompanyListField, id: string) => void;
  onChangeList: (field: CompanyListField, next: string[]) => void;
  onPickImage: (kind: CompanyImageKind, file: File) => void;
  onRemoveImage: (kind: CompanyImageKind) => void;
  /** Validates and saves; returns the errors that stopped it, if any. */
  onSubmit: () => CompanyFieldErrors;
  onCancel: () => void;
}>) {
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
        <Field field="name" error={errors.name}>
          <input
            id={fieldId('name')}
            value={values.name}
            onChange={(e) => onChange('name', e.target.value)}
            autoComplete="organization"
            className={inputClass}
            {...a11y('name')}
          />
        </Field>

        <Field
          field="tagline"
          error={errors.tagline}
          hint="One line, shown under the company name."
        >
          <input
            id={fieldId('tagline')}
            value={values.tagline}
            onChange={(e) => onChange('tagline', e.target.value)}
            placeholder="Hiring software for growing teams"
            className={inputClass}
            {...a11y('tagline')}
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
            {COMPANY_SIZE_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>

        <Field field="companyType" error={errors.companyType}>
          <select
            id={fieldId('companyType')}
            value={values.companyType}
            onChange={(e) => onChange('companyType', e.target.value)}
            className={inputClass}
            {...a11y('companyType')}
          >
            <option value="">Select a type</option>
            {COMPANY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>

        <Field field="foundedYear" error={errors.foundedYear}>
          <input
            id={fieldId('foundedYear')}
            type="number"
            inputMode="numeric"
            min={1800}
            max={new Date().getFullYear()}
            value={values.foundedYear}
            onChange={(e) => onChange('foundedYear', e.target.value)}
            placeholder="2015"
            className={inputClass}
            {...a11y('foundedYear')}
          />
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

        {/* Sits with the description, like mission and vision, rather than
            under a heading of its own. */}
        <div className="sm:col-span-2">
          <CompanyChipListEditor
            id="company-departments"
            label="Departments"
            placeholder="Engineering, then Enter"
            hint="Shown on the profile under the description, once you add one."
            values={values.departments}
            disabled={saving}
            onChange={(next) => onChangeList('departments', next)}
          />
        </div>

        <Field field="mission" error={errors.mission} hint="Why the company exists.">
          <textarea
            id={fieldId('mission')}
            rows={2}
            value={values.mission}
            onChange={(e) => onChange('mission', e.target.value)}
            className={`${inputClass} resize-none`}
            {...a11y('mission')}
          />
        </Field>

        <Field field="vision" error={errors.vision} hint="Where it is heading.">
          <textarea
            id={fieldId('vision')}
            rows={2}
            value={values.vision}
            onChange={(e) => onChange('vision', e.target.value)}
            className={`${inputClass} resize-none`}
            {...a11y('vision')}
          />
        </Field>
      </Fieldset>

      {/* A checklist, not free text: stored as identifiers, these can be
          filtered on later — "show me companies with health insurance" —
          which a sentence someone typed never could. */}
      <CheckboxGroup
        legend="Benefits &amp; perks"
        hint="Pick everything that applies. Candidates scan these before the job description."
        options={BENEFIT_CATALOGUE}
        selected={values.benefits}
        onToggle={(id) => onToggleListValue('benefits', id)}
      />

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

        <Field
          field="hrEmail"
          error={errors.hrEmail}
          hint="Only if applications go somewhere other than the address above."
        >
          <input
            id={fieldId('hrEmail')}
            type="email"
            value={values.hrEmail}
            onChange={(e) => onChange('hrEmail', e.target.value)}
            placeholder="careers@abc.com"
            className={inputClass}
            {...a11y('hrEmail')}
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

        <Field field="alternativePhone" error={errors.alternativePhone}>
          <input
            id={fieldId('alternativePhone')}
            type="tel"
            value={values.alternativePhone}
            onChange={(e) => onChange('alternativePhone', e.target.value)}
            placeholder="+94 77 123 4567"
            className={inputClass}
            {...a11y('alternativePhone')}
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

        <Field field="state" error={errors.state}>
          <input
            id={fieldId('state')}
            value={values.state}
            onChange={(e) => onChange('state', e.target.value)}
            autoComplete="address-level1"
            placeholder="Western"
            className={inputClass}
            {...a11y('state')}
          />
        </Field>

        <Field field="postalCode" error={errors.postalCode}>
          <input
            id={fieldId('postalCode')}
            value={values.postalCode}
            onChange={(e) => onChange('postalCode', e.target.value)}
            autoComplete="postal-code"
            placeholder="00300"
            className={inputClass}
            {...a11y('postalCode')}
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

        <div className="sm:col-span-2">
          <CompanyChipListEditor
            id="company-officeLocations"
            label="Other branches"
            placeholder="Kandy, then Enter"
            hint="The other cities you operate from, besides the address above."
            values={values.officeLocations}
            disabled={saving}
            onChange={(next) => onChangeList('officeLocations', next)}
          />
        </div>
      </Fieldset>

      <Fieldset legend="Operations">
        <Field field="timezone" error={errors.timezone}>
          <select
            id={fieldId('timezone')}
            value={values.timezone}
            onChange={(e) => onChange('timezone', e.target.value)}
            className={inputClass}
            {...a11y('timezone')}
          >
            <option value="">Select a time zone</option>
            {/* A stored zone outside the shortlist still shows, so a value the
                backend holds is never silently blanked by this select. */}
            {values.timezone && !TIMEZONES.includes(values.timezone) && (
              <option value={values.timezone}>{values.timezone}</option>
            )}
            {TIMEZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </Field>

        <Field field="currency" error={errors.currency} hint="Used when a salary is shown.">
          <select
            id={fieldId('currency')}
            value={values.currency}
            onChange={(e) => onChange('currency', e.target.value)}
            className={inputClass}
            {...a11y('currency')}
          >
            <option value="">Select a currency</option>
            {values.currency && !CURRENCIES.includes(values.currency) && (
              <option value={values.currency}>{values.currency}</option>
            )}
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </Field>

        <Field field="language" error={errors.language}>
          <select
            id={fieldId('language')}
            value={values.language}
            onChange={(e) => onChange('language', e.target.value)}
            className={inputClass}
            {...a11y('language')}
          >
            <option value="">Select a language</option>
            {values.language && !LANGUAGES.includes(values.language) && (
              <option value={values.language}>{values.language}</option>
            )}
            {LANGUAGES.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </Field>
      </Fieldset>

      {/* Paperwork, not marketing — kept last and never shown to candidates. */}
      <Fieldset legend="Registration & tax">
        <Field
          field="legalName"
          error={errors.legalName}
          className="sm:col-span-2"
          hint="The registered name, if it differs from the trading name."
        >
          <input
            id={fieldId('legalName')}
            value={values.legalName}
            onChange={(e) => onChange('legalName', e.target.value)}
            placeholder="ABC Technologies (Private) Limited"
            className={inputClass}
            {...a11y('legalName')}
          />
        </Field>

        <Field field="registrationNumber" error={errors.registrationNumber}>
          <input
            id={fieldId('registrationNumber')}
            value={values.registrationNumber}
            onChange={(e) => onChange('registrationNumber', e.target.value)}
            placeholder="PV 12345"
            className={inputClass}
            {...a11y('registrationNumber')}
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

import { Checkbox, Col, Flex, Input, Row, Select, Typography } from 'antd';
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

const fieldId = (field: CompanyTextField) => `company-${field}`;
const errorId = (field: CompanyTextField) => `company-${field}-error`;

/**
 * Kept as a real `<fieldset>`/`<legend>` rather than antd's `Form.Item`
 * grouping. The pair is what actually associates a heading with the controls
 * beneath it for assistive tech; antd renders plain divs, which would leave a
 * 28-field form as one undifferentiated run of inputs.
 */
function Fieldset({ legend, children }: Readonly<{ legend: string; children: ReactNode }>) {
  return (
    <fieldset style={{ border: 0, borderTop: '1px solid #f1f5f9', margin: 0, paddingTop: 24 }}>
      <legend className="tp-legend">{legend}</legend>
      <Row gutter={[20, 20]} style={{ marginTop: 16 }}>
        {children}
      </Row>
    </fieldset>
  );
}

function Field({
  field,
  error,
  hint,
  span = 12,
  children,
}: Readonly<{
  field: CompanyTextField;
  error?: string;
  hint?: ReactNode;
  /** Columns out of 24 at `sm` and up; full width below. */
  span?: number;
  children: ReactNode;
}>) {
  return (
    <Col xs={24} sm={span}>
      <label htmlFor={fieldId(field)} style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>
        {FIELD_LABELS[field]}
      </label>
      {children}
      {error ? (
        <Typography.Paragraph
          id={errorId(field)}
          role="alert"
          type="danger"
          style={{ display: 'flex', alignItems: 'flex-start', gap: 4, fontSize: 12, margin: '6px 0 0' }}
        >
          <Icon name="warning" size={14} style={{ marginTop: 1 }} />
          {error}
        </Typography.Paragraph>
      ) : (
        hint && (
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 6 }}>
            {hint}
          </Typography.Text>
        )
      )}
    </Col>
  );
}

/** A titled set of checkboxes over a fixed catalogue. */
function CheckboxGroup({
  legend,
  hint,
  options,
  selected,
  onToggle,
}: Readonly<{
  legend: string;
  hint: string;
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}>) {
  return (
    <fieldset style={{ border: 0, borderTop: '1px solid #f1f5f9', margin: 0, paddingTop: 24 }}>
      <legend className="tp-legend">{legend}</legend>
      <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
        {hint}
      </Typography.Text>
      <Row gutter={[24, 10]} style={{ marginTop: 16 }}>
        {options.map((option) => (
          <Col xs={24} sm={12} key={option.id}>
            <Checkbox
              checked={selected.includes(option.id)}
              onChange={() => onToggle(option.id)}
            >
              {option.label}
            </Checkbox>
          </Col>
        ))}
      </Row>
    </fieldset>
  );
}

/**
 * Builds a select's option list, keeping a stored value that is not in the
 * shortlist as an option of its own — otherwise a value the backend holds
 * would be silently blanked the first time this form is opened.
 */
function optionsFor(shortlist: readonly string[], current: string) {
  const extra = current && !shortlist.includes(current) ? [{ value: current, label: current }] : [];
  return [...extra, ...shortlist.map((item) => ({ value: item, label: item }))];
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
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      <Flex vertical gap={24}>
        <Row gutter={[20, 20]}>
          <Col xs={24} sm={12}>
            <CompanyImagePicker
              kind="logo"
              imageUrl={logoUrl}
              companyName={values.name}
              error={imageErrors.logo}
              disabled={saving}
              onPick={(file) => onPickImage('logo', file)}
              onRemove={() => onRemoveImage('logo')}
            />
          </Col>
          <Col xs={24} sm={12}>
            <CompanyImagePicker
              kind="cover"
              imageUrl={coverUrl}
              companyName={values.name}
              error={imageErrors.cover}
              disabled={saving}
              onPick={(file) => onPickImage('cover', file)}
              onRemove={() => onRemoveImage('cover')}
            />
          </Col>
        </Row>

      <Fieldset legend="Company overview">
        <Field field="name" error={errors.name}>
          <Input
            id={fieldId('name')}
            value={values.name}
            onChange={(e) => onChange('name', e.target.value)}
            autoComplete="organization"
            {...a11y('name')}
          />
        </Field>

        <Field
          field="tagline"
          error={errors.tagline}
          hint="One line, shown under the company name."
        >
          <Input
            id={fieldId('tagline')}
            value={values.tagline}
            onChange={(e) => onChange('tagline', e.target.value)}
            placeholder="Hiring software for growing teams"
            {...a11y('tagline')}
          />
        </Field>

        <Field field="industry" error={errors.industry}>
          {/* An explicit "not set" entry, and no `allowClear`: without a way to
              mean "unanswered", the first industry in the list silently becomes
              every company's answer. */}
          <Select
            id={fieldId('industry')}
            value={values.industry}
            onChange={(value: string) => onChange('industry', value)}
            style={{ width: '100%' }}
            options={[{ value: '', label: 'Select an industry' }, ...optionsFor(INDUSTRIES, values.industry)]}
            {...a11y('industry')}
          />
        </Field>

        <Field field="size" error={errors.size}>
          <Select
            id={fieldId('size')}
            value={values.size}
            onChange={(value: string) => onChange('size', value)}
            style={{ width: '100%' }}
            options={[
              { value: '', label: 'Select a size' },
              ...COMPANY_SIZE_GROUPS.map((group) => ({
                label: group.label,
                options: group.options.map((size) => ({ value: size, label: size })),
              })),
            ]}
            {...a11y('size')}
          />
        </Field>

        <Field field="companyType" error={errors.companyType}>
          <Select
            id={fieldId('companyType')}
            value={values.companyType}
            onChange={(value: string) => onChange('companyType', value)}
            style={{ width: '100%' }}
            options={[
              { value: '', label: 'Select a type' },
              ...optionsFor(COMPANY_TYPES, values.companyType),
            ]}
            {...a11y('companyType')}
          />
        </Field>

        <Field field="foundedYear" error={errors.foundedYear}>
          <Input
            id={fieldId('foundedYear')}
            type="number"
            inputMode="numeric"
            min={1800}
            max={new Date().getFullYear()}
            value={values.foundedYear}
            onChange={(e) => onChange('foundedYear', e.target.value)}
            placeholder="2015"
            {...a11y('foundedYear')}
          />
        </Field>

        <Field
          field="description"
          error={errors.description}
          span={24}
          hint="What the company does, in a few sentences. Candidates read this first."
        >
          <Input.TextArea
            id={fieldId('description')}
            rows={5}
            value={values.description}
            onChange={(e) => onChange('description', e.target.value)}
            {...a11y('description')}
          />
          <Typography.Paragraph
            type={overLimit ? 'danger' : 'secondary'}
            style={{
              margin: '4px 0 0',
              textAlign: 'right',
              fontSize: 12,
              fontVariantNumeric: 'tabular-nums',
              fontWeight: overLimit ? 500 : undefined,
            }}
          >
            {values.description.trim().length} / {MAX_DESCRIPTION}
          </Typography.Paragraph>
        </Field>

        {/* Sits with the description, like mission and vision, rather than
            under a heading of its own. */}
        <Col xs={24}>
          <CompanyChipListEditor
            id="company-departments"
            label="Departments"
            placeholder="Engineering, then Enter"
            hint="Shown on the profile under the description, once you add one."
            values={values.departments}
            disabled={saving}
            onChange={(next) => onChangeList('departments', next)}
          />
        </Col>

        <Field field="mission" error={errors.mission} hint="Why the company exists.">
          <Input.TextArea
            id={fieldId('mission')}
            rows={2}
            value={values.mission}
            onChange={(e) => onChange('mission', e.target.value)}
            {...a11y('mission')}
          />
        </Field>

        <Field field="vision" error={errors.vision} hint="Where it is heading.">
          <Input.TextArea
            id={fieldId('vision')}
            rows={2}
            value={values.vision}
            onChange={(e) => onChange('vision', e.target.value)}
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
          <Input
            id={fieldId('email')}
            type="email"
            value={values.email}
            onChange={(e) => onChange('email', e.target.value)}
            autoComplete="email"
            placeholder="contact@abc.com"
            {...a11y('email')}
          />
        </Field>

        <Field
          field="hrEmail"
          error={errors.hrEmail}
          hint="Only if applications go somewhere other than the address above."
        >
          <Input
            id={fieldId('hrEmail')}
            type="email"
            value={values.hrEmail}
            onChange={(e) => onChange('hrEmail', e.target.value)}
            placeholder="careers@abc.com"
            {...a11y('hrEmail')}
          />
        </Field>

        <Field field="phone" error={errors.phone}>
          <Input
            id={fieldId('phone')}
            type="tel"
            value={values.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            autoComplete="tel"
            placeholder="+94 11 234 5678"
            {...a11y('phone')}
          />
        </Field>

        <Field field="alternativePhone" error={errors.alternativePhone}>
          <Input
            id={fieldId('alternativePhone')}
            type="tel"
            value={values.alternativePhone}
            onChange={(e) => onChange('alternativePhone', e.target.value)}
            placeholder="+94 77 123 4567"
            {...a11y('alternativePhone')}
          />
        </Field>

        <Field
          field="website"
          error={errors.website}
          span={24}
          hint="We'll add https:// if you leave it out."
        >
          {/* type="text", not "url": type="url" makes the browser reject a bare
              'abc.com' with its own tooltip before our normaliser ever sees it. */}
          <Input
            id={fieldId('website')}
            type="text"
            inputMode="url"
            value={values.website}
            onChange={(e) => onChange('website', e.target.value)}
            autoComplete="url"
            placeholder="abc.com"
            {...a11y('website')}
          />
        </Field>
      </Fieldset>

      <Fieldset legend="Social links">
        {SOCIAL_FIELDS.map((field) => (
          <Field key={field} field={field} error={errors[field]}>
            {/* type="text" for the same reason as the website field: the
                browser's own url validation rejects a bare domain first. */}
            <Input
              id={fieldId(field)}
              type="text"
              inputMode="url"
              value={values[field]}
              onChange={(e) => onChange(field, e.target.value)}
              placeholder={SOCIAL_PLACEHOLDERS[field]}
              {...a11y(field)}
            />
          </Field>
        ))}
      </Fieldset>

      <Fieldset legend="Location">
        <Field field="address" error={errors.address} span={24}>
          <Input
            id={fieldId('address')}
            value={values.address}
            onChange={(e) => onChange('address', e.target.value)}
            autoComplete="street-address"
            placeholder="No. 42, Galle Road"
            {...a11y('address')}
          />
        </Field>

        <Field field="city" error={errors.city}>
          <Input
            id={fieldId('city')}
            value={values.city}
            onChange={(e) => onChange('city', e.target.value)}
            autoComplete="address-level2"
            placeholder="Colombo"
            {...a11y('city')}
          />
        </Field>

        <Field field="state" error={errors.state}>
          <Input
            id={fieldId('state')}
            value={values.state}
            onChange={(e) => onChange('state', e.target.value)}
            autoComplete="address-level1"
            placeholder="Western"
            {...a11y('state')}
          />
        </Field>

        <Field field="postalCode" error={errors.postalCode}>
          <Input
            id={fieldId('postalCode')}
            value={values.postalCode}
            onChange={(e) => onChange('postalCode', e.target.value)}
            autoComplete="postal-code"
            placeholder="00300"
            {...a11y('postalCode')}
          />
        </Field>

        <Field field="country" error={errors.country}>
          <Input
            id={fieldId('country')}
            value={values.country}
            onChange={(e) => onChange('country', e.target.value)}
            autoComplete="country-name"
            placeholder="Sri Lanka"
            {...a11y('country')}
          />
        </Field>

        <Col xs={24}>
          <CompanyChipListEditor
            id="company-officeLocations"
            label="Other branches"
            placeholder="Kandy, then Enter"
            hint="The other cities you operate from, besides the address above."
            values={values.officeLocations}
            disabled={saving}
            onChange={(next) => onChangeList('officeLocations', next)}
          />
        </Col>
      </Fieldset>

      <Fieldset legend="Operations">
        <Field field="timezone" error={errors.timezone}>
          {/* `optionsFor` keeps a stored zone outside the shortlist visible, so
              a value the backend holds is never silently blanked by this list. */}
          <Select
            id={fieldId('timezone')}
            value={values.timezone}
            onChange={(value: string) => onChange('timezone', value)}
            style={{ width: '100%' }}
            showSearch
            options={[
              { value: '', label: 'Select a time zone' },
              ...optionsFor(TIMEZONES, values.timezone),
            ]}
            {...a11y('timezone')}
          />
        </Field>

        <Field field="currency" error={errors.currency} hint="Used when a salary is shown.">
          <Select
            id={fieldId('currency')}
            value={values.currency}
            onChange={(value: string) => onChange('currency', value)}
            style={{ width: '100%' }}
            showSearch
            options={[
              { value: '', label: 'Select a currency' },
              ...optionsFor(CURRENCIES, values.currency),
            ]}
            {...a11y('currency')}
          />
        </Field>

        <Field field="language" error={errors.language}>
          <Select
            id={fieldId('language')}
            value={values.language}
            onChange={(value: string) => onChange('language', value)}
            style={{ width: '100%' }}
            showSearch
            options={[
              { value: '', label: 'Select a language' },
              ...optionsFor(LANGUAGES, values.language),
            ]}
            {...a11y('language')}
          />
        </Field>
      </Fieldset>

      {/* Paperwork, not marketing — kept last and never shown to candidates. */}
      <Fieldset legend="Registration & tax">
        <Field
          field="legalName"
          error={errors.legalName}
          span={24}
          hint="The registered name, if it differs from the trading name."
        >
          <Input
            id={fieldId('legalName')}
            value={values.legalName}
            onChange={(e) => onChange('legalName', e.target.value)}
            placeholder="ABC Technologies (Private) Limited"
            {...a11y('legalName')}
          />
        </Field>

        <Field field="registrationNumber" error={errors.registrationNumber}>
          <Input
            id={fieldId('registrationNumber')}
            value={values.registrationNumber}
            onChange={(e) => onChange('registrationNumber', e.target.value)}
            placeholder="PV 12345"
            {...a11y('registrationNumber')}
          />
        </Field>

      </Fieldset>

        <Flex
          wrap
          align="center"
          justify="flex-end"
          gap={12}
          style={{ borderTop: '1px solid #f1f5f9', paddingTop: 20 }}
        >
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
                <Icon name="check" size={16} />
                Save changes
              </>
            )}
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}

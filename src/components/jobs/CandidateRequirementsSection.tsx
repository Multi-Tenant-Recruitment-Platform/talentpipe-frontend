import { Col, Input, InputNumber, Select } from 'antd';
import { LANGUAGES } from '../../dashboard/companyProfile';
import { EDUCATION_LEVELS, MAX_OTHER_REQUIREMENTS } from '../../dashboard/jobVacancy';
import { CompanyChipListEditor } from '../dashboard/CompanyChipListEditor';
import type { VacancySectionProps } from './sectionProps';
import { VacancyField } from './VacancyField';
import { fieldAria, vacancyFieldId } from './vacancyFieldIds';

export function CandidateRequirementsSection({
  values,
  errors,
  set,
}: Readonly<VacancySectionProps>) {
  return (
    <>
      {/* The chip editor carries its own label and hint, so these two sit
          directly in the grid rather than inside a VacancyField that would
          render a second one. */}
      <Col xs={24} sm={12}>
        <CompanyChipListEditor
          id={vacancyFieldId('requiredSkills')}
          label="Required skills"
          required
          placeholder="e.g. Java"
          hint="Press Enter after each. A candidate without these is not a fit."
          values={values.requiredSkills}
          error={errors.requiredSkills}
          onChange={(next) => set('requiredSkills', next)}
        />
      </Col>

      <Col xs={24} sm={12}>
        <CompanyChipListEditor
          id={vacancyFieldId('preferredSkills')}
          label="Preferred skills"
          placeholder="e.g. Kubernetes"
          hint="Nice to have. These widen the field rather than narrowing it."
          values={values.preferredSkills}
          error={errors.preferredSkills}
          onChange={(next) => set('preferredSkills', next)}
        />
      </Col>

      <VacancyField
        field="minimumExperienceYears"
        span={8}
        error={errors.minimumExperienceYears}
        hint="Leave blank if experience is not a bar."
      >
        <InputNumber
          {...fieldAria('minimumExperienceYears', errors.minimumExperienceYears)}
          value={values.minimumExperienceYears}
          status={errors.minimumExperienceYears ? 'error' : undefined}
          min={0}
          max={50}
          precision={0}
          addonAfter="years"
          style={{ width: '100%' }}
          onChange={(next) => set('minimumExperienceYears', next)}
        />
      </VacancyField>

      <VacancyField field="education" span={16} error={errors.education}>
        <Select
          {...fieldAria('education', errors.education)}
          value={values.education === '' ? undefined : values.education}
          options={EDUCATION_LEVELS.map((level) => ({ value: level, label: level }))}
          placeholder="Choose a minimum qualification"
          allowClear
          showSearch
          style={{ width: '100%' }}
          onChange={(next: string | undefined) => set('education', next ?? '')}
        />
      </VacancyField>

      <Col xs={24} sm={12}>
        <CompanyChipListEditor
          id={vacancyFieldId('certifications')}
          label="Certifications"
          placeholder="e.g. AWS Solutions Architect"
          hint="Formal credentials this role expects."
          values={values.certifications}
          error={errors.certifications}
          onChange={(next) => set('certifications', next)}
        />
      </Col>

      <VacancyField
        field="languageRequirements"
        span={12}
        error={errors.languageRequirements}
        hint="Languages the role is worked in."
      >
        <Select
          {...fieldAria('languageRequirements', errors.languageRequirements)}
          mode="multiple"
          value={values.languageRequirements}
          options={LANGUAGES.map((language) => ({ value: language, label: language }))}
          placeholder="Choose one or more"
          allowClear
          style={{ width: '100%' }}
          onChange={(next: string[]) => set('languageRequirements', next)}
        />
      </VacancyField>

      <VacancyField
        field="otherRequirements"
        span={24}
        error={errors.otherRequirements}
        hint="Anything else that decides the shortlist — a driving licence, a work permit, willingness to travel."
      >
        <Input.TextArea
          {...fieldAria('otherRequirements', errors.otherRequirements)}
          value={values.otherRequirements}
          status={errors.otherRequirements ? 'error' : undefined}
          autoSize={{ minRows: 3, maxRows: 8 }}
          maxLength={MAX_OTHER_REQUIREMENTS}
          showCount
          onChange={(event) => set('otherRequirements', event.target.value)}
        />
      </VacancyField>
    </>
  );
}

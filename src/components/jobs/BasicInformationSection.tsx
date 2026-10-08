import { DatePicker, Input, InputNumber, Segmented, Select } from 'antd';
import dayjs from 'dayjs';
import type { EmploymentType, WorkplaceType } from '../../api/types';
import { useCompanyProfileContext } from '../../dashboard/CompanyProfileContext';
import { EMPLOYMENT_TYPES, WORKPLACE_TYPES } from '../../dashboard/jobVacancy';
import { slate } from '../../theme/tokens';
import { Icon } from '../dashboard/Icon';
import { DepartmentSelect } from './DepartmentSelect';
import type { VacancySectionProps } from './sectionProps';
import { VacancyField } from './VacancyField';
import { fieldAria, vacancyErrorId, vacancyFieldId } from './vacancyFieldIds';

/** Yesterday and earlier cannot be a deadline for applications opening today. */
const isPast = (date: dayjs.Dayjs) => date.isBefore(dayjs().startOf('day'));

export function BasicInformationSection({ values, errors, set }: Readonly<VacancySectionProps>) {
  const profile = useCompanyProfileContext();

  return (
    <>
      <VacancyField
        field="title"
        span={24}
        error={errors.title}
        hint="The title candidates search for — “Senior Backend Engineer”, not “Engineer III”."
      >
        <Input
          {...fieldAria('title', errors.title)}
          value={values.title}
          status={errors.title ? 'error' : undefined}
          placeholder="e.g. Senior Backend Engineer"
          onChange={(event) => set('title', event.target.value)}
        />
      </VacancyField>

      <VacancyField
        field="department"
        span={16}
        error={errors.department}
        hint="Defined on your company profile."
      >
        <DepartmentSelect
          id={vacancyFieldId('department')}
          value={values.department}
          departments={profile.saved.departments}
          loading={profile.loading}
          invalid={Boolean(errors.department)}
          describedBy={errors.department ? vacancyErrorId('department') : undefined}
          onChange={(next) => set('department', next)}
        />
      </VacancyField>

      <VacancyField field="openings" span={8} error={errors.openings}>
        <InputNumber
          {...fieldAria('openings', errors.openings)}
          value={values.openings}
          status={errors.openings ? 'error' : undefined}
          min={1}
          max={999}
          precision={0}
          style={{ width: '100%' }}
          onChange={(next) => set('openings', next)}
        />
      </VacancyField>

      <VacancyField field="employmentType" span={12} error={errors.employmentType}>
        <Select
          {...fieldAria('employmentType', errors.employmentType)}
          value={values.employmentType === '' ? undefined : values.employmentType}
          status={errors.employmentType ? 'error' : undefined}
          options={EMPLOYMENT_TYPES.map((type) => ({ value: type.id, label: type.label }))}
          placeholder="Choose an employment type"
          style={{ width: '100%' }}
          onChange={(next: EmploymentType) => set('employmentType', next)}
        />
      </VacancyField>

      <VacancyField field="workplaceType" span={12} error={errors.workplaceType} group>
        {/* Three mutually exclusive options that fit on one line: a segmented
            control shows all of them at once, where a select would hide two
            behind a click for no gain. */}
        <Segmented
          block
          value={values.workplaceType === '' ? undefined : values.workplaceType}
          options={WORKPLACE_TYPES.map((type) => ({ value: type.id, label: type.label }))}
          onChange={(next) => set('workplaceType', next as WorkplaceType)}
        />
      </VacancyField>

      <VacancyField
        field="location"
        span={12}
        error={errors.location}
        hint={
          values.workplaceType === 'REMOTE'
            ? 'Remote still has a base — name the country or region you hire from.'
            : 'City and country, as a candidate would search for it.'
        }
      >
        <Input
          {...fieldAria('location', errors.location)}
          value={values.location}
          status={errors.location ? 'error' : undefined}
          prefix={<Icon name="map-pin" size={16} style={{ color: slate[400] }} />}
          placeholder="e.g. Colombo, Sri Lanka"
          onChange={(event) => set('location', event.target.value)}
        />
      </VacancyField>

      <VacancyField
        field="applicationDeadline"
        span={12}
        error={errors.applicationDeadline}
        hint="Applications close at the end of this day."
      >
        <DatePicker
          {...fieldAria('applicationDeadline', errors.applicationDeadline)}
          value={values.applicationDeadline ? dayjs(values.applicationDeadline) : null}
          status={errors.applicationDeadline ? 'error' : undefined}
          disabledDate={isPast}
          format="D MMM YYYY"
          placeholder="Select a date"
          style={{ width: '100%' }}
          onChange={(date) => set('applicationDeadline', date ? date.format('YYYY-MM-DD') : '')}
        />
      </VacancyField>
    </>
  );
}

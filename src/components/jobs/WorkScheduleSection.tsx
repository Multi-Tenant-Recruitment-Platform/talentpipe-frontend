import { Checkbox, Flex, Input, InputNumber, Select } from 'antd';
import type { ShiftType, WeekDay } from '../../api/types';
import { SHIFT_TYPES, WEEK_DAYS } from '../../dashboard/jobVacancy';
import { space } from '../../theme/tokens';
import { Button } from '../ui/Button';
import type { VacancySectionProps } from './sectionProps';
import { VacancyField } from './VacancyField';
import { fieldAria } from './vacancyFieldIds';

const WEEKDAYS: WeekDay[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

export function WorkScheduleSection({ values, errors, set }: Readonly<VacancySectionProps>) {
  const isStandardWeek =
    values.workingDays.length === WEEKDAYS.length &&
    WEEKDAYS.every((day) => values.workingDays.includes(day));

  return (
    <>
      <VacancyField
        field="workingDays"
        span={24}
        error={errors.workingDays}
        hint="The days this role is expected to work."
        group
      >
        <Flex align="center" gap={space[2]} wrap>
          <Checkbox.Group
            className="tp-day-checks"
            value={values.workingDays}
            onChange={(next) => set('workingDays', next as WeekDay[])}
          >
            {WEEK_DAYS.map((day) => (
              <Checkbox key={day.id} value={day.id}>
                {day.short}
              </Checkbox>
            ))}
          </Checkbox.Group>
          {/* Five of six vacancies are a standard week; clicking five boxes to
              say so is the kind of tax that makes people skip the field. */}
          <Button
            variant="ghost"
            size="sm"
            disabled={isStandardWeek}
            onClick={() => set('workingDays', WEEKDAYS)}
          >
            Set Mon–Fri
          </Button>
        </Flex>
      </VacancyField>

      <VacancyField
        field="workingHours"
        span={8}
        error={errors.workingHours}
        hint="As you would write it on the advert."
      >
        <Input
          {...fieldAria('workingHours', errors.workingHours)}
          value={values.workingHours}
          status={errors.workingHours ? 'error' : undefined}
          placeholder="e.g. 9:00 AM – 6:00 PM"
          onChange={(event) => set('workingHours', event.target.value)}
        />
      </VacancyField>

      <VacancyField field="shiftType" span={8} error={errors.shiftType}>
        <Select
          {...fieldAria('shiftType', errors.shiftType)}
          value={values.shiftType === '' ? undefined : values.shiftType}
          options={SHIFT_TYPES.map((shift) => ({ value: shift.id, label: shift.label }))}
          placeholder="Choose a shift"
          allowClear
          style={{ width: '100%' }}
          onChange={(next: ShiftType | undefined) => set('shiftType', next ?? '')}
        />
      </VacancyField>

      <VacancyField field="expectedHoursPerWeek" span={8} error={errors.expectedHoursPerWeek}>
        <InputNumber
          {...fieldAria('expectedHoursPerWeek', errors.expectedHoursPerWeek)}
          value={values.expectedHoursPerWeek}
          status={errors.expectedHoursPerWeek ? 'error' : undefined}
          min={1}
          max={168}
          addonAfter="hours"
          style={{ width: '100%' }}
          onChange={(next) => set('expectedHoursPerWeek', next)}
        />
      </VacancyField>
    </>
  );
}

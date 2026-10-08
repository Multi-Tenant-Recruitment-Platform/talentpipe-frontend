import { Checkbox, InputNumber, Select } from 'antd';
import type { PayPeriod } from '../../api/types';
import { BENEFIT_CATALOGUE, CURRENCIES } from '../../dashboard/companyProfile';
import { currencyCode, PAY_PERIODS } from '../../dashboard/jobVacancy';
import type { VacancySectionProps } from './sectionProps';
import { VacancyField } from './VacancyField';
import { fieldAria } from './vacancyFieldIds';

/**
 * Thousands separators, because a salary is read in groups of three.
 *
 * <p>Display only — there is deliberately no matching `parser`. antd's default
 * one already strips the separators back out, and replacing it would mean
 * deciding what an empty box parses to: every obvious answer turns a cleared
 * optional salary into a zero the form would then store.</p>
 */
const group = (value: number | string | undefined) =>
  value === undefined || value === '' ? '' : `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export function SalaryBenefitsSection({ values, errors, set }: Readonly<VacancySectionProps>) {
  const code = currencyCode(values.currency);

  return (
    <>
      <VacancyField field="salaryMin" span={8} error={errors.salaryMin}>
        {/* The generic is pinned because `formatter` accepts a string too, which
            would otherwise widen the value type and let a string reach a
            number-only field. */}
        <InputNumber<number>
          {...fieldAria('salaryMin', errors.salaryMin)}
          value={values.salaryMin}
          status={errors.salaryMin ? 'error' : undefined}
          min={0}
          formatter={group}
          prefix={code || undefined}
          style={{ width: '100%' }}
          onChange={(next) => set('salaryMin', next)}
        />
      </VacancyField>

      <VacancyField field="salaryMax" span={8} error={errors.salaryMax}>
        <InputNumber<number>
          {...fieldAria('salaryMax', errors.salaryMax)}
          value={values.salaryMax}
          status={errors.salaryMax ? 'error' : undefined}
          min={0}
          formatter={group}
          prefix={code || undefined}
          style={{ width: '100%' }}
          onChange={(next) => set('salaryMax', next)}
        />
      </VacancyField>

      <VacancyField field="currency" span={8} error={errors.currency}>
        <Select
          {...fieldAria('currency', errors.currency)}
          value={values.currency === '' ? undefined : values.currency}
          status={errors.currency ? 'error' : undefined}
          options={CURRENCIES.map((currency) => ({ value: currency, label: currency }))}
          placeholder="Choose a currency"
          allowClear
          showSearch
          style={{ width: '100%' }}
          onChange={(next: string | undefined) => set('currency', next ?? '')}
        />
      </VacancyField>

      <VacancyField
        field="payPeriod"
        span={12}
        error={errors.payPeriod}
        hint="A range without a period is a number nobody can act on."
      >
        <Select
          {...fieldAria('payPeriod', errors.payPeriod)}
          value={values.payPeriod === '' ? undefined : values.payPeriod}
          status={errors.payPeriod ? 'error' : undefined}
          options={PAY_PERIODS.map((period) => ({ value: period.id, label: period.label }))}
          placeholder="Choose a pay period"
          allowClear
          style={{ width: '100%' }}
          onChange={(next: PayPeriod | undefined) => set('payPeriod', next ?? '')}
        />
      </VacancyField>

      <VacancyField
        field="benefits"
        span={24}
        error={errors.benefits}
        hint="Drawn from the perks on your company profile, so a candidate sees the same list everywhere."
        group
      >
        <Checkbox.Group
          className="tp-benefit-checks"
          value={values.benefits}
          onChange={(next) => set('benefits', next as string[])}
        >
          {BENEFIT_CATALOGUE.map((benefit) => (
            <Checkbox key={benefit.id} value={benefit.id}>
              {benefit.label}
            </Checkbox>
          ))}
        </Checkbox.Group>
      </VacancyField>
    </>
  );
}

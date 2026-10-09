import { describe, expect, it } from 'vitest';
import type { EmploymentType } from '../api/types';
import { currencyCode, employmentTypeLabel, formatExperience, formatSalary, formatWorkingDays, workplaceTypeLabel } from './jobLabels';

describe('job labels', () => {
  it('uses the vacancy form wording for its identifiers', () => {
    expect(employmentTypeLabel('FULL_TIME')).toBe('Full time');
    expect(workplaceTypeLabel('ON_SITE')).toBe('On-site');
  });

  it('keeps a value the board does not know yet readable', () => {
    expect(employmentTypeLabel('SEASONAL_WORK' as EmploymentType)).toBe('Seasonal work');
  });
});

describe('formatSalary', () => {
  const base = { currency: 'LKR — Sri Lankan rupee', payPeriod: 'MONTHLY' as const };

  it('shows a range with its currency code and period', () => {
    expect(formatSalary({ ...base, salaryMin: 150000, salaryMax: 220000 })).toBe('LKR 150,000 – 220,000 / month');
  });

  it('handles one-sided and single-figure salaries', () => {
    expect(formatSalary({ ...base, salaryMin: 60000, salaryMax: null })).toBe('From LKR 60,000 / month');
    expect(formatSalary({ ...base, salaryMin: null, salaryMax: 90000 })).toBe('Up to LKR 90,000 / month');
    expect(formatSalary({ ...base, salaryMin: 50, salaryMax: 50, payPeriod: 'HOURLY' })).toBe('LKR 50 / hour');
  });

  it('is empty when no salary is stated, and copes without currency or period', () => {
    expect(formatSalary({ ...base, salaryMin: null, salaryMax: null })).toBe('');
    expect(formatSalary({ salaryMin: 1000, salaryMax: 2000 })).toBe('1,000 – 2,000');
  });

  it('takes the code from the stored currency', () => {
    expect(currencyCode('USD — US dollar')).toBe('USD');
    expect(currencyCode(null)).toBe('');
  });
});

describe('formatExperience', () => {
  it('reads as a minimum, and zero means open to newcomers', () => {
    expect(formatExperience(4)).toBe('4+ years experience');
    expect(formatExperience(1)).toBe('1+ year experience');
    expect(formatExperience(0)).toBe('No experience required');
    expect(formatExperience(null)).toBe('');
  });
});

describe('formatWorkingDays', () => {
  it('collapses a run of days and lists the rest', () => {
    expect(formatWorkingDays(['FRI', 'MON', 'TUE', 'WED', 'THU'])).toBe('Mon–Fri');
    expect(formatWorkingDays(['MON', 'WED', 'FRI'])).toBe('Mon, Wed, Fri');
    expect(formatWorkingDays([])).toBe('');
  });
});

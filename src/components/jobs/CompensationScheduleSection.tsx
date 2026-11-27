import { DollarOutlined, FieldTimeOutlined } from '@ant-design/icons';
import { Col } from 'antd';
import type { ReactNode } from 'react';
import { SalaryBenefitsSection } from './SalaryBenefitsSection';
import type { VacancySectionProps } from './sectionProps';
import { WorkScheduleSection } from './WorkScheduleSection';

/**
 * Section 04: what the role pays and the week it keeps, as one step.
 *
 * <p>Two short, all-optional groups that a candidate weighs together, so they
 * share a step rather than each taking one. Each keeps its own sub-heading,
 * and a rule between them, so the step still scans as "pay" then "hours".</p>
 */
function GroupHeading({
  icon,
  title,
  hint,
  divided = false,
}: Readonly<{ icon: ReactNode; title: string; hint: string; divided?: boolean }>) {
  return (
    <Col span={24}>
      <div className={divided ? 'mt-2 border-t border-slate-100 pt-5' : undefined}>
        <h3 className="m-0 flex items-center gap-2 text-body font-semibold text-slate-900">
          <span aria-hidden="true" className="inline-flex size-6 items-center justify-center rounded-sm bg-slate-100 text-[13px] text-slate-500">
            {icon}
          </span>
          {title}
        </h3>
        <p className="m-0 mt-1 text-small text-slate-500">{hint}</p>
      </div>
    </Col>
  );
}

export function CompensationScheduleSection(props: Readonly<VacancySectionProps>) {
  return (
    <>
      <GroupHeading icon={<DollarOutlined aria-hidden />} title="Salary & benefits" hint="The pay range, and what comes with the role." />
      <SalaryBenefitsSection {...props} />
      <GroupHeading
        icon={<FieldTimeOutlined aria-hidden />}
        title="Work schedule"
        hint="The working days, hours and shift pattern."
        divided
      />
      <WorkScheduleSection {...props} />
    </>
  );
}

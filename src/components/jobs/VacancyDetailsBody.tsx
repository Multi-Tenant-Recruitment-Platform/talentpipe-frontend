import { Flex, Tag, Typography } from 'antd';
import type { ReactNode } from 'react';
import type { JobVacancyResponse } from '../../api/types';
import { benefitLabel } from '../../dashboard/companyProfile';
import {
  employmentTypeLabel,
  formatSalary,
  formatWorkingDays,
  payPeriodLabel,
  // pipelineLabel, — with the Recruitment settings block below
  shiftTypeLabel,
  workplaceTypeLabel,
} from '../../dashboard/jobVacancy';
import { space } from '../../theme/tokens';
import { formatDate } from '../../utils/format';
import { detailGrid } from '../ui/classes';

/**
 * Everything captured about one vacancy, read back — the body of its page.
 *
 * <p>Empty fields are omitted rather than listed as "Not set". The profile page
 * states its blanks because a half-finished company profile is a prompt to
 * finish it; a vacancy with no shift pattern is simply a vacancy that does not
 * have one, and printing nine "Not set" rows would bury the nine that matter.
 * A draft's missing *required* fields are named separately, above this, where
 * they can be acted on.</p>
 */

function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  if (value === '') {
    return null;
  }
  return (
    <div className="min-w-0">
      <dt className="text-caption font-medium uppercase tracking-[0.03em] text-slate-500">
        {label}
      </dt>
      <dd className="m-0 mt-0.5 min-w-0">
        <Typography.Text>{value}</Typography.Text>
      </dd>
    </div>
  );
}

function Block({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="tp-vacancy-block">
      {/* A plain heading rather than Typography.Title: antd's own selector
          outranks `.tp-legend` and would restore its heading size. */}
      <h2 className="tp-legend m-0">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Chips({ values }: Readonly<{ values: string[] }>) {
  return (
    <Flex gap={space[0.5]} wrap>
      {values.map((value) => (
        <Tag key={value} className="m-0">
          {value}
        </Tag>
      ))}
    </Flex>
  );
}

function Lines({ values }: Readonly<{ values: string[] }>) {
  return (
    <ol className="m-0 ps-5">
      {values.map((value) => (
        <li key={value} className="mb-1">
          <Typography.Text>{value}</Typography.Text>
        </li>
      ))}
    </ol>
  );
}

export function VacancyDetailsBody({ vacancy }: Readonly<{ vacancy: JobVacancyResponse }>) {
  return (
    <>
      <Block title="Basic information">
        <dl className={detailGrid}>
          <Fact label="Department" value={vacancy.department} />
          <Fact label="Openings" value={String(vacancy.openings)} />
          <Fact
            label="Employment type"
            value={employmentTypeLabel(vacancy.employmentType) ?? ''}
          />
          <Fact label="Workplace" value={workplaceTypeLabel(vacancy.workplaceType) ?? ''} />
          <Fact label="Location" value={vacancy.location} />
          <Fact
            label="Applications close"
            value={vacancy.applicationDeadline ? formatDate(vacancy.applicationDeadline) : ''}
          />
        </dl>
      </Block>

      {(vacancy.jobSummary || vacancy.jobDescription) && (
        <Block title="Job description">
          {vacancy.jobSummary && (
            <Typography.Paragraph className="mb-3">
              {vacancy.jobSummary}
            </Typography.Paragraph>
          )}
          {vacancy.jobDescription && (
            <Typography.Paragraph type="secondary" className="whitespace-pre-wrap">
              {vacancy.jobDescription}
            </Typography.Paragraph>
          )}
          {vacancy.keyResponsibilities.length > 0 && (
            <>
              <Typography.Text strong className="mb-2 block">
                Key responsibilities
              </Typography.Text>
              <Lines values={vacancy.keyResponsibilities} />
            </>
          )}
        </Block>
      )}

      <Block title="Candidate requirements">
        <Flex vertical gap={space[2]}>
          {vacancy.requiredSkills.length > 0 && (
            <div>
              <Typography.Text strong className="mb-2 block">
                Required skills
              </Typography.Text>
              <Chips values={vacancy.requiredSkills} />
            </div>
          )}
          {vacancy.preferredSkills.length > 0 && (
            <div>
              <Typography.Text strong className="mb-2 block">
                Preferred skills
              </Typography.Text>
              <Chips values={vacancy.preferredSkills} />
            </div>
          )}
          <dl className={detailGrid}>
            <Fact
              label="Minimum experience"
              value={
                vacancy.minimumExperienceYears === null
                  ? ''
                  : `${vacancy.minimumExperienceYears} years`
              }
            />
            <Fact label="Education" value={vacancy.education ?? ''} />
            <Fact label="Languages" value={vacancy.languageRequirements.join(', ')} />
            <Fact label="Certifications" value={vacancy.certifications.join(', ')} />
            <Fact label="Other requirements" value={vacancy.otherRequirements ?? ''} />
          </dl>
        </Flex>
      </Block>

      {(formatSalary(vacancy) || vacancy.benefits.length > 0) && (
        <Block title="Salary & benefits">
          <Flex vertical gap={space[2]}>
            <dl className={detailGrid}>
              <Fact label="Salary" value={formatSalary(vacancy)} />
              <Fact label="Pay period" value={payPeriodLabel(vacancy.payPeriod) ?? ''} />
            </dl>
            {vacancy.benefits.length > 0 && (
              <Chips values={vacancy.benefits.map(benefitLabel)} />
            )}
          </Flex>
        </Block>
      )}

      <Block title="Work schedule">
        <dl className={detailGrid}>
          <Fact label="Working days" value={formatWorkingDays(vacancy.workingDays)} />
          <Fact label="Working hours" value={vacancy.workingHours ?? ''} />
          <Fact label="Shift" value={shiftTypeLabel(vacancy.shiftType) ?? ''} />
          <Fact
            label="Hours per week"
            value={
              vacancy.expectedHoursPerWeek === null ? '' : `${vacancy.expectedHoursPerWeek}`
            }
          />
        </dl>
      </Block>

      {/* Hidden alongside the form's Recruitment settings section. Block always
          renders its heading, so leaving it would print an empty one now that
          nothing can fill these fields in. */}
      {/* <Block title="Recruitment settings">
        <Flex vertical gap={space[2]}>
          <dl className={detailGrid}>
            <Fact label="Pipeline" value={pipelineLabel(vacancy.recruitmentPipelineId) ?? ''} />
          </dl>
          {vacancy.screeningQuestions.length > 0 && (
            <div>
              <Typography.Text strong className="mb-2 block">
                Screening questions
              </Typography.Text>
              <Lines values={vacancy.screeningQuestions} />
            </div>
          )}
        </Flex>
      </Block> */}
    </>
  );
}
